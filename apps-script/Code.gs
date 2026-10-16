// NEXT LINE 데이터 받기 (Google Apps Script 웹앱)
// 설정 방법은 docs/data-setup.md 참고.
// 게임이 보낸 JSON을 이벤트 이름별 시트 탭(register, pre, post, satisfaction, ...)에 한 줄씩 쌓는다.
// 처음 보는 항목이 오면 맨 오른쪽에 열을 새로 만든다.

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const event = String(data.event || 'unknown').replace(/[^a-z0-9_]/gi, '').slice(0, 40) || 'unknown';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(event) || ss.insertSheet(event);

    // 머리글: 받은 시각 + 데이터의 키들
    let headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (!headers.length) {
      headers = ['received'];
      sheet.appendRow(headers);
    }
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) === -1) {
        headers.push(k);
        sheet.getRange(1, headers.length).setValue(k);
      }
    });

    const row = headers.map(function (h) {
      if (h === 'received') return new Date();
      const v = data[h];
      if (v === undefined || v === null) return '';
      return typeof v === 'object' ? JSON.stringify(v) : v;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// 브라우저로 주소를 열었을 때 살아 있는지 확인용
function doGet() {
  return ContentService.createTextOutput('NEXT LINE data endpoint is running.');
}
