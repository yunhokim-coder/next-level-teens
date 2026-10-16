// 3화 종착역 패널: 미래의 나 고르기, 연료 게이지 체크, 게이지 결과, 유용성 질문.
// 학생이 직접 쓴 글(종착역 직접 쓰기, 유용성 직접 쓰기)은 기기에만 저장하고 보내지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  let data = null;
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  async function load() {
    if (!data) data = await (await fetch('data/station.json', { cache: 'no-cache' })).json();
    return data;
  }

  function open(id) {
    $(id).hidden = false;
    $(`${id} .form-panel`).scrollTop = 0;
  }

  // ---------- 종착역 ----------
  // 직접 쓰기가 기본. 떠오르지 않으면 예시(Holland RIASEC 6유형 × 2)를 펼쳐 골라 칸에 채운 뒤 고칠 수 있다.
  // 종착역은 "○○ 하는 사람" 틀로 받는다 (가치 수준의 큰 목표). 칸에는 틀을 뺀 부분만 쓴다
  function unframe(text) {
    const v = String(text).trim();
    return lang() === 'en' ? v.replace(/^someone who\s*/i, '') : v.replace(/\s*사람$/, '');
  }
  function frame(text) {
    const v = String(text).trim();
    if (lang() === 'en') return /^someone\b/i.test(v) ? v : `Someone who ${v}`;
    return /사람$/.test(v) ? v : `${v} 사람`;
  }

  function pickDest(prev) {
    const L = lang();
    return new Promise((resolve) => {
      const input = $('#dest-own');
      const box = $('#dest-options');
      let fromExample = null; // 예시를 고른 뒤 고치지 않았으면 그 예시 id로 기록
      box.innerHTML = '';
      const done = (value) => {
        Sound.play('select');
        $('#dest-screen').hidden = true;
        resolve(value);
      };
      data.destinations.forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dest-opt';
        b.textContent = d[L];
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          input.value = unframe(d[L]);
          fromExample = d;
          box.querySelectorAll('.dest-opt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          $('#dest-error').hidden = true;
          Sound.play('blip');
        };
        box.appendChild(b);
      });
      input.value = (prev && prev.id === 'own' && prev.own ? unframe(prev.own) : '') || '';
      input.oninput = () => {
        fromExample = null;
        box.querySelectorAll('.dest-opt').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        $('#dest-error').hidden = true;
      };
      const ideas = $('#dest-ideas');
      const ideasBox = $('#dest-ideas-box');
      ideasBox.hidden = true;
      ideas.setAttribute('aria-expanded', 'false');
      ideas.textContent = I18n.t('ep3.destIdeas');
      ideas.onclick = () => {
        ideasBox.hidden = !ideasBox.hidden;
        ideas.setAttribute('aria-expanded', String(!ideasBox.hidden));
        ideas.textContent = I18n.t(ideasBox.hidden ? 'ep3.destIdeas' : 'ep3.destIdeasHide');
        Sound.play('blip');
      };
      $('#dest-error').hidden = true;
      $('#dest-own-go').onclick = () => {
        const v = input.value.trim().slice(0, 30);
        if (!v) {
          $('#dest-error').hidden = false;
          Sound.play('poof');
          input.focus();
          return;
        }
        if (fromExample && v === unframe(fromExample[L])) done({ id: fromExample.id, riasec: fromExample.riasec, label: fromExample.short[L] });
        else done({ id: 'own', label: frame(v), own: frame(v) });
      };
      $('#dest-unknown').onclick = () => done({ id: 'unknown', label: I18n.t('ep3.fogStation') });
      open('#dest-screen');
      setTimeout(() => input.focus(), 50);
    });
  }

  // ---------- 연료 체크: "나도 그래"를 여러 개 ----------
  function fuelCheck() {
    const L = lang();
    return new Promise((resolve) => {
      const picked = new Set();
      const box = $('#fuel-options');
      box.innerHTML = '';
      data.fuel.forEach((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fuel-opt';
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<i></i><span></span>';
        b.querySelector('span').textContent = f[L];
        b.onclick = () => {
          if (picked.has(f.id)) picked.delete(f.id);
          else picked.add(f.id);
          b.setAttribute('aria-pressed', String(picked.has(f.id)));
          Sound.play('blip');
        };
        box.appendChild(b);
      });
      $('#fuel-go').onclick = () => {
        Sound.play('select');
        $('#fuel-screen').hidden = true;
        resolve([...picked].sort((a, b) => a - b));
      };
      open('#fuel-screen');
    });
  }

  // 게이지별 개수와 주 연료 (가장 많이 고른 게이지, 동점이면 여럿)
  function gauges(checked) {
    const count = {};
    data.gauges.forEach((g) => {
      count[g.id] = 0;
    });
    checked.forEach((id) => {
      const f = data.fuel.find((x) => x.id === id);
      if (f) count[f.g]++;
    });
    const max = Math.max(...Object.values(count));
    const main = max > 0 ? data.gauges.filter((g) => count[g.id] === max).map((g) => g.id) : [];
    return { count, main };
  }

  function showGauge(res) {
    const L = lang();
    return new Promise((resolve) => {
      const box = $('#gauge-bars');
      box.innerHTML = '';
      data.gauges.forEach((g) => {
        const row = document.createElement('div');
        row.className = `gauge-row${res.main.includes(g.id) ? ' main' : ''}`;
        row.innerHTML = '<span class="g-name"></span><span class="g-bar"><i></i><i></i></span>';
        row.querySelector('.g-name').textContent = g.sub ? `${g[L]} (${g.sub[L]})` : g[L];
        row.querySelectorAll('.g-bar i').forEach((cell, k) => {
          if (k < res.count[g.id]) cell.style.background = g.color;
        });
        box.appendChild(row);
      });
      const names = res.main.map((id) => data.gauges.find((g) => g.id === id)[L]);
      $('#gauge-main').textContent = names.length ? I18n.t('ep3.mainFuel').replace('{fuel}', names.join(' · ')) : I18n.t('ep3.noFuel');
      $('#gauge-go').onclick = () => {
        Sound.play('select');
        $('#gauge-screen').hidden = true;
        resolve();
      };
      open('#gauge-screen');
      Sound.play('powerup');
    });
  }

  // ---------- 유용성: 지금 공부가 그 역에 어떻게 이어질까 (칩 여러 개 + 직접 쓰기) ----------
  function utility(dest) {
    const L = lang();
    return new Promise((resolve) => {
      const picked = new Set();
      $('#util-title').textContent = dest.id === 'unknown' ? I18n.t('ep3.utilTitleFog') : I18n.t('ep3.utilTitle').replace('{dest}', dest.label);
      const box = $('#util-options');
      box.innerHTML = '';
      data.utility.forEach((u) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = u[L];
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          if (picked.has(u.id)) picked.delete(u.id);
          else picked.add(u.id);
          b.setAttribute('aria-pressed', String(picked.has(u.id)));
          Sound.play('blip');
          $('#util-error').hidden = true;
        };
        box.appendChild(b);
      });
      $('#util-own').value = '';
      $('#util-error').hidden = true;
      $('#util-go').onclick = () => {
        const own = $('#util-own').value.trim().slice(0, 80);
        if (!picked.size && !own) {
          $('#util-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Sound.play('select');
        $('#util-screen').hidden = true;
        resolve({ ids: data.utility.filter((u) => picked.has(u.id)).map((u) => u.id), own });
      };
      open('#util-screen');
    });
  }

  window.Station = {
    load,
    get data() {
      return data;
    },
    pickDest,
    fuelCheck,
    gauges,
    showGauge,
    utility,
  };
})();
