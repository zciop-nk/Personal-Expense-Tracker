# 씀 / SSEUM

> **기록이 습관이 되는, 나의 지출 관리**

씀(SSEUM)은 일상에서 발생하는 지출을 기록하고, 기간·카테고리·내용별 소비 흐름을 한눈에 확인할 수 있는 **개인 지출 관리 웹 서비스**입니다.

단순히 금액을 저장하는 데서 끝나지 않고, 월별 소비 현황과 예산, 카테고리 비중, 지출 추이를 함께 보여 주어 사용자가 자신의 소비 패턴을 자연스럽게 돌아볼 수 있도록 구성했습니다.

---

## 주요 기능

### 1. 지출 기록 관리

- 지출 **등록 / 수정 / 삭제**
- 날짜, 카테고리, 내용, 금액 입력
- 미래 날짜 입력 방지
- 금액 1원 이상 검증
- 내용 공백 입력 방지
- 데스크톱에서는 목록을 보면서 작성할 수 있는 **우측 Drawer UI** 제공
- 모바일에서는 화면 크기에 맞춘 입력 화면 제공

### 2. 카테고리 관리

기본 카테고리는 다음 10종으로 구성되어 있습니다.

- 식비
- 교통
- 주거·공과금
- 생활
- 쇼핑
- 건강
- 문화·여가
- 교육·자기계발
- 금융·고정비
- 반려동물

각 카테고리는 고유한 색상으로 구분되며, 입력 과정에서 기본 키워드를 활용해 카테고리를 찾을 수 있습니다.

기본 카테고리에 없는 항목은 **사용자 정의 카테고리**로 새롭게 생성할 수 있습니다.

### 3. 검색 및 필터

지출이 많아져도 원하는 기록을 빠르게 찾을 수 있도록 다음 필터를 제공합니다.

- 내용 검색
- 카테고리 검색
- 카테고리 다중 선택
- 시작일 / 종료일 기간 선택
- 이번 달
- 최근 3개월
- 최근 6개월
- 전체 기간
- 선택한 필터를 chip 형태로 표시 및 개별 해제

검색과 필터 변경은 화면 전체를 다시 구성하지 않고 결과 영역을 갱신하는 방식으로 동작합니다.

### 4. 페이지네이션

많은 지출 데이터를 한 화면에 과도하게 쌓지 않도록 페이지네이션을 적용했습니다.

- 데스크톱: 기본 30건 단위
- 모바일: 15건 단위
- 10페이지 이하: 전체 페이지 번호 표시
- 10페이지 초과: 현재 위치를 기준으로 필요한 구간만 표시

### 5. 월별 홈 요약

상단 홈 영역에서는 선택한 월의 소비 상황을 빠르게 확인할 수 있습니다.

- 월별 총 지출
- 이전 달 또는 지난달 같은 기간과 비교
- 오늘 지출 / 과거 월의 하루 평균
- 이전·다음 월 이동
- 이번 달로 빠르게 돌아오기

미래 월로는 이동하지 않도록 제한되어 있습니다.

### 6. 월 예산 관리

월별 예산을 설정하고 현재 지출과 비교할 수 있습니다.

- 월별 예산 등록 및 수정
- 사용 금액 / 남은 금액 표시
- 예산 사용률 progress bar
- 현재 월의 남은 일수 계산
- 하루에 사용할 수 있는 금액 안내
- 예산 초과 상태 표시

예산은 월 단위로 각각 저장됩니다.

---

## 적응형 지출 분석 대시보드

선택한 필터 조건에 따라 같은 화면에서도 필요한 분석이 자동으로 달라집니다.

| 유형 | 조건 | 제공 분석 |
| --- | --- | --- |
| **A. 전체 분석** | 카테고리 미선택 또는 3개 이상, 일반 기간 | 카테고리 구성, 월별 지출 추이 |
| **B. 단일 카테고리 분석** | 카테고리 1개 선택 | 내용별 지출 분석, 해당 카테고리 기간별 추이 |
| **C. 단기 기간 분석** | 명시적인 기간이 30일 이하 | 기간 카테고리 구성, 일별 지출 추이 |
| **D. 카테고리 비교** | 카테고리 2개 선택 | 총 지출·건수·평균 비교, 기간별 비교 추이 |

