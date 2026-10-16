// 6화 노선도 완성: 경유역 3개(O), "만약 ~하면 ~한다"(W), 역 이름 붙이기, 나의 노선도 그리기·저장·인쇄.
// 학생이 쓴 글(경유역, 역 이름)은 기기에만 저장하고 보내지 않는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const lang = () => (I18n.lang === 'en' ? 'en' : 'ko');

  function open(id) {
    $(id).hidden = false;
    const p = $(`${id} .form-panel`);
    if (p) p.scrollTop = 0;
  }

  // ---------- GROW 노선: 지금 여기(R) → 경유역 3개(O) → 종착역(G) ----------
  // 역을 눌러 하나씩 채운다. 채운 역까지 선로에 불이 들어온다.
  function ways(prev = [], ctx = {}) {
    const keys = ['w1', 'w2', 'w3'];
    const vals = keys.map((k, i) => prev[i] || '');
    const used = [false, false, false];
    let cur = Math.max(0, vals.findIndex((v) => !v));
    if (vals.every((v) => v)) cur = 0;
    return new Promise((resolve) => {
      const route = $('#grow-route');
      route.style.setProperty('--gc', ctx.color || 'var(--line)');
      $('#grow-title').textContent = I18n.t('ep6.waysTitle').replace('{dest}', ctx.dest || '');
      const input = $('#grow-input');
      const save = () => {
        vals[cur] = input.value.trim().slice(0, 40);
      };
      const render = () => {
        route.innerHTML = '<div class="grow-fill"></div>';
        const stops = [
          { cls: 'start lit', letter: 'R', when: I18n.t('ep6.now'), text: ctx.now || '' },
          ...keys.map((k, i) => ({ cls: (vals[i] ? 'lit' : '') + (i === cur ? ' cur' : ''), letter: 'O', when: I18n.t(`ep6.${k}Short`), text: vals[i], i })),
          { cls: 'end' + (vals.every((v) => v) ? ' lit' : ''), letter: 'G', when: I18n.t('ep6.mapDestShort'), text: ctx.dest || '' },
        ];
        stops.forEach((st) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `grow-stop ${st.cls}`;
          b.innerHTML = '<span class="grow-letter"></span><span class="grow-dot"></span><span class="grow-when"></span><span class="grow-text"></span>';
          b.querySelector('.grow-letter').textContent = st.letter;
          b.querySelector('.grow-when').textContent = st.when;
          const tx = b.querySelector('.grow-text');
          tx.textContent = st.text || I18n.t('ep6.tapToWrite');
          if (!st.text) tx.classList.add('empty');
          if (st.i === undefined) b.disabled = true;
          else
            b.onclick = () => {
              save();
              cur = st.i;
              Sound.play('blip');
              render();
              input.focus();
            };
          route.appendChild(b);
        });
        // 불 들어온 선로: 앞에서부터 이어서 채운 역까지
        let n = 0;
        while (n < 3 && vals[n]) n++;
        const lit = vals.every((v) => v) ? 4 : n;
        route.querySelector('.grow-fill').style.width = `${(80 * lit) / 4}%`;
        const k = keys[cur];
        $('#grow-label').textContent = I18n.t(`ep6.${k}`);
        input.placeholder = I18n.t(`ep6.${k}Ph`);
        input.value = vals[cur];
        const box = $('#grow-ideas');
        box.innerHTML = '';
        I18n.t(`ep6.${k}Ideas`)
          .split('|')
          .forEach((idea) => {
            const c = document.createElement('button');
            c.type = 'button';
            c.className = 'chip';
            c.textContent = idea;
            c.onclick = () => {
              input.value = idea;
              used[cur] = true;
              save();
              Sound.play('blip');
              $('#ways-error').hidden = true;
              render();
            };
            box.appendChild(c);
          });
        const done = vals.every((v) => v);
        $('#ways-go').textContent = I18n.t(done ? 'ep6.waysGo' : 'ep6.nextStop');
      };
      input.oninput = () => {
        used[cur] = false;
        $('#ways-error').hidden = true;
        save();
        // 글자를 쓰는 동안 노선 위 이름만 바꾼다 (입력 칸 포커스 유지)
        const el = $('#grow-route').querySelectorAll('.grow-stop')[cur + 1].querySelector('.grow-text');
        el.textContent = vals[cur] || I18n.t('ep6.tapToWrite');
        el.classList.toggle('empty', !vals[cur]);
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') $('#ways-go').click();
      };
      $('#grow-ideas-btn').onclick = () => {
        Sound.play('blip');
        $('#grow-ideas').hidden = false;
        $('#grow-ideas-btn').hidden = true;
      };
      $('#ways-go').onclick = () => {
        save();
        if (!vals[cur]) {
          $('#ways-error').hidden = false;
          Sound.play('poof');
          return;
        }
        const next = vals.findIndex((v) => !v);
        if (next >= 0) {
          cur = next;
          Sound.play('select');
          $('#grow-ideas').hidden = true;
          $('#grow-ideas-btn').hidden = false;
          render();
          input.focus();
          return;
        }
        Sound.play('powerup');
        $('#ways-screen').hidden = true;
        resolve({ ways: vals.slice(), ideas: used.slice() });
      };
      $('#ways-error').hidden = true;
      $('#grow-ideas').hidden = true;
      $('#grow-ideas-btn').hidden = false;
      render();
      open('#ways-screen');
    });
  }

  // ---------- 만약 ~하면 ~한다 ----------
  // mambas: 4화 블랙맘바 카드, cards: 5화에 낸 우회 노선 카드 (태그가 맞았던 것 먼저)
  function plan(mambas, cards, prev = {}) {
    const L = lang();
    let m = mambas.find((c) => c.id === prev.m) ? prev.m : null;
    let c = cards.find((x) => x.id === prev.c) ? prev.c : null;
    return new Promise((resolve) => {
      const render = () => {
        const fill = (box, list, cur, set) => {
          box.innerHTML = '';
          list.forEach((item) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip';
            b.setAttribute('aria-pressed', String(item.id === cur));
            b.textContent = item.label;
            b.onclick = () => {
              set(item.id);
              Sound.play('blip');
              $('#plan-error').hidden = true;
              render();
            };
            box.appendChild(b);
          });
        };
        fill($('#plan-if'), mambas.map((x) => ({ id: x.id, label: x[L].word })), m, (v) => (m = v));
        fill($('#plan-then'), cards.map((x) => ({ id: x.id, label: x[L].name })), c, (v) => (c = v));
        const mm = mambas.find((x) => x.id === m);
        const cc = cards.find((x) => x.id === c);
        $('#plan-preview').textContent = Story.josa(
          I18n.t('ep6.planSentence')
            .replace('{if}', mm ? mm[L].word : '______')
            .replace('{then}', cc ? cc[L].act : '______')
        );
      };
      $('#plan-go').onclick = () => {
        if (!m || !c) {
          $('#plan-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Sound.play('select');
        $('#plan-screen').hidden = true;
        resolve({ m, c });
      };
      $('#plan-error').hidden = true;
      render();
      open('#plan-screen');
    });
  }

  // ---------- 이름 없는 역에 이름 붙이기 ----------
  function station(ideas, prev) {
    return new Promise((resolve) => {
      const input = $('#station-own');
      input.value = prev || '';
      const box = $('#station-ideas');
      box.innerHTML = '';
      let fromIdea = -1;
      ideas.forEach((idea, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = idea;
        b.onclick = () => {
          input.value = idea;
          fromIdea = i;
          Sound.play('blip');
          $('#station-error').hidden = true;
        };
        box.appendChild(b);
      });
      input.oninput = () => {
        fromIdea = -1;
        $('#station-error').hidden = true;
      };
      $('#station-go').onclick = () => {
        const v = input.value.trim().slice(0, 20);
        if (!v) {
          $('#station-error').hidden = false;
          Sound.play('poof');
          return;
        }
        Sound.play('select');
        $('#station-screen').hidden = true;
        resolve({ name: v, idea: fromIdea >= 0 && v === ideas[fromIdea] ? fromIdea : -1 });
      };
      $('#station-error').hidden = true;
      open('#station-screen');
      setTimeout(() => input.focus(), 50);
    });
  }

  // ---------- 나의 노선도 그리기 ----------
  // info = { passenger, type, avatar, color, station, ways[3], dest, shadow, plan, detours[] }
  // 낱말 단위로 줄을 바꾼다. 한 낱말이 너무 길면 글자 단위로 자른다
  function wrap(g, str, maxW) {
    const lines = [];
    let line = '';
    const push = (word) => {
      const next = line ? `${line} ${word}` : word;
      if (g.measureText(next).width <= maxW) {
        line = next;
        return;
      }
      if (line) lines.push(line);
      line = '';
      let part = '';
      for (const ch of word) {
        if (g.measureText(part + ch).width > maxW && part) {
          lines.push(part);
          part = ch;
        } else part += ch;
      }
      line = part;
    };
    String(str).split(/\s+/).filter(Boolean).forEach(push);
    if (line) lines.push(line);
    return lines;
  }

  function draw(canvas, info, tall) {
    const W = 1080;
    const H = tall ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const col = info.color || '#2fd3bf';
    const F = (size, bold) => `${bold ? '700 ' : ''}${size}px Galmuri11, monospace`;
    // 하늘: 위는 밤, 아래는 해 뜨는 색
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1030');
    sky.addColorStop(0.55, '#2c3566');
    sky.addColorStop(1, '#e8916a');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // 별
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const x = (i * 197) % W;
      const y = (i * 131) % (H * 0.45);
      g.globalAlpha = 0.25 + ((i * 7) % 10) / 20;
      g.fillRect(x, y, 4, 4);
    }
    g.globalAlpha = 1;
    // 해
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.arc(W * 0.78, H - 40, 120, Math.PI, 0);
    g.fill();
    // 도시 실루엣
    g.fillStyle = '#141a33';
    for (let x = 0, i = 0; x < W; i++) {
      const bw = 60 + ((i * 37) % 70);
      const bh = 70 + ((i * 53) % 160);
      g.fillRect(x, H - bh, bw, bh);
      x += bw + 6;
    }

    // 머리글
    const pad = 70;
    g.textBaseline = 'top';
    g.fillStyle = col;
    g.font = F(30, true);
    g.fillText('NEXT LINE', pad, pad);
    g.fillStyle = '#ffffff';
    g.font = F(tall ? 60 : 52, true);
    g.fillText(I18n.t('ep6.mapTitle'), pad, pad + 44);
    // 승객 카드 (오른쪽 위)
    const pc = document.createElement('canvas');
    pc.width = 24;
    pc.height = 32;
    Chars.portrait(pc, info.avatar, col);
    g.imageSmoothingEnabled = false;
    const ps = tall ? 5 : 4;
    const px0 = W - pad - 24 * ps;
    g.fillStyle = col;
    g.fillRect(px0 - 8, pad - 8, 24 * ps + 16, 32 * ps + 16);
    g.drawImage(pc, px0, pad, 24 * ps, 32 * ps);
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    g.font = F(28, true);
    g.fillText(info.passenger, px0 - 26, pad + 6);
    g.fillStyle = '#c4c9de';
    g.font = F(24);
    if (info.type) g.fillText(info.type, px0 - 26, pad + 46);
    g.textAlign = 'left';

    // 노선: 아래(지금 역) → 위(종착역)
    const top = tall ? 420 : 300;
    const bottom = tall ? 1100 : 860;
    const lx = pad + 50;
    g.fillStyle = col;
    g.fillRect(lx - 9, top, 18, bottom - top);
    const stops = [
      { tag: I18n.t('ep6.mapDest'), name: info.dest, big: true },
      { tag: I18n.t('ep6.mapW3'), name: info.ways[2] },
      { tag: I18n.t('ep6.mapW2'), name: info.ways[1] },
      { tag: I18n.t('ep6.mapW1'), name: info.ways[0] },
      { tag: I18n.t('ep6.mapNow'), name: info.station, big: true },
    ];
    const textW = tall ? W - lx - 120 : 430;
    stops.forEach((s, i) => {
      const y = top + ((bottom - top) * i) / (stops.length - 1);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(lx, y, s.big ? 30 : 22, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = col;
      g.stroke();
      g.fillStyle = col;
      g.font = F(22, true);
      g.fillText(s.tag, lx + 56, y - 40);
      g.fillStyle = '#ffffff';
      g.font = F(s.big ? 38 : 32, true);
      wrap(g, s.name, textW)
        .slice(0, 2)
        .forEach((ln, k) => g.fillText(ln, lx + 56, y - 8 + k * 42));
    });

    // 그림자와 우회 노선, 약속
    const bx = tall ? pad : 640;
    const by = tall ? 1190 : 300;
    const bw = tall ? W - pad * 2 : W - 640 - pad;
    let y = by;
    const box = (h) => {
      g.fillStyle = 'rgba(8, 10, 24, 0.82)';
      g.fillRect(bx, y, bw, h);
      g.fillStyle = col;
      g.fillRect(bx, y, 8, h);
    };
    g.font = F(26);
    const planLines = wrap(g, info.plan, bw - 60);
    const dets = info.detours.slice(0, 3);
    g.font = F(28, true);
    const shadowLines = wrap(g, info.shadow, bw - 60).slice(0, 2);
    const h1 = 66 + shadowLines.length * 36 + dets.length * 40;
    box(h1);
    g.fillStyle = '#c9a8ff';
    g.font = F(22, true);
    g.fillText(I18n.t('ep6.mapShadow'), bx + 30, y + 20);
    g.fillStyle = '#ffcf4a';
    g.font = F(28, true);
    shadowLines.forEach((ln, i) => g.fillText(ln, bx + 30, y + 52 + i * 36));
    const dy = y + 56 + shadowLines.length * 36;
    g.fillStyle = '#e6e9f5';
    g.font = F(24);
    dets.forEach((d, i) => g.fillText(`↪ ${d}`, bx + 30, dy + i * 40));
    y += h1 + 20;
    const h2 = 74 + planLines.length * 36;
    box(h2);
    g.fillStyle = col;
    g.font = F(22, true);
    g.fillText(I18n.t('ep6.mapPlan'), bx + 30, y + 20);
    g.fillStyle = '#ffffff';
    g.font = F(26);
    planLines.forEach((ln, i) => g.fillText(ln, bx + 30, y + 58 + i * 36));

    // 아래 글
    g.fillStyle = '#ffffff';
    g.font = F(tall ? 34 : 28, true);
    g.textAlign = 'center';
    g.fillText(I18n.t('ep6.mapFoot'), W / 2, H - (tall ? 320 : 120));
    g.textAlign = 'left';
  }

  // ---------- 프로필 카드 (승객 카드) ----------
  // p = { passenger, code, avatar, color, primary:{name,line}, secondary:{name}, summary, strengths[], study, fuels:[{label,color,n}], dest }
  function drawProfile(canvas, p, tall) {
    const W = 1080;
    const H = tall ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const col = p.color || '#2fd3bf';
    const F = (size, bold) => `${bold ? '700 ' : ''}${size}px Galmuri11, monospace`;
    g.textBaseline = 'top';
    g.fillStyle = '#0b0e1e';
    g.fillRect(0, 0, W, H);
    // 카드 몸통 (승차권처럼 위에 노선색 띠)
    const m = tall ? 60 : 36;
    const top = tall ? 330 : m;
    const ch = tall ? 1120 : H - m * 2;
    g.fillStyle = '#f3efe2';
    g.fillRect(m, top, W - m * 2, ch);
    g.fillStyle = col;
    g.fillRect(m, top, W - m * 2, 96);
    g.fillStyle = '#0b0e1e';
    g.font = F(30, true);
    g.fillText('NEXT LINE', m + 40, top + 20);
    g.font = F(24);
    g.fillText(I18n.t('ep6.profileTag'), m + 40, top + 58);
    g.textAlign = 'right';
    g.font = F(26, true);
    g.fillText(p.line, W - m - 40, top + 34);
    g.textAlign = 'left';
    // 초상화
    const pc = document.createElement('canvas');
    pc.width = 24;
    pc.height = 32;
    Chars.portrait(pc, p.avatar, col);
    g.imageSmoothingEnabled = false;
    const ps = tall ? 8 : 7;
    const ax = m + 40;
    const ay = top + 130;
    g.fillStyle = col;
    g.fillRect(ax - 8, ay - 8, 24 * ps + 16, 32 * ps + 16);
    g.drawImage(pc, ax, ay, 24 * ps, 32 * ps);
    // 이름과 유형
    const tx = ax + 24 * ps + 50;
    const tw = W - m - 40 - tx;
    g.fillStyle = '#5a6078';
    g.font = F(24);
    g.fillText(I18n.t('hud.passenger'), tx, ay);
    g.fillStyle = '#0b0e1e';
    g.font = F(44, true);
    g.fillText(p.passenger, tx, ay + 34);
    g.font = F(34, true);
    g.fillStyle = col;
    g.fillRect(tx, ay + 102, g.measureText(p.code).width + 40, 52);
    g.fillStyle = '#ffffff';
    g.fillText(p.code, tx + 20, ay + 110);
    g.fillStyle = '#0b0e1e';
    g.font = F(34, true);
    let y = ay + 176;
    wrap(g, p.primary, tw).forEach((ln) => {
      g.fillText(ln, tx, y);
      y += 42;
    });
    if (p.secondary) {
      g.fillStyle = '#5a6078';
      g.font = F(24);
      wrap(g, `+ ${p.secondary}`, tw).forEach((ln) => {
        g.fillText(ln, tx, y + 4);
        y += 32;
      });
    }
    // 아래 칸들
    let by = ay + 32 * ps + 50;
    const bx = m + 40;
    const bw = W - m * 2 - 80;
    const label = (str) => {
      g.fillStyle = col;
      g.fillRect(bx, by + 6, 8, 24);
      g.fillStyle = '#5a6078';
      g.font = F(24, true);
      g.fillText(str, bx + 20, by + 4);
      by += 42;
    };
    // 강점
    label(I18n.t('ep6.profileStrengths'));
    let cx = bx;
    g.font = F(28, true);
    p.strengths.forEach((st) => {
      const w = g.measureText(st).width + 36;
      g.fillStyle = '#0b0e1e';
      g.fillRect(cx, by, w, 48);
      g.fillStyle = '#ffffff';
      g.fillText(st, cx + 18, by + 9);
      cx += w + 12;
    });
    by += 72;
    // 연료 게이지
    label(I18n.t('ep6.profileFuel'));
    const cols = tall || I18n.lang === 'en' ? 2 : 3;
    const cw = (bw - (cols - 1) * 20) / cols;
    const maxN = Math.max(1, ...p.fuels.map((f) => f.n));
    p.fuels.forEach((f, i) => {
      const x = bx + (i % cols) * (cw + 20);
      const yy = by + Math.floor(i / cols) * 46;
      g.fillStyle = '#0b0e1e';
      g.font = F(22, f.main);
      const lw = Math.min(cw * 0.55, Math.max(110, g.measureText(f.label).width + 14));
      g.fillText(f.label, x, yy + 6);
      const gx = x + lw;
      const gw = cw - lw;
      g.fillStyle = '#d8d3c4';
      g.fillRect(gx, yy + 8, gw, 20);
      g.fillStyle = f.color;
      g.fillRect(gx, yy + 8, (gw * f.n) / maxN, 20);
    });
    by += Math.ceil(p.fuels.length / cols) * 46 + 26;
    // 공부 팁과 종착역
    const textBlock = (title, body, size) => {
      label(title);
      g.fillStyle = '#0b0e1e';
      g.font = F(size);
      wrap(g, body, bw).slice(0, 2).forEach((ln) => {
        g.fillText(ln, bx, by);
        by += size + 12;
      });
      by += 18;
    };
    textBlock(I18n.t('ep6.profileStudy'), p.study, 26);
    textBlock(I18n.t('ep6.mapDest'), p.dest, 28);
    // 아래 글
    g.fillStyle = '#ffffff';
    g.font = F(tall ? 34 : 26, true);
    g.textAlign = 'center';
    if (tall) g.fillText(I18n.t('ep6.mapFoot'), W / 2, top + ch + 80);
    g.textAlign = 'left';
  }

  // ---------- 카드 화면: 노선도·프로필 카드, 저장(정사각형·배경화면), 인쇄 ----------
  function show(info, onSave) {
    let kind = 'route';
    const paint = (c, tall) => (kind === 'route' ? draw(c, info, tall) : drawProfile(c, info.profile, tall));
    return new Promise((resolve) => {
      const preview = $('#routemap-canvas');
      const render = () => paint(preview, false);
      const tabs = $('#card-tabs');
      tabs.innerHTML = '';
      ['route', 'profile'].forEach((k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tab';
        b.dataset.kind = k;
        b.textContent = I18n.t(k === 'route' ? 'ep6.mapTitle' : 'ep6.profileTitle');
        b.onclick = () => {
          kind = k;
          Sound.play('blip');
          tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.kind === kind)));
          render();
        };
        b.setAttribute('aria-pressed', String(k === kind));
        tabs.appendChild(b);
      });
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(render);
      render();
      const save = (tall) => {
        const c = document.createElement('canvas');
        paint(c, tall);
        const name = `next-line-${kind}${tall ? '-wallpaper' : ''}.png`;
        c.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }, 'image/png');
        Sound.play('select');
        if (onSave) onSave(`${kind}-${tall ? 'wallpaper' : 'square'}`);
      };
      $('#routemap-save').onclick = () => save(false);
      $('#routemap-wall').onclick = () => save(true);
      $('#routemap-print').onclick = () => {
        const c = document.createElement('canvas');
        paint(c, false);
        $('#print-img').src = c.toDataURL('image/png');
        Sound.play('select');
        if (onSave) onSave(`${kind}-print`);
        setTimeout(() => window.print(), 200);
      };
      $('#routemap-go').onclick = () => {
        Sound.play('select');
        $('#routemap-screen').hidden = true;
        resolve();
      };
      open('#routemap-screen');
    });
  }

  window.Finale = { ways, plan, station, draw, drawProfile, show };
})();
