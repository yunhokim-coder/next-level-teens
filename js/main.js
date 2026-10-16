// 화면 흐름: 언어 선택 → 타이틀 → 1화 첫차 (꿈 → 깨어남 → 둘러보기 → 노바·정체 → 통로 걷기 → 첫차).
(function () {
  const $ = (sel) => document.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const stage = $('#stage');


  // ---------- 화면 크기: 320×180 정수배 확대, 대화창은 그림 아래 ----------
  function fit() {
    const portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait', portrait);
    const raw = portrait
      ? Math.min(window.innerWidth / Game.W, (window.innerHeight * 0.62) / Game.H)
      : Math.min(window.innerWidth / Game.W, (window.innerHeight - 110) / Game.H);
    const scale = raw >= 2 ? Math.floor(raw) : raw;
    const w = Math.floor(Game.W * scale);
    stage.style.width = `${w}px`;
    stage.style.height = `${Math.floor(Game.H * scale)}px`;
    $('#app').style.width = `${w}px`;
    document.documentElement.style.setProperty('--s', scale);
    Game.resize(scale);
  }

  // ---------- 미니 초상화: 아직 거울을 보지 않아 후드 실루엣과 ? ----------
  function drawPortrait() {
    const c = $('#portrait-canvas');
    const g = c.getContext('2d');
    g.clearRect(0, 0, 24, 32);
    g.fillStyle = '#565c70';
    g.fillRect(7, 4, 10, 3);
    g.fillRect(5, 7, 14, 11);
    g.fillRect(4, 18, 16, 14);
    g.fillStyle = '#0b0c16';
    g.fillRect(8, 9, 8, 8);
    g.fillStyle = '#ffe14a';
    g.fillRect(11, 10, 3, 1);
    g.fillRect(13, 11, 1, 2);
    g.fillRect(12, 13, 1, 1);
    g.fillRect(12, 15, 1, 1);
  }

  let toastTimer = null;
  function toast(msg, ms = 3800) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, ms);
  }

  const say = (steps) => Story.play(steps);
  const n = (key, extra = {}) => ({ who: 'narrator', key, ...extra });
  const nova = (key, extra = {}) => ({ who: 'nova', key, ...extra });
  const jam = (key, extra = {}) => ({ who: 'jam', key, ...extra });

  // ---------- 둘러보기: 전광판을 볼 때까지 자유롭게 ----------
  function lookAround() {
    return new Promise((resolve) => {
      $('#look-left').hidden = false;
      $('#look-right').hidden = false;
      const hint = $('#look-hint');
      hint.textContent = I18n.t('look.hint');
      hint.hidden = false;
      Game.lookMode(true);
      Game.onHot = (id) => {
        Game.markSeen(id);
        Sound.play('select');
        if (id === 'board') {
          Game.onHot = null;
          Game.lookMode(false);
          $('#look-left').hidden = true;
          $('#look-right').hidden = true;
          hint.hidden = true;
          $('#toast').hidden = true;
          resolve();
          return;
        }
        toast(I18n.t(`hot.${id}`));
      };
    });
  }

  // ---------- 통로 걷기: 끝의 계단까지 ----------
  function walkTunnel() {
    return new Promise((resolve) => {
      $('#walk-pad').hidden = false;
      const hint = $('#look-hint');
      hint.textContent = I18n.t('walk.hint');
      hint.hidden = false;
      Game.onHot = (id) => {
        Game.markSeen(id);
        Sound.play('select');
        toast(I18n.t(`hot.${id}`));
      };
      Game.walkMode(true, () => {
        $('#walk-pad').hidden = true;
        hint.hidden = true;
        $('#toast').hidden = true;
        Game.onHot = null;
        resolve();
      });
      setTimeout(() => {
        hint.hidden = true;
      }, 4000);
    });
  }

  // ---------- 익명 데이터 동의 ----------
  function consent() {
    return new Promise((resolve) => {
      $('#consent-screen').hidden = false;
      const pick = (yes) => {
        Sound.play('select');
        $('#consent-screen').hidden = true;
        resolve(yes);
      };
      $('#consent-yes').onclick = () => pick(true);
      $('#consent-no').onclick = () => pick(false);
    });
  }

  // ---------- 승객 등록: 이름(낱말 조합), 학년, 성별, 성적 수준 ----------
  function setup() {
    const sv = Data.survey;
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const save = Data.save;
    const nA = sv.nameParts.a.ko.length;
    const nB = sv.nameParts.b.ko.length;
    save.name = [Math.floor(Math.random() * nA), Math.floor(Math.random() * nB)];
    const showName = () => {
      $('#setup-name').textContent = Data.nameText();
    };
    showName();
    $('#setup-code').textContent = save.code;
    document.querySelectorAll('[data-name]').forEach((b) => {
      b.onclick = () => {
        const i = b.dataset.name === 'a' ? 0 : 1;
        const len = i ? nB : nA;
        save.name[i] = (save.name[i] + Number(b.dataset.step) + len) % len;
        Sound.play('blip');
        showName();
      };
    });
    $('#name-random').onclick = () => {
      save.name = [Math.floor(Math.random() * nA), Math.floor(Math.random() * nB)];
      Sound.play('select');
      showName();
    };
    const sel = $('#setup-grade');
    sel.innerHTML = `<option value="">${I18n.t('setup.choose')}</option>` + sv.grades.map((g) => `<option value="${g.id}">${g[L]}</option>`).join('');
    const picks = {};
    const seg = (box, list, key) => {
      box.innerHTML = '';
      list.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o[L];
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          picks[key] = o.id;
          box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          Sound.play('blip');
        };
        box.appendChild(b);
      });
    };
    seg($('#setup-gender'), sv.gender, 'gender');
    seg($('#setup-ach'), sv.achievement, 'achievement');
    $('#setup-error').hidden = true;
    $('#setup-screen').hidden = false;
    return new Promise((resolve) => {
      $('#setup-go').onclick = () => {
        if (!sel.value || !picks.gender || !picks.achievement) {
          $('#setup-error').hidden = false;
          Sound.play('poof');
          return;
        }
        save.profile = { grade: sel.value, gender: picks.gender, achievement: picks.achievement };
        Data.persist();
        Data.send('register', { name: save.name.join('-'), ...save.profile, consent: save.consent });
        Sound.play('start');
        $('#setup-screen').hidden = true;
        $('#portrait-name').textContent = Data.nameText();
        resolve();
      };
    });
  }

  // ---------- 설문: kind = pre | post | satisfaction ----------
  function survey(kind) {
    const sv = Data.survey;
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const items = kind === 'satisfaction' ? sv.satisfaction : sv.motivation;
    $('#survey-tag').textContent = I18n.t(`survey.${kind}Tag`);
    $('#survey-title').textContent = I18n.t(`survey.${kind}Title`);
    $('#survey-lead').textContent = I18n.t('survey.lead');
    const box = $('#survey-items');
    box.innerHTML = '';
    const ans = {};
    items.forEach((q) => {
      const row = document.createElement('div');
      row.className = 'q';
      row.innerHTML = '<div class="q-text"></div><div class="seg"></div>';
      row.querySelector('.q-text').textContent = q[L];
      const segEl = row.querySelector('.seg');
      sv.scale[L].forEach((label, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<b>${i + 1}</b><span></span>`;
        b.querySelector('span').textContent = label;
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          ans[q.id] = i + 1;
          segEl.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          Sound.play('blip');
        };
        segEl.appendChild(b);
      });
      box.appendChild(row);
    });
    $('#survey-error').hidden = true;
    $('#survey-screen').hidden = false;
    $('#survey-screen .form-panel').scrollTop = 0;
    return new Promise((resolve) => {
      $('#survey-go').onclick = () => {
        if (items.some((q) => !ans[q.id])) {
          $('#survey-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Data.save.answers[kind] = ans;
        Data.persist();
        Data.send(kind, ans);
        Sound.play('select');
        $('#survey-screen').hidden = true;
        resolve(ans);
      };
    });
  }

  // ---------- 시작: 동의 → 등록 → 사전 질문 → 1화 ----------
  async function start() {
    $('#title-screen').hidden = true;
    await Data.loadSurvey();
    const yes = await consent();
    Data.create(yes);
    await setup();
    await survey('pre');
    await ep1();
  }

  // ---------- 끝: 사후 질문 → 만족도 → 인사 ----------
  async function finish() {
    $('#clear-screen').hidden = true;
    await survey('post');
    await survey('satisfaction');
    Data.save.done.demo = true;
    Data.persist();
    $('#thanks-code').textContent = Data.save.code;
    $('#thanks-screen').hidden = false;
    Sound.play('clear');
  }

  // ---------- 1화: 첫차 ----------
  async function ep1() {
    await Game.fadeTo(1);

    // 꿈: 아침빛 속의 역. 누군가 부르다 끊긴다
    Game.scene('platform', { phase: 1 });
    Game.signName = I18n.t('scene.dreamSign');
    Game.dream(true);
    Game.setLids(0);
    Game.fadeTo(0);
    await Game.lids(0.55, 1200);
    await say([{ who: 'voice', key: 'ep1.d1' }, { who: 'voice', key: 'ep1.d2' }]);
    await Game.lids(0, 700);

    // 깨어남: 한밤의 이름 없는 역
    Game.dream(false);
    Game.signName = '';
    Game.phase(0);
    Sound.play('rumble');
    await sleep(700);
    await Game.lids(0.3, 260);
    await Game.lids(0, 220);
    await Game.lids(1, 800);
    $('#portrait').hidden = false;
    await say([n('ep1.n1'), n('ep1.n2'), n('ep1.n3'), n('ep1.n4')]);

    await lookAround();

    await say([n('ep1.board')]);
    Game.lookAt(480);
    await sleep(500);
    Sound.play('select');
    Game.novaEnter();
    await sleep(700);
    await say([
      nova('ep1.nova1'),
      {
        who: 'nova',
        key: 'ep1.nova2',
        choices: [
          { key: 'ep1.c1a', then: [nova('ep1.nova3a')] },
          { key: 'ep1.c1b', then: [nova('ep1.nova3b')] },
        ],
      },
      nova('ep1.nova4'),
      nova('ep1.nova5'),
      { do: () => Game.jamEnter(), wait: 900 },
      {
        who: 'jam',
        key: 'ep1.jam1',
        choices: [
          { key: 'ep1.c2a', then: [jam('ep1.jam2a'), nova('ep1.nova6a')] },
          { key: 'ep1.c2b', then: [jam('ep1.jam2b'), nova('ep1.nova6b')] },
        ],
      },
      { do: () => Game.jamLeave(), wait: 600 },
      nova('ep1.nova7'),
      nova('ep1.nova8'),
    ]);

    // 통로를 직접 걸어 반대편 승강장으로
    await Game.fadeTo(1);
    Game.scene('underpass');
    await Game.fadeTo(0);
    await walkTunnel();

    // 첫차 도착: 하늘이 아주 조금 밝아졌다
    await Game.fadeTo(1);
    Game.scene('arrival', { phase: 0.14 });
    await Game.fadeTo(0);
    Sound.play('rumble');
    await say([n('ep1.arrive1', { wait: 2600 }), nova('ep1.nova9'), nova('ep1.nova10')]);
    Sound.play('clear');
    Data.send('episode_complete', { episode: 1 });
    $('#clear-screen').hidden = false;
  }

  function showTitle() {
    Game.scene('title', { phase: 0 });
    Game.setLids(1);
    Game.fadeTo(0);
    $('#portrait').hidden = true;
    $('#clear-screen').hidden = true;
    $('#portrait-name').textContent = '???';
    $('#title-screen').hidden = false;
  }

  // ---------- 입력 ----------
  function bind() {
    document.querySelectorAll('[data-pick-lang]').forEach((b) =>
      b.addEventListener('click', async () => {
        Sound.unlock && Sound.unlock();
        await I18n.set(b.dataset.pickLang);
        Sound.play('select');
        $('#lang-screen').hidden = true;
        showTitle();
      })
    );
    $('#start-btn').addEventListener('click', () => {
      Sound.unlock && Sound.unlock();
      Sound.play('start');
      start();
    });
    $('#replay-btn').addEventListener('click', () => {
      Sound.play('select');
      finish();
    });
    $('#thanks-replay').addEventListener('click', () => {
      Sound.play('select');
      $('#thanks-screen').hidden = true;
      showTitle();
    });
    $('#look-left').addEventListener('click', () => Game.turn(-1));
    $('#look-right').addEventListener('click', () => Game.turn(1));
    const hold = (id, dir) => {
      const b = $(id);
      const on = (e) => {
        e.preventDefault();
        Game.key(dir, true);
      };
      const off = () => Game.key(dir, false);
      b.addEventListener('pointerdown', on);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
    };
    hold('#walk-left', 'left');
    hold('#walk-right', 'right');
    $('#sound-btn').addEventListener('click', () => {
      const on = !Sound.muted;
      Sound.setMuted ? Sound.setMuted(on) : (Sound.muted = on);
      $('#sound-btn').classList.toggle('off', on);
    });
    document.addEventListener('keydown', (e) => {
      if (e.repeat && (e.key === ' ' || e.key === 'Enter')) return;
      const lookOn = !$('#look-left').hidden;
      const walkOn = !$('#walk-pad').hidden;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (lookOn) Game.turn(-1);
        if (walkOn) Game.key('left', true);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (lookOn) Game.turn(1);
        if (walkOn) Game.key('right', true);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (walkOn && Game.nearPoster() && Game.onHot) {
          Game.onHot(Game.nearPoster().id);
          return;
        }
        if (!$('#dialog').hidden) {
          e.preventDefault();
          Story.advance();
        }
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') Game.key('left', false);
      if (e.key === 'ArrowRight' || e.key === 'd') Game.key('right', false);
    });
    window.addEventListener('resize', fit);
  }

  async function boot() {
    Game.init($('#game'));
    fit();
    Story.init();
    drawPortrait();
    bind();
    await I18n.init();
    Game.scene('title', { phase: 0 });
    Game.setLids(1);
    Game.fadeTo(0);
  }

  boot();
})();
