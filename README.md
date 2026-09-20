# 야시장 데드라인

서울·경기·인천 야시장, 야장, 축제 연계 먹거리 일정을 확인하는 GitHub Pages입니다.

**사이트:** https://hoyoi05.github.io/night-market-deadlines/

기존 [팝업 데드라인](https://hoyoi05.github.io/popup-deadlines/)과 유사한 목록·필터 구조에 야시장 운영일 계산을 더했습니다.

- 행사 시작까지 / 시즌 종료까지 별도 구역
- 공지된 요일·개별 개최일에 따른 다음 운영일
- 지역·행사 종류·이름 검색, 오늘 일정, 확인 필요, 종료 기록
- 공식 출처·확인일·지도 검색 링크
- 한국 시간 기준 계산, 날짜만 공개된 경우 날짜 단위 표시
- 운영 중 표시는 실시간 현장 정보가 아니라 공지된 시간과의 비교
- 확인 필요·취소는 방문 가능한 일정에서 제외

2026-09-21 초판: 13개 항목(시즌 진행·예정 5, 종료 5, 확인 필요 3). 전 지역을 망라하지 않습니다. [수집 기록](RESEARCH.md)을 참고하세요.

## 실행·검증

Node.js 22 이상. 외부 라이브러리와 빌드 과정 없이 동작합니다.

```sh
npm start
npm test
npm run validate
```

로컬 주소: http://127.0.0.1:4175/night-market-deadlines/

## 데이터 수정

`docs/data/markets.json`에서 수정합니다. 공식 공지의 URL과 실제 검토일을 함께 남깁니다.

`schedule.mode`:

| 값 | 뜻 | 필요한 필드 |
| --- | --- | --- |
| daily | 기간 내 매일 | start, end, open, close |
| weekly | 특정 요일 | 위 필드와 weekdays(일요일 0 ~ 토요일 6) |
| dates | 개별 공지 날짜 | 위 필드와 dates 배열 |
| unknown | 상세 일정 미확인 | 날짜 필드 없이 scheduleText로 설명 |

시간이 없으면 open·close 모두 null. excludedDates로 휴무·취소 회차를 제외하고 overrides의 날짜별 open·close로 변경 시간을 반영합니다. 행사 전체 취소는 cancelled: true. verification은 official 또는 secondary이며, secondary는 카운트다운 대상에서 제외됩니다. 종료시간이 개장시간보다 이르면 다음 날 종료로 계산합니다.

새 행사 자동 수집은 아직 연결하지 않았습니다. 데이터 확인일은 실제 검토 때만 변경하며, 카운트다운은 30초마다 갱신됩니다.

## GitHub Pages

저장소 Settings → Pages → Deploy from a branch → main /docs. 프로젝트 경로 아래에서도 동작하도록 모든 사이트 자산 경로를 상대 경로로 작성했습니다. main에 변경을 올리면 GitHub Pages가 다시 게시합니다.

배포 전 `npm test`와 `npm run validate`를 실행합니다. PC와 모바일에서 검색·필터·공식 링크·빈 결과를 확인합니다.

## 구성

- docs/: 공개 사이트
- docs/assets/core.js: 날짜와 운영일 계산
- docs/assets/app.js: 화면과 필터
- docs/data/markets.json: 검토한 행사 자료
- tests/: 날짜 경계·필터 회귀 검사
- scripts/: 개발 서버·데이터 검증

코드는 MIT 라이선스입니다. 연결된 외부 출처의 저작물 권리는 각 권리자에게 있습니다.