### 차트 UX

- 한 화면에 막대 데이터를 최대 **5개 구간**까지 보여 줌
- 데이터가 더 많으면 가로 스크롤 제공
- 막대의 하단 값은 간결하게 축약
- 데스크톱: 막대 hover / focus 시 상세 금액 표시
- 터치 환경: 막대 터치 시 상세 정보 표시
- 값이 작아도 데이터 존재 여부를 인지할 수 있도록 최소 시각 높이 보정
- 긴 내용명은 레이아웃을 밀지 않도록 말줄임 처리

---

## 반응형 UX

씀은 데스크톱과 모바일에서 동일한 기능을 단순 축소하지 않고, 화면 크기에 맞게 정보 구조를 다르게 제공합니다.

### Desktop

- 지출 내역과 분석 대시보드를 동시에 확인
- 넓은 화면에서 지출 생성·수정 Drawer와 기존 목록을 함께 확인
- 검색 / 필터 / 분석 결과를 한 화면에서 탐색

### Mobile

하단 App Bar를 기준으로 주요 기능을 분리했습니다.

- **가계부**: 검색·필터와 지출 목록 중심
- **+ 버튼**: 새 지출 기록
- **분석**: 요약 정보와 분석 대시보드 중심

모바일에서도 검색·필터 조건은 분석 화면과 자연스럽게 연결됩니다.

---

## CSV 내보내기

현재 적용된 검색 / 카테고리 / 기간 조건을 그대로 반영하여 지출 데이터를 CSV 파일로 내보낼 수 있습니다.

내보내는 항목:

- ID
- 날짜
- 카테고리
- 내용
- 금액

스프레드시트에서 수식으로 해석될 수 있는 문자열은 안전하게 처리한 뒤 저장합니다.

---

## 디자인 시스템

| 항목 | 내용 |
| --- | --- |
| 서비스명 | **씀 / SSEUM** |
| 핵심 문구 | 기록이 습관이 되는, 나의 지출 관리 |
| Brand Color | `#FFE860` |
| Typography | **SUIT** |
| UI 방향 | Modern · Simple · Responsive |
| 주요 구성 | Cool grayscale + 카테고리별 컬러 variation |

브랜드 옐로우는 주요 CTA와 강조 요소에 사용하고, 카테고리 데이터는 서로 구분하기 쉬운 색상 variation을 사용합니다.

---

## 기술 스택

### Backend

- Python
- Django `5.2+`
- Django ORM
- SQLite

### Frontend

- Django Template
- HTML5
- CSS3
- Vanilla JavaScript
- AJAX / Fetch API

### UI

- SUIT Font
- SVG / PNG Brand Assets
- Custom Date Picker
- Responsive Layout
- CSS 기반 Donut / Bar Chart UI

추가적인 프론트엔드 프레임워크 없이 Django Template과 Vanilla JavaScript를 중심으로 구현했습니다.

---

## 데이터 구조

### Category

카테고리 기본 정보와 화면 표시용 색상을 관리합니다.

```text
Category
├─ name
├─ color_key
├─ is_default
└─ created_at
```

### CategoryKeyword

카테고리 검색 및 추천에 사용하는 키워드를 관리합니다.

```text
CategoryKeyword
├─ category
└─ keyword
```

### Expense

사용자가 기록한 개별 지출입니다.

```text
Expense
├─ date
├─ category
├─ description
├─ amount
└─ created_at
```

### MonthlyBudget

월별 예산을 관리합니다.

```text
MonthlyBudget
├─ month
├─ amount
└─ updated_at
```

---

## 프로젝트 구조

