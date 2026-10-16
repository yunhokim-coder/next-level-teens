// 5화 우회 노선 배틀: 그림자가 블랙맘바 카드로 공격하면, 손에 든 우회 노선 카드 4장(또는 전체 카드)에서 하나를 낸다.
// 태그가 겹치면 효과가 크다. 지는 경우는 없다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const HAND = 4;
  let data = null;
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  async function load() {
    if (!data) data = await (await fetch('data/detour.json', { cache: 'no-cache' })).json();
    return data;
  }
  const card = (id) => data.cards.find((c) => c.id === id);
  const overlap = (a, b) => a.filter((t) => b.includes(t));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function tagChips(tags, hot = []) {
    const L = lang();
    const box = document.createElement('span');
    box.className = 'tags';
    tags.forEach((t) => {
      const s = document.createElement('i');
      s.className = 'tag' + (hot.includes(t) ? ' hot' : '');
      s.style.setProperty('--tag', data.tags[t].color);
      s.textContent = data.tags[t][L];
      box.appendChild(s);
    });
    return box;
  }
  const tagNames = (tags) => tags.map((t) => data.tags[t][lang()]).join(', ');

  // ---------- 손패 ----------
  // 매 턴 새로 나눈다: 이번 공격과 태그가 많이 겹치는 카드부터 최대 4장 추천, 모자라면 나머지로 채운다
  function deal(hand, used, attackTags) {
    const pool = shuffle(data.cards.filter((c) => !used.includes(c.id)));
    const fit = pool
      .map((c) => ({ id: c.id, n: overlap(c.tags, attackTags).length }))
      .filter((x) => x.n > 0)
      .sort((x, y) => y.n - x.n)
      .map((x) => x.id);
    const rest = pool.map((c) => c.id).filter((id) => !fit.includes(id));
    hand.length = 0;
    fit.concat(rest).slice(0, HAND).forEach((id) => hand.push(id));
    return hand;
  }

  function cardEl(c, attackTags, cls) {
    const L = lang();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.dataset.route = c.route;
    b.innerHTML = '<em></em><strong></strong>';
    b.querySelector('em').textContent = data.routes.find((r) => r.id === c.route)[L];
    b.querySelector('strong').textContent = c[L].name;
    b.appendChild(tagChips(c.tags, attackTags));
    return b;
  }

  // 카드 크게 보기: 쓰기 또는 돌아가기
  function zoom(id, attackTags) {
    const L = lang();
    const c = card(id);
    return new Promise((resolve) => {
      const box = $('#zoom-card');
      box.innerHTML = '';
      box.dataset.route = c.route;
      const head = document.createElement('div');
      head.className = 'zoom-route';
      head.textContent = data.routes.find((r) => r.id === c.route)[L];
      const h = document.createElement('h2');
      h.textContent = c[L].name;
      const p = document.createElement('p');
      p.textContent = c[L].desc;
      box.append(head, h, p, tagChips(c.tags, attackTags));
      const hit = overlap(c.tags, attackTags).length > 0;
      $('#zoom-match').textContent = hit ? I18n.t('ep5.zoomHit') : '';
      $('#zoom-match').hidden = !hit;
      $('#zoom-use').onclick = () => {
        $('#zoom-screen').hidden = true;
        resolve(true);
      };
      $('#zoom-back').onclick = () => {
        Sound.play('blip');
        $('#zoom-screen').hidden = true;
        resolve(false);
      };
      $('#zoom-screen').hidden = false;
    });
  }

  // 전체 카드에서 고르기
  function deck(used, attackTags) {
    const L = lang();
    let tab = 'heart';
    return new Promise((resolve) => {
      const render = () => {
        const tabs = $('#deck-tabs');
        tabs.innerHTML = '';
        data.routes.forEach((r) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'tab';
          b.setAttribute('aria-pressed', String(r.id === tab));
          b.textContent = r[L];
          b.onclick = () => {
            tab = r.id;
            Sound.play('blip');
            render();
            $('#deck-grid').scrollTop = 0;
          };
          tabs.appendChild(b);
        });
        const grid = $('#deck-grid');
        grid.innerHTML = '';
        data.cards
          .filter((c) => c.route === tab && !used.includes(c.id))
          .forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'mcard dcard';
            b.dataset.route = c.route;
            b.innerHTML = '<strong></strong><span></span>';
            b.querySelector('strong').textContent = c[L].name;
            b.querySelector('span').textContent = c[L].desc;
            b.appendChild(tagChips(c.tags, attackTags));
            b.onclick = async () => {
              Sound.play('select');
              if (await zoom(c.id, attackTags)) {
                $('#deck-screen').hidden = true;
                resolve(c.id);
              }
            };
            grid.appendChild(b);
          });
      };
      $('#deck-close').onclick = () => {
        Sound.play('blip');
        $('#deck-screen').hidden = true;
        resolve(null);
      };
      render();
      $('#deck-screen').hidden = false;
      $('#deck-screen .form-panel').scrollTop = 0;
    });
  }

  // 한 턴: 공격 카드(블랙맘바)를 보여 주고 낼 카드를 고른다
  function choose(attack, hand, used) {
    const L = lang();
    const attackTags = attack.tags;
    let browsed = false;
    return new Promise((resolve) => {
      const a = $('#hand-attack');
      a.innerHTML = '<em></em><strong></strong>';
      a.querySelector('em').textContent = I18n.t('ep5.attack');
      a.querySelector('strong').textContent = attack[L].name;
      a.appendChild(tagChips(attackTags, attackTags));
      const fan = $('#hand-fan');
      fan.innerHTML = '';
      const pick = async (id) => {
        Sound.play('select');
        $('#hand-screen').hidden = true;
        const ok = await zoom(id, attackTags);
        if (ok) resolve({ id, browsed });
        else $('#hand-screen').hidden = false;
      };
      hand.forEach((id, i) => {
        const b = cardEl(card(id), attackTags, 'hcard');
        b.style.setProperty('--i', i - (hand.length - 1) / 2);
        b.onclick = () => pick(id);
        fan.appendChild(b);
      });
      $('#hand-deck').onclick = async () => {
        Sound.play('blip');
        $('#hand-screen').hidden = true;
        const id = await deck(used, attackTags);
        if (id) {
          browsed = true;
          resolve({ id, browsed });
        } else $('#hand-screen').hidden = false;
      };
      $('#hand-screen').hidden = false;
    });
  }

  // 마지막: 오늘 이어 붙인 우회 노선
  function summary(turns, mambaCard) {
    const L = lang();
    return new Promise((resolve) => {
      const box = $('#route-list');
      box.innerHTML = '';
      turns.forEach((tn) => {
        const c = card(tn.c);
        const m = mambaCard(tn.m);
        const row = document.createElement('div');
        row.className = 'route-row' + (tn.hit ? ' hit' : '');
        row.dataset.route = c.route;
        row.innerHTML = '<span class="route-from"></span><span class="route-arrow">→</span><strong></strong>';
        row.querySelector('.route-from').textContent = m[L].word;
        row.querySelector('strong').textContent = c[L].name;
        box.appendChild(row);
      });
      $('#route-go').onclick = () => {
        Sound.play('select');
        $('#route-screen').hidden = true;
        resolve();
      };
      $('#route-screen').hidden = false;
      $('#route-screen .form-panel').scrollTop = 0;
    });
  }

  window.Battle = {
    load,
    card,
    get data() {
      return data;
    },
    overlap,
    tagNames,
    deal,
    choose,
    summary,
  };
})();
