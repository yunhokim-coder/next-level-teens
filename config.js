// 앱 전체 설정. 코드를 몰라도 이 파일만 고쳐서 동작을 바꿀 수 있게 모아둔다.
window.APP_CONFIG = {
  // IRB 승인 전에는 반드시 false. true일 때만 학생 데이터 전송이 켜진다.
  // 연결 확인용: 주소 끝에 ?s=TEST를 붙여 열면 이 값이 false여도 전송한다 (학교 코드 TEST로 기록됨).
  DATA_COLLECTION: true,

  // Google Analytics 4 측정 ID (예: 'G-XXXXXXX'). 비워두면 보내지 않는다.
  GA_MEASUREMENT_ID: '',

  // Google Apps Script 웹앱 URL. 비워두면 보내지 않는다.
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzawhsBj9z2f-KI7yxViqlzvydD98nP3Em4gsNl4O6ZZLPdfeNMt9GexsXYSnFadm4k/exec',

  // 처음 열었을 때 언어 ('ko' 또는 'en'). 학생이 메뉴에서 바꾸면 그 기기에 기억된다.
  DEFAULT_LANG: 'ko',
  LANGS: ['ko', 'en'],
};
