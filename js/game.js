// 캔버스 장면: 타이틀(밤의 도시), 1인칭 승강장(둘러보기), 지하 통로(옆에서 걷기), 첫차 도착.
// 게임 좌표는 320×180. 매 프레임 4배 버퍼에 그린 뒤 화면 해상도로 확대한다.
(function () {
  const W = 320;
  const H = 180;

  let canvas;
  let ctx;
  let buf;
  let g;
  let t = 0;
  let last = 0;

  const C = {
    K: '#0b0c16',
    line: '#2fd3bf',
    lineDim: '#1f7f75',
    skin: '#e9c3a0',
    skinDark: '#c99a78',
    hood: '#565c70',
    hoodDark: '#41465a',
    navy: '#1f2a4a',
    navy2: '#2b3a64',
    amber: '#ffbe4a',
  };

  const S = {
    scene: 'title', // 'title' | 'platform' | 'underpass' | 'arrival'
    phase: 0, // 0 한밤 → 1 해 뜸
    cam: 480, // 승강장 파노라마에서 화면 가운데의 x
    camT: 480,
    nova: null, // { x, tx }
    jam: null, // { x, y, a }
    walker: { x: 40, dir: 1, moving: 0, target: null, step: 0 },
    keys: { left: false, right: false },
    hands: false,
    look: false,
    walk: false,
    seen: {},
    fade: 1,
    fadeT: 0,
    train: 0,
    lids: 1, // 1 뜬 눈, 0 감은 눈
    lidsT: 1,
    dream: false,
  };

  // ---------- 그리기 도구 ----------
  function r(x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  }

  // 정해진 순서로 나오는 난수 (도시 건물 모양이 매번 같게)
  function rng(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function mix(a, b, p) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - p) + ((pb >> sh) & 255) * p);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // 부분(사각형) 목록으로 된 캐릭터: 먼저 윤곽선을 1픽셀 두르고 색을 채운다
  function shape(parts, x, y, u, flip = false, w = 20) {
    const px = (p) => (flip ? x + (w - p[0] - p[2]) * u : x + p[0] * u);
    parts.forEach((p) => r(px(p) - 1, y + p[1] * u - 1, p[2] * u + 2, p[3] * u + 2, C.K));
    parts.forEach((p) => r(px(p), y + p[1] * u, p[2] * u, p[3] * u, p[4]));
  }

  function text(str, x, y, color, size = 11, align = 'left') {
    g.font = `${size}px Galmuri11, monospace`;
    g.textAlign = align;
    g.textBaseline = 'top';
    g.fillStyle = color;
    g.fillText(str, Math.round(x), Math.round(y));
  }

  // ---------- 하늘과 도시 ----------
  function sky(p) {
    const top = mix('#04050d', '#4f74b8', p);
    const mid = mix('#0e1230', '#9fb4dc', p);
    const low = mix('#1c1d48', '#ffbf86', p);
    const rows = [top, mid, low];
    for (let i = 0; i < 3; i++) r(0, i * 40, W, 40, rows[i]);
    // 경계는 체크무늬로 섞는다
    for (let i = 1; i < 3; i++) {
      g.fillStyle = rows[i];
      for (let y = i * 40 - 3; y < i * 40; y++) for (let x = y % 2; x < W; x += 2) g.fillRect(x, y, 1, 1);
    }
    r(0, 120, W, 60, low);
    const rand = rng(7);
    const starA = Math.max(0, 1 - p * 1.6);
    if (starA > 0) {
      g.globalAlpha = starA;
      for (let i = 0; i < 46; i++) {
        const sx = Math.floor(rand() * W);
        const sy = Math.floor(rand() * 80);
        if ((Math.floor(t * 2 + i) % 7) !== 0) r(sx, sy, 1, 1, i % 5 ? '#c9d2ff' : '#ffffff');
      }
      g.globalAlpha = 1;
    }
  }

  function skyline(p) {
    const far = mix('#121631', '#6c7aa6', p);
    const near = mix('#0a0c1c', '#3c4466', p);
    let rand = rng(11);
    for (let x = -4; x < W; ) {
      const w = 14 + Math.floor(rand() * 18);
      const h = 30 + Math.floor(rand() * 46);
      r(x, 128 - h, w, h, far);
      x += w + 1;
    }
    rand = rng(23);
    for (let x = -6; x < W; ) {
      const w = 18 + Math.floor(rand() * 24);
      const h = 22 + Math.floor(rand() * 34);
      r(x, 140 - h, w, h, near);
      // 불 켜진 창문 (밤에만)
      if (p < 0.7) {
        for (let wy = 140 - h + 4; wy < 134; wy += 6) {
          for (let wx = x + 3; wx < x + w - 3; wx += 5) {
            if (rand() < 0.28) r(wx, wy, 2, 2, rand() < 0.2 ? '#7fe7d8' : '#ffd98a');
          }
        }
      }
      x += w + 2;
    }
  }

  function elevated(p) {
    const beam = mix('#07080f', '#2a3048', p);
    r(0, 128, W, 6, beam);
    r(0, 127, W, 1, mix('#2fd3bf', '#9ff5ea', p));
    for (let x = 10; x < W; x += 44) r(x, 134, 6, 46, beam);
    r(0, 170, W, 10, mix('#05060c', '#22283c', p));
  }

  function trainSide(x, y, len) {
    r(x, y, len, 18, '#c7cbd9');
    r(x, y + 12, len, 3, C.line);
    r(x, y, len, 1, '#e9ecf4');
    for (let wx = x + 8; wx < x + len - 10; wx += 16) r(wx, y + 3, 10, 6, '#ffe39a');
    r(x - 6, y + 2, 6, 14, '#aeb3c4');
    r(x - 6, y + 6, 2, 3, '#fff6c8');
    for (let wx = x + 10; wx < x + len; wx += 30) r(wx, y + 18, 6, 2, '#1a1c26');
  }

  function drawTitle() {
    sky(S.phase);
    skyline(S.phase);
    elevated(S.phase);
    // 노선 위를 지나가는 열차
    const x = 340 - ((t * 38) % 560);
    trainSide(x, 109, 150);
  }

  // ---------- 1인칭 승강장 (가로 960 파노라마) ----------
  const PANO = 960;
  const HOT = [
    { id: 'vending', x: 26, y: 70, w: 56, h: 82 },
    { id: 'poster', x: 190, y: 50, w: 46, h: 52 },
    { id: 'sign', x: 400, y: 52, w: 160, h: 26 },
    { id: 'graffiti', x: 618, y: 84, w: 54, h: 18 },
    { id: 'board', x: 760, y: 14, w: 132, h: 30 },
  ];

  function drawPlatform() {
    const L = S.cam - W / 2;
    const px = (x) => x - L;
    const lit = S.phase;
    // 천장과 조명
    r(0, 0, W, 34, mix('#0c0f1d', '#1c2236', lit));
    for (let x = 20; x < PANO; x += 80) {
      r(px(x), 9, 40, 3, '#dfe8ff');
      g.globalAlpha = 0.18;
      r(px(x) - 6, 12, 52, 4, '#dfe8ff');
      g.globalAlpha = 1;
    }
    // 건너편 벽
    r(0, 34, W, 76, '#1a2136');
    for (let y = 42; y < 110; y += 8) r(0, y, W, 1, '#202a44');
    for (let x = 0; x < PANO; x += 16) r(px(x), 34, 1, 76, '#202a44');
    r(0, 46, W, 3, C.lineDim);
    // 역 이름판 (아직 비어 있음)
    r(px(400), 52, 160, 26, '#e9ecf2');
    r(px(400), 52, 160, 4, C.line);
    text(S.signName || '? ? ?', px(480), 59, '#2a3048', 11, 'center');
    text('NEXT LINE', px(404), 70, '#8a90a6', 8);
    // 광고판 (공부 팁)
    r(px(190), 50, 46, 52, '#11274a');
    r(px(193), 53, 40, 30, '#2e6fb0');
    r(px(199), 59, 28, 4, '#cfe6ff');
    r(px(199), 66, 20, 3, '#cfe6ff');
    r(px(199), 72, 24, 3, '#cfe6ff');
    r(px(193), 86, 40, 12, '#0c1a33');
    text('TIP', px(213), 87, '#ffd98a', 8, 'center');
    // 다른 광고들
    r(px(300), 54, 40, 44, '#3a2148');
    r(px(306), 60, 28, 20, '#d0679a');
    r(px(700), 54, 40, 44, '#203d34');
    r(px(706), 60, 28, 20, '#4bc18f');
    // 벽 낙서
    text('다음 역은', px(622), 86, '#ff8fb8', 8);
    text('내가 정한다', px(622), 94, '#ff8fb8', 8);
    // 선로
    r(0, 110, W, 30, '#06070c');
    for (let x = 4; x < PANO; x += 12) r(px(x), 127, 8, 10, '#1b1712');
    r(0, 124, W, 2, '#8b90a6');
    r(0, 134, W, 2, '#8b90a6');
    r(0, 124, W, 1, '#c3c8da');
    r(0, 134, W, 1, '#c3c8da');
    // 우리 쪽 승강장
    r(0, 140, W, 40, '#2a2f42');
    r(0, 140, W, 6, '#c9a43a');
    for (let x = 0; x < PANO; x += 3) r(px(x), 142, 1, 1, '#8a6f22');
    for (let x = 0; x < PANO; x += 40) r(px(x), 146, 1, 34, '#232838');
    // 자판기 (가까이 있음)
    const vx = px(26);
    r(vx, 70, 56, 82, '#23356a');
    r(vx + 4, 74, 34, 50, '#bfe6ff');
    const cans = ['#e8414f', '#ffd23f', '#3cf29a', '#5b8cff', '#ff8fb8'];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) r(vx + 7 + col * 6, 78 + row * 12, 4, 8, cans[(row + col) % 5]);
    r(vx + 42, 80, 10, 14, '#0f1730');
    r(vx + 44, 98, 6, 3, '#ffd98a');
    r(vx + 4, 128, 34, 10, '#0f1730');
    g.globalAlpha = 0.12 + 0.04 * Math.sin(t * 3);
    r(vx - 6, 66, 68, 92, '#bfe6ff');
    g.globalAlpha = 1;
    // 시간표 전광판 (천장에 매달림)
    const bx = px(760);
    r(bx + 30, 0, 2, 14, '#3a3f52');
    r(bx + 100, 0, 2, 14, '#3a3f52');
    r(bx, 14, 132, 30, '#05060a');
    r(bx, 14, 132, 1, '#3a3f52');
    text(I18n.t('scene.boardNext'), bx + 6, 17, C.amber, 8);
    text('--:--', bx + 126, 17, C.amber, 8, 'right');
    text(I18n.t('scene.boardDest'), bx + 6, 30, C.amber, 8);
    text(I18n.t('scene.boardUnknown'), bx + 126, 30, (Math.floor(t * 2) % 2 ? C.amber : '#7a5a20'), 8, 'right');
    // 계단과 출구 표시
    const sx = px(900);
    for (let i = 0; i < 6; i++) r(sx + i * 8, 140 - i * 10, 60, 10, i % 2 ? '#2f3549' : '#353c52');
    r(px(906), 58, 44, 12, '#1d7a4a');
    text(I18n.t('scene.exit'), px(928), 60, '#e8fff2', 8, 'center');
    // 둘러보기 중이면 아직 안 본 곳에 표시
    if (S.look) {
      HOT.forEach((h) => {
        if (S.seen[h.id]) return;
        const bob = Math.round(Math.sin(t * 4) * 2);
        r(px(h.x + h.w / 2) - 2, h.y - 10 + bob, 4, 6, '#ffe14a');
        r(px(h.x + h.w / 2) - 2, h.y - 2 + bob, 4, 2, '#ffe14a');
      });
    }
    if (S.nova) drawNova(px(S.nova.x), 76);
    if (S.jam) drawJam(px(S.jam.x), S.jam.y);
  }

  // ---------- 노바 (야간 안내원) ----------
  const NOVA = [
    [5, 0, 10, 3, C.navy],
    [5, 3, 10, 1, C.line],
    [4, 4, 12, 1, '#121830'],
    [5, 5, 10, 3, '#2a1f2e'],
    [7, 5, 6, 7, C.skin],
    [5, 5, 2, 7, '#2a1f2e'],
    [13, 5, 2, 7, '#2a1f2e'],
    [4, 13, 12, 14, C.navy],
    [9, 13, 2, 10, C.navy2],
    [2, 14, 2, 11, C.navy],
    [16, 14, 2, 11, C.navy],
    [2, 25, 2, 2, C.skin],
    [16, 25, 2, 2, C.skin],
    [6, 27, 3, 10, '#151a2c'],
    [11, 27, 3, 10, '#151a2c'],
    [5, 37, 4, 2, '#0b0c16'],
    [11, 37, 4, 2, '#0b0c16'],
  ];

  function drawNova(x, y) {
    const u = 2;
    shape(NOVA, x - 20, y, u);
    // 눈 (가끔 깜빡임), 단추, 랜턴
    const blink = Math.floor(t * 10) % 40 === 0;
    r(x - 20 + 8 * u, y + 8 * u, u, blink ? 1 : u, C.K);
    r(x - 20 + 11 * u, y + 8 * u, u, blink ? 1 : u, C.K);
    r(x - 20 + 9 * u, y + 10 * u, 2 * u, 1, C.skinDark);
    for (let i = 0; i < 3; i++) r(x - 20 + 8 * u, y + (16 + i * 3) * u, u, u, '#d8b04a');
    r(x - 20 + 4 * u, y + 22 * u, 12 * u, u, '#121830');
    const lx = x - 20 + 16 * u;
    const ly = y + 27 * u;
    r(lx, ly, 3 * u, 4 * u, '#ffd35a');
    r(lx, ly, 3 * u, 1, '#8a6a20');
    g.globalAlpha = 0.18 + 0.06 * Math.sin(t * 5);
    r(lx - 8, ly - 6, 3 * u + 16, 4 * u + 12, '#ffd35a');
    g.globalAlpha = 1;
  }

  // ---------- 정체 (멈추자고 하는 목소리) ----------
  function drawJam(x, y) {
    const bob = Math.sin(t * 2.4) * 3;
    const yy = y + bob;
    g.globalAlpha = 0.9;
    shape(
      [
        [3, 0, 8, 2, '#4b4560'],
        [1, 2, 12, 8, '#4b4560'],
        [0, 4, 14, 5, '#4b4560'],
        [2, 10, 4, 2, '#4b4560'],
        [8, 10, 4, 2, '#4b4560'],
        [3, 3, 6, 2, '#6a6385'],
      ],
      x - 14,
      yy,
      2
    );
    g.globalAlpha = 1;
    // 졸린 눈
    r(x - 14 + 6, yy + 12, 6, 1, '#e8e2ff');
    r(x - 14 + 16, yy + 12, 6, 1, '#e8e2ff');
    r(x - 14 + 10, yy + 17, 8, 1, '#2a2638');
    const zz = Math.floor(t * 1.5) % 3;
    text('z', x + 14, yy - 6 - zz * 3, '#b9b2e0', 8);
  }

  // ---------- 내 손 (1인칭) ----------
  function drawHands() {
    const bob = Math.round(Math.sin(t * 1.8) * 1.2);
    const sway = Math.round((S.camT - S.cam) * 0.04);
    // 왼손
    r(18 - sway, 160 + bob, 52, 20, C.hood);
    r(18 - sway, 160 + bob, 52, 3, C.hoodDark);
    r(30 - sway, 148 + bob, 26, 14, C.skin);
    for (let i = 0; i < 4; i++) r(31 - sway + i * 6, 147 + bob, 5, 3, C.skin);
    r(30 - sway, 160 + bob, 26, 1, C.skinDark);
    // 오른손에 든 승차권 (엄지가 왼쪽 아래 모서리를 잡고 있다)
    const tx = 192 - sway;
    const ty = 110 + bob;
    r(tx - 1, ty - 1, 86, 48, C.K);
    r(tx, ty, 84, 46, '#efe8d6');
    r(tx, ty, 84, 8, C.line);
    text('NEXT LINE', tx + 4, ty + 1, '#0b2b28', 6);
    r(tx + 70, ty + 2, 10, 4, '#0b2b28');
    text(I18n.t('scene.ticketFrom'), tx + 4, ty + 12, '#4a4538', 6);
    text(I18n.t('scene.ticketTo'), tx + 4, ty + 24, '#4a4538', 6);
    for (let x = tx + 26; x < tx + 78; x += 4) r(x, ty + 30, 2, 1, '#b0a890');
    // 손가락은 승차권 뒤에서 받치고, 엄지는 앞에서 누른다
    r(tx + 30, ty + 44, 34, 14, C.skin);
    r(tx + 30, ty + 44, 34, 1, C.skinDark);
    r(tx + 14, ty + 36, 14, 10, C.skin);
    r(tx + 14, ty + 36, 1, 10, C.skinDark);
    r(tx + 24, ty + 54, 50, 20, C.hood);
    r(tx + 24, ty + 54, 50, 3, C.hoodDark);
  }

  // ---------- 지하 통로 (옆에서 걷기, 가로 640) ----------
  const TUNNEL = 640;
  const POSTERS = [
    { id: 'lost', x: 150 },
    { id: 'tip2', x: 320 },
    { id: 'wall', x: 470 },
  ];

  function drawUnderpass() {
    const L = Math.max(0, Math.min(TUNNEL - W, S.walker.x - W / 2));
    const px = (x) => x - L;
    r(0, 0, W, 30, '#0f121b');
    for (let x = 30; x < TUNNEL; x += 70) {
      r(px(x), 12, 30, 3, '#cfe0ff');
      g.globalAlpha = 0.1;
      r(px(x) - 6, 15, 42, 6, '#cfe0ff');
      g.globalAlpha = 1;
    }
    r(0, 30, W, 102, '#232a3d');
    for (let y = 38; y < 132; y += 10) r(0, y, W, 1, '#2a3248');
    for (let x = 0; x < TUNNEL; x += 20) r(px(x), 30, 1, 102, '#2a3248');
    r(0, 96, W, 4, C.lineDim);
    // 포스터
    const colors = { lost: ['#3b2a18', '#d9a24a'], tip2: ['#11274a', '#5aa0e0'], wall: ['#2a1630', '#ff8fb8'] };
    POSTERS.forEach((p) => {
      const [bg, fg] = colors[p.id];
      r(px(p.x) - 22, 44, 44, 40, bg);
      r(px(p.x) - 18, 48, 36, 18, fg);
      r(px(p.x) - 18, 70, 28, 3, fg);
      r(px(p.x) - 18, 76, 20, 3, fg);
      if (S.walk && !S.seen[p.id] && Math.abs(S.walker.x - p.x) < 30) {
        const bob = Math.round(Math.sin(t * 5) * 2);
        r(px(p.x) - 2, 32 + bob, 4, 6, '#ffe14a');
        r(px(p.x) - 2, 40 + bob, 4, 2, '#ffe14a');
      }
    });
    // 끝의 계단
    const sx = px(590);
    for (let i = 0; i < 6; i++) r(sx + i * 8, 132 - i * 12, 80, 12, i % 2 ? '#30374d' : '#3a4259');
    r(px(560), 50, 70, 14, '#1d7a4a');
    text(I18n.t('scene.toPlatform'), px(595), 53, '#e8fff2', 8, 'center');
    // 바닥
    r(0, 132, W, 48, '#2d3346');
    r(0, 132, W, 2, '#3c4359');
    for (let x = 0; x < TUNNEL; x += 32) r(px(x), 134, 1, 46, '#262b3c');
    drawWalker(px(S.walker.x), 160);
  }

  // 후드를 쓴 나 (옆모습, 2화 전까지 얼굴이 그늘에 가려 보이지 않는다)
  function drawWalker(x, feetY) {
    const u = 2;
    const f = S.walker.moving ? Math.floor(S.walker.step) % 2 : -1;
    const flip = S.walker.dir < 0;
    const legs =
      f === 0
        ? [[3, 17, 3, 7, '#1d2233'], [7, 17, 3, 6, '#1d2233']]
        : f === 1
          ? [[3, 17, 3, 6, '#1d2233'], [7, 17, 3, 7, '#1d2233']]
          : [[3, 17, 3, 7, '#1d2233'], [6, 17, 3, 7, '#1d2233']];
    const parts = [
      [3, 0, 6, 1, C.hood],
      [2, 1, 8, 2, C.hood],
      [1, 3, 9, 6, C.hood],
      [2, 9, 8, 8, C.hood],
      ...legs,
    ];
    const ox = x - 12;
    const oy = feetY - 24 * u;
    shape(parts, ox, oy, u, flip, 12);
    // 후드 속 그늘진 얼굴과 코끝
    const fx = (c, w) => (flip ? ox + (12 - c - w) * u : ox + c * u);
    r(fx(7, 3), oy + 3 * u, 3 * u, 5 * u, '#141622');
    r(fx(9, 1), oy + 5 * u, u, 2 * u, C.skinDark);
    r(fx(2, 8), oy + 9 * u, 8 * u, u, C.hoodDark);
    // 팔 (걸을 때 앞뒤로)
    const swing = f === 0 ? 1 : f === 1 ? -1 : 0;
    r(fx(5 + swing, 2), oy + 10 * u, 2 * u, 6 * u, C.hoodDark);
    r(fx(5 + swing, 2), oy + 16 * u, 2 * u, u, C.skin);
    // 신발
    r(ox + 2 * u, feetY - 2, 4 * u, 2, '#e9ecf2');
    r(ox + 6 * u, feetY - 2, 4 * u, 2, '#e9ecf2');
  }

  // ---------- 첫차 도착 (옆에서, 하늘이 조금 밝아짐) ----------
  function drawArrival() {
    sky(S.phase);
    skyline(S.phase);
    elevated(S.phase);
    const tx = 330 - Math.min(1, S.train) * 250;
    trainSide(tx, 109, 200);
    // 승강장에 선 나 (작게)
    drawWalkerSmall(60, 127);
  }

  function drawWalkerSmall(x, feetY) {
    r(x - 3, feetY - 13, 6, 6, C.hood);
    r(x - 4, feetY - 8, 8, 6, C.hood);
    r(x - 3, feetY - 2, 2, 2, '#1d2233');
    r(x + 1, feetY - 2, 2, 2, '#1d2233');
  }

  // 눈꺼풀: 위아래 검은 막이 열리고 닫힌다 (가장자리는 체크무늬로 부드럽게)
  function drawLids() {
    const open = Math.max(0, Math.min(1, S.lids));
    const h = Math.round((H / 2 + 6) * (1 - open));
    if (h <= 0) return;
    r(0, 0, W, h, '#000000');
    r(0, H - h, W, h, '#000000');
    g.fillStyle = '#000000';
    for (let y = 0; y < 4; y++) {
      for (let x = y % 2; x < W; x += 2) {
        g.fillRect(x, h + y, 1, 1);
        g.fillRect(x, H - h - 1 - y, 1, 1);
      }
    }
  }

  // ---------- 프레임 ----------
  function update(dt) {
    S.cam += (S.camT - S.cam) * Math.min(1, dt * 7);
    S.fade += (S.fadeT - S.fade) * Math.min(1, dt * 4);
    S.lids += (S.lidsT - S.lids) * Math.min(1, dt * 6);
    if (S.nova && S.nova.tx !== undefined) S.nova.x += (S.nova.tx - S.nova.x) * Math.min(1, dt * 3);
    if (S.jam) {
      S.jam.a = Math.min(1, (S.jam.a || 0) + dt * 2);
      S.jam.x += (S.jam.tx - S.jam.x) * Math.min(1, dt * 2);
    }
    if (S.scene === 'arrival') S.train = Math.min(1, S.train + dt * 0.35);
    if (S.scene === 'underpass' && S.walk) {
      const w = S.walker;
      let dir = 0;
      if (S.keys.left) dir = -1;
      if (S.keys.right) dir = 1;
      if (!dir && w.target !== null) {
        if (Math.abs(w.target - w.x) < 2) w.target = null;
        else dir = Math.sign(w.target - w.x);
      }
      w.moving = dir !== 0;
      if (dir) {
        w.dir = dir;
        w.x = Math.max(16, Math.min(TUNNEL - 30, w.x + dir * dt * 70));
        w.step += dt * 6;
        if (Math.floor(w.step * 2) !== Math.floor((w.step - dt * 6) * 2) && Math.floor(w.step) % 2 === 0) Sound.play('blip');
      }
      if (w.x >= 588 && S.onExit) {
        const cb = S.onExit;
        S.onExit = null;
        S.walk = false;
        w.moving = false;
        cb();
      }
    }
  }

  function draw() {
    if (S.scene === 'title') drawTitle();
    else if (S.scene === 'platform') {
      if (S.dream) S.cam = S.camT + Math.sin(t * 1.2) * 6;
      drawPlatform();
    }
    else if (S.scene === 'underpass') drawUnderpass();
    else if (S.scene === 'arrival') drawArrival();
    if (S.dream) {
      // 꿈: 아침빛이 번지고 화면이 출렁인다
      g.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.5);
      r(0, 0, W, H, '#fff4e0');
      g.globalAlpha = 1;
    }
    if (S.hands && S.scene === 'platform' && !S.dream) drawHands();
    if (S.lids < 0.999) drawLids();
    if (S.fade > 0.01) {
      g.globalAlpha = S.fade;
      r(0, 0, W, H, '#000000');
      g.globalAlpha = 1;
    }
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    t += dt;
    update(dt);
    draw();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(frame);
  }

  // 화면 좌표 → 게임 좌표
  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }

  window.Game = {
    W,
    H,
    init(el) {
      canvas = el;
      ctx = canvas.getContext('2d');
      // 버퍼는 4배로 그린다: 도형은 게임 픽셀 단위로 각지게, 글자는 작게 써도 또렷하게
      buf = document.createElement('canvas');
      buf.width = W * 4;
      buf.height = H * 4;
      g = buf.getContext('2d');
      g.setTransform(4, 0, 0, 4, 0, 0);
      canvas.addEventListener('click', (e) => this.click(toGame(e)));
      requestAnimationFrame(frame);
    },
    resize(cssScale) {
      const k = Math.max(1, Math.round(cssScale * (window.devicePixelRatio || 1)));
      canvas.width = W * k;
      canvas.height = H * k;
    },
    scene(name, opts = {}) {
      S.scene = name;
      S.hands = name === 'platform';
      S.look = false;
      S.walk = false;
      S.nova = null;
      S.jam = null;
      if (opts.phase !== undefined) S.phase = opts.phase;
      if (name === 'platform') {
        S.cam = S.camT = 480;
      }
      if (name === 'underpass') {
        S.walker = { x: 40, dir: 1, moving: false, target: null, step: 0 };
      }
      if (name === 'arrival') S.train = 0;
    },
    dream(on) {
      S.dream = on;
    },
    // 눈 뜨기·감기. 0이면 감은 눈. 이어서 기다릴 수 있게 Promise를 돌려준다
    lids(v, ms = 500) {
      S.lidsT = v;
      return new Promise((res) => setTimeout(res, ms));
    },
    setLids(v) {
      S.lids = S.lidsT = v;
    },
    phase(p) {
      S.phase = p;
    },
    fadeTo(v) {
      S.fadeT = v;
      return new Promise((res) => setTimeout(res, 450));
    },
    // 둘러보기: ◀ ▶ 로 왼쪽(자판기), 가운데(역 이름판), 오른쪽(전광판·출구)을 본다
    lookMode(on) {
      S.look = on;
    },
    turn(dir) {
      S.camT = Math.max(W / 2, Math.min(PANO - W / 2, S.camT + dir * 160));
      Sound.play('blip');
    },
    get view() {
      return S.camT;
    },
    lookAt(x) {
      S.camT = Math.max(W / 2, Math.min(PANO - W / 2, x));
    },
    novaEnter() {
      S.nova = { x: S.camT + 220, tx: S.camT - 22 };
    },
    jamEnter() {
      S.jam = { x: S.camT - 220, tx: S.camT - 100, y: 60, a: 0 };
    },
    jamLeave() {
      if (S.jam) S.jam.tx = S.camT - 260;
      setTimeout(() => {
        S.jam = null;
      }, 900);
    },
    walkMode(on, onExit) {
      S.walk = on;
      S.onExit = onExit || null;
    },
    key(dir, down) {
      S.keys[dir] = down;
      if (down) S.walker.target = null;
    },
    markSeen(id) {
      S.seen[id] = true;
    },
    // 누른 곳: 둘러보기 중이면 그곳의 물건, 걷기 중이면 그 위치로 걸어간다
    click(p) {
      if (S.scene === 'platform' && S.look) {
        const L = S.cam - W / 2;
        const hit = HOT.find((h) => p.x + L >= h.x && p.x + L <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
        if (hit && this.onHot) this.onHot(hit.id);
        return;
      }
      if (S.scene === 'underpass' && S.walk) {
        const L = Math.max(0, Math.min(TUNNEL - W, S.walker.x - W / 2));
        const near = POSTERS.find((q) => Math.abs(p.x + L - q.x) < 24 && p.y < 90);
        if (near && Math.abs(S.walker.x - near.x) < 34) {
          if (this.onHot) this.onHot(near.id);
          return;
        }
        S.walker.target = p.x + L;
      }
    },
    // 걷는 중 가까운 포스터 (Enter·Space로 읽기)
    nearPoster() {
      return POSTERS.find((q) => Math.abs(S.walker.x - q.x) < 30) || null;
    },
    focus() {},
    set signName(v) {
      S.signName = v;
    },
  };
})();
