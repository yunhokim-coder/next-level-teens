// 익명 저장과 전송.
// - 기기 저장(localStorage): 진행 상황, 승객 이름 번호, 설문 응답
// - 전송: config.js의 DATA_COLLECTION이 true이고, 학생이 동의했고, APPS_SCRIPT_URL이 있을 때만
// - 이름·연락처·직접 쓴 글은 어떤 경우에도 보내지 않는다
(function () {
  const KEY = 'nextline.save.v1';
  const cfg = window.APP_CONFIG;
  let survey = null;
  let save = null;

  function load() {
    try {
      save = JSON.parse(localStorage.getItem(KEY)) || null;
    } catch (e) {
      save = null;
    }
    return save;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* 저장이 막힌 기기에서는 이번 방문 동안만 유지 */
    }
  }

  // 헷갈리는 글자(0/O, 1/I)를 뺀 익명 코드. 예) KT-4821
  function newCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const pick = () => L[Math.floor(Math.random() * L.length)];
    return `${pick()}${pick()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  function school() {
    const s = new URLSearchParams(location.search).get('s');
    return s && /^[A-Za-z0-9]{1,8}$/.test(s) ? s : '';
  }

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  window.Data = {
    async loadSurvey() {
      if (!survey) survey = await (await fetch('data/survey.json', { cache: 'no-cache' })).json();
      return survey;
    },
    get survey() {
      return survey;
    },
    get save() {
      return save;
    },
    load,
    persist,
    // 새 승객: 동의 여부와 함께 저장을 새로 시작한다
    create(consent) {
      save = { v: 1, code: newCode(), consent: !!consent, school: school(), name: [0, 0], profile: {}, answers: {}, done: {} };
      persist();
      return save;
    },
    nameText() {
      if (!save || !survey) return '???';
      const [a, b] = save.name;
      const L = lang();
      return `${survey.nameParts.a[L][a]} ${survey.nameParts.b[L][b]}`;
    },
    // 보낼 수 있는지: 설정 플래그 + 학생 동의 + 주소
    get canSend() {
      // ?s=TEST 링크는 연결 확인용이라 수집 스위치가 꺼져 있어도 보낸다
      const on = cfg.DATA_COLLECTION || (save && save.school === 'TEST');
      return !!(on && cfg.APPS_SCRIPT_URL && save && save.consent);
    },
    // event: register, pre, post, satisfaction, episode_complete ...
    send(event, payload = {}) {
      if (!this.canSend) return;
      const body = {
        event,
        code: save.code,
        school: save.school,
        lang: lang(),
        version: document.querySelector('meta[name="app-version"]').content,
        ts: new Date().toISOString(),
        ...payload,
      };
      const text = JSON.stringify(body);
      try {
        // sendBeacon: 페이지를 닫아도 보내지고, CORS 사전 요청이 없다. 안 되면 fetch로 보낸다
        const ok = navigator.sendBeacon && navigator.sendBeacon(cfg.APPS_SCRIPT_URL, new Blob([text], { type: 'text/plain;charset=utf-8' }));
        if (!ok) fetch(cfg.APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: text }).catch(() => {});
      } catch (e) {
        /* 전송 실패는 진행을 막지 않는다 */
      }
    },
  };
})();
