// 앱 전체 설정. 코드를 몰라도 이 파일만 고쳐서 동작을 바꿀 수 있게 모아둔다.
window.APP_CONFIG = {
  // IRB 승인 전에는 반드시 false. true일 때만 사전·사후 설문과 데이터 전송이 켜진다.
  DATA_COLLECTION: false,

  // Google Analytics 4 측정 ID (예: 'G-XXXXXXX'). 비워두면 보내지 않는다.
  GA_MEASUREMENT_ID: '',

  // Google Apps Script 웹앱 URL. 비워두면 보내지 않는다.
  APPS_SCRIPT_URL: '',

  // 처음 열었을 때 언어 ('ko' 또는 'en'). 학생이 메뉴에서 바꾸면 그 기기에 기억된다.
  DEFAULT_LANG: 'ko',
  LANGS: ['ko', 'en'],
};
