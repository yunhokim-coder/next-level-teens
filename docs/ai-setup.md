# AI 아이디어 도우미 연결 (Claude Haiku 5.5)

6화 R(지금)·O(방법 찾기)는 노바와의 코칭 대화다. 학생이 **AI 도우미를 직접 켰을 때만**, 그 대화(종착역, 해 본 것과 👍/👎, 대답, R 점수)와 그림자 낱말이 Apps Script를 거쳐 Claude로 간다.
- `examples`: G 목표 예시(kind: goals) 또는 R "지금까지 해 본 것" 예시 (종착역 맞춤)
- `coach`: R에서 노바의 반영 + 해결중심 질문 한마디 + 답 후보 칩 3개
- `ideas`: 노바의 반영 한마디 + 공부 방법 아이디어 5개
키가 없거나, 한도에 걸리거나, 실패하면 기기 안 생성기(js/grow.js)가 대신 만든다. 게임은 멈추지 않는다.

## 흐름

게임(js/ai.js) → Apps Script 웹앱(apps-script/Code.gs, `action: 'ideas'`) → Anthropic API (`claude-haiku-5-5`, effort low, JSON 형식 고정) → 게임

- API 키는 Apps Script의 **스크립트 속성 `ANTHROPIC_API_KEY`** 에만 있다. 게임 코드·저장소에는 없다.
- 학생 글은 시트에 저장하지 않는다. `ai_log` 탭에는 익명 코드, 성공 여부, 걸린 시간, 토큰 수만 남는다.

## 안전장치

| 무엇 | 어디서 | 기본값 |
|---|---|---|
| 월 지출 상한 | Anthropic Console → Billing (충전식이면 충전액이 곧 상한) | 예: $5 |
| 하루 전체 요청 수 | Code.gs `AI_DAILY_LIMIT` | 500 |
| 학생 한 명 요청 수 | 게임 10회 + Code.gs `AI_PER_STUDENT` 12회(6시간) | 10 |
| 연락처 지우기 | js/ai.js `scrub` (이메일, 6자리 이상 숫자) | 켜짐 |
| 위기 신호 | js/ai.js `CRISIS`(기기 안, AI로 보내지 않음) + AI 지시문(safety) | 켜짐 → 1388 안내 |
| 끄기 | config.js `AI_IDEAS: false` | true |

## 연결 방법 (한 번만)

1. console.anthropic.com 가입 → Billing에서 결제 수단 등록, 소액 충전(예: $5) 또는 월 한도 설정.
2. API Keys → Create Key → 이름 `next-line` → 키 복사 (한 번만 보인다).
3. 스프레드시트 → 확장 프로그램 → Apps Script → `Code.gs`를 이 저장소의 `apps-script/Code.gs`로 바꾸고, `SHEET_ID`에 원래 쓰던 시트 ID를 넣는다.
4. 왼쪽 ⚙ 프로젝트 설정 → 스크립트 속성 → 속성 추가: `ANTHROPIC_API_KEY` = 복사한 키 → 저장.
5. 함수 선택에서 `testIdeas` → ▷ 실행 → 처음이면 권한 승인(외부 서비스 연결 권한이 추가됨) → 실행 로그에 아이디어 5개가 보이면 성공.
6. 배포 → 배포 관리 → ✏ 수정 → 버전: **새 버전** → 배포. (웹앱 URL은 그대로)

## 연구 윤리 메모

- 동의 화면 문구에 "마지막 역에서 AI 도우미를 켜면 그때 쓴 짧은 글만 AI로 보내짐"을 넣었다. IRB 서류와 보호자 동의서에도 같은 내용을 적는다.
- Anthropic API는 보낸 내용을 모델 학습에 쓰지 않는다(상용 약관). 보관 기간은 Anthropic의 데이터 정책을 확인해 IRB 서류에 적는다.
- 위기 신호 안내(청소년상담 1388)는 학교의 위기 대응 절차와 맞는지 확인한다.
