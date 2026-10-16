// 대사 진행기: 대본(step 배열)을 한 줄씩 보여주고, 선택지가 있으면 고른 쪽 대본을 이어 붙인다.
// step = { who, key, vars, do, wait, choices: [{ key, pick, then }] }
//   vars: 문구의 {이름} 자리에 넣을 값 (객체 또는 객체를 돌려주는 함수)
//   pick: 선택지를 골랐을 때 실행할 함수, then: 이어 붙일 대본 (배열 또는 배열을 돌려주는 함수)
(function () {
  const $ = (sel) => document.querySelector(sel);
  let dialog;
  let nameEl;
  let textEl;
  let choicesEl;

  let queue = [];
  let current = null;
  let typing = null;
  let waitingChoice = false;
  let busy = false;
  let finish = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // {name} 같은 자리에 여행자 이름을 넣는다
  function fill(text) {
    return String(text).replace('{name}', Data.nameText());
  }

  function withVars(text, vars) {
    const v = typeof vars === 'function' ? vars() : vars || {};
    return josa(Object.keys(v).reduce((acc, k) => acc.split(`{${k}}`).join(v[k]), String(text)));
  }

  // '맘바(이)가' → '맘바가', '기사(은)는' → '기사는': 앞 글자에 받침이 있는지 보고 조사를 고른다
  function josa(text) {
    const pairs = { '(이)가': ['이', '가'], '(은)는': ['은', '는'], '(을)를': ['을', '를'], '(과)와': ['과', '와'], '(이)': ['이', ''] };
    return text.replace(/(.)(\(이\)가|\(은\)는|\(을\)를|\(과\)와|\(이\))/g, (m, ch, mark) => {
      const code = ch.charCodeAt(0) - 0xac00;
      const batchim = code >= 0 && code < 11172 && code % 28 !== 0;
      return ch + pairs[mark][batchim ? 0 : 1];
    });
  }

  function textOf(step) {
    return fill(withVars(I18n.t(step.key), step.vars));
  }

  async function next() {
    if (busy || waitingChoice) return;
    busy = true;
    while (queue.length) {
      const step = queue.shift();
      if (step.do) await step.do();
      if (step.wait) {
        dialog.hidden = true;
        await sleep(step.wait);
      }
      if (step.key) {
        say(step);
        busy = false;
        return;
      }
    }
    busy = false;
    dialog.hidden = true;
    current = null;
    const done = finish;
    finish = null;
    if (done) done();
  }

  function say(step) {
    current = step;
    dialog.hidden = false;
    dialog.dataset.who = step.who;
    choicesEl.hidden = true;
    choicesEl.innerHTML = '';
    const name = I18n.t(`names.${step.who}`);
    nameEl.textContent = name;
    nameEl.hidden = !name;
    if (step.who !== 'narrator') Game.focus(step.who);
    typeText(textOf(step));
  }

  function typeText(full) {
    clearInterval(typing);
    let i = 0;
    textEl.textContent = '';
    typing = setInterval(() => {
      i++;
      textEl.textContent = full.slice(0, i);
      if (i % 2 === 0 && full[i - 1] !== ' ') Sound.play('blip');
      if (i >= full.length) finishTyping();
    }, 30);
  }

  function finishTyping() {
    clearInterval(typing);
    typing = null;
    if (!current) return;
    textEl.textContent = textOf(current);
    if (current.choices) showChoices(current.choices);
  }

  function showChoices(choices) {
    waitingChoice = true;
    choicesEl.innerHTML = '';
    choices.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.type = 'button';
      b.textContent = withVars(I18n.t(c.key), c.vars);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        Sound.play('select');
        waitingChoice = false;
        choicesEl.hidden = true;
        if (c.pick) c.pick();
        const then = typeof c.then === 'function' ? c.then() : c.then || [];
        queue = then.concat(queue);
        next();
      });
      choicesEl.appendChild(b);
    });
    choicesEl.hidden = false;
    choicesEl.querySelector('button').focus();
  }

  window.Story = {
    init() {
      dialog = $('#dialog');
      nameEl = $('#dialog-name');
      textEl = $('#dialog-text');
      choicesEl = $('#choices');
      dialog.addEventListener('click', (e) => {
        if (!e.target.closest('button')) this.advance();
      });
      I18n.onChange(() => this.refresh());
    },
    // 대본을 끝까지 재생하면 resolve 된다
    play(script) {
      this.stop();
      queue = script.slice();
      return new Promise((resolve) => {
        finish = resolve;
        next();
      });
    },
    stop() {
      queue = [];
      current = null;
      waitingChoice = false;
      busy = false;
      finish = null;
      clearInterval(typing);
      typing = null;
      if (dialog) dialog.hidden = true;
    },
    get active() {
      return !!current && !dialog.hidden;
    },
    advance() {
      if (dialog.hidden || waitingChoice || !current) return;
      if (typing) {
        finishTyping();
        return;
      }
      next();
    },
    // 대사 도중 언어를 바꾸면 지금 대사를 바뀐 언어로 다시 보여준다
    refresh() {
      if (!current || dialog.hidden) return;
      nameEl.textContent = I18n.t(`names.${current.who}`);
      finishTyping();
    },
  };
})();
