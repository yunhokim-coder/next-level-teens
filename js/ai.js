// AI 아이디어 도우미 (6화 O 단계). 학생이 켰을 때만, 선생님의 Apps Script를 거쳐 Claude에게 묻는다.
// API 키는 Apps Script에만 있다. 실패하면 기기 안 생성기(grow.js)로 넘어간다.
(function () {
  const cfg = window.APP_CONFIG || {};
  const PER_STUDENT = 5;

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

  const on = () => !!(cfg.AI_IDEAS && cfg.APPS_SCRIPT_URL);
  const used = () => (Data.save && Data.save.aiUsed) || 0;
  const left = () => Math.max(0, PER_STUDENT - used());

  // 결과: { ok, safety, ideas:[{name, act, tag, why}], reason }
  async function ideas({ text, shadow, r }) {
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
        body: JSON.stringify({ action: 'ideas', code: Data.save.code, lang: I18n.lang === 'en' ? 'en' : 'ko', text: scrub(text), shadow, r }),
        signal: ctrl.signal,
      });
      const out = await res.json();
      if (!out || !out.ok) return { ok: false, reason: (out && out.reason) || 'error' };
      return { ok: true, safety: !!out.safety, ideas: Array.isArray(out.ideas) ? out.ideas : [] };
    } catch (e) {
      return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  window.Ai = { on, left, crisis, scrub, ideas, PER_STUDENT };
})();
