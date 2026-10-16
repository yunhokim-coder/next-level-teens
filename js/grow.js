// 6화 GROW: 노바가 옆에서 돕는다.
// G 목표(3화 종착역) → R 현실·O 탐색(노바와 코칭 대화, coach.js) → W 실행 계획(언제·어디서·무엇 + 만약 ~하면)
// 기기 안 아이디어 생성기: 낱말을 보고 우회 노선 카드를 고른다 (AI 도우미를 끈 학생, AI가 실패했을 때).
(function () {
  const $ = (sel) => document.querySelector(sel);
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  // ---------- 아이디어 생성: 낱말 → 태그·과목 → 카드 ----------
  const SUBJECTS = {
    ko: ['수학', '영어', '국어', '과학', '사회', '역사', '한국사', '물리', '화학', '생명', '지구과학', '영단어', '단어', '문법', '독서', '글쓰기', '코딩', '정보', '한자', '일본어', '중국어', '기술', '가정', '도덕', '지리', '경제'],
    en: ['math', 'english', 'korean', 'science', 'history', 'social', 'physics', 'chemistry', 'biology', 'vocab', 'words', 'grammar', 'reading', 'writing', 'coding', 'geography', 'economics', 'spanish', 'french', 'chinese', 'japanese'],
  };
  const KEYS = [
    { tags: ['focus'], ko: ['폰', '핸드폰', '휴대폰', '스마트폰', '숏폼', '쇼츠', '릴스', '유튜브', 'sns', '인스타', '틱톡', '게임', '알림', '카톡', '단톡', '집중', '딴짓', '산만', '멍'], en: ['phone', 'short', 'youtube', 'tiktok', 'insta', 'game', 'notification', 'focus', 'distract', 'scroll'] },
    { tags: ['start', 'motivation'], ko: ['미루', '미뤄', '시작', '귀찮', '의욕', '하기 싫', '안 하', '못 하겠', '게을'], en: ['procrastinat', 'start', 'lazy', 'later', 'motivat', "don't want"] },
    { tags: ['plan'], ko: ['계획', '시간', '관리', '일정', '스케줄', '루틴', '습관', '매일', '꾸준'], en: ['plan', 'time', 'schedule', 'routine', 'habit', 'every day', 'daily'] },
    { tags: ['method', 'plan'], ko: ['시험', '성적', '점수', '등급', '내신', '모의고사', '수능', '기말', '중간'], en: ['test', 'exam', 'grade', 'score', 'final', 'midterm'] },
    { tags: ['calm'], ko: ['불안', '긴장', '떨', '걱정', '스트레스', '무서', '겁', '번아웃', '지쳐', '힘들'], en: ['anxi', 'nervous', 'worr', 'stress', 'scared', 'burn', 'tired of'] },
    { tags: ['method'], ko: ['암기', '외우', '외워', '기억', '복습', '까먹', '이해', '개념', '문제', '풀이', '오답', '공부법', '노트', '필기'], en: ['memor', 'remember', 'review', 'forget', 'understand', 'concept', 'problem', 'mistake', 'notes', 'study method'] },
    { tags: ['calm', 'focus'], ko: ['잠', '수면', '피곤', '졸', '늦게 자', '밤'], en: ['sleep', 'tired', 'sleepy', 'late'] },
    { tags: ['selfworth'], ko: ['자신감', '비교', '못하', '자책', '바보', '재능', '열등'], en: ['confiden', 'compar', 'stupid', 'talent', 'not good'] },
    { tags: ['motivation'], ko: ['왜', '동기', '재미', '지루', '꿈', '진로', '목표'], en: ['why', 'boring', 'fun', 'dream', 'career', 'goal'] },
    { tags: ['relation'], ko: ['친구', '질문', '선생님', '물어', '같이', '혼자', '부모', '엄마', '아빠'], en: ['friend', 'ask', 'teacher', 'together', 'alone', 'parent'] },
    { tags: ['start', 'plan'], ko: ['숙제', '과제', '수행'], en: ['homework', 'assignment', 'project'] },
  ];

  function analyze(text) {
    const L = lang();
    const low = String(text).toLowerCase();
    const w = {};
    KEYS.forEach((k) => {
      if (k[L].concat(L === 'ko' ? k.en : []).some((word) => low.includes(word))) k.tags.forEach((t) => (w[t] = (w[t] || 0) + 1));
    });
    const subject = SUBJECTS[L].find((s) => low.includes(s)) || '';
    return { tags: w, subject };
  }

  // 점수: 글에서 찾은 태그(가장 큼) + 그림자 태그 + 5화에 썼던 카드 + 약간의 무작위
  function ideas(text, ctx, exclude = [], n = 6, tried = []) {
    const a = analyze(text);
    const triedW = {};
    tried.forEach((x) => (x.tags || []).forEach((tg) => (triedW[tg] = (triedW[tg] || 0) + (x.good ? 1.5 : -1))));
    const has = Object.keys(a.tags).length > 0;
    const shadowTags = {};
    ctx.mambas.forEach((m, i) => m.tags.forEach((t) => (shadowTags[t] = (shadowTags[t] || 0) + (i === 0 ? 2 : 1))));
    const used = ctx.detours.map((c) => c.id);
    const scored = Battle.data.cards
      .filter((c) => !exclude.includes(c.id))
      .map((c) => {
        let s = 0;
        c.tags.forEach((t) => {
          s += (a.tags[t] || 0) * 3;
          s += (shadowTags[t] || 0) * (has ? 0.4 : 1);
          s += triedW[t] || 0;
        });
        if (a.subject && c.tags.includes('method')) s += 1.2;
        if (used.includes(c.id)) s += 0.8;
        return { c, s: s + Math.random() * 1.5 };
      })
      .sort((x, y) => y.s - x.s);
    // 마음 노선·공부 노선이 고루 섞이게
    const out = [];
    let heart = 0;
    for (const x of scored) {
      if (out.length >= n) break;
      if (x.c.route === 'heart' && heart >= Math.ceil(n / 2)) continue;
      if (x.c.route === 'heart') heart++;
      out.push(x.c);
    }
    return { analysis: a, cards: out };
  }

  // 아이디어 문장: 과목이 있으면 앞에 붙인다. 예) 수학 · 책을 덮고 기억나는 걸 써 본다
  function ideaText(card, subject) {
    const L = lang();
    return subject && card.tags.includes('method') ? `${subject} · ${card[L].act}` : card[L].act;
  }

  // ---------- 노바 그리기 (작은 캔버스) ----------
  function paintNova() {
    const c = $('#grow-nova');
    if (c && Game.paintNova) Game.paintNova(c);
  }
  let tipTimer = null;
  function tip(key, vars = {}) {
    const el = $('#grow-tip');
    const text = Story.josa(Object.keys(vars).reduce((acc, k) => acc.split(`{${k}}`).join(vars[k]), I18n.t(key)));
    el.textContent = '';
    clearInterval(tipTimer);
    let i = 0;
    const chars = Array.from(text);
    tipTimer = setInterval(() => {
      el.textContent += chars[i++] || '';
      if (i >= chars.length) clearInterval(tipTimer);
    }, 18);
    paintNova();
  }

  const analyzeTags = (text) => Object.keys(analyze(text).tags);

  function chipRow(box, items, isOn, onTap) {
    box.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = it.label;
      b.setAttribute('aria-pressed', String(isOn(it.id)));
      b.onclick = () => onTap(it.id);
      box.appendChild(b);
    });
  }

  // ---------- GROW 화면 ----------
  // ctx = { dest, shadow, mambas[], detours[], color, prev }
  function run(ctx) {
    const L = lang();
    const prev = ctx.prev || {};
    const st = {
      r: null,
      text: (prev.o && prev.o.text) || '',
      shown: [],
      analysis: { tags: {}, subject: '' },
      picks: [], // { id } 또는 { own: '글' } 또는 { ai: {...} }
      rerolls: 0,
      generated: 0,
      aiCalls: 0,
      aiOk: 0,
      busy: false,
      crisis: false,
      tried: [],
      chat: {},
      aiTurns: 0,
      answered: 0,
      w: Object.assign({ pick: 0, days: [], time: null, place: null }, prev.w || {}),
      plan: Object.assign({ m: null, c: null }, prev.plan || {}),
    };
    const steps = ['g', 'r', 'o', 'w1', 'w2'];
    let step = 0;
    const pickLabel = (p) => (p.own ? p.own : p.ai ? p.ai.act : ideaText(Battle.card(p.id), p.subject || ''));
    const HEART = ['calm', 'selfworth', 'motivation', 'relation'];
    const same = (p, it) => (it.ai ? !!p.ai && p.ai.act === it.text : p.id === it.id);
    const DAYS = I18n.t('ep6.days').split('|');
    const TIMES = I18n.t('ep6.times').split('|');
    const PLACES = I18n.t('ep6.places').split('|');

    return new Promise((resolve) => {
      const body = $('#grow-body');
      const err = (msg) => {
        $('#grow-error').textContent = msg;
        $('#grow-error').hidden = false;
        Sound.play('poof');
      };
      const stepper = () => {
        const letter = steps[step][0];
        $('#grow-steps')
          .querySelectorAll('.gstep')
          .forEach((el) => {
            const k = el.dataset.k;
            const order = 'grow'.indexOf(k);
            const curOrder = 'grow'.indexOf(letter);
            el.classList.toggle('done', order < curOrder);
            el.classList.toggle('cur', order === curOrder);
          });
      };

      const renderG = () => {
        body.innerHTML = '';
        const h = document.createElement('div');
        h.className = 'grow-big';
        h.innerHTML = '<span class="grow-big-tag"></span><strong></strong>';
        h.querySelector('span').textContent = I18n.t('ep6.mapDest');
        h.querySelector('strong').textContent = ctx.dest;
        body.appendChild(h);
        tip('ep6.tipG', { dest: ctx.dest });
      };

      const renderW1 = () => {
        body.innerHTML = '';
        if (st.w.pick >= st.picks.length) st.w.pick = 0;
        const q = document.createElement('p');
        q.className = 'grow-q';
        q.textContent = I18n.t('ep6.wWhat');
        body.appendChild(q);
        const what = document.createElement('div');
        what.className = 'chips';
        chipRow(what, st.picks.map((p, i) => ({ id: i, label: pickLabel(p) })), (id) => id === st.w.pick, (id) => {
          st.w.pick = id;
          Sound.play('blip');
          renderW1();
        });
        body.appendChild(what);
        const add = (key, items, isOn, onTap) => {
          const p = document.createElement('p');
          p.className = 'grow-q';
          p.textContent = I18n.t(key);
          body.appendChild(p);
          const box = document.createElement('div');
          box.className = 'chips';
          chipRow(box, items, isOn, onTap);
          body.appendChild(box);
        };
        add('ep6.wWhen', DAYS.map((d, i) => ({ id: i, label: d })), (id) => st.w.days.includes(id), (id) => {
          const k = st.w.days.indexOf(id);
          if (k >= 0) st.w.days.splice(k, 1);
          else st.w.days.push(id);
          st.w.days.sort();
          Sound.play('blip');
          $('#grow-error').hidden = true;
          renderW1();
        });
        add('ep6.wTime', TIMES.map((d, i) => ({ id: i, label: d })), (id) => id === st.w.time, (id) => {
          st.w.time = id;
          Sound.play('blip');
          $('#grow-error').hidden = true;
          renderW1();
        });
        add('ep6.wWhere', PLACES.map((d, i) => ({ id: i, label: d })), (id) => id === st.w.place, (id) => {
          st.w.place = id;
          Sound.play('blip');
          $('#grow-error').hidden = true;
          renderW1();
        });
        const pv = document.createElement('p');
        pv.className = 'plan-preview';
        pv.textContent = actionSentence(st);
        body.appendChild(pv);
      };

      const renderW2 = () => {
        body.innerHTML = '';
        const q = document.createElement('p');
        q.className = 'grow-q';
        q.textContent = I18n.t('ep6.planIf');
        body.appendChild(q);
        const ifs = document.createElement('div');
        ifs.className = 'chips';
        chipRow(ifs, ctx.mambas.map((m) => ({ id: m.id, label: m[L].word })), (id) => id === st.plan.m, (id) => {
          st.plan.m = id;
          Sound.play('blip');
          $('#grow-error').hidden = true;
          renderW2();
        });
        body.appendChild(ifs);
        const q2 = document.createElement('p');
        q2.className = 'grow-q';
        q2.textContent = I18n.t('ep6.planThen');
        body.appendChild(q2);
        const thens = document.createElement('div');
        thens.className = 'chips';
        // 5화에 낸 카드 + O에서 고른 카드
        const ids = [];
        ctx.detours.map((c) => c.id).concat(st.picks.filter((p) => p.id).map((p) => p.id)).forEach((id) => {
          if (!ids.includes(id)) ids.push(id);
        });
        chipRow(thens, ids.map((id) => ({ id, label: Battle.card(id)[L].name })), (id) => id === st.plan.c, (id) => {
          st.plan.c = id;
          Sound.play('blip');
          $('#grow-error').hidden = true;
          renderW2();
        });
        body.appendChild(thens);
        const pv = document.createElement('p');
        pv.className = 'plan-preview';
        pv.textContent = actionSentence(st) + '\n' + ifSentence(st.plan);
        body.appendChild(pv);
      };

      const render = () => {
        $('#grow-error').hidden = true;
        stepper();
        const k = steps[step];
        $('#grow-title').textContent = I18n.t(`ep6.title_${k}`);
        $('#grow-back').hidden = step === 0;
        $('#grow-next').textContent = I18n.t(step === steps.length - 1 ? 'ep6.growDone' : 'ep6.growNext');
        if (k === 'g') renderG();
        if (k === 'r' || k === 'o') {
          tip(k === 'r' ? 'ep6.tipRChat' : 'ep6.tipOChat');
          Coach.stage(k, { body, tip, onDone: () => {} }, ctx, st);
        }
        if (k === 'w1') {
          renderW1();
          tip('ep6.tipW1');
        }
        if (k === 'w2') {
          renderW2();
          tip('ep6.tipW2', { name: ctx.shadow });
        }
        $('#grow-screen .form-panel').scrollTop = 0;
      };

      $('#grow-back').onclick = () => {
        Sound.play('blip');
        step = Math.max(0, step - 1);
        render();
      };
      $('#grow-next').onclick = () => {
        const k = steps[step];
        if ((k === 'r' || k === 'o') && !(st.chat[k] && st.chat[k].done)) return err(I18n.t('ep6.coachWait'));
        if (k === 'w1' && (!st.w.days.length || st.w.time === null || st.w.place === null)) return err(I18n.t('ep6.wError'));
        if (k === 'w2' && (!st.plan.m || !st.plan.c)) return err(I18n.t('ep6.planError'));
        if (step < steps.length - 1) {
          Sound.play('select');
          step++;
          render();
          return;
        }
        Sound.play('powerup');
        clearInterval(tipTimer);
        $('#grow-screen').hidden = true;
        resolve({
          r: st.r,
          tried: st.tried.map((x) => ({ text: x.text, good: x.good, idx: x.idx === undefined ? null : x.idx, aiEx: !!x.aiEx })),
          answered: st.answered,
          aiTurns: st.aiTurns,
          o: { text: st.text, picks: st.picks.slice(), tags: Object.keys(st.analysis.tags), subject: !!st.analysis.subject, generated: st.generated, rerolls: st.rerolls, ai: !!Data.save.aiConsent, aiCalls: st.aiCalls, aiOk: st.aiOk },
          w: Object.assign({}, st.w),
          plan: Object.assign({}, st.plan),
        });
      };
      render();
      $('#grow-screen').hidden = false;
    });
  }

  // "이번 주 월·수 저녁, 내 책상에서 ○○." (W 실행 문장)
  function actionSentence(s) {
    const L = lang();
    const p = s.picks[s.w.pick] || s.picks[0];
    if (!p) return '';
    const DAYS = I18n.t('ep6.days').split('|');
    const TIMES = I18n.t('ep6.times').split('|');
    const PLACES = I18n.t('ep6.places').split('|');
    const what = p.own ? p.own : p.ai ? p.ai.act : Battle.card(p.id)[L].act;
    const hasSubj = p.subject && p.id && Battle.card(p.id).tags.includes('method');
    const subj = hasSubj ? (L === 'en' ? ` (${p.subject})` : `${p.subject} `) : '';
    const days = s.w.days.length ? s.w.days.map((d) => DAYS[d]).join(I18n.t('ep6.daySep')) : '__';
    return I18n.t('ep6.actionSentence')
      .replace('{days}', days)
      .replace('{time}', s.w.time !== null && s.w.time !== undefined ? TIMES[s.w.time] : '__')
      .replace('{place}', s.w.place !== null && s.w.place !== undefined ? PLACES[s.w.place] : '__')
      .replace('{subject}', subj)
      .replace('{what}', what);
  }
  function ifSentence(pl) {
    const L = lang();
    const m = pl.m && Mamba.card(pl.m);
    const c = pl.c && Battle.card(pl.c);
    return Story.josa(I18n.t('ep6.planSentence').replace('{if}', m ? m[L].word : '______').replace('{then}', c ? c[L].act : '______'));
  }

  window.Grow = { run, ideas, analyze, analyzeTags, ideaText, actionSentence, ifSentence };
})();
