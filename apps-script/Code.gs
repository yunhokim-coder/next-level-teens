// NEXT LINE 데이터 받기 + AI 아이디어 도우미 (Google Apps Script 웹앱)
// 설정 방법은 docs/data-setup.md, docs/ai-setup.md 참고.
//
// 1) 데이터: 게임이 보낸 JSON을 이벤트 이름별 시트 탭(register, pre, post, ...)에 한 줄씩 쌓는다.
// 2) AI 도우미: action이 'ideas'이면 Claude(Haiku 5.5)에게 공부 방법 아이디어를 받아 돌려준다.
//    API 키는 이 코드에 쓰지 않고 [프로젝트 설정 → 스크립트 속성]의 ANTHROPIC_API_KEY에만 둔다.
//    학생이 쓴 글은 시트에 저장하지 않는다 (ai_log 탭에는 성공 여부·시간·토큰 수만).

// 데이터를 쌓을 스프레드시트 ID (주소창의 /d/ 와 /edit 사이)
const SHEET_ID = '여기에_스프레드시트_ID';

// AI 도우미 한도: 하루 전체 요청 수, 한 학생(익명 코드)당 요청 수
const AI_DAILY_LIMIT = 500;
const AI_PER_STUDENT = 6;
const AI_MODEL = 'claude-haiku-5-5';

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput('error');
  }
  if (data.action === 'ideas') return json(ideas(data));
  return logEvent(data);
}

// 브라우저로 주소를 열었을 때 살아 있는지 확인용
function doGet() {
  return ContentService.createTextOutput('NEXT LINE data endpoint is running.');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- 1) 데이터 쌓기 ----------
function logEvent(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const event = String(data.event || 'unknown').replace(/[^a-z0-9_]/gi, '').slice(0, 40) || 'unknown';
    appendRow(event, data);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// 처음 보는 항목이 오면 맨 오른쪽에 열을 새로 만든다
function appendRow(tab, data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
  let headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (!headers.length) {
    headers = ['received'];
    sheet.appendRow(headers);
  }
  Object.keys(data).forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      sheet.getRange(1, headers.length).setValue(k);
    }
  });
  const row = headers.map(function (h) {
    if (h === 'received') return new Date();
    const v = data[h];
    if (v === undefined || v === null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : v;
  });
  sheet.appendRow(row);
}

// ---------- 2) AI 아이디어 도우미 ----------
const TAGS = ['calm', 'selfworth', 'motivation', 'relation', 'focus', 'start', 'plan', 'method'];

function ideas(data) {
  const started = Date.now();
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, reason: 'nokey' };

  const code = String(data.code || '').slice(0, 20);
  const lang = data.lang === 'en' ? 'en' : 'ko';
  const text = String(data.text || '').slice(0, 80);
  const shadow = (Array.isArray(data.shadow) ? data.shadow : []).slice(0, 9).map(function (s) {
    return String(s).slice(0, 20);
  });
  const r = Math.max(0, Math.min(10, Number(data.r) || 0));

  // 한도: 하루 전체, 학생 한 명
  const cache = CacheService.getScriptCache();
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const day = Number(props.getProperty('ai_' + today) || 0);
    if (day >= AI_DAILY_LIMIT) return { ok: false, reason: 'daily' };
    const mine = Number(cache.get('ai_' + code) || 0);
    if (code && mine >= AI_PER_STUDENT) return { ok: false, reason: 'student' };
    props.setProperty('ai_' + today, String(day + 1));
    if (code) cache.put('ai_' + code, String(mine + 1), 6 * 60 * 60);
  } finally {
    lock.releaseLock();
  }

  const body = {
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            safety: { type: 'boolean' },
            ideas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  act: { type: 'string' },
                  tag: { type: 'string', enum: TAGS },
                  why: { type: 'string' },
                },
                required: ['name', 'act', 'tag', 'why'],
                additionalProperties: false,
              },
            },
          },
          required: ['safety', 'ideas'],
          additionalProperties: false,
        },
      },
    },
    system: systemPrompt(lang),
    messages: [{ role: 'user', content: JSON.stringify({ student_wrote: text, shadow: shadow, progress_0_to_10: r }) }],
  };

  let out = { ok: false, reason: 'error' };
  let usage = {};
  try {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const status = res.getResponseCode();
    const msg = JSON.parse(res.getContentText());
    usage = msg.usage || {};
    if (status !== 200) out = { ok: false, reason: 'http' + status };
    else if (msg.stop_reason === 'refusal') out = { ok: true, safety: true, ideas: [] };
    else {
      const block = (msg.content || []).filter(function (b) {
        return b.type === 'text';
      })[0];
      const parsed = JSON.parse(block ? block.text : '{}');
      const list = (parsed.ideas || [])
        .filter(function (x) {
          return x && x.name && x.act && TAGS.indexOf(x.tag) >= 0;
        })
        .slice(0, 6)
        .map(function (x) {
          return { name: String(x.name).slice(0, 24), act: String(x.act).slice(0, 60), tag: x.tag, why: String(x.why || '').slice(0, 80) };
        });
      out = { ok: true, safety: !!parsed.safety, ideas: parsed.safety ? [] : list };
    }
  } catch (err) {
    out = { ok: false, reason: 'error' };
  }

  // 기록: 학생 글은 남기지 않는다
  try {
    appendRow('ai_log', {
      code: code,
      lang: lang,
      ok: out.ok ? 1 : 0,
      reason: out.reason || '',
      safety: out.safety ? 1 : 0,
      ideas: out.ideas ? out.ideas.length : 0,
      ms: Date.now() - started,
      input_tokens: usage.input_tokens || '',
      output_tokens: usage.output_tokens || '',
    });
  } catch (err) {
    /* 기록 실패는 응답을 막지 않는다 */
  }
  return out;
}

