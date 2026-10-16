// 앱 전체 설정. 코드를 몰라도 이 파일만 고쳐서 동작을 바꿀 수 있게 모아둔다.
window.APP_CONFIG = {
  // IRB 승인 전에는 반드시 false. true일 때만 학생 데이터 전송이 켜진다.
  // 연결 확인용: 주소 끝에 ?s=TEST를 붙여 열면 이 값이 false여도 전송한다 (학교 코드 TEST로 기록됨).
  DATA_COLLECTION: true,

  // Google Analytics 4 측정 ID (예: 'G-XXXXXXX'). 비워두면 보내지 않는다.
  GA_MEASUREMENT_ID: '',

  // Google Apps Script 웹앱 URL. 비워두면 보내지 않는다.
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzawhsBj9z2f-KI7yxViqlzvydD98nP3Em4gsNl4O6ZZLPdfeNMt9GexsXYSnFadm4k/exec',

  // AI 아이디어 도우미 (6화 O 단계). true이고 학생이 켰을 때만 Apps Script를 거쳐 Claude에게 묻는다.
  // API 키는 Apps Script의 스크립트 속성(ANTHROPIC_API_KEY)에 둔다. 키가 없거나 실패하면 기기 안 생성기를 쓴다.
  AI_IDEAS: true,

  // AI 요청을 받을 Cloudflare Worker 주소 (cloudflare/worker.js). 비워 두면 Apps Script로 보낸다.
  // 이 주소가 실패하면 한 번 더 시도하고, 그래도 안 되면 Apps Script로 보낸다.
  AI_URL: 'https://next-line-ai.ch6rrb.workers.dev/',

  // 처음 열었을 때 언어 ('ko' 또는 'en'). 학생이 메뉴에서 바꾸면 그 기기에 기억된다.
  DEFAULT_LANG: 'ko',
  LANGS: ['ko', 'en'],
};
