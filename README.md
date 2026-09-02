# Personal Spending Tracker — Django

Flask 버전을 사용하지 않고 **Django + pandas + SQLite + HTML/CSS/Vanilla JavaScript**로 구성한 개인 지출 관리 웹 프로젝트입니다.

## 주요 기능
- CRUD: 지출 등록 / 조회 / 수정 / 삭제
- SQLite + Django ORM
- pandas 통계
- 전체 지출 / 지출 건수 / 가장 큰 지출
- 카테고리별 합계 / 월별 합계
- 카테고리 복수 선택 필터
- 선택된 필터 배지 개별 제거
- 기본은 전체 선택 상태
- 모든 카테고리가 선택되면 자동으로 전체 필터 상태로 정규화
- 상단 `↻` 아이콘으로 전체 필터 초기화
- 이번 달 / 최근 3개월 / 최근 6개월 / 전체 빠른 선택
- 커스텀 기간 캘린더
- React / Node.js 미사용

## 처음 실행

기존 Flask 프로젝트에서 전환한다면 **새 Django 프로젝트 파일 전체를 덮어쓴 뒤**, 기존 `.venv`는 유지하거나 새로 만들어도 됩니다.

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
```

브라우저:
```text
http://127.0.0.1:8000/
```

`migrate` 시 초기 예시 데이터 3건도 자동으로 추가됩니다.

## 폴더 구조

```text
Personal-Spending-Tracker-Django/
├─ manage.py
├─ requirements.txt
├─ config/
└─ expenses/
   ├─ models.py
   ├─ forms.py
   ├─ views.py
   ├─ urls.py
   ├─ services/statistics.py
   ├─ migrations/
   ├─ templates/expenses/
   └─ static/expenses/
```

## 디자인
제공된 Figma 디자인 시스템의 다음 요소를 참고했습니다.
- SUIT 중심의 국문, 영문 타이포그래피
- Lato 계열 숫자 표현
- Black / Grey / `#F7F7F7` 중립 배경
- 라운드 카드와 정돈된 간격
- 노란 포인트 컬러


## 브랜드 이미지 파일 위치

아래 6개 파일은 모두 다음 폴더에 둡니다.

```text
expenses/static/expenses/images/
```

파일명:
```text
logo-sseum-horizontal.png
favicon-sseum.png
logo-sseum-symbol.png
logo-sseum-mono-black.png
logo-sseum-mono-white.png
logo-sseum-mono-yellow.png
```

현재 실제 화면 사용:
- `logo-sseum-horizontal.png` → 상단 헤더 메인 로고
- `favicon-sseum.png` → 브라우저 파비콘 / Apple touch icon
- `logo-sseum-symbol.png` → 메인 히어로 강조 / 빈 상태 / 등록·수정 화면 포인트

보관용 변형:
- `logo-sseum-mono-black.png` → 밝은 배경에서 사용할 단색 로고
- `logo-sseum-mono-white.png` → 검정/다크 배경용
- `logo-sseum-mono-yellow.png` → 검정 배경의 브랜드 포인트용


## 2026-09 UX 개선
- 카테고리/빠른 기간 필터는 AJAX로 적용되어 페이지 전체가 새로고침되지 않습니다.
- 현재 스크롤 위치를 유지하면서 대시보드/목록/통계 영역만 교체됩니다.
- 지출 등록/수정 날짜 입력은 브라우저 기본 달력을 사용하지 않고 SSEUM 커스텀 달력을 사용합니다.
- 날짜 입력 영역 전체를 클릭하면 달력이 열립니다.
- 전체 필터 초기화 버튼은 필터가 실제로 적용된 경우에만 보이며, 날짜 버튼 바로 뒤에 배치됩니다.
- 필터/날짜/초기화 아이콘은 라운드 캡/조인의 심플한 outline 스타일로 통일했습니다.
- 전체 폰트는 SUIT로 통일했습니다.
- 기본 진한 텍스트 컬러는 순수 검정 대신 브랜드 기준 `#1A1A1A`를 사용합니다.
- 가장 큰 지출 카드의 카테고리/내용은 배지로 올려 카드 정렬을 맞췄습니다.
