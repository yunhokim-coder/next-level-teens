// AI 도우미 (6화 G·R·O). 학생이 켰을 때만, Cloudflare Worker(또는 Apps Script)를 거쳐 Claude에게 묻는다.
// API 키는 Worker·Apps Script에만 있다. 모두 실패하면 정해진 문장과 기기 안 생성기로 넘어간다.
(function () {
  const cfg = window.APP_CONFIG || {};
  const PER_STUDENT = 10; // R 예시·코칭 + O 아이디어를 합친 횟수

  // 위기 신호: 이런 글에는 공부 코칭 대신 도움 받을 곳을 안내한다 (AI에도 보내지 않는다)
  const CRISIS = [/죽고\s*싶/, /자살/, /자해/, /사라지고\s*싶/, /살기\s*싫/, /뛰어내리/, /손목/, /없어지고\s*싶/, /맞고\s*있/, /때려/, /kill myself/i, /suicid/i, /self[-\s]?harm/i, /want to die/i, /hurt myself/i, /end it all/i];
  const crisis = (text) => CRISIS.some((re) => re.test(String(text)));

  // 보내기 전에 연락처·긴 숫자를 지운다
  function scrub(text) {
    return String(text)
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[x]')
      .replace(/\d[\d\s-]{5,}\d/g, '[x]')
      .slice(0, 60);
  }

  // 보낼 글은 모두 연락처를 지우고 길이를 줄인다
  function clean(p) {
    const o = Object.assign({}, p);
    if (o.text !== undefined) o.text = scrub(o.text);
    if (o.dest !== undefined) o.dest = scrub(o.dest).slice(0, 40);
    if (o.goal !== undefined) o.goal = scrub(o.goal).slice(0, 40);
    if (Array.isArray(o.history)) o.history = o.history.slice(-6).map((m) => ({ who: m.who, text: scrub(m.text).slice(0, 160) }));
    if (Array.isArray(o.tried)) o.tried = o.tried.slice(0, 8).map((t) => ({ text: scrub(t.text).slice(0, 30), good: t.good }));
    return o;
  }
  const ideas = (p) => call('ideas', p);

  const on = () => !!(cfg.AI_IDEAS && (cfg.AI_URL || cfg.APPS_SCRIPT_URL));
  const used = () => (Data.save && Data.save.aiUsed) || 0;
  const left = () => Math.max(0, PER_STUDENT - used());

  // 한 곳에 한 번 보내기. 결과: { ok, safety, ...task별 내용, reason }
  async function post(url, body, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctrl.signal });
      const out = await res.json();
      if (!out || !out.ok) return { ok: false, reason: (out && out.reason) || 'error' };
      return Object.assign({ ideas: [], items: [], reply: '' }, out, { ok: true, safety: !!out.safety });
    } catch (e) {
      return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 다시 시도해도 소용없는 이유 (키 없음, 한도, 막힌 주소)
  const FINAL = ['nokey', 'student', 'daily', 'origin', 'off', 'limit'];

  // task: 'examples'(G 목표·R 해 본 것 예시) | 'coach'(R 코칭 한마디) | 'ideas'(O 아이디어)
  // Cloudflare Worker(AI_URL) 먼저, 실패하면 잠깐 쉬고 한 번 더, 그래도 안 되면 Apps Script로
  async function call(task, payload) {
    if (!on()) return { ok: false, reason: 'off' };
    if (!left()) return { ok: false, reason: 'limit' };
    Data.save.aiUsed = used() + 1;
    Data.persist();
    const body = JSON.stringify(Object.assign({ action: 'ideas', task, code: Data.save.code, lang: I18n.lang === 'en' ? 'en' : 'ko' }, clean(payload)));
    let out = { ok: false, reason: 'off' };
    if (cfg.AI_URL) {
      out = await post(cfg.AI_URL, body, 15000);
      if (!out.ok && !FINAL.includes(out.reason)) {
        await sleep(600 + Math.random() * 1400);
        out = await post(cfg.AI_URL, body, 15000);
      }
      if (out.ok || out.reason === 'student') return out;
    }
    if (cfg.APPS_SCRIPT_URL) out = await post(cfg.APPS_SCRIPT_URL, body, 15000);
    return out;
  }

  window.Ai = { on, left, crisis, scrub, call, ideas, PER_STUDENT };
})();
