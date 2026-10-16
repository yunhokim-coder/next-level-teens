// NEXT LINE AI 전달자 (Cloudflare Workers)
// 게임 → 이 Worker → Claude(Haiku 5.5). API 키는 Worker의 비밀 변수 ANTHROPIC_API_KEY에만 둔다.
// Apps Script(apps-script/Code.gs)의 AI 부분과 같은 일을 하지만, 동시에 훨씬 많은 요청을 받을 수 있다.
// 학생 글은 저장하지 않는다. 기록(ai_log)은 Apps Script로 넘겨 구글 시트에 남긴다 (글 없이 숫자만).
// 설정 방법: docs/ai-setup.md

// 이 주소에서 온 요청만 받는다 (다른 사이트가 이 Worker로 요금을 쓰지 못하게)
const ALLOWED_ORIGINS = ['https://yunhokim-coder.github.io', 'http://localhost:8770'];
// 기록을 남길 Apps Script 웹앱 주소 (config.js의 APPS_SCRIPT_URL과 같음)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzawhsBj9z2f-KI7yxViqlzvydD98nP3Em4gsNl4O6ZZLPdfeNMt9GexsXYSnFadm4k/exec';
const AI_MODEL = 'claude-haiku-5-5';
// 한 학생(익명 코드)이 1시간에 보낼 수 있는 요청 수 (Worker 한 대 기준, 대략적인 보호막)
const PER_STUDENT_HOUR = 15;

const TAGS = ['calm', 'selfworth', 'motivation', 'relation', 'focus', 'start', 'plan', 'method'];

const hits = new Map(); // 익명 코드 → [요청 시각...]

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method === 'GET') return new Response(JSON.stringify({ ok: true, msg: 'NEXT LINE AI worker is running.', key: !!env.ANTHROPIC_API_KEY }), { headers });
    if (request.method !== 'POST') return new Response('{}', { status: 405, headers });
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response(JSON.stringify({ ok: false, reason: 'origin' }), { status: 403, headers });

    let data;
    try {
      data = JSON.parse(await request.text());
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, reason: 'bad' }), { status: 400, headers });
    }
    const out = await ideas(data, env, ctx);
    return new Response(JSON.stringify(out), { headers });
  },
};

async function ideas(data, env, ctx) {
  const started = Date.now();
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: 'nokey' };

  const code = String(data.code || '').slice(0, 20);
  const lang = data.lang === 'en' ? 'en' : 'ko';
  const task = ['coach', 'examples', 'ideas'].indexOf(data.task) >= 0 ? data.task : 'ideas';

  // 한 학생이 짧은 시간에 너무 많이 보내면 막는다
  const now = Date.now();
  const list = (hits.get(code || 'anon') || []).filter((t) => now - t < 3600000);
  if (list.length >= PER_STUDENT_HOUR) return { ok: false, reason: 'student' };
  list.push(now);
  hits.set(code || 'anon', list);

  const short = (v, n) => String(v || '').slice(0, n);
  const input = {
    goal_station: short(data.dest, 40),
    goal: short(data.goal, 40),
    shadow: (Array.isArray(data.shadow) ? data.shadow : []).slice(0, 9).map((x) => short(x, 20)),
    tried: (Array.isArray(data.tried) ? data.tried : []).slice(0, 8).map((x) => ({ text: short(x && x.text, 30), helped: x && x.good === true ? 'yes' : x && x.good === false ? 'no' : 'unsure' })),
    progress_0_to_10: data.r === null || data.r === undefined ? null : Math.max(0, Math.min(10, Number(data.r) || 0)),
  };
  if (task === 'examples') input.kind = data.kind === 'goals' ? 'goals' : 'tried';
  if (task === 'coach') input.conversation = (Array.isArray(data.history) ? data.history : []).slice(-6).map((m) => ({ from: m && m.who === 'me' ? 'student' : 'nova', text: short(m && m.text, 160) }));
  if (task === 'ideas') input.student_wants_to_change = short(data.text, 80);

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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    const msg = await res.json();
    usage = msg.usage || {};
    if (res.status !== 200) out = { ok: false, reason: 'http' + res.status };
    else if (msg.stop_reason === 'refusal') out = { ok: true, safety: true, ideas: [] };
    else {
      const block = (msg.content || []).filter((b) => b.type === 'text')[0];
      out = shape(task, JSON.parse(block ? block.text : '{}'));
    }
  } catch (e) {
    out = { ok: false, reason: 'error' };
  }

  // 기록: 학생 글은 남기지 않는다. 응답을 기다리게 하지 않고 뒤에서 보낸다
  const log = {
    event: 'ai_log',
    via: 'worker',
    code,
    lang,
    task,
    ok: out.ok ? 1 : 0,
    reason: out.reason || '',
    safety: out.safety ? 1 : 0,
    ideas: out.ideas ? out.ideas.length : out.items ? out.items.length : 0,
    ms: Date.now() - started,
    input_tokens: usage.input_tokens || '',
    output_tokens: usage.output_tokens || '',
  };
  if (APPS_SCRIPT_URL) ctx.waitUntil(fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(log) }).catch(() => {}));
  return out;
}

