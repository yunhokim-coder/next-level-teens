// 4화 운행 방해 패널: 블랙맘바 카드 고르기(마음·생각·행동 각 1~3장), 얼마나 자주, 그림자 이름 붙이기.
// 그림자 이름을 직접 쓰면 기기에만 저장하고 보내지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const MAX_PER_CAT = 3;
  let data = null;
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  async function load() {
    if (!data) data = await (await fetch('data/mamba.json', { cache: 'no-cache' })).json();
    return data;
  }
  const card = (id) => data.cards.find((c) => c.id === id);

  function open(id) {
    $(id).hidden = false;
    $(`${id} .form-panel`).scrollTop = 0;
  }

  // ---------- 카드 고르기 ----------
  function pick(prev = []) {
    const L = lang();
    let tab = 'heart';
    const picked = prev.filter((id) => card(id));
    const count = (cat) => picked.filter((id) => card(id).category === cat).length;
    return new Promise((resolve) => {
      const render = () => {
        const tabs = $('#mamba-tabs');
        tabs.innerHTML = '';
        data.categories.forEach((c) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'tab';
          b.setAttribute('aria-pressed', String(c.id === tab));
          b.innerHTML = '<span></span> <b class="tab-count"></b>';
          b.firstChild.textContent = c[L];
          b.querySelector('b').textContent = count(c.id);
          b.querySelector('b').classList.toggle('on', count(c.id) > 0);
          b.onclick = () => {
            tab = c.id;
            Sound.play('blip');
            render();
            $('#mamba-grid').scrollTop = 0;
          };
          tabs.appendChild(b);
        });
        const grid = $('#mamba-grid');
        const scroll = grid.scrollTop;
        grid.innerHTML = '';
        data.cards
          .filter((c) => c.category === tab)
          .forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'mcard';
            b.setAttribute('aria-pressed', String(picked.includes(c.id)));
            b.innerHTML = '<strong></strong><span></span>';
            b.querySelector('strong').textContent = c[L].name;
            b.querySelector('span').textContent = c[L].desc;
            b.onclick = () => {
              const i = picked.indexOf(c.id);
              if (i >= 0) picked.splice(i, 1);
              else if (count(c.category) >= MAX_PER_CAT) {
                error(I18n.t('ep4.full'));
                return;
              } else picked.push(c.id);
              Sound.play(i >= 0 ? 'blip' : 'select');
              $('#mamba-error').hidden = true;
              render();
            };
            grid.appendChild(b);
          });
        grid.scrollTop = scroll;
        $('#mamba-need').textContent = I18n.t('ep4.need').replace('{h}', count('heart')).replace('{t}', count('thought')).replace('{a}', count('action'));
      };
      const error = (msg) => {
        $('#mamba-error').textContent = msg;
        $('#mamba-error').hidden = false;
        Sound.play('poof');
      };
      $('#mamba-done').onclick = () => {
        const missing = data.categories.filter((c) => !count(c.id));
        if (missing.length) {
          tab = missing[0].id;
          render();
          error(I18n.t('ep4.missing').replace('{cats}', missing.map((c) => c[L]).join(', ')));
          return;
        }
        Sound.play('select');
        $('#mamba-screen').hidden = true;
        resolve(picked.slice());
      };
      $('#mamba-error').hidden = true;
      render();
      open('#mamba-screen');
    });
  }

  // ---------- 얼마나 자주 ----------
  function frequency(ids, prev = {}) {
    const L = lang();
    const freq = {};
    ids.forEach((id) => {
      if (prev[id]) freq[id] = prev[id];
    });
    return new Promise((resolve) => {
      const render = () => {
        const box = $('#freq-list');
        box.innerHTML = '';
        ids.forEach((id) => {
          const c = card(id);
          const row = document.createElement('div');
          row.className = 'freq-row';
          row.innerHTML = '<div class="freq-name"></div><div class="seg"></div>';
          row.querySelector('.freq-name').textContent = c[L].name;
          const seg = row.querySelector('.seg');
          [1, 2, 3].forEach((v) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = I18n.t(`ep4.freq${v}`);
            b.setAttribute('aria-pressed', String(freq[id] === v));
            b.onclick = () => {
              freq[id] = v;
              Sound.play('blip');
              $('#freq-error').hidden = true;
              render();
            };
            seg.appendChild(b);
          });
          box.appendChild(row);
        });
      };
      $('#freq-done').onclick = () => {
        if (ids.some((id) => !freq[id])) {
          $('#freq-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Sound.play('select');
        $('#freq-screen').hidden = true;
        resolve({ ...freq });
      };
      $('#freq-error').hidden = true;
      render();
      open('#freq-screen');
    });
  }

  // 가장 자주 나타나는 카드부터 (같으면 고른 순서)
  function byFrequency(ids, freq) {
    return ids.slice().sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
  }

  // ---------- 그림자 이름 붙이기 (외재화) ----------
  // 추천 이름은 가장 자주 나타나는 카드의 낱말로 만든다. 예) 숏폼 → 숏폼 그림자, 숏폼 씨
  function name(ids, freq, prev) {
    const L = lang();
    const top = byFrequency(ids, freq).slice(0, 2).map((id) => card(id)[L].word);
    const ideas = [];
    top.forEach((w) => {
      I18n.t('ep4.nameIdeas')
        .split('|')
        .forEach((pattern) => ideas.push(pattern.replace('{w}', w)));
    });
    return new Promise((resolve) => {
      const input = $('#name-own');
      input.value = (prev && prev.name) || '';
      const box = $('#name-ideas');
      box.innerHTML = '';
      let fromIdea = -1;
      ideas.slice(0, 4).forEach((idea, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = idea;
        b.onclick = () => {
          input.value = idea;
          fromIdea = i;
          Sound.play('blip');
          $('#name-error').hidden = true;
        };
        box.appendChild(b);
      });
      input.oninput = () => {
        fromIdea = -1;
        $('#name-error').hidden = true;
      };
      $('#name-go').onclick = () => {
        const v = input.value.trim().slice(0, 16);
        if (!v) {
          $('#name-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Sound.play('select');
        $('#name-screen').hidden = true;
        resolve({ name: v, idea: fromIdea >= 0 && v === ideas[fromIdea] ? fromIdea : -1 });
      };
      $('#name-error').hidden = true;
      open('#name-screen');
      setTimeout(() => input.focus(), 50);
    });
  }

  window.Mamba = {
    load,
    card,
    get data() {
      return data;
    },
    pick,
    frequency,
    byFrequency,
    name,
  };
})();
