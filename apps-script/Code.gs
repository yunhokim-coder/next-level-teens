// NEXT LINE 데이터 받기 + AI 아이디어 도우미 (Google Apps Script 웹앱)
// 설정 방법은 docs/data-setup.md, docs/ai-setup.md 참고.
//
// 1) 데이터: 게임이 보낸 JSON을 이벤트 이름별 시트 탭(register, pre, post, ...)에 한 줄씩 쌓는다.
// 2) AI 도우미: action이 'ideas'이면 Claude(Haiku 5.5)에게 묻는다. task에 따라
//    'coach'    R 단계 노바의 코칭 한마디 (반영 + 열린 질문 하나)
//    'examples' R 단계 "지금까지 해 본 것" 예시 (종착역에 맞춤)
//    'ideas'    O 단계 코칭 한마디 + 공부 방법 아이디어 5개
//    API 키는 이 코드에 쓰지 않고 [프로젝트 설정 → 스크립트 속성]의 ANTHROPIC_API_KEY에만 둔다.
//    학생이 쓴 글은 시트에 저장하지 않는다 (ai_log 탭에는 성공 여부·시간·토큰 수만).

// 데이터를 쌓을 스프레드시트 ID (주소창의 /d/ 와 /edit 사이)
const SHEET_ID = '여기에_스프레드시트_ID';

// AI 도우미 한도: 하루 전체 요청 수, 한 학생(익명 코드)당 요청 수
const AI_DAILY_LIMIT = 500;
const AI_PER_STUDENT = 12;
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
  const task = ['coach', 'examples', 'ideas'].indexOf(data.task) >= 0 ? data.task : 'ideas';
  const short = function (v, n) {
    return String(v || '').slice(0, n);
  };
  const input = {
    goal_station: short(data.dest, 40),
    shadow: (Array.isArray(data.shadow) ? data.shadow : []).slice(0, 9).map(function (x) {
      return short(x, 20);
    }),
    tried: (Array.isArray(data.tried) ? data.tried : []).slice(0, 8).map(function (x) {
      return { text: short(x && x.text, 30), helped: x && x.good === true ? 'yes' : x && x.good === false ? 'no' : 'unsure' };
    }),
    progress_0_to_10: data.r === null || data.r === undefined ? null : Math.max(0, Math.min(10, Number(data.r) || 0)),
  };
  if (task === 'coach') {
    input.turn = data.turn === 'r2' ? 'r2' : 'r1';
    input.conversation = (Array.isArray(data.history) ? data.history : []).slice(-6).map(function (m) {
      return { from: m && m.who === 'me' ? 'student' : 'nova', text: short(m && m.text, 160) };
    });
  }
  if (task === 'ideas') input.student_wants_to_change = short(data.text, 80);

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
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMAS[task] } },
    system: COMMON[lang] + '\n\n' + TASKS[task][lang],
    messages: [{ role: 'user', content: JSON.stringify(input) }],
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
      out = shape(task, JSON.parse(block ? block.text : '{}'));
    }
  } catch (err) {
    out = { ok: false, reason: 'error' };
  }

  // 기록: 학생 글은 남기지 않는다
  try {
    appendRow('ai_log', {
      code: code,
      lang: lang,
      task: task,
      ok: out.ok ? 1 : 0,
      reason: out.reason || '',
      safety: out.safety ? 1 : 0,
      ideas: out.ideas ? out.ideas.length : out.items ? out.items.length : 0,
      ms: Date.now() - started,
      input_tokens: usage.input_tokens || '',
      output_tokens: usage.output_tokens || '',
    });
  } catch (err) {
    /* 기록 실패는 응답을 막지 않는다 */
  }
  return out;
}

// 모델이 돌려준 JSON을 다듬는다 (길이 제한, 태그 확인)
function shape(task, p) {
  const safety = !!(p && p.safety);
  if (safety) return { ok: true, safety: true, ideas: [], items: [], reply: '' };
  const cut = function (v, n) {
    return String(v || '').slice(0, n);
  };
  if (task === 'coach') return { ok: true, safety: false, reply: cut(p.reply, 220) };
  if (task === 'examples') {
    return {
      ok: true,
      safety: false,
      items: (p.items || [])
        .filter(function (x) {
          return x && x.text && TAGS.indexOf(x.tag) >= 0;
        })
        .slice(0, 8)
        .map(function (x) {
          return { text: cut(x.text, 24), tag: x.tag };
        }),
    };
  }
  return {
    ok: true,
    safety: false,
    reply: cut(p.reply, 220),
    ideas: (p.ideas || [])
      .filter(function (x) {
        return x && x.name && x.act && TAGS.indexOf(x.tag) >= 0;
      })
      .slice(0, 6)
      .map(function (x) {
        return { name: cut(x.name, 24), act: cut(x.act, 60), tag: x.tag, why: cut(x.why, 80) };
      }),
  };
}