// 모델이 돌려준 JSON을 다듬는다 (길이 제한, 태그 확인)
function shape(task, p) {
  const safety = !!(p && p.safety);
  if (safety) return { ok: true, safety: true, ideas: [], items: [], reply: '' };
  const cut = function (v, n) {
    return String(v || '').slice(0, n);
  };
  if (task === 'coach') {
    return {
      ok: true,
      safety: false,
      reply: cut(p.reply, 220),
      chips: (p.chips || []).slice(0, 3).map(function (x) {
        return cut(x, 24);
      }),
    };
  }
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
    properties: { safety: { type: 'boolean' }, reply: { type: 'string' }, chips: { type: 'array', items: { type: 'string' } } },
    required: ['safety', 'reply', 'chips'],
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
    'goal_station은 학생이 정한 "스무 살쯤 되고 싶은 나"(가치), goal은 그걸 이루기 위해 학생이 정한 목표(비어 있으면 goal_station을 목표로 삼은 것), shadow는 요즘 학생을 막는 것들, tried는 학생이 해 본 것과 도움 여부(helped), progress_0_to_10은 학생이 느끼는 진행 정도야.',
    '학생 글에 자해, 자살, 학대, 위험한 상황이 보이면 safety를 true로 하고 나머지는 비워. 그 밖에는 safety는 false.',
  ].join('\n'),
  en: [
    'You are Nova, a train conductor and a warm psychological coach in a study-motivation game for middle and high school students (ages 13-18). Speak casually and kindly.',
    "Coaching principles: help the student find their own answers; don't lecture. Reflect back the student's own words so they feel heard, affirm specific efforts and small successes, and ask one open question at a time.",
    'Solution-focused: pay attention to moments that already went well and strengths the student already has.',
    "Never: blame, compare with other students, give medical or diagnostic advice, judge parents or school, or invent facts the student didn't say.",
    'goal_station is the student\'s "who I want to be around age 20" (a value), goal is the goal they set to get there (if empty, goal_station itself is the goal), shadow is what blocks them lately, tried is what they tried and whether it helped, progress_0_to_10 is how far along they feel.',
    'If the student\'s text suggests self-harm, suicide, abuse or danger, set safety to true and leave the rest empty. Otherwise safety is false.',
  ].join('\n'),
};

