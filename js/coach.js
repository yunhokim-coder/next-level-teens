// 6화 R·O 코칭 대화: 노바가 심리 코치처럼 한 번에 하나씩 묻고, 학생 말을 되짚고(반영), 노력을 인정하고, 다음 질문을 한다.
// 동기강화상담의 OARS(열린 질문·인정·반영·요약)와 해결중심 질문(척도, "0이 아니라 n인 건 뭐 덕분이야?")을 따른다.
// AI 도우미를 켠 학생은 노바의 말이 Claude로 만들어지고, 끄면 정해진 문장으로 같은 흐름을 간다.
// 학생 글은 기기에만 저장한다 (AI를 켰을 때만 AI로 보낸다. 시트로는 보내지 않는다).
(function () {
  const $ = (sel) => document.querySelector(sel);
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fill = (str, vars = {}) => Story.josa(Object.keys(vars).reduce((acc, k) => acc.split(`{${k}}`).join(vars[k]), str));
  const t = (key, vars) => fill(I18n.t(key), vars);

  // 해 본 것 예시 (AI를 끈 학생용 고정 목록)
  const TRIED = [
    { tags: ['plan'], ko: '계획표 짜기', en: 'Making a study plan' },
    { tags: ['method'], ko: '인강·학원 다니기', en: 'Online classes or cram school' },
    { tags: ['method'], ko: '문제집 많이 풀기', en: 'Doing lots of workbook problems' },
    { tags: ['focus'], ko: '폰 멀리 두기', en: 'Keeping my phone away' },
    { tags: ['relation'], ko: '친구랑 같이 공부', en: 'Studying with friends' },
    { tags: ['method'], ko: '오답 노트', en: 'Mistake notes' },
    { tags: ['plan'], ko: '시험 전 벼락치기', en: 'Cramming before tests' },
    { tags: ['calm', 'focus'], ko: '일찍 자기', en: 'Going to bed early' },
    { tags: ['focus'], ko: '도서관·스터디카페 가기', en: 'Going to a library or study cafe' },
    { tags: ['focus', 'start'], ko: '타이머 켜고 공부', en: 'Studying with a timer' },
    { tags: ['relation'], ko: '선생님께 질문하기', en: 'Asking teachers' },
    { tags: ['motivation'], ko: '목표 적어 두기', en: 'Writing down my goal' },
  ];

  // st.chat[kind] = { log:[{who, text}], done }
  function stage(kind, ui, ctx, st) {
    const L = lang();
    const chat = (st.chat[kind] = st.chat[kind] && st.chat[kind].done ? st.chat[kind] : { log: [], done: false });
    const body = ui.body;
    body.innerHTML = '';

    // AI 도우미 스위치 (켜면 이 역의 대화가 AI로 간다)
    if (Ai.on()) body.appendChild(aiSwitch(ui, kind !== 'g'));
    const log = document.createElement('div');
    log.className = 'coach-log';
    body.appendChild(log);
    const bar = document.createElement('div');
    bar.className = 'coach-bar';
    bar.hidden = true;
    bar.innerHTML = '<div class="coach-chips chips"></div><div class="coach-row"><input class="field" maxlength="80" autocomplete="off"><button class="btn btn-primary coach-send" type="button"></button></div>';
    body.appendChild(bar);
    const input = bar.querySelector('input');
    bar.querySelector('.coach-send').textContent = I18n.t('ep6.send');

    const scroll = () => {
      const panel = $('#grow-screen .form-panel');
      requestAnimationFrame(() => (panel.scrollTop = panel.scrollHeight));
    };
    const bubble = (who, text, instant) => {
      const b = document.createElement('div');
      b.className = `bubble ${who}`;
      log.appendChild(b);
      if (who !== 'nova' || instant) {
        b.textContent = text;
        scroll();
        return Promise.resolve();
      }
      return new Promise((res) => {
        const chars = Array.from(text);
        let i = 0;
        const timer = setInterval(() => {
          b.textContent += chars[i++] || '';
          if (i >= chars.length) {
            clearInterval(timer);
            scroll();
            res();
          }
        }, 16);
        scroll();
      });
    };
    const nova = async (text) => {
      chat.log.push({ who: 'nova', text });
      Sound.play('blip');
      await bubble('nova', text);
      await sleep(250);
    };
    const me = (text) => {
      chat.log.push({ who: 'me', text });
      return bubble('me', text);
    };
    const thinking = () => {
      const b = document.createElement('div');
      b.className = 'bubble nova typing';
      b.textContent = '…';
      log.appendChild(b);
      scroll();
      return () => b.remove();
    };

    // 학생에게 묻기: 글 또는 빠른 답 칩. 위기 신호가 보이면 도움 안내를 띄운다
    const ask = ({ ph, chips = [] }) =>
      new Promise((resolve) => {
        bar.hidden = false;
        input.value = '';
        input.placeholder = ph || I18n.t('ep6.ansPh');
        const cbox = bar.querySelector('.coach-chips');
        cbox.innerHTML = '';
        const done = async (text, skipped, chip) => {
          bar.hidden = true;
          Sound.play('select');
          await me(text);
          if (!skipped && Ai.crisis(text)) {
            st.crisis = true;
            log.appendChild(crisisBox());
            scroll();
            await nova(t('ep6.tipCrisis'));
          }
          resolve({ text, skipped, chip });
        };
        // 칩: 문자열이면 "건너뛰기"류, {label, answer}는 그 말로 대답, {label, action}은 칩을 바꾸는 버튼
        const setChips = (list) => {
          cbox.innerHTML = '';
          list.forEach((c) => {
            const o = typeof c === 'string' ? { label: c, skip: true } : c;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip' + (o.ai ? ' chip-ai' : '') + (o.action ? ' chip-action' : '');
            b.textContent = o.ai ? `✦ ${o.label}` : o.label;
            b.onclick = async () => {
              if (o.action) {
                b.disabled = true;
                await o.action(setChips, b);
                scroll();
                return;
              }
              done(o.label, !!o.skip, o);
            };
            cbox.appendChild(b);
          });
        };
        setChips(chips);
        const send = () => {
          const v = input.value.trim();
          if (!v) return;
          done(v.slice(0, 80), false);
        };
        bar.querySelector('.coach-send').onclick = send;
        input.onkeydown = (e) => {
          if (e.key === 'Enter') send();
        };
        scroll();
        setTimeout(() => input.focus(), 30);
      });

    // AI 코치의 한마디 (실패하면 null → 정해진 문장)
    const aiOn = () => Ai.on() && Data.save.aiConsent && Ai.left() > 0 && !st.crisis;
    const coach = async (turn) => {
      if (!aiOn()) return null;
      st.aiCalls++;
      const stop = thinking();
      const res = await Ai.call('coach', {
        turn,
        dest: ctx.dest,
        goal: st.goal && !st.goal.same ? st.goal.text : '',
        shadow: ctx.mambas.map((m) => m[L].word),
        tried: st.tried.map((x) => ({ text: x.text, good: x.good })),
        r: st.r,
        history: chat.log.slice(-6),
      });
      stop();
      if (res.ok && res.safety) {
        st.crisis = true;
        log.appendChild(crisisBox());
        return { reply: t('ep6.tipCrisis'), chips: [] };
      }
      if (res.ok && res.reply) {
        st.aiOk++;
        st.aiTurns++;
        return { reply: res.reply, chips: Array.isArray(res.chips) ? res.chips.slice(0, 3) : [] };
      }
      return null;
    };

    // 이미 끝난 대화는 그대로 보여 주고, 다시 할 수 있게
    if (chat.done) {
      chat.log.forEach((m) => bubble(m.who, m.text, true));
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'link-btn';
      again.textContent = I18n.t('ep6.talkAgain');
      again.onclick = () => {
        st.chat[kind] = { log: [], done: false };
        stage(kind, ui, ctx, st).then(ui.onDone);
      };
      body.appendChild(again);
      return Promise.resolve();
    }

    const run = kind === 'g' ? runG : kind === 'r' ? runR : runO;
    return run({ nova, me, ask, coach, log, scroll, ui, ctx, st, L }).then(() => {
      chat.done = true;
      ui.onDone();
    });
  }

  const goalOf = (st, ctx) => (st.goal && !st.goal.same ? st.goal.text : ctx.dest);

  // ---------- G: 종착역(가치)을 이루기 위한 목표 ----------
  async function runG(c) {
    const { nova, ask, ctx, st, L } = c;
    await nova(t('ep6.cG1', { dest: ctx.dest }));
    await nova(t('ep6.cG2'));
    const fixed = I18n.t('ep6.goalEx').split('|');
    const examples = {
      label: I18n.t('ep6.ideas'),
      action: async (setChips, btn) => {
        let list = null;
        if (Ai.on() && Data.save.aiConsent && Ai.left() > 0 && !st.crisis) {
          btn.textContent = I18n.t('ep6.aiThinking');
          st.aiCalls++;
          const res = await Ai.call('examples', { kind: 'goals', dest: ctx.dest, shadow: ctx.mambas.map((m) => m[L].word) });
          if (res.ok && !res.safety && res.items && res.items.length) {
            st.aiOk++;
            list = res.items.map((x) => ({ label: x.text, answer: true, ai: true }));
          }
        }
        if (!list) list = fixed.map((x, i) => ({ label: x, answer: true, idx: i }));
        setChips([same].concat(list));
      },
    };
    const same = { label: I18n.t('ep6.goalSame'), same: true };
    const a = await ask({ ph: I18n.t('ep6.goalPh'), chips: [same, examples] });
    st.goal = a.chip && a.chip.same ? { same: true, text: ctx.dest } : { same: false, text: a.text.slice(0, 40), idx: a.chip && a.chip.idx !== undefined ? a.chip.idx : null, aiEx: !!(a.chip && a.chip.ai) };
    if (c.ui.onGoal) c.ui.onGoal();
    await nova(st.goal.same ? t('ep6.cG3same', { dest: ctx.dest }) : t('ep6.cG3', { goal: st.goal.text }));
  }

  // ---------- R: 해 본 것 + 👍/👎 → 척도 → 코칭 한마디(반영 + 질문 하나, 답 후보 칩) ----------
  async function runR(c) {
    const { nova, me, ask, coach, ctx, st } = c;
    const goal = goalOf(st, ctx);
    await nova(t('ep6.cR1', { goal }));
    st.tried = await triedWidget(c);
    const good = st.tried.filter((x) => x.good === true);
    await me(st.tried.length ? st.tried.map((x) => `${x.text} ${x.good ? '👍' : '👎'}`).join(' · ') : I18n.t('ep6.triedNone'));

    // 척도
    await nova(t('ep6.cR3', { goal }));
    st.r = await scaleWidget(c);
    await me(t('ep6.rMe', { n: st.r }));

    // 코칭 한마디: 해 본 것과 점수를 엮어 반영하고, 해결중심 질문 하나
    const ai = await coach('r');
    const reply = ai
      ? ai.reply
      : st.r === 0
        ? t('ep6.cR4zero')
        : good.length
          ? t('ep6.cR4good', { item: good[0].text, n: st.r })
          : t('ep6.cR4', { n: st.r });
    const chips = ai && ai.chips.length ? ai.chips.map((x) => ({ label: x, answer: true, ai: true })) : I18n.t(st.r === 0 ? 'ep6.rChipsZero' : 'ep6.rChips').split('|').map((x) => ({ label: x, answer: true }));
    await nova(reply);
    const a = await ask({ chips: chips.concat([I18n.t('ep6.skipAns')]) });
    if (!a.skipped) st.answered++;
    st.strength = good.length ? good[0].text : '';
  }

  // ---------- O: 무엇을 바꾸고 싶은지 → 반영 + 아이디어 → 고르기 → 마무리 ----------
  async function runO(c) {
    const { nova, ask, ctx, st, L } = c;
    await nova(st.strength ? t('ep6.cO1good', { n: st.r, s: st.strength, goal: goalOf(st, ctx) }) : t('ep6.cO1', { n: st.r, goal: goalOf(st, ctx) }));
    const a = await ask({ ph: I18n.t('ep6.oPh'), chips: [I18n.t('ep6.oNotSure')] });
    st.text = a.skipped ? '' : a.text;
    const picks = await ideasWidget(c);
    st.picks = picks;
    const first = picks[0];
    const name = first.ai ? first.ai.name : first.own ? first.own : Battle.card(first.id)[L].name;
    await nova(t('ep6.cO3', { name }));
  }

  // ---------- 해 본 것 카드: 직접 쓰기 + 예시(AI 맞춤 또는 고정) + 👍/👎 ----------
  function triedWidget(c) {
    const { log, scroll, ctx, st, L } = c;
    return new Promise((resolve) => {
      const items = [];
      const box = document.createElement('div');
      box.className = 'coach-card';
      box.innerHTML =
        '<div class="coach-row"><input class="field" maxlength="30" autocomplete="off"><button class="btn coach-add" type="button"></button></div>' +
        '<button class="link-btn coach-ex" type="button"></button><div class="chips coach-exlist" hidden></div>' +
        '<div class="tried-list"></div><div class="error" hidden></div>' +
        '<div class="coach-card-btns"><button class="btn coach-none" type="button"></button><button class="btn btn-primary coach-ok" type="button"></button></div>';
      log.appendChild(box);
      const input = box.querySelector('input');
      input.placeholder = I18n.t('ep6.triedPh');
      box.querySelector('.coach-add').textContent = I18n.t('ep6.add');
      box.querySelector('.coach-ex').textContent = I18n.t('ep6.ideas');
      box.querySelector('.coach-none').textContent = I18n.t('ep6.triedNone');
      box.querySelector('.coach-ok').textContent = I18n.t('ep6.triedDone');
      const errEl = box.querySelector('.error');
      const list = box.querySelector('.tried-list');
      const render = () => {
        list.innerHTML = '';
        items.forEach((it, i) => {
          const row = document.createElement('div');
          row.className = 'tried-row';
          row.innerHTML = '<span></span><button type="button" class="thumb">👍</button><button type="button" class="thumb">👎</button><button type="button" class="x">×</button>';
          row.querySelector('span').textContent = it.text;
          const [up, down] = row.querySelectorAll('.thumb');
          up.setAttribute('aria-pressed', String(it.good === true));
          down.setAttribute('aria-pressed', String(it.good === false));
          up.onclick = () => {
            it.good = true;
            Sound.play('blip');
            render();
          };
          down.onclick = () => {
            it.good = false;
            Sound.play('blip');
            render();
          };
          row.querySelector('.x').onclick = () => {
            items.splice(i, 1);
            render();
          };
          list.appendChild(row);
        });
        scroll();
      };
      const add = (text, extra = {}) => {
        const v = String(text).trim().slice(0, 30);
        if (!v || items.some((x) => x.text === v) || items.length >= 8) return;
        if (Ai.crisis(v)) {
          st.crisis = true;
          log.appendChild(crisisBox());
          return;
        }
        items.push(Object.assign({ text: v, good: null }, extra));
        errEl.hidden = true;
        Sound.play('select');
        render();
      };
      box.querySelector('.coach-add').onclick = () => {
        add(input.value);
        input.value = '';
        input.focus();
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') box.querySelector('.coach-add').click();
      };
      // 예시: AI를 켰으면 종착역에 맞춘 예시, 아니면 고정 목록
      box.querySelector('.coach-ex').onclick = async () => {
        const btn = box.querySelector('.coach-ex');
        const exl = box.querySelector('.coach-exlist');
        btn.disabled = true;
        let ex = null;
        if (Ai.on() && Data.save.aiConsent && Ai.left() > 0 && !st.crisis) {
          btn.textContent = I18n.t('ep6.aiThinking');
          st.aiCalls++;
          const res = await Ai.call('examples', { dest: ctx.dest, shadow: ctx.mambas.map((m) => m[L].word) });
          if (res.ok && !res.safety && res.items && res.items.length) {
            st.aiOk++;
            ex = res.items.map((x) => ({ text: x.text, tags: [x.tag], ai: true }));
          }
        }
        if (!ex) ex = TRIED.map((x, i) => ({ text: x[L], tags: x.tags, idx: i }));
        btn.hidden = true;
        exl.hidden = false;
        exl.innerHTML = '';
        ex.forEach((x) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip' + (x.ai ? ' chip-ai' : '');
          b.textContent = x.ai ? `✦ ${x.text}` : x.text;
          b.onclick = () => {
            add(x.text, { tags: x.tags, idx: x.idx, aiEx: !!x.ai });
            b.disabled = true;
          };
          exl.appendChild(b);
        });
        scroll();
      };
      const finish = (none) => {
        if (!none) {
          if (!items.length) {
            errEl.textContent = I18n.t('ep6.triedError');
            errEl.hidden = false;
            return Sound.play('poof');
          }
          if (items.some((x) => x.good === null)) {
            errEl.textContent = I18n.t('ep6.thumbError');
            errEl.hidden = false;
            return Sound.play('poof');
          }
        }
        errEl.hidden = true;
        box.classList.add('locked');
        box.querySelectorAll('button, input').forEach((el) => (el.disabled = true));
        resolve(none ? [] : items.map((x) => Object.assign({}, x, { tags: x.tags || Grow.analyzeTags(x.text) })));
      };
      box.querySelector('.coach-ok').onclick = () => finish(false);
      box.querySelector('.coach-none').onclick = () => finish(true);
      scroll();
      setTimeout(() => input.focus(), 30);
    });
  }

  // ---------- 척도 카드 ----------
  function scaleWidget(c) {
    const { log, scroll } = c;
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'coach-card';
      box.innerHTML = '<div class="grow-scale"></div><div class="grow-scale-ends"><span></span><span></span></div>';
      box.querySelectorAll('.grow-scale-ends span')[0].textContent = I18n.t('ep6.rLow');
      box.querySelectorAll('.grow-scale-ends span')[1].textContent = I18n.t('ep6.rHigh');
      const sc = box.querySelector('.grow-scale');
      for (let i = 0; i <= 10; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = i;
        b.onclick = () => {
          b.setAttribute('aria-pressed', 'true');
          box.classList.add('locked');
          sc.querySelectorAll('button').forEach((x) => (x.disabled = true));
          Sound.play('select');
          resolve(i);
        };
        sc.appendChild(b);
      }
      log.appendChild(box);
      scroll();
    });
  }

  // ---------- 아이디어 카드: AI(코치 한마디 + 아이디어) 또는 기기 안 생성기 → 1~3개 고르기 ----------
  function ideasWidget(c) {
    const { nova, log, scroll, ctx, st, L } = c;
    const HEART = ['calm', 'selfworth', 'motivation', 'relation'];
    return new Promise((resolve) => {
      let shown = [];
      const picks = [];
      const box = document.createElement('div');
      box.className = 'coach-card';
      box.innerHTML = '<div class="idea-list"></div><div class="coach-card-btns"><button class="btn coach-more" type="button"></button><button class="btn btn-primary coach-ok" type="button"></button></div><button class="link-btn coach-own" type="button"></button><div class="error" hidden></div>';
      const listEl = box.querySelector('.idea-list');
      const errEl = box.querySelector('.error');
      box.querySelector('.coach-more').textContent = I18n.t('ep6.oMore');
      box.querySelector('.coach-own').textContent = I18n.t('ep6.oOwn2');
      const same = (p, it) => (it.ai ? !!p.ai && p.ai.act === it.text : it.own ? p.own === it.text : p.id === it.id);
      const label = () => (box.querySelector('.coach-ok').textContent = I18n.t('ep6.oPickDone').replace('{n}', picks.length));
      const render = (fresh) => {
        listEl.className = 'idea-list' + (fresh ? ' fresh' : '');
        listEl.innerHTML = '';
        shown.forEach((it, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'idea' + (it.ai ? ' ai' : '');
          b.dataset.route = it.route;
          b.style.setProperty('--d', `${i * 70}ms`);
          b.setAttribute('aria-pressed', String(picks.some((p) => same(p, it))));
          b.innerHTML = '<em></em><strong></strong>';
          b.querySelector('em').textContent = it.ai ? `✦ ${it.name}` : it.name;
          b.querySelector('strong').textContent = it.text;
          if (it.why) {
            const w = document.createElement('small');
            w.textContent = it.why;
            b.appendChild(w);
          }
          b.onclick = () => {
            const k = picks.findIndex((p) => same(p, it));
            if (k >= 0) picks.splice(k, 1);
            else if (picks.length >= 3) {
              errEl.textContent = I18n.t('ep6.oMax');
              errEl.hidden = false;
              return Sound.play('poof');
            } else picks.push(it.pick);
            errEl.hidden = true;
            Sound.play(k >= 0 ? 'blip' : 'select');
            render(false);
            label();
          };
          listEl.appendChild(b);
        });
        label();
        scroll();
      };
      const generate = async (first) => {
        let reply = null;
        let viaAi = false;
        if (Ai.on() && Data.save.aiConsent && Ai.left() > 0 && !st.crisis) {
          st.aiCalls++;
          const stop = (() => {
            const b = document.createElement('div');
            b.className = 'bubble nova typing';
            b.textContent = '…';
            log.insertBefore(b, box.parentNode ? box : null);
            scroll();
            return () => b.remove();
          })();
          const res = await Ai.call('ideas', {
            text: st.text,
            dest: ctx.dest,
            goal: st.goal && !st.goal.same ? st.goal.text : '',
            shadow: ctx.mambas.map((m) => m[L].word),
            tried: st.tried.map((x) => ({ text: x.text, good: x.good })),
            r: st.r,
          });
          stop();
          if (res.ok && res.safety) {
            st.crisis = true;
            log.appendChild(crisisBox());
          } else if (res.ok && res.ideas.length) {
            st.aiOk++;
            st.aiTurns++;
            viaAi = true;
            reply = res.reply || null;
            shown = res.ideas.map((x) => ({ ai: true, name: x.name, text: x.act, why: x.why, route: HEART.includes(x.tag) ? 'heart' : 'study', pick: { ai: { name: x.name, act: x.act, tag: x.tag } } }));
          }
        }
        if (!viaAi) {
          const r = Grow.ideas(st.text, ctx, shown.filter((x) => x.id).map((x) => x.id).concat(picks.filter((p) => p.id).map((p) => p.id)), 6, st.tried);
          st.analysis = r.analysis;
          shown = r.cards.map((cd) => ({ id: cd.id, name: cd[L].name, text: Grow.ideaText(cd, r.analysis.subject), route: cd.route, pick: { id: cd.id, subject: r.analysis.subject } }));
        } else st.analysis = Grow.analyze(st.text);
        st.generated++;
        if (!first) st.rerolls++;
        if (first) {
          const good = st.tried.find((x) => x.good === true);
          await nova(reply || (good ? t('ep6.cO2good', { item: good.text }) : st.text ? t('ep6.cO2', {}) : t('ep6.cO2none')));
          log.appendChild(box);
        }
        Sound.play('sparkle');
        render(true);
      };
      box.querySelector('.coach-more').onclick = async () => {
        box.querySelector('.coach-more').disabled = true;
        await generate(false);
        box.querySelector('.coach-more').disabled = false;
      };
      box.querySelector('.coach-own').onclick = () => {
        if (!st.text) {
          errEl.textContent = I18n.t('ep6.oOwnEmpty2');
          errEl.hidden = false;
          return Sound.play('poof');
        }
        if (picks.length >= 3) {
          errEl.textContent = I18n.t('ep6.oMax');
          errEl.hidden = false;
          return Sound.play('poof');
        }
        if (!shown.some((x) => x.own)) shown.unshift({ own: true, name: I18n.t('ep6.myIdea'), text: st.text.slice(0, 40), route: 'study', pick: { own: st.text.slice(0, 40) } });
        picks.push({ own: st.text.slice(0, 40) });
        render(false);
      };
      box.querySelector('.coach-ok').onclick = () => {
        if (!picks.length) {
          errEl.textContent = I18n.t('ep6.oError');
          errEl.hidden = false;
          return Sound.play('poof');
        }
        box.classList.add('locked');
        box.querySelectorAll('button').forEach((el) => (el.disabled = true));
        resolve(picks.slice());
      };
      generate(true);
    });
  }

  function crisisBox() {
    const box = document.createElement('div');
    box.className = 'crisis-box';
    box.innerHTML = '<strong></strong><p></p><p></p>';
    box.querySelector('strong').textContent = I18n.t('ep6.crisisTitle');
    box.querySelectorAll('p')[0].textContent = I18n.t('ep6.crisisBody');
    box.querySelectorAll('p')[1].textContent = I18n.t('ep6.crisisHelp');
    return box;
  }

  function aiSwitch(ui, compact) {
    const sw = document.createElement('label');
    sw.className = 'ai-switch' + (compact ? ' compact' : '');
    sw.innerHTML = '<input type="checkbox"><span class="ai-switch-text"><b></b><small></small></span>';
    const cb = sw.querySelector('input');
    cb.checked = !!Data.save.aiConsent;
    sw.querySelector('b').textContent = I18n.t('ep6.aiSwitch').replace('{n}', Ai.left());
    sw.querySelector('small').textContent = I18n.t('ep6.aiNote');
    cb.onchange = () => {
      Data.save.aiConsent = cb.checked;
      Data.persist();
      Sound.play('blip');
      ui.tip(cb.checked ? 'ep6.tipAiOn' : 'ep6.tipAiOff');
    };
    return sw;
  }

  window.Coach = { stage, TRIED };
})();
