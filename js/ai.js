// AI 아이디어 도우미 (6화 O 단계). 학생이 켰을 때만, 선생님의 Apps Script를 거쳐 Claude에게 묻는다.
// API 키는 Apps Script에만 있다. 실패하면 기기 안 생성기(grow.js)로 넘어간다.
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
    if (Array.isArray(o.history)) o.history = o.history.slice(-6).map((m) => ({ who: m.who, text: scrub(m.text).slice(0, 160) }));
    if (Array.isArray(o.tried)) o.tried = o.tried.slice(0, 8).map((t) => ({ text: scrub(t.text).slice(0, 30), good: t.good }));
    return o;
  }
  const ideas = (p) => call('ideas', p);

  const on = () => !!(cfg.AI_IDEAS && cfg.APPS_SCRIPT_URL);
  const used = () => (Data.save && Data.save.aiUsed) || 0;
  const left = () => Math.max(0, PER_STUDENT - used());

  // task: 'ideas'(O 아이디어) | 'examples'(R1 해 본 것 예시) | 'reflect'(R2 코칭 한마디)
  // 결과: { ok, safety, ...task별 내용, reason }
  async function call(task, payload) {
    if (!on()) return { ok: false, reason: 'off' };
    if (!left()) return { ok: false, reason: 'limit' };
    Data.save.aiUsed = used() + 1;
    Data.persist();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(cfg.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: 'ideas', task, code: Data.save.code, lang: I18n.lang === 'en' ? 'en' : 'ko' }, clean(payload))),
        signal: ctrl.signal,
      });
      const out = await res.json();
      if (!out || !out.ok) return { ok: false, reason: (out && out.reason) || 'error' };
      return Object.assign({ ideas: [], items: [], reply: '' }, out, { ok: true, safety: !!out.safety });
    } catch (e) {
      return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  window.Ai = { on, left, crisis, scrub, call, ideas, PER_STUDENT };
})();
