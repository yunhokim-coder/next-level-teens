// 캐릭터 그림 (상반신, 가로 24 × 세로 30칸).
// - 역할 캐릭터 4종(D I S C, 사람): 성향 결과 카드에 나온다.
// - 동물 4종(tiger cat rabbit dog): 원작 DISC 동물을 청소년 감성으로 다시 그린 겉모습. 성향과 상관없이 학생이 고른다.
// 옷 색 'CL'은 내 노선색, 'CD'는 그보다 어두운 색으로 바뀐다.
// 부분 = [x, y, w, h, 색, 윤곽선 여부(기본 true)]
(function () {
  const K = '#0b0c16';
  const W = '#f6f4f2';
  const SKIN = '#f2c7a0';

  // 사람 공통 얼굴
  const face = (hair) => [
    [9, 18, 6, 2, SKIN],
    [1, 20, 22, 10, 'CL'],
    [3, 10, 2, 3, SKIN],
    [19, 10, 2, 3, SKIN],
    [5, 5, 14, 14, SKIN],
    ...hair,
    [7, 11, 2, 2, K, false],
    [15, 11, 2, 2, K, false],
  ];

  const BUST = {
    // 직진 급행: 짧게 뻗친 머리, 굵은 눈썹, 지퍼 점퍼
    D: [
      ...face([
        [4, 2, 16, 4, '#3a2216'],
        [3, 4, 2, 5, '#3a2216'],
        [19, 4, 2, 5, '#3a2216'],
        [5, 0, 2, 2, '#3a2216'],
        [9, 0, 2, 2, '#3a2216'],
        [13, 0, 2, 2, '#3a2216'],
        [17, 1, 2, 2, '#3a2216'],
      ]),
      [7, 9, 3, 1, '#3a2216', false],
      [14, 9, 3, 1, '#3a2216', false],
      [10, 16, 4, 1, '#b5745a', false],
      [8, 19, 8, 2, '#2a2a3a', false],
      [11, 21, 2, 9, '#e9e9ef', false],
    ],
    // 모두를 태우는 순환선: 웨이브 머리, 헤드폰, 후드티
    I: [
      ...face([
        [4, 2, 16, 5, '#7a4a2a'],
        [3, 5, 2, 8, '#7a4a2a'],
        [19, 5, 2, 8, '#7a4a2a'],
        [2, 1, 20, 1, '#2b2d3a'],
        [1, 9, 3, 6, '#2b2d3a'],
        [20, 9, 3, 6, '#2b2d3a'],
      ]),
      [9, 16, 6, 1, '#b5745a', false],
      [8, 15, 1, 1, '#b5745a', false],
      [15, 15, 1, 1, '#b5745a', false],
      [8, 21, 1, 4, W, false],
      [15, 21, 1, 4, W, false],
    ],
    // 늘 같은 시간의 막차: 단발, 볼 터치, 카디건
    S: [
      ...face([
        [3, 2, 18, 6, '#1d1a24'],
        [3, 5, 3, 11, '#1d1a24'],
        [18, 5, 3, 11, '#1d1a24'],
      ]),
      [6, 14, 2, 1, '#ff9ab8', false],
      [16, 14, 2, 1, '#ff9ab8', false],
      [10, 16, 4, 1, '#b5745a', false],
      [9, 20, 6, 3, '#ffffff', false],
      [11, 24, 1, 1, 'CD', false],
      [11, 27, 1, 1, 'CD', false],
    ],
    // 시간표를 짜는 기관사: 안경, 셔츠 깃
    C: [
      ...face([
        [3, 2, 18, 5, '#2c2a3a'],
        [3, 5, 2, 6, '#2c2a3a'],
        [19, 5, 2, 6, '#2c2a3a'],
      ]),
      [5, 10, 6, 1, '#3f8cff', false],
      [5, 13, 6, 1, '#3f8cff', false],
      [5, 10, 1, 4, '#3f8cff', false],
      [10, 10, 1, 4, '#3f8cff', false],
      [13, 10, 6, 1, '#3f8cff', false],
      [13, 13, 6, 1, '#3f8cff', false],
      [13, 10, 1, 4, '#3f8cff', false],
      [18, 10, 1, 4, '#3f8cff', false],
      [11, 11, 2, 1, '#3f8cff', false],
      [10, 16, 4, 1, '#b5745a', false],
      [9, 20, 6, 4, '#ffffff', false],
    ],

    // ---------- 동물 (겉모습) ----------
    tiger: [
      [3, 2, 4, 4, '#f08a2e'],
      [17, 2, 4, 4, '#f08a2e'],
      [9, 18, 6, 2, '#f08a2e'],
      [1, 20, 22, 10, 'CL'],
      [2, 5, 20, 14, '#f08a2e'],
      [1, 8, 1, 8, '#f08a2e'],
      [22, 8, 1, 8, '#f08a2e'],
      [6, 13, 12, 6, '#fff1de', false],
      [4, 3, 2, 2, '#ffc9a8', false],
      [18, 3, 2, 2, '#ffc9a8', false],
      [11, 5, 2, 4, '#3a2416', false],
      [8, 6, 1, 3, '#3a2416', false],
      [15, 6, 1, 3, '#3a2416', false],
      [2, 10, 3, 1, '#3a2416', false],
      [2, 12, 3, 1, '#3a2416', false],
      [19, 10, 3, 1, '#3a2416', false],
      [19, 12, 3, 1, '#3a2416', false],
      [7, 10, 2, 2, K, false],
      [15, 10, 2, 2, K, false],
      [7, 10, 1, 1, '#ffffff', false],
      [15, 10, 1, 1, '#ffffff', false],
      [11, 14, 2, 1, '#e86a7a', false],
      [11, 16, 2, 1, K, false],
      [8, 19, 8, 2, 'CD', false],
    ],
    cat: [
      [3, 1, 3, 2, '#22232e'],
      [2, 3, 5, 3, '#22232e'],
      [18, 1, 3, 2, '#22232e'],
      [17, 3, 5, 3, '#22232e'],
      [9, 18, 6, 2, '#22232e'],
      [1, 20, 22, 10, 'CL'],
      [2, 5, 20, 14, '#22232e'],
      [9, 5, 6, 4, W, false],
      [6, 12, 12, 7, W, false],
      [4, 3, 2, 2, '#ff9ab8', false],
      [18, 3, 2, 2, '#ff9ab8', false],
      [7, 10, 2, 2, '#7fe08a', false],
      [15, 10, 2, 2, '#7fe08a', false],
      [8, 10, 1, 2, K, false],
      [15, 10, 1, 2, K, false],
      [11, 14, 2, 1, '#ff9ab8', false],
      [11, 16, 2, 1, K, false],
      [10, 19, 4, 2, '#e8414f', false],
      [10, 20, 4, 4, W, false],
    ],
    rabbit: [
      [5, 0, 4, 10, W],
      [15, 0, 4, 10, W],
      [9, 19, 6, 2, W],
      [1, 21, 22, 9, 'CL'],
      [3, 8, 18, 12, W],
      [6, 2, 2, 7, '#ffb3c4', false],
      [16, 2, 2, 7, '#ffb3c4', false],
      [5, 15, 2, 1, '#ffb3c4', false],
      [17, 15, 2, 1, '#ffb3c4', false],
      [7, 12, 2, 2, K, false],
      [15, 12, 2, 2, K, false],
      [7, 12, 1, 1, '#ffffff', false],
      [15, 12, 1, 1, '#ffffff', false],
      [11, 15, 2, 1, '#ff8fa6', false],
      [11, 17, 2, 1, '#c98a96', false],
      [9, 20, 6, 3, '#ffffff', false],
    ],
    dog: [
      [2, 3, 5, 6, '#8a5a2a'],
      [17, 3, 5, 6, '#8a5a2a'],
      [9, 18, 6, 2, '#c98a4a'],
      [1, 20, 22, 10, 'CL'],
      [4, 4, 16, 15, '#c98a4a'],
      [8, 12, 8, 6, '#f0d2a0', false],
      [5, 10, 6, 1, K, false],
      [5, 13, 6, 1, K, false],
      [5, 10, 1, 4, K, false],
      [10, 10, 1, 4, K, false],
      [13, 10, 6, 1, K, false],
      [13, 13, 6, 1, K, false],
      [13, 10, 1, 4, K, false],
      [18, 10, 1, 4, K, false],
      [11, 11, 2, 1, K, false],
      [7, 11, 2, 2, K, false],
      [15, 11, 2, 2, K, false],
      [11, 14, 2, 2, K, false],
      [11, 17, 2, 1, '#8a5a2a', false],
      [8, 19, 8, 2, 'CD', false],
    ],
  };

  // 2화 전: 후드를 쓴 실루엣과 물음표
  const UNKNOWN = [
    [6, 3, 12, 3, '#565c70'],
    [4, 6, 16, 14, '#565c70'],
    [1, 20, 22, 10, '#565c70'],
    [7, 9, 10, 9, '#141622', false],
    [11, 10, 3, 1, '#ffe14a', false],
    [13, 11, 1, 2, '#ffe14a', false],
    [12, 13, 1, 1, '#ffe14a', false],
    [12, 15, 1, 1, '#ffe14a', false],
  ];

  // 동물별 1인칭 손 색 (털), 무늬
  const HANDS = {
    tiger: { skin: '#f08a2e', dark: '#c46a1e', mark: '#3a2416' },
    cat: { skin: '#22232e', dark: '#111219', mark: '#f4f4f8' },
    rabbit: { skin: '#f6f4f2', dark: '#d9d4cf', mark: null },
    dog: { skin: '#c98a4a', dark: '#9a6834', mark: null },
    none: { skin: '#e9c3a0', dark: '#c99a78', mark: null },
  };

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  }

  // parts를 직접 넘기면(전신 그리기) 그 부분과 위치·배율을 쓴다
  function draw(g, code, x, y, u = 1, cloth = '#565c70', parts0 = null, x0 = null, y0 = null, u0 = null) {
    const parts = parts0 || BUST[code] || UNKNOWN;
    if (parts0) {
      x = x0;
      y = y0;
      u = u0;
    }
    const col = (c) => (c === 'CL' ? cloth : c === 'CD' ? shade(cloth, 0.7) : c);
    const px = (v) => Math.round(v);
    parts.forEach((p) => {
      if (p[5] === false) return;
      g.fillStyle = K;
      g.fillRect(px(x + p[0] * u - 1), px(y + p[1] * u - 1), p[2] * u + 2, p[3] * u + 2);
    });
    parts.forEach((p) => {
      g.fillStyle = col(p[4]);
      g.fillRect(px(x + p[0] * u), px(y + p[1] * u), p[2] * u, p[3] * u);
    });
  }

  // 3인칭 전신 (정면 꼬마 체형): 머리는 상반신 그림에서 가져오고, 몸·팔·다리를 붙인다. 높이 35칸.
  function full(g, animal, x, feetY, u = 1.25, cloth = '#565c70', step = -1) {
    const fur = (HANDS[animal] || HANDS.none).skin;
    const top = feetY - 35 * u;
    const head = (BUST[animal] || UNKNOWN).filter((p) => p[1] < 18 && p[4] !== 'CL' && p[4] !== 'CD');
    const legL = step === 0 ? -1 : step === 1 ? 1 : 0;
    const body = [
      [7, 27 + Math.max(0, legL), 4, 6 - Math.abs(legL), '#1d2233'],
      [13, 27 + Math.max(0, -legL), 4, 6 - Math.abs(legL), '#1d2233'],
      [3, 20, 3, 7, 'CD'],
      [18, 20, 3, 7, 'CD'],
      [6, 18, 12, 10, 'CL'],
    ];
    const deco = [
      [3, 27, 3, 2, fur, false],
      [18, 27, 3, 2, fur, false],
      [6, 33, 5, 2, '#e9ecf2', false],
      [13, 33, 5, 2, '#e9ecf2', false],
      [10, 18, 4, 2, shade(cloth, 0.7), false],
    ];
    draw(g, null, 0, 0, 0, cloth, body.concat(deco), x - 12 * u, top, u);
    draw(g, null, 0, 0, 0, cloth, head, x - 12 * u, top, u);
  }

  window.Chars = {
    ANIMALS: ['tiger', 'cat', 'rabbit', 'dog'],
    full,
    draw,
    shade,
    hands(animal, cloth) {
      const h = HANDS[animal] || HANDS.none;
      const sleeve = cloth || '#565c70';
      return { ...h, sleeve, sleeveDark: shade(sleeve, 0.72) };
    },
    // 작은 캔버스(24×32 등)에 상반신 하나
    portrait(canvas, code, cloth) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#141831';
      g.fillRect(0, 0, canvas.width, canvas.height);
      draw(g, code, Math.floor((canvas.width - 24) / 2), canvas.height - 30, 1, cloth || '#565c70');
    },
  };
})();
