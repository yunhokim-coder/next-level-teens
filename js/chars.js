// 탑승 캐릭터 4종 (원작 DISC 동물을 청소년 감성으로 다시 그림, 개발자 라이선스 캐릭터).
// 상반신(가로 24 × 세로 30칸): 창문에 비친 모습, 결과 카드, 미니 초상화에 같이 쓴다.
// 부분 = [x, y, w, h, 색, 윤곽선 여부(기본 true)]
(function () {
  const K = '#0b0c16';
  const W = '#f6f4f2';

  const BUST = {
    D: [
      [3, 2, 4, 4, '#f08a2e'],
      [17, 2, 4, 4, '#f08a2e'],
      [9, 18, 6, 2, '#f08a2e'],
      [1, 20, 22, 10, '#c8323f'],
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
      [8, 19, 8, 2, '#2a2a3a', false],
      [11, 21, 2, 9, '#e9e9ef', false],
    ],
    I: [
      [3, 1, 3, 2, '#22232e'],
      [2, 3, 5, 3, '#22232e'],
      [18, 1, 3, 2, '#22232e'],
      [17, 3, 5, 3, '#22232e'],
      [9, 18, 6, 2, '#22232e'],
      [1, 20, 22, 10, '#6fb84e'],
      [2, 5, 20, 14, '#22232e'],
      [0, 9, 3, 6, '#8fd16a'],
      [21, 9, 3, 6, '#8fd16a'],
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
      [10, 20, 4, 4, W, false],
      [8, 21, 1, 4, W, false],
      [15, 21, 1, 4, W, false],
    ],
    S: [
      [5, 0, 4, 10, W],
      [15, 0, 4, 10, W],
      [9, 19, 6, 2, W],
      [1, 21, 22, 9, '#f5d33f'],
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
      [11, 24, 1, 1, '#b08a10', false],
      [11, 27, 1, 1, '#b08a10', false],
    ],
    C: [
      [9, 18, 6, 2, '#f2c7a0'],
      [1, 20, 22, 10, '#2f6fd6'],
      [3, 10, 2, 3, '#f2c7a0'],
      [19, 10, 3, 3, '#f2c7a0'],
      [5, 5, 14, 14, '#f2c7a0'],
      [3, 2, 18, 5, '#2c2a3a'],
      [3, 5, 2, 6, '#2c2a3a'],
      [19, 5, 2, 6, '#2c2a3a'],
      [5, 10, 6, 1, '#3f8cff', false],
      [5, 13, 6, 1, '#3f8cff', false],
      [5, 10, 1, 4, '#3f8cff', false],
      [10, 10, 1, 4, '#3f8cff', false],
      [13, 10, 6, 1, '#3f8cff', false],
      [13, 13, 6, 1, '#3f8cff', false],
      [13, 10, 1, 4, '#3f8cff', false],
      [18, 10, 1, 4, '#3f8cff', false],
      [11, 11, 2, 1, '#3f8cff', false],
      [7, 11, 2, 2, K, false],
      [15, 11, 2, 2, K, false],
      [10, 16, 4, 1, '#b5745a', false],
      [9, 20, 6, 4, '#ffffff', false],
      // AI 로봇 (어깨 옆에 떠 있음)
      [23, 5, 6, 5, '#cfd6e6'],
      [24, 7, 4, 1, '#3f8cff', false],
      [25, 3, 2, 2, '#cfd6e6'],
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

  // 1인칭 손 색: 털·피부, 소매
  const HANDS = {
    D: { skin: '#f08a2e', dark: '#c46a1e', mark: '#3a2416', sleeve: '#c8323f', sleeveDark: '#9c2531' },
    I: { skin: '#22232e', dark: '#111219', mark: '#f4f4f8', sleeve: '#6fb84e', sleeveDark: '#4f8f36' },
    S: { skin: '#f6f4f2', dark: '#d9d4cf', mark: '#ffb3c4', sleeve: '#f5d33f', sleeveDark: '#c9a922' },
    C: { skin: '#f2c7a0', dark: '#c99a78', mark: null, sleeve: '#2f6fd6', sleeveDark: '#2255a8' },
    none: { skin: '#e9c3a0', dark: '#c99a78', mark: null, sleeve: '#565c70', sleeveDark: '#41465a' },
  };

  function draw(g, code, x, y, u = 1) {
    const parts = BUST[code] || UNKNOWN;
    const px = (v) => Math.round(v);
    parts.forEach((p) => {
      if (p[5] === false) return;
      g.fillStyle = K;
      g.fillRect(px(x + p[0] * u - 1), px(y + p[1] * u - 1), p[2] * u + 2, p[3] * u + 2);
    });
    parts.forEach((p) => {
      g.fillStyle = p[4];
      g.fillRect(px(x + p[0] * u), px(y + p[1] * u), p[2] * u, p[3] * u);
    });
  }

  window.Chars = {
    draw,
    hands: (code) => HANDS[code] || HANDS.none,
    // 미니 초상화 (24×32 캔버스)
    portrait(canvas, code) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#141831';
      g.fillRect(0, 0, canvas.width, canvas.height);
      draw(g, code, 0, 2, 1);
    },
  };
})();
