// 2화 성향 질문: 24문항, 문항마다 나와 가장 비슷한 보기 하나. data/disc.json의 key로 D/I/S/C에 1점.
// 1순위가 내 캐릭터, 2순위는 "조금 섞인 모습". 동점이면 학생이 고른다. 점수는 보여주지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const TYPES = ['D', 'I', 'S', 'C'];
  let disc = null;
  let types = null;

  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  async function load() {
    if (!disc) disc = await (await fetch('data/disc.json', { cache: 'no-cache' })).json();
    if (!types) types = await (await fetch('data/types.json', { cache: 'no-cache' })).json();
  }

  function score(ans) {
    const s = { D: 0, I: 0, S: 0, C: 0 };
    ans.forEach((letter, i) => {
      const key = disc.items[i].key;
      const tp = TYPES.find((x) => key[x] === letter);
      if (tp) s[tp]++;
    });
    return s;
  }

  function topOf(scores, exclude = []) {
    const pool = TYPES.filter((x) => !exclude.includes(x));
    const max = Math.max(...pool.map((x) => scores[x]));
    return pool.filter((x) => scores[x] === max);
  }

  // 문항 하나씩 보여 주고, 고르면 바로 다음으로. ◀ 이전으로 돌아갈 수 있다.
  function ask() {
    return new Promise((resolve) => {
      const ans = [];
      let i = 0;
      const screen = $('#quiz-screen');
      const render = () => {
        const q = disc.items[i];
        $('#quiz-count').textContent = `${i + 1} / ${disc.items.length}`;
        $('#quiz-bar').style.width = `${(i / disc.items.length) * 100}%`;
        $('#quiz-back').disabled = i === 0;
        const box = $('#quiz-options');
        box.innerHTML = '';
        Object.keys(q.options).forEach((letter) => {
          const o = q.options[letter][lang()];
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiz-opt';
          b.setAttribute('aria-pressed', String(ans[i] === letter));
          b.innerHTML = '<strong></strong><span></span>';
          b.querySelector('strong').textContent = o.word;
          b.querySelector('span').textContent = o.desc;
          b.onclick = () => {
            ans[i] = letter;
            Sound.play('select');
            if (i < disc.items.length - 1) {
              i++;
              render();
            } else {
              screen.hidden = true;
              resolve(ans.slice());
            }
          };
          box.appendChild(b);
        });
      };
      $('#quiz-back').onclick = () => {
        if (i > 0) {
          i--;
          Sound.play('blip');
          render();
        }
      };
      render();
      screen.hidden = false;
    });
  }

  // 동점인 유형 중에서 고르기: 유형 이름과 한 줄 설명만 보여 준다
  function pickTie(list, titleKey) {
    return new Promise((resolve) => {
      $('#tie-title').textContent = I18n.t(titleKey);
      const box = $('#tie-options');
      box.innerHTML = '';
      list.forEach((code) => {
        const tp = types[code];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-opt';
        b.style.borderLeft = `4px solid ${tp.color}`;
        b.innerHTML = '<strong></strong><span></span>';
        b.querySelector('strong').textContent = tp[lang()].name;
        b.querySelector('span').textContent = tp[lang()].summary;
        b.onclick = () => {
          Sound.play('select');
          $('#tie-screen').hidden = true;
          resolve(code);
        };
        box.appendChild(b);
      });
      $('#tie-screen').hidden = false;
    });
  }

  window.Quiz = {
    load,
    get types() {
      return types;
    },
    async run() {
      await load();
      const answers = await ask();
      const scores = score(answers);
      const firsts = topOf(scores);
      const primary = firsts.length > 1 ? await pickTie(firsts, 'quiz.tie1') : firsts[0];
      const seconds = topOf(scores, [primary]);
      const secondary = seconds.length > 1 ? await pickTie(seconds, 'quiz.tie2') : seconds[0];
      return { answers, scores, primary, secondary };
    },
  };
})();
