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

  // ---------- 미니 초상화: 2화 전에는 후드 실루엣과 ?, 그 뒤로는 내 캐릭터와 노선색 ----------
  function drawPortrait(avatar = null, color = null) {
    Chars.portrait($('#portrait-canvas'), avatar, color);
    $('#portrait').style.borderLeftColor = color || '';
  }

  // 초상화 옆 유형 표시: 1·2순위를 붙여서 (예: SC형)
  function showType(disc) {
    const el = $('#portrait-type');
    if (!disc) {
      el.hidden = true;
      return;
    }
    el.textContent = I18n.t('hud.type').replace('{code}', `${disc.primary}${disc.secondary || ''}`);
    el.style.setProperty('--ptype', Quiz.types[disc.primary].color);
    el.hidden = false;
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

  // ---------- 안내된 한 번의 클릭: 전광판을 누르면 이야기가 이어진다 ----------
  function tapBoard() {
    return new Promise((resolve) => {
      const hint = $('#look-hint');
      hint.textContent = I18n.t('look.hint');
      hint.hidden = false;
      Game.lookMode(true, 'board');
      Game.onHot = (id) => {
        if (id !== 'board') return;
        Game.markSeen(id);
        Game.onHot = null;
        Game.lookMode(false);
        hint.hidden = true;
        Sound.play('select');
        resolve();
      };
    });
  }

  // ---------- 통로 걷기: 끝의 계단까지 ----------
  function walkTunnel(hintKey = 'walk.hint') {
    return new Promise((resolve) => {
      $('#walk-pad').hidden = false;
      const hint = $('#look-hint');
      hint.textContent = I18n.t(hintKey);
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
  // 등록과 사전 질문까지 마친 저장이 있는지
  const hasRun = () => {
    const sv = Data.load();
    return !!(sv && sv.profile && sv.profile.grade && sv.answers && sv.answers.pre);
  };

  // 저장된 승객으로 돌아왔을 때: 이름, 캐릭터, 노선색을 되살린다
  function restore() {
    const sv = Data.save;
    $('#portrait-name').textContent = Data.nameText();
    $('#portrait').hidden = false;
    if (sv.disc && Quiz.types[sv.disc.primary]) {
      const tp = Quiz.types[sv.disc.primary];
      Game.setChar(sv.avatar || null, tp.color);
      drawPortrait(sv.avatar || null, tp.color);
      showType(sv.disc);
    }
    if (sv.ep3 && sv.ep3.dest) showDest(sv.ep3.dest);
  }

  // 시작: 이어하기면 노선도로, 처음이면 동의 → 등록 → 사전 질문 → 1화
  async function start(fresh = false) {
    $('#title-screen').hidden = true;
    await Data.loadSurvey();
    await Quiz.load();
    if (!fresh && hasRun()) {
      restore();
      showMap();
      return;
    }
    const yes = await consent();
    Data.create(yes);
    await setup();
    await survey('pre');
    await ep1();
  }

  // ---------- 노선도 (목차) ----------
  const STOPS = [1, 2, 3, 4, 5, 6];
  function showMap() {
    const sv = Data.save;
    const done = sv.done || {};
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const color = sv.disc && Quiz.types[sv.disc.primary] ? Quiz.types[sv.disc.primary].color : '';
    $('#map-screen .map-panel').style.setProperty('--mapc', color || 'var(--line)');
    $('#map-title').textContent = I18n.t('map.title').replace('{name}', Data.nameText());
    // 다음 역: 아직 안 깬 역 중 첫 번째 (앞 역을 모두 깼을 때만 열림)
    const next = STOPS.find((n) => !done[n]);
    const list = $('#map-list');
    list.innerHTML = '';
    STOPS.forEach((n) => {
      const ready = READY.includes(n);
      const state = done[n] ? 'done' : n === next && ready ? 'next' : 'locked';
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `map-stop ${state}`;
      b.innerHTML = '<span class="dot"></span><span class="info"><span class="no"></span><span class="name"></span><span class="state"></span></span>';
      b.querySelector('.dot').textContent = state === 'done' ? '✓' : state === 'locked' ? '🔒' : '';
      b.querySelector('.no').textContent = `STOP ${n}`;
      b.querySelector('.name').textContent = I18n.t(`map.stop${n}`);
      b.querySelector('.state').textContent = I18n.t(state === 'done' ? 'map.replay' : state === 'next' ? 'map.go' : ready ? 'map.locked' : 'map.soon');
      if (state === 'locked') b.disabled = true;
      else
        b.onclick = () => {
          Sound.play('start');
          $('#map-screen').hidden = true;
          EPISODES[n]();
        };
      li.appendChild(b);
      list.appendChild(li);
    });
    // 지금 열린 역을 다 깼고 사후 질문을 아직 안 했으면 마지막 질문 버튼
    const allReady = READY.every((n) => done[n]);
    $('#map-survey').hidden = !(allReady && !(sv.answers && sv.answers.post));
    $('#map-survey').onclick = () => {
      Sound.play('select');
      $('#map-screen').hidden = true;
      finish();
    };
    $('#portrait').hidden = false;
    $('#map-screen').hidden = false;
  }

  // ---------- 끝: 사후 질문 → 만족도 → 인사 ----------
  async function finish() {
    $('#clear-screen').hidden = true;
    $('#map-screen').hidden = true;
    await survey('post');
    await survey('satisfaction');
    Data.save.done.demo = true;
    Data.persist();
    $('#thanks-code').textContent = Data.save.code;
    $('#thanks-routemap').hidden = !(Data.save.ep6 && Data.save.ep6.grow);
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
    await say([n('ep1.n1'), n('ep1.n2'), n('ep1.n3'), { who: 'narrator', key: 'ep1.n4', do: () => Game.lookAt(800), wait: 900 }]);

    await tapBoard();

    await say([n('ep1.board')]);
    await sleep(300);
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
    await stopClear(1);
  }

  // ---------- 역 클리어: 다음 역이 있으면 이어서, 없으면 마지막 질문으로 ----------
  const READY = [1, 2, 3, 4, 5, 6];
  function stopClear(ep) {
    Sound.play('clear');
    const replay = !!Data.save.done[ep];
    Data.save.done[ep] = true;
    Data.persist();
    Data.send('episode_complete', { episode: ep, replay });
    // 다음 역이 열려 있고 아직 안 깼으면 다음 역, 열린 역을 다 깼는데 사후 질문 전이면 마지막 질문, 그 밖에는 노선도
    const nextReady = READY.includes(ep + 1) && !Data.save.done[ep + 1];
    const needSurvey = READY.every((n) => Data.save.done[n]) && !(Data.save.answers && Data.save.answers.post);
    const action = nextReady ? 'next' : needSurvey ? 'survey' : 'map';
    $('#clear-stop').textContent = `STOP ${ep}`;
    $('#clear-title').textContent = I18n.t(`clear.ep${ep}.title`);
    $('#clear-next').textContent = I18n.t(`clear.ep${ep}.next`);
    $('#clear-demo').hidden = READY.includes(ep + 1) || ep === STOPS[STOPS.length - 1];
    $('#replay-btn').textContent = I18n.t(action === 'next' ? 'clear.toNext' : action === 'survey' ? 'clear.toSurvey' : 'map.open');
    $('#clear-map').hidden = action === 'map';
    $('#clear-screen').hidden = false;
    return new Promise((resolve) => {
      $('#replay-btn').onclick = () => {
        Sound.play('select');
        $('#clear-screen').hidden = true;
        resolve();
        if (action === 'next') EPISODES[ep + 1]();
        else if (action === 'survey') finish();
        else showMap();
      };
      $('#clear-map').onclick = () => {
        Sound.play('select');
        $('#clear-screen').hidden = true;
        resolve();
        showMap();
      };
    });
  }

  // ---------- 2화: 탑승 캐릭터 ----------
  function showResult(res) {
    const types = Quiz.types;
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const tp = types[res.primary];
    const t2 = types[res.secondary];
    $('#result-line').textContent = tp[L].line;
    $('#result-line').style.color = tp.color;
    $('#result-screen .result-panel').style.borderTopColor = tp.color;
    Chars.portrait($('#result-canvas'), res.primary, tp.color);
    $('#result-name').textContent = tp[L].name;
    $('#result-animal').textContent = I18n.t('result.type').replace('{code}', res.primary);
    $('#result-summary').textContent = tp[L].summary;
    $('#result-strengths').textContent = tp[L].strengths.join(' · ');
    $('#result-watch').textContent = tp[L].watch;
    $('#result-study').textContent = tp[L].study;
    $('#result-mix').textContent = I18n.t('result.mixText').replace('{name}', t2[L].name);
    $('#result-screen').hidden = false;
    Sound.play('powerup');
    return new Promise((resolve) => {
      $('#result-go').onclick = () => {
        Sound.play('select');
        $('#result-screen').hidden = true;
        resolve();
      };
    });
  }

  function pickAvatar(color) {
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const box = $('#avatar-options');
    box.innerHTML = '';
    return new Promise((resolve) => {
      Chars.ANIMALS.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'avatar-opt';
        const c = document.createElement('canvas');
        c.width = 24;
        c.height = 32;
        Chars.portrait(c, a, color);
        b.appendChild(c);
        const label = document.createElement('span');
        label.textContent = Quiz.types.avatars[a][L];
        b.appendChild(label);
        b.onclick = () => {
          Sound.play('select');
          $('#avatar-screen').hidden = true;
          resolve(a);
        };
        box.appendChild(b);
      });
      $('#avatar-screen').hidden = false;
    });
  }

  async function ep2() {
    await Game.fadeTo(1);
    Game.scene('train', { phase: 0.2 });
    Game.novaSit(292);
    await Game.fadeTo(0);
    await say([n('ep2.n1'), nova('ep2.nova1'), nova('ep2.nova2'), nova('ep2.nova3')]);

    const res = await Quiz.run();
    Data.save.disc = res;
    Data.persist();
    Data.send('disc_result', {
      answers: res.answers.join(''),
      scores: ['D', 'I', 'S', 'C'].map((k) => `${k}${res.scores[k]}`).join(' '),
      primary: res.primary,
      secondary: res.secondary,
    });

    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const tp = Quiz.types[res.primary];
    // 성향 결과: 사람 역할 캐릭터 카드, 노선색 확정
    await say([nova('ep2.nova4')]);
    await showResult(res);
    showType(res);
    // 겉모습: 성향과 상관없이 마음에 드는 동물을 고른다 (옷은 내 노선색)
    await say([nova('ep2.nova5', { vars: { line: tp[L].line } }), nova('ep2.nova6')]);
    const avatar = await pickAvatar(tp.color);
    Data.save.avatar = avatar;
    Data.persist();
    Data.send('avatar', { avatar });
    // 터널: 어두운 창에 고른 모습이 비친다
    await say([nova('ep2.nova7'), { who: 'narrator', key: 'ep2.tunnel', do: () => { Game.tunnel(true); Sound.play('rumble'); }, wait: 1800 }]);
    Game.setChar(avatar, tp.color);
    Game.reflect(1);
    await sleep(2600);
    await say([n('ep2.reflect1'), n('ep2.reflect2')]);
    drawPortrait(avatar, tp.color);
    Game.tunnel(false);
    Game.reflect(0);
    await sleep(900);
    await say([nova('ep2.nova8')]);
    await stopClear(2);
  }

  // ---------- 3화: 종착역 ----------
  // 승차권·전광판에 들어갈 짧은 이름 (너무 길면 줄임)
  const shortName = (s) => (s.length > 10 ? `${s.slice(0, 9)}…` : s);

  function showDest(dest) {
    Game.destName = dest && dest.id !== 'unknown' ? shortName(dest.label) : '';
    Game.ticketTo = dest ? shortName(dest.label) : '';
  }

  async function ep3() {
    await Station.load();
    await Game.fadeTo(1);
    Game.scene('hub', { phase: 0.5 });
    Game.novaSit(292);
    showDest(null);
    await Game.fadeTo(0);
    await say([n('ep3.n1'), nova('ep3.nova1'), nova('ep3.nova2'), nova('ep3.nova3')]);

    const prev = Data.save.ep3 || {};
    const dest = await Station.pickDest(prev.dest);
    showDest(dest);
    Sound.play('powerup');
    await sleep(500);
    await say([
      dest.id === 'unknown' ? nova('ep3.destFog') : nova('ep3.destSet', { vars: { dest: dest.label } }),
      nova('ep3.nova4'),
    ]);

    const checked = await Station.fuelCheck();
    const fuel = Station.gauges(checked);
    await Station.showGauge(fuel);
    const main = fuel.main;
    const comment = !main.length ? 'ep3.fuelNone' : main.includes('pressure') && main.length === 1 ? 'ep3.fuel_pressure' : `ep3.fuel_${main.find((m) => m !== 'pressure') || main[0]}`;
    await say([nova(comment), nova('ep3.nova5')]);

    const util = await Station.utility(dest);
    // 기기에는 다 저장, 전송은 선택지 번호만 (직접 쓴 글 제외)
    Data.save.ep3 = { dest: { id: dest.id, label: dest.label, own: dest.own || '' }, fuel: checked, count: fuel.count, main, util: util.ids, utilOwn: util.own };
    Data.persist();
    Data.send('ep3_result', {
      destination: dest.id,
      riasec: dest.riasec || '',
      fuel: checked.join(','),
      counts: Station.data.gauges.map((gg) => `${gg.id}:${fuel.count[gg.id]}`).join(' '),
      main: main.join(','),
      utility: util.ids.join(','),
      utility_own: util.own ? 1 : 0,
    });
    await say([nova('ep3.nova6'), nova('ep3.nova7')]);
    await stopClear(3);
  }

  // ---------- 4화: 운행 방해 (3인칭) ----------
  async function ep4() {
    await Mamba.load();
    const sv = Data.save;
    const color = sv.disc && Quiz.types[sv.disc.primary] ? Quiz.types[sv.disc.primary].color : null;
    // 달리던 열차가 갑자기 멈춘다 (1인칭)
    await Game.fadeTo(1);
    Game.scene('train', { phase: 0.6 });
    Game.setChar(sv.avatar || null, color);
    await Game.fadeTo(0);
    await say([n('ep4.t1'), n('ep4.t2')]);
    Game.brake();
    Sound.play('screech');
    await sleep(900);
    Sound.play('crash');
    await say([
      { who: 'narrator', key: 'ep4.t3', wait: 600 },
      { who: 'narrator', key: 'ep4.t4', do: () => Sound.play('alarm') },
      nova('ep4.t5'),
    ]);
    // 밖으로 나가 보니 (3인칭)
    await Game.fadeTo(1);
    Game.scene('track', { phase: 0.65 });
    Game.setChar(sv.avatar || null, color);
    Game.alarm(true);
    await Game.fadeTo(0);
    await say([n('ep4.n1'), n('ep4.n2')]);
    // 직접 걸어서 열차 앞쪽으로
    await walkTunnel('walk.hintTrack');
    Sound.play('rumble');
    Game.shadow(0.7, 3);
    Game.quake(0.6);
    await sleep(1200);
    Game.novaSit(262);
    await say([n('ep4.n3'), nova('ep4.nova1'), nova('ep4.nova2')]);

    const prev = sv.ep4 || {};
    const ids = await Mamba.pick(prev.cards || []);
    const freq = await Mamba.frequency(ids, prev.freq || {});
    Game.alarm(false);
    // 고른 것들이 모여 그림자가 커진다
    Game.shadow(1, ids.length);
    Sound.play('rumble');
    await sleep(1400);
    await say([n('ep4.grow'), nova('ep4.nova3')]);
    const named = await Mamba.name(ids, freq, prev);
    Game.shadowName = named.full;
    Sound.play('powerup');
    await sleep(800);
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const top = Mamba.card(Mamba.byFrequency(ids, freq)[0]);
    await say([
      { who: 'shadow', name: named.full, key: 'ep4.shadow1', vars: { name: named.full, desc: top[L].desc } },
      nova('ep4.nova4', { vars: { name: named.full } }),
      nova('ep4.nova5', { vars: { name: named.full } }),
    ]);
    // 이름이 불리자 그림자가 날뛰며 선로를 부순다
    Game.shadow(1.15);
    Sound.play('rumble');
    Game.quake(0.8);
    await say([{ who: 'shadow', name: named.full, key: 'ep4.shadow2', wait: 300 }]);
    Game.wreck();
    Sound.play('crash');
    await sleep(500);
    Game.shadow(0.12);
    await sleep(1600);
    await say([n('ep4.n4'), nova('ep4.nova6', { vars: { name: named.full } }), nova('ep4.nova7')]);
    Data.save.ep4 = { cards: ids, freq, name: named.name, full: named.full, idea: named.idea };
    Data.persist();
    Data.send('ep4_result', {
      cards: ids.join(','),
      heart: ids.filter((id) => Mamba.card(id).category === 'heart').length,
      thought: ids.filter((id) => Mamba.card(id).category === 'thought').length,
      action: ids.filter((id) => Mamba.card(id).category === 'action').length,
      freq: ids.map((id) => `${id}:${freq[id]}`).join(' '),
      named: named.idea >= 0 ? `idea${named.idea}` : 'own',
    });
    await stopClear(4);
  }

    // ---------- 5화: 우회 노선 배틀 (1인칭) ----------
  async function ep5() {
    await Promise.all([Mamba.load(), Battle.load()]);
    const sv = Data.save;
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const color = sv.disc && Quiz.types[sv.disc.primary] ? Quiz.types[sv.disc.primary].color : null;
    const e4 = sv.ep4 && sv.ep4.cards && sv.ep4.cards.length ? sv.ep4 : { cards: [31, 16, 1], freq: {}, name: I18n.t('ep5.fallbackName') };
    const attacks = Mamba.byFrequency(e4.cards, e4.freq || {});
    const full = Mamba.join(Mamba.card(attacks[0])[L].word, e4.name);
    await Game.fadeTo(1);
    Game.scene('battle', { phase: 0.78 });
    Game.setChar(sv.avatar || null, color);
    Game.shadowName = full;
    await Game.fadeTo(0);
    await say([n('ep5.n1'), n('ep5.n2')]);
    Sound.play('rumble');
    Game.shadow(1, attacks.length);
    Game.attack();
    await sleep(1100);
    Game.hp(1);
    await say([
      { who: 'shadow', name: full, key: 'ep5.shadow0' },
      nova('ep5.tut1'),
      nova('ep5.tut2'),
      nova('ep5.tut3'),
    ]);

    const taunts = I18n.t('ep5.taunts').split('|');
    const hand = [];
    const used = [];
    const turns = [];
    let hp = 1;
    for (let i = 0; i < attacks.length; i++) {
      const m = Mamba.card(attacks[i]);
      Game.attack();
      Sound.play('rumble');
      await sleep(500);
      await say([{ who: 'shadow', name: full, key: 'ep5.attackLine', vars: { desc: m[L].desc, taunt: taunts[i % taunts.length] } }]);
      Battle.deal(hand, used, m.tags);
      const { id, browsed } = await Battle.choose(m, hand, used);
      used.push(id);
      if (hand.includes(id)) hand.splice(hand.indexOf(id), 1);
      const c = Battle.card(id);
      const hitTags = Battle.overlap(c.tags, m.tags);
      const hit = hitTags.length > 0;
      Game.beam(c.route === 'heart' ? '#ff8fb8' : '#5ee0c8', hit);
      Sound.play(hit ? 'powerup' : 'sparkle');
      hp -= (hit ? 1 : 0.5) / attacks.length;
      Game.hp(Math.max(0.06, hp));
      Game.detour(((i + 1) / attacks.length) * 0.9);
      await sleep(1000);
      const vars = { card: c[L].name, word: m[L].word, tags: Battle.tagNames(hit ? hitTags : m.tags) };
      await say([nova(hit ? 'ep5.hit' : 'ep5.miss', { vars })].concat(i === 0 ? [nova('ep5.tut4')] : []));
      turns.push({ m: m.id, c: id, hit, browsed });
    }

    // 우회 선로 완성: 불이 들어오고 그림자는 작아진다
    Game.hp(0);
    Game.shadow(0.3);
    Game.detourLit(true);
    Sound.play('clear');
    await sleep(1200);
    await say([
      n('ep5.end1'),
      { who: 'shadow', name: full, key: 'ep5.shadowEnd' },
      nova('ep5.end2', { vars: { name: full } }),
      nova('ep5.end3'),
    ]);
    await Battle.summary(turns, Mamba.card);
    await say([nova('ep5.end4')]);
    // 완성된 우회 선로로 내 열차가 지나간다
    Game.hp(0, false);
    Game.trainRun();
    Sound.play('rumble');
    await say([n('ep5.trainRun', { wait: 4200 })]);
    await Game.fadeTo(1);
    Data.save.ep5 = { turns };
    Data.persist();
    Data.send('ep5_result', {
      turns: turns.map((tn) => `${tn.m}>${tn.c}:${tn.hit ? 1 : 0}${tn.browsed ? 'd' : ''}`).join(' '),
      total: turns.length,
      hits: turns.filter((tn) => tn.hit).length,
      deck: turns.filter((tn) => tn.browsed).length,
      heart: turns.filter((tn) => Battle.card(tn.c).route === 'heart').length,
      study: turns.filter((tn) => Battle.card(tn.c).route === 'study').length,
    });
    await stopClear(5);
  }

  // ---------- 6화: 노선도 완성 (GROW + 실행 의도) ----------
  // 앞 화에서 모은 것: 종착역(G), 그림자(R), 우회 노선 카드
  function story6() {
    const sv = Data.save;
    const L = I18n.lang === 'en' ? 'en' : 'ko';
    const dest = sv.ep3 && sv.ep3.dest ? sv.ep3.dest : null;
    const destLabel = dest && dest.id !== 'unknown' ? dest.label : I18n.t('ep3.fogStation');
    const e4 = sv.ep4 && sv.ep4.cards && sv.ep4.cards.length ? sv.ep4 : { cards: [31, 16, 1], freq: {}, name: I18n.t('ep5.fallbackName') };
    const order = Mamba.byFrequency(e4.cards, e4.freq || {});
    const shadow = Mamba.join(Mamba.card(order[0])[L].word, e4.name);
    const turns = sv.ep5 && sv.ep5.turns ? sv.ep5.turns : [];
    const ids = [];
    turns.filter((tn) => tn.hit).concat(turns.filter((tn) => !tn.hit)).forEach((tn) => {
      if (!ids.includes(tn.c)) ids.push(tn.c);
    });
    const detours = ids.length ? ids : [24, 21, 28];
    return { L, destLabel, order, shadow, detours };
  }
  // 프로필 카드: 겉모습, DISC 1·2순위, 강점, 연료 게이지, 공부 팁, 종착역
  function profileInfo(st, color) {
    const sv = Data.save;
    const L = st.L;
    const d = sv.disc || null;
    const tp = d && Quiz.types[d.primary] ? Quiz.types[d.primary] : null;
    const t2 = d && d.secondary && Quiz.types[d.secondary] ? Quiz.types[d.secondary] : null;
    const gauges = (Station.data && Station.data.gauges) || [];
    const count = (sv.ep3 && sv.ep3.count) || {};
    const main = (sv.ep3 && sv.ep3.main) || [];
    return {
      passenger: Data.nameText(),
      code: d ? I18n.t('hud.type').replace('{code}', `${d.primary}${d.secondary || ''}`) : '',
      avatar: sv.avatar || null,
      color,
      line: tp ? tp[L].line : '',
      primary: tp ? tp[L].name : '',
      secondary: t2 ? t2[L].name : '',
      strengths: tp ? tp[L].strengths : [],
      study: tp ? tp[L].study : '',
      fuels: gauges.map((g) => ({ label: g[L], color: g.color, n: count[g.id] || 0, main: main.includes(g.id) })),
      dest: st.destLabel,
    };
  }
  // 노선도 역: 위 G 종착역 → W 이번 주 실행 → O 찾은 방법들 → 아래 R 출발역(지금 나)
  function routeStops(st, e6) {
    const L = st.L;
    const g = e6.grow;
    const label = (p) => (p.own ? p.own : Grow.ideaText(Battle.card(p.id), p.subject || ''));
    const DAYS = I18n.t('ep6.days').split('|');
    const TIMES = I18n.t('ep6.times').split('|');
    const PLACES = I18n.t('ep6.places').split('|');
    const wp = g.o.picks[g.w.pick] || g.o.picks[0];
    const when = `${g.w.days.map((d) => DAYS[d]).join(I18n.t('ep6.daySep'))} ${TIMES[g.w.time]} · ${PLACES[g.w.place]}`;
    const stops = [{ letter: 'G', tag: I18n.t('ep6.mapDest'), name: st.destLabel, big: true }];
    stops.push({ letter: 'W', tag: `${I18n.t('ep6.mapW')} · ${when}`, name: wp.own ? wp.own : Grow.ideaText(Battle.card(wp.id), wp.subject || '') });
    g.o.picks.forEach((p, i) => {
      if (i !== g.w.pick) stops.push({ letter: 'O', tag: I18n.t('ep6.mapO'), name: label(p) });
    });
    stops.push({ letter: 'R', tag: I18n.t('ep6.mapR').replace('{n}', g.r), name: e6.station, big: true });
    return stops;
  }
  function routeInfo() {
    const sv = Data.save;
    const st = story6();
    const color = sv.disc && Quiz.types[sv.disc.primary] ? Quiz.types[sv.disc.primary].color : null;
    const e6 = sv.ep6;
    return {
      passenger: Data.nameText(),
      type: sv.disc ? I18n.t('hud.type').replace('{code}', `${sv.disc.primary}${sv.disc.secondary || ''}`) : '',
      avatar: sv.avatar || null,
      color,
      stops: routeStops(st, e6),
      shadow: st.shadow,
      plan: Grow.ifSentence(e6.grow.plan),
      detours: st.detours.map((id) => Battle.card(id)[st.L].name),
      profile: profileInfo(st, color),
    };
  }

  async function ep6() {
    await Promise.all([Mamba.load(), Battle.load(), Station.load(), Quiz.load()]);
    const sv = Data.save;
    const st = story6();
    const color = sv.disc && Quiz.types[sv.disc.primary] ? Quiz.types[sv.disc.primary].color : null;
    await Game.fadeTo(1);
    Game.scene('platform', { phase: 0.8 });
    Game.setChar(sv.avatar || null, color);
    if (sv.ep3 && sv.ep3.dest) showDest(sv.ep3.dest);
    Game.boardDest = st.destLabel.length > 12 ? `${st.destLabel.slice(0, 11)}…` : st.destLabel;
    Game.signName = '';
    Game.lookAt(480);
    await Game.fadeTo(0);
    Sound.play('rumble');
    await say([n('ep6.n1'), n('ep6.n2')]);
    Sound.play('select');
    Game.novaEnter();
    await sleep(700);
    await say([
      nova('ep6.nova1'),
      nova('ep6.growIntro'),
    ]);
    const prev = sv.ep6 || {};
    const gw = await Grow.run({
      dest: st.destLabel,
      shadow: st.shadow,
      mambas: st.order.map((id) => Mamba.card(id)),
      detours: st.detours.map((id) => Battle.card(id)),
      color,
      prev: prev.grow,
    });
    await say([nova('ep6.wDone', { vars: { plan: Grow.actionSentence({ picks: gw.o.picks, w: gw.w }) } }), nova('ep6.s1')]);
    const short = st.destLabel.length > 8 ? st.destLabel.slice(0, 8) : st.destLabel;
    const ideas = I18n.t('ep6.stationIdeas').split('|').map((x) => x.replace('{dest}', short));
    const named = await Finale.station(ideas, prev.station);

    // 이름판에 이름이 들어가고 해가 뜬다
    Game.signName = named.name;
    Sound.play('sparkle');
    for (let p = 0.8; p <= 1.0001; p += 0.02) {
      Game.phase(p);
      await sleep(50);
    }
    Sound.play('powerup');
    await say([
      n('ep6.signLit', { vars: { name: named.name } }),
      nova('ep6.nova2', { vars: { station: named.name, dest: st.destLabel } }),
      nova('ep6.nova3'),
    ]);
    Data.save.ep6 = { grow: gw, station: named.name };
    Data.persist();
    const pl = gw.plan;
    const hit = Battle.overlap(Battle.card(pl.c).tags, Mamba.card(pl.m).tags).length > 0;
    const wp = gw.o.picks[gw.w.pick] || gw.o.picks[0];
    Data.send('ep6_result', {
      r: gw.r,
      o_tags: gw.o.tags.join(','),
      o_subject: gw.o.subject ? 1 : 0,
      o_generated: gw.o.generated,
      o_rerolls: gw.o.rerolls,
      o_picks: gw.o.picks.map((p) => (p.own ? 'own' : p.id)).join(','),
      w_pick: wp.own ? 'own' : wp.id,
      w_days: gw.w.days.length,
      w_time: gw.w.time,
      w_place: gw.w.place,
      plan: `${pl.m}>${pl.c}`,
      plan_hit: hit ? 1 : 0,
      named: named.idea >= 0 ? `idea${named.idea}` : 'own',
    });
    await Finale.show(routeInfo(), (fmt) => Data.send('routemap', { format: fmt }));

    // 첫 열차가 해를 향해 출발한다
    await Game.fadeTo(1);
    Game.scene('arrival', { phase: 1, leave: true });
    await Game.fadeTo(0);
    Sound.play('rumble');
    await say([n('ep6.depart', { wait: 3200 }), nova('ep6.last')]);
    await stopClear(6);
  }

  const EPISODES = { 1: () => ep1(), 2: () => ep2(), 3: () => ep3(), 4: () => ep4(), 5: () => ep5(), 6: () => ep6() };

  function showTitle() {
    Game.scene('title', { phase: 0 });
    Game.setLids(1);
    Game.fadeTo(0);
    $('#portrait').hidden = true;
    $('#clear-screen').hidden = true;
    $('#map-screen').hidden = true;
    $('#new-btn').hidden = !hasRun();
    $('#start-btn').textContent = I18n.t(hasRun() ? 'title.continue' : 'title.start');
    $('#portrait-name').textContent = '???';
    Game.setChar(null, null);
    drawPortrait();
    showType(null);
    Game.destName = '';
    Game.ticketTo = '';
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
    $('#new-btn').addEventListener('click', () => {
      Sound.unlock && Sound.unlock();
      Sound.play('start');
      start(true);
    });
    $('#thanks-routemap').addEventListener('click', async () => {
      Sound.play('select');
      $('#thanks-screen').hidden = true;
      await Promise.all([Mamba.load(), Battle.load(), Station.load(), Quiz.load()]);
      await Finale.show(routeInfo(), (fmt) => Data.send('routemap', { format: fmt, replay: true }));
      $('#thanks-screen').hidden = false;
    });
    $('#thanks-replay').addEventListener('click', () => {
      Sound.play('select');
      $('#thanks-screen').hidden = true;
      showMap();
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