```text
Personal-Expense-Tracker/
├─ config/
│  ├─ settings.py
│  ├─ urls.py
│  ├─ asgi.py
│  └─ wsgi.py
│
├─ expenses/
│  ├─ management/
│  │  └─ commands/
│  │     └─ seed_demo_expenses.py
│  │
│  ├─ migrations/
│  ├─ services/
│  │  └─ statistics.py
│  │
│  ├─ static/expenses/
│  │  ├─ css/
│  │  │  └─ base.css
│  │  ├─ images/
│  │  └─ js/
│  │     ├─ charts.js
│  │     ├─ drawer.js
│  │     └─ ledger.js
│  │
│  ├─ templates/expenses/
│  │  ├─ base.html
│  │  ├─ index.html
│  │  ├─ _home.html
│  │  ├─ _results.html
│  │  ├─ _category_donut.html
│  │  ├─ expense_form.html
│  │  ├─ budget_form.html
│  │  └─ _budget_form.html
│  │
│  ├─ admin.py
│  ├─ apps.py
│  ├─ forms.py
│  ├─ models.py
│  ├─ tests.py
│  ├─ urls.py
│  └─ views.py
│
├─ db.sqlite3
├─ manage.py
├─ requirements.txt
└─ README.md
```

### 주요 파일 역할

| 파일 | 역할 |
| --- | --- |
| `models.py` | 지출, 카테고리, 예산 데이터 모델 |
| `forms.py` | 지출·예산 입력 검증 |
| `views.py` | CRUD, 검색, 필터, 페이지네이션, 월 요약, 예산 처리 |
| `services/statistics.py` | 분석용 통계 데이터 계산 |
| `ledger.js` | 검색·필터·기간 선택·모바일 화면 동작 |
| `charts.js` | 도넛/막대 차트 렌더링과 tooltip |
| `drawer.js` | 지출 생성·수정 Drawer와 입력 UI |
| `base.css` | 전체 디자인 시스템과 반응형 UI |

---

## 실행 방법

### 1. 프로젝트 폴더로 이동

```powershell
cd C:\dev\Personal-Expense-Tracker
```

### 2. 가상환경 생성

이미 `.venv`가 있다면 이 단계는 생략할 수 있습니다.

```powershell
python -m venv .venv
```

### 3. 가상환경 활성화

Windows PowerShell 기준:

```powershell
.venv\Scripts\Activate.ps1
```

활성화되면 터미널 앞에 다음과 같이 표시됩니다.

```text
(.venv) PS C:\dev\Personal-Expense-Tracker>
```

### 4. 패키지 설치

```powershell
pip install -r requirements.txt
```

### 5. 데이터베이스 적용

```powershell
python manage.py migrate
```

### 6. 개발 서버 실행

```powershell
python manage.py runserver
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:8000/
```

---

## 예시 데이터 생성

대시보드와 필터 기능을 빠르게 확인하려면 포함된 management command를 사용할 수 있습니다.

기존 데이터를 예시 데이터로 교체:

```powershell
python manage.py seed_demo_expenses --replace
```

기존 데이터를 유지하면서 추가:

```powershell
python manage.py seed_demo_expenses --append
```

별도의 옵션 없이 기존 지출 데이터가 존재하면 실수로 데이터를 지우지 않도록 명령 실행을 중단합니다.

---

## 테스트

Django 테스트 실행:

```powershell
python manage.py test
```

현재 테스트에서는 다음과 같은 주요 동작을 확인합니다.

- 지출 등록 / 수정 / 삭제
- 잘못된 금액·날짜·카테고리 입력 검증
- 미래 날짜 입력 방지
- 검색 + 카테고리 + 기간 복합 필터
- 페이지네이션 상태에서도 전체 통계 유지
- CSV 내보내기
- 월 예산 저장 및 초과 계산
- 월 이동 및 월별 요약
- 사용자 정의 카테고리 생성
- CSRF 보호
- 빈 데이터 및 비교 대시보드 통계
- AJAX 결과 갱신

---

## 서비스 사용 흐름

```text
지출 기록
   ↓
검색 / 카테고리 / 기간으로 필요한 기록 확인
   ↓
월별 소비와 예산 확인
   ↓
카테고리 구성 및 지출 추이 분석
   ↓
필요한 경우 두 카테고리를 직접 비교
```

씀은 기록 자체를 복잡하게 만들기보다, **가볍게 기록하고 필요할 때 소비 흐름을 확인하는 경험**에 초점을 두고 있습니다.