const IDEA = {
  type: 'object',
  properties: { name: { type: 'string' }, act: { type: 'string' }, tag: { type: 'string', enum: TAGS }, why: { type: 'string' } },
  required: ['name', 'act', 'tag', 'why'],
  additionalProperties: false,
};
const SCHEMAS = {
  coach: {
    type: 'object',
    properties: { safety: { type: 'boolean' }, reply: { type: 'string' } },
    required: ['safety', 'reply'],
    additionalProperties: false,
  },
  examples: {
    type: 'object',
    properties: {
      safety: { type: 'boolean' },
      items: {
        type: 'array',
        items: { type: 'object', properties: { text: { type: 'string' }, tag: { type: 'string', enum: TAGS } }, required: ['text', 'tag'], additionalProperties: false },
      },
    },
    required: ['safety', 'items'],
    additionalProperties: false,
  },
  ideas: {
    type: 'object',
    properties: { safety: { type: 'boolean' }, reply: { type: 'string' }, ideas: { type: 'array', items: IDEA } },
    required: ['safety', 'reply', 'ideas'],
    additionalProperties: false,
  },
};

// 노바의 코칭 태도 (모든 task 공통)
const COMMON = {
  ko: [
    '너는 중고등학생(13~18세)을 위한 학업 동기 게임에서 학생 곁을 지키는 기관사 "노바"이자, 따뜻한 심리 코치야. 학생에게 반말로 다정하게 말해.',
    '코칭 원칙: 학생이 답을 스스로 찾게 돕는다. 가르치거나 훈계하지 않는다. 학생이 한 말을 그대로 되짚어(반영) 들었다는 걸 보여 주고, 해 본 노력과 작은 성공을 구체적으로 인정한다. 질문은 한 번에 하나, 열린 질문으로 한다.',
    '해결중심 관점: 문제보다 이미 잘 된 순간, 학생이 가진 힘에 주목한다.',
    '하지 말 것: 비난, 다른 학생과 비교, 의학적 조언이나 진단, 부모·학교에 대한 판단, 학생이 말하지 않은 사실 지어내기.',
    'goal_station은 학생이 정한 "스무 살쯤 되고 싶은 나", shadow는 요즘 학생을 막는 것들, tried는 학생이 해 본 것과 도움 여부(helped), progress_0_to_10은 학생이 느끼는 진행 정도야.',
    '학생 글에 자해, 자살, 학대, 위험한 상황이 보이면 safety를 true로 하고 나머지는 비워. 그 밖에는 safety는 false.',
  ].join('\n'),
  en: [
    'You are Nova, a train conductor and a warm psychological coach in a study-motivation game for middle and high school students (ages 13-18). Speak casually and kindly.',
    "Coaching principles: help the student find their own answers; don't lecture. Reflect back the student's own words so they feel heard, affirm specific efforts and small successes, and ask one open question at a time.",
    'Solution-focused: pay attention to moments that already went well and strengths the student already has.',
    "Never: blame, compare with other students, give medical or diagnostic advice, judge parents or school, or invent facts the student didn't say.",
    'goal_station is the student\'s "who I want to be around age 20", shadow is what blocks them lately, tried is what they tried and whether it helped, progress_0_to_10 is how far along they feel.',
    'If the student\'s text suggests self-harm, suicide, abuse or danger, set safety to true and leave the rest empty. Otherwise safety is false.',
  ].join('\n'),
};

