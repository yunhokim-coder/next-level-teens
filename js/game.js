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
    char: null, // 겉모습 동물 tiger cat rabbit dog (2화에서 학생이 고름)
    lineColor: null,
    ticketTo: '',
    destName: '',
    tunnel: 0,
    tunnelT: 0,
    reflect: 0,
    reflectT: 0,
    lids: 1, // 1 뜬 눈, 0 감은 눈
    lidsT: 1,
    dream: false,
    ride: 0, // 창밖 풍경이 흘러간 거리
    speed: 1, // 열차 속도 1 달림, 0 멈춤
    speedT: 1,
    quake: 0, // 화면 흔들림 세기
    alarm: false,
    wreck: -1, // 선로가 부서진 뒤 흐른 시간 (-1 아직)
    beam: 0,
    beamColor: '#ffffff',
    beamBig: false,
    hit: 0,
    lunge: 0,
    detour: 0, // 우회 선로가 놓인 정도 0~1
    detourT: 0,
    detourLit: false,
    run: 0, // 우회 선로를 달리는 열차 위치 (0 가까이 ~ 1 멀리)
    hp: 1,
    hpT: 1,
    hpShow: false,
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
    r(x, y + 12, len, 3, S.lineColor || C.line);
    r(x, y, len, 1, '#e9ecf4');
    for (let wx = x + 8; wx < x + len - 10; wx += 16) r(wx, y + 3, 10, 6, '#ffe39a');
    r(x - 6, y + 2, 6, 14, '#aeb3c4');
    r(x - 6, y + 6, 2, 3, '#fff6c8');
    for (let wx = x + 10; wx < x + len; wx += 30) r(wx, y + 18, 6, 2, '#1a1c26');
  }

  // 해와 달: 밤에는 달이 떠 있고, 새벽에 해가 지평선 위로 올라온다
  function sunMoon(p) {
    if (p < 0.55) {
      g.globalAlpha = 1 - p / 0.55;
      const my = 26 + p * 40;
      r(258, my, 12, 12, '#f2f0d8');
      r(256, my + 2, 16, 8, '#f2f0d8');
      r(260, my - 2, 8, 16, '#f2f0d8');
      r(262, my + 3, 3, 3, '#d9d6b8');
      r(266, my + 7, 2, 2, '#d9d6b8');
      g.globalAlpha = 1;
    }
    if (p > 0.35) {
      const k = (p - 0.35) / 0.65;
      const sy = 118 - k * 70;
      g.globalAlpha = Math.min(1, k * 2);
      r(52, sy - 8, 20, 20, '#ffd27a');
      r(48, sy - 4, 28, 12, '#ffd27a');
      r(56, sy - 12, 12, 28, '#ffd27a');
      // 체크무늬 햇무리
      g.fillStyle = '#ffe9b0';
      g.globalAlpha = 0.5 * Math.min(1, k * 2);
      for (let y = sy - 18; y < sy + 22; y += 2) {
        for (let x = 42 + ((y / 2) % 2); x < 82; x += 2) {
          const dx = x - 62;
          const dy = y - (sy + 2);
          const d = dx * dx + dy * dy;
          if (d > 200 && d < 400) g.fillRect(x, y, 1, 1);
        }
      }
      g.globalAlpha = 1;
    }
  }

  function drawTitle() {
    // 타이틀은 밤 → 새벽 → 아침 → 다시 밤으로 천천히 돈다 (한 바퀴 30초)
    if (S.titleCycle) S.phase = (1 - Math.cos((t * Math.PI * 2) / 30)) / 2;
    sky(S.phase);
    sunMoon(S.phase);
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
        if (S.seen[h.id] || (S.only && h.id !== S.only)) return;
        const bob = Math.round(Math.sin(t * 4) * 2);
        r(px(h.x + h.w / 2) - 2, h.y - 10 + bob, 4, 6, '#ffe14a');
        r(px(h.x + h.w / 2) - 2, h.y - 2 + bob, 4, 2, '#ffe14a');
      });
    }
    if (S.nova) drawNova(px(S.nova.x), 76);
    if (S.jam) drawJam(px(S.jam.x), S.jam.y);
    // 아침빛: 천장 틈으로 햇살이 비스듬히 들어온다 (6화 해돋이)
    if (lit > 0.5 && !S.dream) {
      const a = (lit - 0.5) * 2;
      g.globalAlpha = 0.18 * a;
      r(0, 0, W, H, '#ffb070');
      for (let x = 40; x < PANO; x += 120) {
        g.globalAlpha = 0.16 * a;
        g.fillStyle = '#ffe2a8';
        g.beginPath();
        g.moveTo(px(x), 0);
        g.lineTo(px(x + 26), 0);
        g.lineTo(px(x - 40), 180);
        g.lineTo(px(x - 80), 180);
        g.fill();
      }
      g.globalAlpha = 1;
    }
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

  function drawNova(x, y, u = 2) {
    shape(NOVA, x - 10 * u, y, u);
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
    r(lx - 4 * u, ly - 3 * u, 11 * u, 10 * u, '#ffd35a');
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
    const h = Chars.hands(S.char, S.lineColor);
    const bob = Math.round(Math.sin(t * 1.8) * 1.2);
    const sway = Math.round((S.camT - S.cam) * 0.04);
    // 왼손
    r(18 - sway, 160 + bob, 52, 20, h.sleeve);
    r(18 - sway, 160 + bob, 52, 3, h.sleeveDark);
    r(30 - sway, 148 + bob, 26, 14, h.skin);
    for (let i = 0; i < 4; i++) r(31 - sway + i * 6, 147 + bob, 5, 3, i % 2 ? h.skin : h.skin);
    r(30 - sway, 160 + bob, 26, 1, h.dark);
    if (h.mark && S.char === 'tiger') for (let i = 0; i < 3; i++) r(34 - sway + i * 7, 152 + bob, 2, 5, h.mark);
    if (h.mark && S.char === 'cat') for (let i = 0; i < 4; i++) r(31 - sway + i * 6, 147 + bob, 5, 2, h.mark);
    // 오른손에 든 승차권 (엄지가 왼쪽 아래 모서리를 잡고 있다)
    const tx = 192 - sway;
    const ty = 110 + bob;
    r(tx - 1, ty - 1, 86, 48, C.K);
    r(tx, ty, 84, 46, '#efe8d6');
    r(tx, ty, 84, 8, S.lineColor || C.line);
    text('NEXT LINE', tx + 4, ty + 1, '#0b0c16', 6);
    r(tx + 70, ty + 2, 10, 4, '#0b0c16');
    text(I18n.t('scene.ticketFrom'), tx + 4, ty + 12, '#4a4538', 6);
    text(I18n.t('scene.ticketTo'), tx + 4, ty + 24, '#4a4538', 6);
    if (S.ticketTo) text(S.ticketTo, tx + 26, ty + 24, '#0b0c16', 6);
    else for (let x = tx + 26; x < tx + 78; x += 4) r(x, ty + 30, 2, 1, '#b0a890');
    // 손가락은 승차권 뒤에서 받치고, 엄지는 앞에서 누른다
    r(tx + 30, ty + 44, 34, 14, h.skin);
    r(tx + 30, ty + 44, 34, 1, h.dark);
    r(tx + 14, ty + 36, 14, 10, h.skin);
    r(tx + 14, ty + 36, 1, 10, h.dark);
    if (h.mark && S.char === 'tiger') for (let i = 0; i < 3; i++) r(tx + 36 + i * 8, ty + 47, 2, 6, h.mark);
    if (h.mark && S.char === 'cat') r(tx + 14, ty + 36, 14, 3, h.mark);
    r(tx + 24, ty + 54, 50, 20, h.sleeve);
    r(tx + 24, ty + 54, 50, 3, h.sleeveDark);
  }

  // ---------- 열차 안 (1인칭, 맞은편 창문) ----------
  // 창문 밖으로 도시가 흐르고, 터널에 들어가면 창이 어두워지며 내 모습이 비친다.
  function drawTrain() {
    const shake = Math.round(Math.sin(t * 22) * 0.6 * S.speed);
    const lurch = Math.max(0, S.speed - S.speedT) * 10; // 급정거: 손잡이가 앞으로 쏠린다
    // 천장, 손잡이 봉, 손잡이
    r(0, 0, W, 22, '#d9dde8');
    for (let x = 10; x < W; x += 60) r(x, 4, 40, 3, '#ffffff');
    r(0, 22, W, 22, '#e4e7ef');
    r(0, 22, W, 2, '#9aa0b4');
    r(0, 28, W, 2, '#b8bdcc');
    for (let x = 30; x < W; x += 36) {
      const sw = Math.round(Math.sin(t * 2 + x) * 1.5 * (0.3 + S.speed * 0.7) - lurch);
      r(x + sw, 30, 1, 8, '#7a8094');
      r(x - 3 + sw, 38, 7, 6, '#7a8094');
      r(x - 2 + sw, 39, 5, 4, '#d9dde8');
    }
    // 벽
    r(0, 44, W, 86, '#cfd3de');
    r(0, 44, W, 2, '#b8bdcc');
    // 창문 (가운데 큰 창)
    const wx = 56;
    const wy = 50 + shake;
    const ww = 208;
    const wh = 60;
    r(wx - 4, wy - 4, ww + 8, wh + 8, '#8a90a4');
    r(wx, wy, ww, wh, '#0a0c1c');
    g.save();
    g.beginPath();
    g.rect(wx, wy, ww, wh);
    g.clip();
    // 창밖: 도시 (터널이면 어둠과 지나가는 불빛)
    if (S.tunnel < 1) {
      g.globalAlpha = 1 - S.tunnel;
      r(wx, wy, ww, wh, mix('#141a3c', '#b9787a', Math.max(0, S.phase - 0.3)));
      const off = S.ride % 64;
      const rand = rng(31);
      for (let k = -1; k < 6; k++) {
        const bx = wx + k * 64 - off;
        for (let b = 0; b < 4; b++) {
          const h = 14 + Math.floor(rand() * 30);
          const bw = 10 + Math.floor(rand() * 8);
          const x0 = bx + b * 16;
          r(x0, wy + wh - h, bw, h, '#0b0e22');
          for (let yy = wy + wh - h + 3; yy < wy + wh - 2; yy += 5) if (rand() < 0.5) r(x0 + 3, yy, 2, 2, '#ffd98a');
        }
      }
      g.globalAlpha = 1;
    }
    if (S.tunnel > 0) {
      g.globalAlpha = S.tunnel;
      r(wx, wy, ww, wh, '#05060b');
      const lx = wx + ww - ((t * 260) % (ww + 80));
      r(lx, wy + 8, 30, 2, '#ffbe4a');
      g.globalAlpha = 1;
    }
    // 창에 비친 나: 터널 속에서 서서히 드러난다
    if (S.reflect > 0.01) {
      g.globalAlpha = S.reflect * 0.85;
      Chars.draw(g, S.char, wx + ww / 2 - 30, wy + 4, 2.5, S.lineColor || '#565c70');
      g.globalAlpha = S.reflect * 0.25;
      r(wx, wy, ww, wh, '#7fa6d8');
      g.globalAlpha = 1;
    }
    // 유리 반사광
    g.globalAlpha = 0.12;
    r(wx + 20, wy, 6, wh, '#ffffff');
    r(wx + 30, wy, 2, wh, '#ffffff');
    g.globalAlpha = 1;
    g.restore();
    // 노선도 띠 (내 노선색)
    r(wx, wy + wh + 6, ww, 4, S.lineColor || '#9aa0b4');
    for (let k = 0; k < 6; k++) r(wx + 10 + k * 38, wy + wh + 5, 6, 6, '#ffffff');
    // 좌석
    r(0, 122, W, 10, S.lineColor ? mix(S.lineColor, '#2a3047', 0.35) : '#3d6f8f');
    r(0, 132, W, 6, '#262a3a');
    // 바닥
    r(0, 138, W, 42, '#3a3f52');
    for (let x = 0; x < W; x += 24) r(x, 138, 1, 42, '#33384a');
    if (S.nova) drawNova(S.nova.x - (S.cam - W / 2), 52);
    // 비상: 천장 등이 붉게 깜빡인다
    if (S.alarm && Math.floor(t * 3) % 2 === 0) {
      for (let x = 10; x < W; x += 60) r(x, 4, 40, 3, '#ff4a5a');
      g.globalAlpha = 0.16;
      r(0, 0, W, H, '#ff2a3a');
      g.globalAlpha = 1;
    }
  }

  // ---------- 환승역 (1인칭, 커다란 노선도 전광판, 천창 너머로 새벽) ----------
  function drawHub() {
    // 천창: 하늘이 보이고 철골이 가로지른다
    sky(S.phase);
    const beam = '#2a2f42';
    r(0, 0, W, 4, beam);
    r(0, 20, W, 3, beam);
    r(0, 38, W, 4, beam);
    for (let x = 0; x < W; x += 40) r(x, 0, 3, 42, beam);
    // 벽
    r(0, 42, W, 80, mix('#2a3047', '#8f97ad', S.phase));
    // 노선도 전광판
    const bx = 18;
    const by = 46;
    const bw = 246;
    const bh = 70;
    r(bx - 3, by - 3, bw + 6, bh + 6, '#8a90a4');
    r(bx, by, bw, bh, '#0e1430');
    text(I18n.t('scene.mapTitle'), bx + 6, by + 3, '#8a90a6', 6);
    // 다른 사람들의 노선 (회색)
    const others = [
      [by + 22, '#4a5272', 30, 210],
      [by + 34, '#3d4562', 60, 236],
      [by + 60, '#454d6a', 20, 150],
    ];
    others.forEach(([y, c, x0, x1]) => {
      r(bx + x0, y, x1 - x0, 3, c);
      for (let x = bx + x0; x <= bx + x1; x += 36) r(x - 2, y - 2, 6, 7, c);
    });
    // 내 노선: 지금 여기 → 종착역
    const my = by + 46;
    const col = S.lineColor || C.line;
    const x0 = bx + 16;
    const x1 = bx + bw - 22;
    r(x0, my, x1 - x0, 4, col);
    for (let k = 1; k <= 3; k++) {
      const x = x0 + ((x1 - x0) * k) / 4;
      r(x - 3, my - 2, 7, 8, '#0e1430');
      r(x - 2, my - 1, 5, 6, '#ffffff');
      r(x - 1, my, 3, 4, '#0e1430');
    }
    r(x0 - 4, my - 3, 9, 10, '#ffffff');
    r(x0 - 2, my - 1, 5, 6, col);
    text(I18n.t('scene.boardHere'), x0 - 4, my + 8, '#c4c9de', 6);
    // 종착역 (안 정했으면 안개)
    const blink = Math.floor(t * 2) % 2 === 0;
    if (S.destName) {
      r(x1 - 6, my - 5, 13, 14, '#ffffff');
      r(x1 - 4, my - 3, 9, 10, col);
      text(S.destName, x1 + 6, my - 15, '#ffffff', 7, 'right');
    } else {
      g.globalAlpha = 0.5 + (blink ? 0.2 : 0);
      r(x1 - 10, my - 8, 22, 18, '#9aa0b4');
      r(x1 - 6, my - 11, 14, 4, '#9aa0b4');
      g.globalAlpha = 1;
      text('?', x1 + 1, my - 5, '#ffffff', 9, 'center');
    }
    // 바닥
    r(0, 122, W, 58, mix('#2f3448', '#5a6178', S.phase));
    for (let x = 0; x < W; x += 32) r(x, 122, 1, 58, mix('#282c3e', '#4c5268', S.phase));
    if (S.nova) drawNova(S.nova.x, 52);
  }

  // ---------- 3인칭 고가 승강장 (옆에서, 가로 640): 내 캐릭터가 걷고, 선로에 그림자가 솟는다 ----------
  const TRACK = 640;
  function drawTrack() {
    const w = S.walker;
    const L = Math.max(0, Math.min(TRACK - W, w.x - W / 2 + 40));
    const px = (x) => x - L;
    sky(S.phase);
    sunMoon(S.phase);
    g.save();
    g.translate(-Math.round(L * 0.25), 0);
    skyline(S.phase);
    g.restore();
    // 선로
    r(0, 112, W, 6, mix('#11141f', '#3a4058', S.phase));
    r(0, 118, W, 18, mix('#0b0d16', '#262b3c', S.phase));
    for (let x = 0; x < TRACK; x += 14) r(px(x), 124, 8, 10, '#1b1712');
    r(0, 122, W, 2, '#8b90a6');
    r(0, 131, W, 2, '#8b90a6');
    // 급정거한 내 열차 (왼쪽, 앞머리가 오른쪽). 문이 열려 있다
    const col = S.lineColor || C.line;
    const tx = px(-60);
    r(tx, 94, 310, 26, '#c7cbd9');
    r(tx, 110, 310, 3, col);
    for (let k = 0; k < 16; k++) if (k !== 9) r(tx + 10 + k * 18, 98, 11, 8, '#ffe39a');
    r(tx + 9 * 18 + 8, 97, 15, 23, '#1b1f2e');
    r(tx + 310, 96, 8, 22, '#aeb3c4');
    r(tx + 315, 102, 3, 4, (S.alarm || S.shadow > 0.5) && Math.floor(t * 4) % 2 ? '#ff4a5a' : '#fff6c8');
    // 부서진 선로: 레일이 끊기고 바닥이 꺼진다
    if (S.wreck >= 0) {
      const gx = px(350);
      r(gx, 112, 80, 26, '#05060b');
      r(gx - 6, 120, 8, 3, '#8b90a6');
      r(gx - 2, 116, 5, 3, '#8b90a6');
      r(gx + 78, 125, 8, 3, '#8b90a6');
      r(gx + 76, 129, 5, 3, '#8b90a6');
    }
    // 그림자 (블랙맘바)
    if (S.shadow > 0.01) drawShadow(px(390), S.shadow);
    if (S.wreck >= 0) drawRocks(px(390));
    // 승강장
    r(0, 136, W, 44, mix('#2a2f42', '#4a5068', S.phase));
    r(0, 136, W, 4, '#c9a43a');
    for (let x = 0; x < TRACK; x += 3) r(px(x), 137, 1, 1, '#8a6f22');
    for (let x = 0; x < TRACK; x += 48) r(px(x), 140, 1, 40, mix('#232838', '#40465c', S.phase));
    if (S.nova) drawNova(px(S.nova.x), 128, 1);
    const step = w.moving ? Math.floor(w.step) % 2 : -1;
    Chars.full(g, S.char, px(w.x), 170, 1.2, S.lineColor || '#565c70', step);
  }

  // 무너져 쌓이는 바위: 하나씩 떨어져 선로 위에 더미를 만든다
  const ROCKS = (() => {
    const rand = rng(77);
    const out = [];
    const rows = [6, 5, 4, 3, 2];
    let i = 0;
    rows.forEach((n, row) => {
      for (let k = 0; k < n; k++) {
        const sz = 12 + Math.floor(rand() * 7);
        out.push({ x: (k - (n - 1) / 2) * 15 + Math.floor(rand() * 5) - 2, y: 130 - row * 11, s: sz, d: i * 0.09 + rand() * 0.1 });
        i++;
      }
    });
    return out;
  })();
  function drawRocks(x, base = 130, u = 1, settled = false) {
    ROCKS.forEach((k) => {
      const tt = S.wreck - k.d;
      if (!settled && tt <= 0) return;
      const y0 = settled ? k.y : Math.min(k.y, -20 + 260 * tt * tt);
      const y = base + (y0 - 130) * u;
      const sz = Math.max(3, Math.round(k.s * u));
      const rx = Math.round(x + k.x * u - sz / 2);
      const ry = Math.round(y - sz);
      const e = Math.max(1, Math.round(2 * u));
      r(rx, ry, sz, sz, '#5d5650');
      r(rx + e, ry - e, sz - e * 2, e, '#5d5650');
      r(rx + e, ry, sz - e * 3, Math.max(1, Math.round(3 * u)), '#857c72');
      r(rx, ry + sz - e - 1, sz, e + 1, '#3b3631');
      r(rx + sz - e - 1, ry + e, e + 1, sz - e, '#47413b');
    });
  }

  // 선로에서 솟는 검은 그림자: 물결치는 몸통, 노란 눈. 고른 카드가 많을수록 크다.
  function drawShadow(x, a, base = 128, k = 1, label = true) {
    const size = (0.8 + Math.min(1, (S.shadowSize || 3) / 9) * 0.6) * k;
    const rise = a * 46 * size;
    g.globalAlpha = Math.min(1, a * 1.2);
    // 기운
    g.fillStyle = '#5a3a8a';
    for (let i = 0; i < 14; i++) {
      const ox = Math.sin(t * 2 + i) * 18 * size;
      const oy = (t * 20 + i * 9) % 40;
      g.fillRect(Math.round(x + ox), Math.round(base - 6 - rise - oy + 20), 2, 2);
    }
    // 몸통: 아래에서 위로 굵기가 줄어드는 마디
    for (let j = 0; j < 9; j++) {
      const yy = base - (rise * j) / 8;
      const xx = x + Math.sin(t * 2.2 + j * 0.7) * 6 * size;
      const rad = (14 - j) * size;
      r(xx - rad, yy - 5, rad * 2, 8, '#06060b');
    }
    // 머리
    const hx = x + Math.sin(t * 2.2 + 6) * 6 * size;
    const hy = base - rise - 6;
    r(hx - 12 * size, hy - 6 * size, 24 * size, 12 * size, '#06060b');
    r(hx - 7 * size, hy - 2 * size, 4, 3, '#ffcf4a');
    r(hx + 3 * size, hy - 2 * size, 4, 3, '#ffcf4a');
    g.globalAlpha = 1;
    if (label && S.shadowName && a > 0.6) {
      g.font = '7px Galmuri11, monospace';
      const tw = g.measureText(S.shadowName).width;
      r(hx - tw / 2 - 4, hy - 26 * size, tw + 8, 11, 'rgba(8,8,16,0.85)');
      text(S.shadowName, hx, hy - 25 * size, '#ffcf4a', 7, 'center');
    }
  }

  // ---------- 5화 배틀 (1인칭, 끊긴 선로 정면): 바위 더미 위로 그림자, 오른쪽으로 우회 선로가 놓인다 ----------
  const HZ = 86;
  const DETOUR = 26; // 우회 선로 침목 수
  function bez(p) {
    const q = 1 - p;
    return { x: q * q * 262 + 2 * q * p * 318 + p * p * 196, y: q * q * 180 + 2 * q * p * 112 + p * p * 92 };
  }
  function drawBattle() {
    sky(S.phase);
    sunMoon(S.phase);
    g.save();
    g.translate(0, -24);
    skyline(S.phase);
    g.restore();
    // 고가 선로 (원근)
    const bed = mix('#1a1e2c', '#4a5068', S.phase);
    r(0, HZ, W, H - HZ, mix('#0a0d18', '#262c40', S.phase));
    for (let y = HZ; y < H; y++) {
      const d = (y - HZ) / (H - HZ);
      const hw = 10 + d * 150;
      r(160 - hw, y, hw * 2, 1, bed);
      const z = 1 / (d + 0.08);
      const hole = y > 100 && y < 116;
      if (hole) r(160 - hw * 0.62, y, hw * 1.24, 1, '#05060b');
      else if (Math.floor(z * 6) % 2 === 0) r(160 - hw * 0.55, y, hw * 1.1, 1, '#2a2118');
      if (!hole) {
        const rx = hw * 0.42;
        const rw = Math.max(1, Math.round(d * 4));
        r(Math.round(160 - rx), y, rw, 1, '#9aa0b6');
        r(Math.round(160 + rx - rw), y, rw, 1, '#9aa0b6');
      }
      // 난간
      r(160 - hw - 2, y, 2, 1, '#c9a43a');
      r(160 + hw, y, 2, 1, '#c9a43a');
    }
    // 우회 선로: 하나씩 놓이고, 다 놓이면 불이 들어온다
    const col = S.lineColor || C.line;
    const built = Math.floor(DETOUR * S.detour + 0.001);
    for (let i = 0; i < built; i++) {
      const p = bez(i / (DETOUR - 1));
      const d = (p.y - HZ) / (H - HZ);
      const w = 3 + d * 18;
      r(p.x - w, p.y, w * 2, Math.max(1, Math.round(1 + d * 3)), '#3a2f22');
      const lit = S.detourLit && Math.floor(t * 8 - i * 0.5) % 4 === 0;
      r(p.x - w * 0.8, p.y - 1, Math.max(1, Math.round(1 + d * 2)), 2, lit ? '#ffffff' : col);
      r(p.x + w * 0.8 - 1, p.y - 1, Math.max(1, Math.round(1 + d * 2)), 2, lit ? '#ffffff' : col);
    }
    if (built > 0 && built < DETOUR) {
      const p = bez((built - 1) / (DETOUR - 1));
      if (Math.floor(t * 6) % 2) r(p.x - 1, p.y - 6, 2, 2, '#fff6c8');
    }
    // 우회 선로를 달려 나가는 내 열차 (멀리 있는 칸부터 그린다)
    if (S.run > 0) {
      for (let i = 0; i < 4; i++) {
        const p = S.run - i * 0.075;
        if (p < 0 || p > 1) continue;
        const pt = bez(p);
        const d = (pt.y - HZ) / (H - HZ);
        const w = Math.round(5 + d * 64);
        const h = Math.round(w * 0.78);
        const x0 = Math.round(pt.x - w / 2);
        const y0 = Math.round(pt.y - h);
        r(x0, y0, w, h, '#c7cbd9');
        r(x0, y0 + Math.round(h * 0.62), w, Math.max(1, Math.round(h * 0.12)), col);
        r(x0 + Math.round(w * 0.15), y0 + Math.round(h * 0.18), Math.round(w * 0.7), Math.max(1, Math.round(h * 0.3)), '#ffe39a');
        if (i === 3 || p - 0.075 < 0) {
          r(x0 + 1, y0 + h - Math.max(2, Math.round(h * 0.2)), Math.max(1, Math.round(w * 0.12)), Math.max(1, Math.round(h * 0.1)), '#ff4a5a');
          r(x0 + w - 1 - Math.max(1, Math.round(w * 0.12)), y0 + h - Math.max(2, Math.round(h * 0.2)), Math.max(1, Math.round(w * 0.12)), Math.max(1, Math.round(h * 0.1)), '#ff4a5a');
        }
      }
    }
    // 그림자와 바위
    const k = 1.15 + S.lunge * 0.35;
    const jit = Math.sin(t * 70) * 4 * S.hit;
    if (S.shadow > 0.01) drawShadow(160 + jit, S.shadow, 106 + S.lunge * 8, k, false);
    drawRocks(160, 118, 0.62, true);
    // 빛줄기: 낸 카드의 색
    if (S.beam > 0.02) {
      const hy = 106 - 46 * k * S.shadow;
      g.globalAlpha = Math.min(1, S.beam * 1.4);
      g.strokeStyle = S.beamColor;
      g.lineWidth = (S.beamBig ? 7 : 3) * S.beam;
      g.beginPath();
      g.moveTo(160, H);
      g.lineTo(160 + jit, hy);
      g.stroke();
      g.fillStyle = S.beamColor;
      const rad = (S.beamBig ? 22 : 11) * (1.2 - S.beam);
      g.beginPath();
      g.arc(160 + jit, hy, rad, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    // 그림자 기운 막대
    if (S.hpShow) {
      g.font = '7px Galmuri11, monospace';
      const name = S.shadowName || '';
      r(100, 6, 120, 20, 'rgba(8,8,16,0.8)');
      text(name, 160, 8, '#ffcf4a', 7, 'center');
      r(106, 18, 108, 4, '#2a2140');
      r(106, 18, Math.round(108 * Math.max(0, S.hp)), 4, '#8a5ad0');
    }
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
    // 들어올 때는 오른쪽에서 멈춰 서고, 떠날 때(6화)는 나를 태우고 왼쪽으로 달려 나간다
    const tx = S.leave ? 80 - Math.max(0, S.train - 1) * 420 : 330 - Math.min(1, S.train) * 250;
    trainSide(tx, 109, 200);
    // 승강장에 선 나 (작게)
    if (!S.leave) drawWalkerSmall(60, 127);
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
    S.tunnel += (S.tunnelT - S.tunnel) * Math.min(1, dt * 1.5);
    S.reflect += (S.reflectT - S.reflect) * Math.min(1, dt * 0.9);
    if (S.nova && S.nova.tx !== undefined) S.nova.x += (S.nova.tx - S.nova.x) * Math.min(1, dt * 3);
    if (S.jam) {
      S.jam.a = Math.min(1, (S.jam.a || 0) + dt * 2);
      S.jam.x += (S.jam.tx - S.jam.x) * Math.min(1, dt * 2);
    }
    S.speed += (S.speedT - S.speed) * Math.min(1, dt * 2.2);
    S.ride += dt * 60 * S.speed;
    S.quake = Math.max(0, S.quake - dt * 0.9);
    if (S.wreck >= 0) S.wreck += dt;
    S.beam = Math.max(0, S.beam - dt * 1.3);
    S.hit = Math.max(0, S.hit - dt * 1.6);
    S.lunge = Math.max(0, S.lunge - dt * 1.4);
    S.detour += (S.detourT - S.detour) * Math.min(1, dt * 2.5);
    S.hp += (S.hpT - S.hp) * Math.min(1, dt * 3);
    if (S.run > 0 && S.run < 1.5) S.run += dt * 0.28;
    if (S.scene === 'arrival') S.train = S.leave ? Math.min(3, S.train + (S.train < 1.6 ? dt * 0.25 : dt * 0.6)) : Math.min(1, S.train + dt * 0.35);
    if (S.shadow !== undefined) S.shadow += ((S.shadowT || 0) - S.shadow) * Math.min(1, dt * 1.2);
    if ((S.scene === 'underpass' || S.scene === 'track') && S.walk) {
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
        w.x = Math.max(16, Math.min((S.scene === 'track' ? 330 : TUNNEL - 30), w.x + dir * dt * 70));
        w.step += dt * 6;
        if (Math.floor(w.step * 2) !== Math.floor((w.step - dt * 6) * 2) && Math.floor(w.step) % 2 === 0) Sound.play('blip');
      }
      if (w.x >= (S.scene === 'track' ? 300 : 588) && S.onExit) {
        const cb = S.onExit;
        S.onExit = null;
        S.walk = false;
        w.moving = false;
        cb();
      }
    }
  }

  function draw() {
    const q = S.quake * 4;
    g.save();
    if (q > 0.2) g.translate(Math.round((Math.random() - 0.5) * q), Math.round((Math.random() - 0.5) * q));
    if (S.scene === 'title') drawTitle();
    else if (S.scene === 'platform') {
      if (S.dream) S.cam = S.camT + Math.sin(t * 1.2) * 6;
      drawPlatform();
    }
    else if (S.scene === 'underpass') drawUnderpass();
    else if (S.scene === 'arrival') drawArrival();
    else if (S.scene === 'train') drawTrain();
    else if (S.scene === 'hub') drawHub();
    else if (S.scene === 'track') drawTrack();
    else if (S.scene === 'battle') drawBattle();
    if (S.dream) {
      // 꿈: 아침빛이 번지고 화면이 출렁인다
      g.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.5);
      r(0, 0, W, H, '#fff4e0');
      g.globalAlpha = 1;
    }
    if (S.hands && (S.scene === 'platform' || S.scene === 'train' || S.scene === 'hub') && !S.dream) drawHands();
    g.restore();
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
      S.hands = name === 'platform' || name === 'train' || name === 'hub';
      S.look = false;
      S.walk = false;
      S.nova = null;
      S.jam = null;
      S.titleCycle = name === 'title';
      if (opts.phase !== undefined) S.phase = opts.phase;
      if (name === 'platform') {
        S.cam = S.camT = 480;
      }
      if (name === 'underpass') {
        S.walker = { x: 40, dir: 1, moving: false, target: null, step: 0 };
      }
      if (name === 'arrival') {
        S.leave = !!opts.leave;
        S.train = S.leave ? 1 : 0;
      }
      S.speed = S.speedT = 1;
      S.alarm = false;
      S.beam = S.hit = S.lunge = 0;
      S.detour = S.detourT = 0;
      S.detourLit = false;
      S.run = 0;
      S.hp = S.hpT = 1;
      S.hpShow = false;
      if (name === 'battle') {
        S.shadow = S.shadowT = 0;
        S.shadowName = '';
      }
      S.wreck = -1;
      S.quake = 0;
      if (name === 'track') {
        S.walker = { x: 104, dir: 1, moving: false, target: null, step: 0 };
        S.shadow = S.shadowT = 0;
        S.shadowName = '';
      }
      if (name === 'train') {
        S.cam = S.camT = W / 2;
        S.tunnel = S.tunnelT = 0;
        S.reflect = S.reflectT = 0;
      }
    },
    // 2화: 내 캐릭터와 노선색
    setChar(code, color) {
      S.char = code;
      S.lineColor = color || null;
    },
    set ticketTo(v) {
      S.ticketTo = v;
    },
    set destName(v) {
      S.destName = v;
    },
    // 급정거: 속도가 0으로, 화면이 흔들리고 비상등이 켜진다
    brake() {
      S.speedT = 0;
      S.quake = 1.4;
      S.alarm = true;
    },
    alarm(on) {
      S.alarm = on;
    },
    quake(v) {
      S.quake = v;
    },
    // 선로가 부서지고 바위가 쌓인다
    wreck() {
      S.wreck = 0;
      S.quake = 1.6;
    },
    // 배틀 연출
    attack() {
      S.lunge = 1;
      S.quake = Math.max(S.quake, 0.5);
    },
    beam(color, big) {
      S.beam = 1;
      S.beamColor = color;
      S.beamBig = big;
      S.hit = 1;
    },
    hp(v, show = true) {
      S.hpT = v;
      S.hpShow = show;
    },
    detour(v) {
      S.detourT = v;
    },
    trainRun() {
      S.run = 0.001;
      S.quake = 0.4;
    },
    detourLit(on) {
      S.detourLit = on;
      if (on) S.detour = S.detourT = 1;
    },
    tunnel(on) {
      S.tunnelT = on ? 1 : 0;
    },
    reflect(v) {
      S.reflectT = v;
    },
    shadow(v, size) {
      S.shadowT = v;
      if (size !== undefined) S.shadowSize = size;
    },
    set shadowName(v) {
      S.shadowName = v;
    },
    novaSit(x) {
      S.nova = { x, tx: x };
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
    lookMode(on, only = null) {
      S.look = on;
      S.only = only;
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
        const hit = HOT.find((h) => (!S.only || h.id === S.only) && p.x + L >= h.x && p.x + L <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
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
      if (S.scene === 'track' && S.walk) {
        const L = Math.max(0, Math.min(TRACK - W, S.walker.x - W / 2 + 40));
        S.walker.target = p.x + L;
      }
    },
    // 걷는 중 가까운 포스터 (Enter·Space로 읽기)
    nearPoster() {
      if (S.scene !== 'underpass') return null;
      return POSTERS.find((q) => Math.abs(S.walker.x - q.x) < 30) || null;
    },
    focus() {},
    set signName(v) {
      S.signName = v;
    },
  };
})();