const TASKS = {
  coach: {
    ko: [
      '학생은 goal(없으면 goal_station)에 가까워지려고 해 본 것(tried, 도움 여부)을 적고, 지금 몇 점쯤 왔는지(progress_0_to_10) 골랐어.',
      'reply: 해 본 것과 점수를 엮어서 짧게 반영하고(도움 된 게 있으면 그걸 구체적으로 인정), "0점이 아니라 n점인 건 뭐 덕분일까?" 같은 해결중심 질문 하나로 끝내. 0점이면 솔직하게 말해 준 걸 인정하고 1점이 되려면 뭐가 있으면 좋을지 묻기. 두 문장 이내, 90자 이내. 조언은 하지 마.',
      'chips: 그 질문에 학생이 누르기만 해도 되는 짧은 답 후보 3개(각 15자 이내, 학생 말투, 서로 다르게).',
    ].join('\n'),
    en: [
      'The student listed what they tried to get closer to goal (or goal_station if empty), whether each helped, and how far along they feel (progress_0_to_10).',
      'reply: briefly reflect what they tried together with the score (affirm specifically anything that helped), and end with one solution-focused question like "What makes it n and not 0?". If it is 0, thank them for being honest and ask what would help it become 1. At most two sentences, under 170 characters. No advice.',
      'chips: 3 short answer options the student could just tap (each under 30 characters, in the student\'s voice, different from each other).',
    ].join('\n'),
  },
  examples: {
    ko: [
      'kind가 goals이면: goal_station이라는 사람이 되기 위해 중고등학생이 세울 만한 가깝고 구체적인 목표 6개. 절반은 공부(성적·습관), 절반은 goal_station과 직접 관련된 것(예: "사람들을 웃게 하는 사람"이면 "학교 축제 무대 서기"). 각 text는 "~하기"로 끝나는 짧은 말(15자 이내).',
      'kind가 tried이면: 학생이 goal(없으면 goal_station)에 가까워지려고 이미 해 봤을 법한 일 6개. 절반은 공부와 관련된 것, 절반은 목표와 직접 관련된 것. 각 text는 "~하기"로 끝나는 짧은 말(15자 이내).',
      'tag는 목록에서 가장 맞는 것.',
    ].join('\n'),
    en: [
      'If kind is goals: 6 near, concrete goals a middle or high school student could set to become goal_station. Half about studying (grades, habits), half directly about goal_station (e.g. for "someone who makes people laugh": "performing at the school festival"). Each text is a short phrase under 30 characters.',
      'If kind is tried: 6 things the student might already have tried to move toward goal (or goal_station). Half about studying, half directly about the goal. Each text is a short gerund phrase under 30 characters.',
      'tag is the best fit from the list.',
    ].join('\n'),
  },
  ideas: {
    ko: [
      'student_wants_to_change는 학생이 goal(없으면 goal_station)에 한 칸 더 가려고 바꾸고 싶은 것이야 (비어 있으면 shadow와 tried를 보고 판단해). 아이디어는 그 goal에 맞춰.',
      'reply: 학생이 바꾸고 싶다고 한 말을 짧게 반영하고, 도움 됐던 tried가 있으면 그 힘을 이어 가자고 한 뒤 "이런 방법들은 어때?"처럼 고르기를 권하는 말. 두 문장 이내, 90자 이내.',
      'ideas: 일주일 안에 해 볼 수 있는 서로 다른 방법 5개. 도움 된 tried는 더 발전시키고, 도움 안 된 tried와 같은 방식은 피해. 학습과학 근거(인출 연습, 간격 반복, 섞어 풀기, 만약-그러면 계획, 할 일 쪼개기, 방해 요소 치우기, 나에게 친절하게 말하기, 도움 요청)를 우선해.',
      '각 아이디어: name은 2~6글자, act는 "~한다"로 끝나는 한 문장(마침표 없이 40자 이내, 작고 구체적으로), tag는 목록에서 가장 맞는 것, why는 노바의 짧은 한마디(50자 이내).',
    ].join('\n'),
    en: [
      'student_wants_to_change is what the student wants to change to move one step closer to goal (or goal_station) (if empty, use shadow and tried). Fit the ideas to that goal.',
      'reply: briefly reflect what they want to change; if something in tried helped, suggest building on that strength; then invite them to pick, like "How about these?". At most two sentences, under 170 characters.',
      'ideas: 5 different methods doable within one week. Build on what helped; avoid approaches like the ones that did not help. Prefer evidence-based strategies (retrieval practice, spacing, interleaving, implementation intentions, breaking tasks down, removing distractions, self-compassion, asking for help).',
      'Each idea: name = 2-4 words; act = what the student will do, written to follow "I will" (lowercase start, no period, under 60 characters, small and concrete); tag = best fit from the list; why = a short line from Nova (under 70 characters).',
    ].join('\n'),
  },
};
