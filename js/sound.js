// 8비트 효과음을 Web Audio API로 직접 만든다 (외부 음원 파일 없음).
(function () {
  const STORE_KEY = 'nextline.muted';
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem(STORE_KEY) === '1';
  } catch (e) {
    /* 기본값 유지 */
  }

  // 아이폰은 무음 모드(옆면 스위치)일 때 웹 효과음을 막는다.
  // 소리를 '재생(playback)' 종류로 알리면 동영상처럼 무음 모드에서도 들린다.
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {
    /* 지원하지 않는 브라우저 */
  }

  // 아이폰·아이패드: 효과음을 보이지 않는 <audio> 재생기로 흘려보낸다.
  // <audio>로 나는 소리는 동영상처럼 무음 스위치를 무시하고 음량 버튼만 따른다.
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let master = null; // 모든 효과음이 모이는 곳
  let player = null;

  function route() {
    if (master) return;
    master = ctx.createGain();
    if (IOS && ctx.createMediaStreamDestination) {
      try {
        const dest = ctx.createMediaStreamDestination();
        master.connect(dest);
        player = document.createElement('audio');
        player.setAttribute('playsinline', '');
        player.srcObject = dest.stream;
        const p = player.play();
        if (p && p.catch) {
          p.catch(() => {
            // 재생기가 막히면 원래대로 바로 스피커로
            master.disconnect();
            master.connect(ctx.destination);
            player = null;
          });
        }
        return;
      } catch (e) {
        player = null;
      }
    }
    master.connect(ctx.destination);
  }

  // 브라우저 정책상 사용자가 화면을 누른 순간에만 소리를 켤 수 있다
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume();
    route();
    if (player && player.paused) {
      const p = player.play();
      if (p && p.catch) p.catch(() => {});
    }
    // 아주 짧은 빈 소리를 한 번 내야 풀리는 기기가 있다
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(master);
    src.start(0);
  }

  // 휴대폰은 화면을 껐다 켜거나 다른 앱에 다녀오면 소리를 멈춘다. 다시 누를 때마다 깨운다
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
    window.addEventListener(
      ev,
      () => {
        if (!ctx || ctx.state !== 'running' || (player && player.paused)) unlock();
      },
      { passive: true }
    )
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && player) player.pause();
  });

  function tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
    if (muted || !ctx || !master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.08) {
    if (muted || !ctx || !master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(master);
    src.start();
  }

  const sfx = {
    blip: () => tone(660, 0.03, { vol: 0.025 }),
    select: () => tone(880, 0.08, { slide: 220 }),
    start: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 })),
    sparkle: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.08, { type: 'triangle', vol: 0.05, delay: i * 0.06 })),
    poof: () => noise(0.25, 0.06),
    rumble: () => {
      noise(0.8, 0.1);
      tone(70, 0.8, { type: 'sawtooth', vol: 0.05, slide: -30 });
    },
    screech: () => {
      tone(2200, 1.4, { type: 'sawtooth', vol: 0.025, slide: -1400 });
      tone(1650, 1.4, { type: 'square', vol: 0.015, slide: -900 });
      noise(1.4, 0.07);
    },
    crash: () => {
      noise(1.2, 0.18);
      tone(60, 1.2, { type: 'sawtooth', vol: 0.09, slide: -35 });
      tone(110, 0.5, { type: 'square', vol: 0.05, slide: -60, delay: 0.15 });
    },
    alarm: () => [0, 1, 2].forEach((i) => {
      tone(880, 0.18, { vol: 0.04, delay: i * 0.42 });
      tone(660, 0.18, { vol: 0.04, delay: i * 0.42 + 0.2 });
    }),
    powerup: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { vol: 0.05, delay: i * 0.07 })),
    clear: () => [523, 523, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, { delay: i * 0.15 })),
  };

  window.Sound = {
    unlock,
    // 메뉴의 소리 테스트용: 지금 소리 장치 상태
    status() {
      return {
        ctx: ctx ? ctx.state : 'none',
        muted,
        session: navigator.audioSession ? navigator.audioSession.type : 'n/a',
        route: player ? (player.paused ? 'player-paused' : 'player') : 'direct',
      };
    },
    play: (name) => sfx[name] && sfx[name](),
    get muted() {
      return muted;
    },
    setMuted(v) {
      muted = v;
      try {
        localStorage.setItem(STORE_KEY, v ? '1' : '0');
      } catch (e) {
        /* 이번 방문 동안만 유지 */
      }
    },
  };
})();