function systemPrompt(lang) {
  if (lang === 'en') {
    return [
      'You are Nova, a warm train conductor in a study-motivation game for middle and high school students (ages 13-18).',
      'The student wrote what they want to change to move closer to their goal. "shadow" lists what usually blocks them. "progress_0_to_10" is how far along they feel.',
      'Give 5 different, concrete study or motivation methods they could try within one week. Prefer evidence-based strategies (retrieval practice, spacing, interleaving, implementation intentions, breaking tasks down, removing distractions, self-compassion, asking for help).',
      'Each idea: name = 2-4 word label; act = what the student will do, written to follow "I will" (lowercase start, no period, under 60 characters); tag = the best fit from the list; why = one short friendly sentence from Nova (under 70 characters).',
      'Make them small and doable, not "study harder". Mix study methods and mindset or habit methods. Never shame, never give medical or diagnostic advice, never compare with other students.',
      'If the text suggests self-harm, suicide, abuse, or danger, set safety to true and return an empty ideas list. Otherwise set safety to false.',
      'If the text is empty, off-topic or unclear, base the ideas on the shadow list.',
    ].join('\n');
  }
  return [
    '너는 중고등학생(13~18세)을 위한 학업 동기 게임의 다정한 기관사 "노바"야.',
    '학생이 목표에 한 칸 더 가까워지려고 바꾸고 싶은 걸 썼어. shadow는 요즘 학생을 막는 것들, progress_0_to_10은 지금 얼마나 왔다고 느끼는지야.',
    '일주일 안에 해 볼 수 있는 서로 다른 공부·동기 방법 5개를 만들어. 학습과학에 근거한 방법(인출 연습, 간격 반복, 섞어 풀기, 만약-그러면 계획, 할 일 쪼개기, 방해 요소 치우기, 나에게 친절하게 말하기, 도움 요청하기 등)을 우선해.',
    '각 아이디어: name은 2~6글자 짧은 이름, act는 학생이 할 행동을 "~한다"로 끝나는 한 문장(마침표 없이 40자 이내), tag는 목록에서 가장 맞는 것, why는 노바가 반말로 건네는 짧은 한마디(50자 이내).',
    '"열심히 하기" 같은 막연한 말 말고 작고 구체적으로. 공부법과 마음·습관 방법을 섞어. 비난하지 말고, 의학적 조언이나 진단은 하지 말고, 다른 학생과 비교하지 마.',
    '글에 자해, 자살, 학대, 위험한 상황이 보이면 safety를 true로 하고 ideas는 빈 목록으로 해. 그 밖에는 safety를 false로 해.',
    '글이 비었거나 공부와 관계없거나 알아보기 어려우면 shadow를 바탕으로 만들어.',
  ].join('\n');
}

// [실행] 버튼으로 AI 연결 확인: API 키가 맞으면 실행 로그에 아이디어가 찍힌다 (예시 문장 사용)
function testIdeas() {
  const res = ideas({ action: 'ideas', code: 'TEST', lang: 'ko', text: '수학 시험 때 폰 때문에 집중이 안 돼', shadow: ['숏폼', '시험 공포'], r: 4 });
  Logger.log(JSON.stringify(res, null, 2));
}

// [실행] 버튼으로 시트 연결 확인
function testWrite() {
  appendRow('test', { event: 'test', note: 'connection ok' });
}
