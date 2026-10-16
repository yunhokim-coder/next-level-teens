// 언어 설정: data/i18n/{lang}.json을 불러와 화면 문구를 바꾼다.
// HTML에서는 data-i18n="menu.title"처럼 키를 적어두면 자동으로 채워진다.
(function () {
  const cfg = window.APP_CONFIG;
  const STORE_KEY = 'nextline.lang';
  const cache = {};
  let lang = cfg.DEFAULT_LANG;
  let dict = {};
  const listeners = [];

  function saved() {
    try {
      const v = localStorage.getItem(STORE_KEY);
      return cfg.LANGS.includes(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  async function load(code) {
    if (!cache[code]) {
      const res = await fetch(`data/i18n/${code}.json`, { cache: 'no-cache' });
      cache[code] = await res.json();
    }
    return cache[code];
  }

  function t(key) {
    const val = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
    return val === undefined ? key : val;
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }

  async function set(code) {
    if (!cfg.LANGS.includes(code)) return;
    dict = await load(code);
    lang = code;
    document.documentElement.lang = code;
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch (e) {
      /* 저장이 막힌 기기에서는 이번 방문 동안만 유지 */
    }
    apply();
    listeners.forEach((fn) => fn(code));
  }

  window.I18n = {
    init: () => set(saved() || cfg.DEFAULT_LANG),
    set,
    t,
    apply,
    get lang() {
      return lang;
    },
    onChange: (fn) => listeners.push(fn),
  };
})();