const TASKS = {
  coach: {
    ko: [
      'turn이 r1이면: 학생이 tried에 적은 것을 보고 반응해. 도움 된 게 있으면 그걸 구체적으로 인정하고 "그때는 뭐가 달랐어?" 같은 열린 질문 하나. 도움 안 된 것만 있으면 시도한 것 자체를 인정하고 무엇이 어려웠는지 묻기. 아무것도 없으면 괜찮다고 말하고 그나마 잘 됐던 순간을 묻기.',
      'turn이 r2이면: 학생이 고른 점수(progress_0_to_10)와 지금까지 대화를 이어서 반영하고, "0점이 아니라 n점인 건 뭐 덕분일까?" 같은 해결중심 질문 하나. 0점이면 여기까지 온 것을 인정하고 1점이 되려면 무엇이 있으면 좋을지 묻기.',
      'reply는 두 문장 이내, 90자 이내, 마지막은 질문 하나로 끝내. 조언이나 방법 제안은 아직 하지 마.',
    ].join('\n'),
    en: [
      'If turn is r1: respond to what the student listed in tried. If something helped, affirm it specifically and ask one open question like "What was different then?". If nothing helped, affirm the effort itself and ask what was hard. If nothing was tried, say that\'s okay and ask about a moment that went a little better.',
      'If turn is r2: reflect the score (progress_0_to_10) together with the conversation so far, and ask one solution-focused question like "What makes it n and not 0?". If it is 0, affirm that they came this far and ask what would help it become 1.',
      'reply: at most two sentences, under 170 characters, ending with exactly one question. Do not give advice or suggest methods yet.',
    ].join('\n'),
  },
  examples: {
    ko: [
      '학생이 goal_station에 가까워지려고 이미 해 봤을 법한 일 6개를 만들어. 절반은 공부와 관련된 것, 절반은 goal_station과 직접 관련된 것(예: "사람들을 웃게 하는 사람"이면 "발표 연습해 보기").',
      '각 text는 "~하기"로 끝나는 짧은 말(15자 이내), tag는 목록에서 가장 맞는 것.',
    ].join('\n'),
    en: [
      'List 6 things a student might already have tried to move toward goal_station. Half about studying, half directly about goal_station (e.g. for "someone who makes people laugh": "practicing presentations").',
      'Each text is a short gerund phrase under 30 characters; tag is the best fit from the list.',
    ].join('\n'),
  },
  ideas: {
    ko: [
      'student_wants_to_change는 학생이 한 칸 더 가려고 바꾸고 싶은 것이야 (비어 있으면 shadow와 tried를 보고 판단해).',
      'reply: 학생이 바꾸고 싶다고 한 말을 짧게 반영하고, 도움 됐던 tried가 있으면 그 힘을 이어 가자고 한 뒤 "이런 방법들은 어때?"처럼 고르기를 권하는 말. 두 문장 이내, 90자 이내.',
      'ideas: 일주일 안에 해 볼 수 있는 서로 다른 방법 5개. 도움 된 tried는 더 발전시키고, 도움 안 된 tried와 같은 방식은 피해. 학습과학 근거(인출 연습, 간격 반복, 섞어 풀기, 만약-그러면 계획, 할 일 쪼개기, 방해 요소 치우기, 나에게 친절하게 말하기, 도움 요청)를 우선해.',
      '각 아이디어: name은 2~6글자, act는 "~한다"로 끝나는 한 문장(마침표 없이 40자 이내, 작고 구체적으로), tag는 목록에서 가장 맞는 것, why는 노바의 짧은 한마디(50자 이내).',
    ].join('\n'),
    en: [
      'student_wants_to_change is what the student wants to change to move one step closer (if empty, use shadow and tried).',
      'reply: briefly reflect what they want to change; if something in tried helped, suggest building on that strength; then invite them to pick, like "How about these?". At most two sentences, under 170 characters.',
      'ideas: 5 different methods doable within one week. Build on what helped; avoid approaches like the ones that did not help. Prefer evidence-based strategies (retrieval practice, spacing, interleaving, implementation intentions, breaking tasks down, removing distractions, self-compassion, asking for help).',
      'Each idea: name = 2-4 words; act = what the student will do, written to follow "I will" (lowercase start, no period, under 60 characters, small and concrete); tag = best fit from the list; why = a short line from Nova (under 70 characters).',
    ].join('\n'),
  },
};

// [실행] 버튼으로 AI 연결 확인 (예시 입력 사용): 실행 로그에 코칭 한마디와 아이디어가 찍힌다
function testIdeas() {
  const base = { action: 'ideas', code: 'TEST', lang: 'ko', dest: '사람들을 웃게 하는 사람', shadow: ['숏폼', '시험 공포'], tried: [{ text: '폰 멀리 두기', good: true }, { text: '벼락치기', good: false }], r: 4 };
  Logger.log(JSON.stringify(ideas(Object.assign({ task: 'coach', turn: 'r1', history: [] }, base)), null, 2));
  Logger.log(JSON.stringify(ideas(Object.assign({ task: 'ideas', text: '수학 시험 때 폰 때문에 집중이 안 돼' }, base)), null, 2));
}

// [실행] 버튼으로 시트 연결 확인
function testWrite() {
  appendRow('test', { event: 'test', note: 'connection ok' });
}
