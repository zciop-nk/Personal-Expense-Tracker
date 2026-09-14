# 사용성·배치 수정본

- 예산 관리 탭 제거. 홈 예산 카드의 설정/수정에서 작은 모달을 엽니다.
- 월 입력 전체를 누르면 12개월 선택기가 열립니다. 연도 이동과 월별 저장값 불러오기를 지원합니다.
- 금액 증감 화살표 제거, 입력 포커스의 진한 녹색/이중 테두리 완화.
- 검색어 지우기 버튼, 조회 중 안내, 적용된 검색어·결과 건수·검색 해제 표시.
- 필터는 지출이 한 건 이상 있는 카테고리만 표시합니다. 기록 입력에서는 모든 카테고리를 선택할 수 있습니다.
- 목록이 2칸을 점유하던 CSS 충돌 수정. 데스크톱의 목록/그래프 좌우 배치 복원.
- 목록 15~16px, 필터 14px 중심으로 한글 가독성 개선.
- 데스크톱 drawer 열기 시 본문 최대 폭 1180px, 왼쪽 최소 여백 44px 유지.
- 서버 테스트 17개 통과. 별도 DOM 환경에서 예산 모달·월 선택·저장 및 검색·입력 동작 검증.
- 실제 브라우저의 픽셀 배치·터치 확인은 환경 제한으로 미완료입니다.

아래 기존 설치 안내대로 적용하세요. 이번에도 데이터베이스는 압축에 포함하지 않습니다.

---

# 화면 깨짐 수정본 안내

이전 화면에서는 새 홈 스타일이 적용되지 않았습니다. 수정본은 CSS와 JavaScript에 새로운 파일명을 부여해 이전 `style.css`와 기존 스크립트 캐시가 재사용되지 않도록 했습니다.

## 가장 확실한 적용 방법

1. 기존 서버를 Ctrl+C로 종료합니다.
2. 기존 폴더와 `db.sqlite3`를 백업합니다.
3. 이번 압축을 **새 폴더**에 풉니다. 기존 폴더 안에 중첩해서 넣지 마세요.
4. 기존 `db.sqlite3`를 새 폴더의 `manage.py` 옆으로 **복사**합니다. 원본 DB는 그대로 보관합니다.
5. VS Code에서 새 `manage.py`가 있는 폴더를 열고 아래 명령을 실행합니다.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver
```

화면 주소는 `http://127.0.0.1:8000/`입니다. 홈에서 노란 지출 카드와 흰 예산 카드가 보이는지 확인하세요.
이번 압축에는 DB와 가상환경이 없습니다. 반드시 본인의 DB를 복사해야 이전 기록이 이어집니다.

---

# 씀 · SSEUM

나를 위한 개인 지출 가계부. **Django + SQLite + HTML/CSS/JavaScript**로 동작합니다.
로그인 없이 사용하는 1인 로컬 프로그램이며, PostgreSQL 연결을 위한 설정도 준비되어 있습니다.

## 기존 프로젝트에서 업데이트하기

1. 실행 중인 서버를 `Ctrl+C`로 종료합니다.
2. **기존 폴더를 복사해서 백업합니다. 특히 `db.sqlite3`를 보관하세요.** 이 파일에 기록이 들어 있습니다.
3. 이 압축 파일의 코드를 기존 프로젝트 폴더에 덮어씁니다. 기존 `.venv`, `.git`, `db.sqlite3`는 유지합니다.
4. `expenses/static/expenses/css/ui-refresh.css`와 `chart-polish.css`는 `style.css`로 합쳤습니다. 기존 파일이 남아 있어도 로드되지 않으며 삭제해도 됩니다.
5. VS Code 터미널에서 아래 명령을 실행합니다.

```powershell
.venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

브라우저에서 `http://127.0.0.1:8000/`을 열고 `Ctrl+F5`로 새 스타일을 불러옵니다.
기존 migration 파일 0001~0009는 삭제하거나 합치지 마세요. 새 0010 migration이 월 예산 테이블과 조회 인덱스를 추가합니다.

## 처음 실행하기

Python 3.12 이상을 권장합니다. VS Code에서 `manage.py`가 있는 폴더를 열고 실행하세요.

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

가상환경 활성화가 안 된다면 아래처럼 직접 실행할 수 있습니다.

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver
```

기존 0002 migration의 동작을 유지했기 때문에 **새 DB를 만들면 2026년 8월의 예시 지출 3건이 생성됩니다.** 실제 가계부로 사용하려면 해당 예시 3건을 화면에서 삭제하세요. 기존 DB에 이미 0002가 적용돼 있다면 다시 생성되지 않습니다.

## 기능과 계산 기준

| 기능 | 동작 |
| --- | --- |
| 홈 요약 | 한국 시간 기준 이번 달 1일부터 오늘까지 쓴 돈, 오늘 쓴 돈 |
| 지난달 비교 | 지난달 1일부터 같은 일자까지 비교. 지난달이 짧으면 그 달의 말일까지 |
| 월 예산 | 월별 예산 저장·수정, 남은 금액, 예산 초과 표시 |
| 하루 사용 가능 금액 | 남은 예산 ÷ 오늘을 포함한 월말까지 일수. 초과 시 0원 |
| 지출 기록 | 날짜·카테고리·내용·금액 입력, 수정, 확인 후 삭제 |
| 입력 검증 | 오늘까지의 실제 지출만 입력, 금액은 1~2,147,483,647원의 정수, 내용 필수 |
| 검색 | 내용 또는 카테고리명 검색. 기간·카테고리 필터와 동시에 적용 |
| 필터 | 카테고리 복수 선택, 이번 달·최근 3/6개월·전체, 직접 기간 선택 |
| 통계 | 카테고리 구성, 기간별 추이, 단일 카테고리 분석, 두 카테고리 비교 |
| 목록 | 최신 날짜 우선, 30건씩 페이지 이동 |
| CSV | 현재 조건에 맞는 **전체 페이지** 내역을 UTF-8 BOM으로 다운로드. Excel에서 한글 표시 가능 |
| 사용자 카테고리 | 새로 만들기, 중복·길이 검사. 마지막 지출을 삭제해도 카테고리 유지 |
| 모바일 | 한 열 카드, 하단 메뉴, 전체 너비 기록 패널, 터치 영역과 안전 여백 |

홈의 이번 달 요약은 아래 검색 필터와 독립적입니다. 검색 결과의 통계는 필터에 맞는 전체 기록 기준이며 페이지를 넘겨도 합계가 바뀌지 않습니다.
월 예산은 지출 한도 계획이며 수입이나 계좌 잔액을 의미하지 않습니다.
로그인·수입/이체·반복 결제 자동 생성·은행 연동은 포함하지 않았습니다.

## 파일 구조

```text
config/settings.py                # SQLite / PostgreSQL 설정
expenses/models.py                # Category, CategoryKeyword, Expense, MonthlyBudget
expenses/forms.py                 # 지출·예산 입력 검증
expenses/views.py                 # CRUD, 조회 조건, 홈 집계, 예산, CSV
expenses/services/statistics.py   # 재사용 가능한 통계 계산
expenses/templates/expenses/      # 공통 틀, 홈, 목록·차트, 기록·예산 폼
expenses/static/expenses/css/sseum.9fbbef0cd3be.css  # 통합 스타일, 모바일 포함
expenses/static/expenses/js/ledger.56b4577d5c13.js     # 목록·필터·기본 입력·대화상자
expenses/static/expenses/js/charts.17c471405918.js  # 차트 표현
expenses/static/expenses/js/drawer.4d722f8d7531.js # 기록 패널
expenses/migrations/              # DB 변경 이력 — 기존 번호 유지
expenses/tests.py                 # 서버 회귀 테스트
```

CSS/JS 파일명에 내용 해시를 넣어 이전 캐시와 구분합니다. 별도 프런트엔드 빌드나 npm 설치 없이 실행됩니다.

CSS 3개를 1개로 통합하고 사용하지 않는 이전 hero 스타일을 제거했습니다. JavaScript는 역할이 다른 목록·차트·입력 패널로 유지했습니다. 템플릿 조각도 서버 갱신에 사용하므로 무조건 한 파일로 합치지 않았습니다. pandas는 사용하지 않습니다.

## PostgreSQL로 연결하기

현재도 SQLite라는 **SQL 데이터베이스**에 저장합니다. PostgreSQL 전환은 Django ORM 모델을 유지한 채 연결 설정을 바꾸는 방식입니다.
먼저 PostgreSQL에 본인 소유의 빈 데이터베이스와 사용자를 준비한 뒤 같은 PowerShell 터미널에서 실행하세요.

```powershell
python -m pip install -r requirements-postgres.txt
$env:DB_ENGINE = "postgresql"
$env:POSTGRES_DB = "personal_expense_tracker"
$env:POSTGRES_USER = "본인_DB_사용자"
$env:POSTGRES_PASSWORD = "본인_DB_비밀번호"
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5432"
python manage.py migrate
python manage.py runserver
```

환경변수는 현재 터미널에만 적용됩니다. `.env`를 자동으로 읽지는 않습니다. 비밀번호를 코드나 Git에 넣지 마세요.
SQLite로 돌아가려면 `Remove-Item Env:DB_ENGINE` 후 서버를 다시 실행하세요.

**연결만 변경하면 기존 SQLite 기록은 자동으로 옮겨지지 않습니다.** 데이터 이전은 별도 작업입니다. 이전할 때는 다음 순서로 진행합니다.

1. 서버를 중지하고 SQLite 파일을 백업합니다.
2. SQLite 설정 상태에서 `python manage.py dumpdata expenses --indent 2 --output expenses-backup.json`으로 카테고리·키워드·지출·예산을 내보냅니다.
3. 비어 있는 PostgreSQL DB에 연결하고 migration을 적용합니다. 기존 데이터가 있는 PostgreSQL DB에 그대로 합치면 ID 충돌이 날 수 있습니다.
4. 새 DB의 초기 예시/분류 데이터와 충돌 여부를 확인한 뒤 이전 계획에 따라 정리하고 JSON을 가져옵니다. 이 단계는 실제 DB를 연결할 때 함께 진행하는 것을 권장합니다.
5. 지출 건수·총액·카테고리 연결·월 예산을 원본과 비교하고, 새 지출의 ID 발급도 확인합니다.

이번 작업에서는 PostgreSQL 인스턴스에 실제 연결하지 않았습니다. 현재 단일 사용자의 모든 기록이 같은 DB를 공유하므로, 외부 공개 서비스로 배포하기 전에는 사용자별 데이터 분리와 접근 제어가 필요합니다.

## 검증

```powershell
python manage.py check
python manage.py test expenses
python manage.py makemigrations --check --dry-run
```

Django 5.2.17 / SQLite에서 17개 테스트 통과:
CRUD, 사용자 카테고리 보존, 잘못된 입력, 날짜 필터 오류, 검색 조합, CSV 범위/문자열 처리,
페이지별 통계 일관성, 월 예산 수정/초과/기간 경계, AJAX 홈 갱신, CSRF, 미분류 통계, 예시 생성 보호.

JavaScript는 별도 DOM 실행 환경에서 검색·필터·입력값 동기화·패널 열기 등 20개 검증 항목을 통과했고, CSS 문법 파싱과 주요 스타일 계산 4개 항목도 통과했습니다. 페이지에서 참조하는 CSS/JS의 서버 응답과 파일 내용 해시도 확인했습니다. 이 검증은 실제 화면 배치나 터치 검증을 대신하지 않습니다.

브라우저 환경에서 로컬 URL과 파일 미리보기가 차단되어 실제 브라우저 화면/터치 동작을 끝까지 확인하지는 못했습니다.
모바일 반응형 스타일은 적용했고, 아래 항목은 본인 브라우저에서 최종 확인해 주세요.

- 데스크톱 / 390px / 320px 폭에서 홈과 기록 패널 확인
- 지출 기록 → 수정 → 필터 검색 → CSV 다운로드
- 예산 입력 후 홈의 남은 금액 확인
- 새 카테고리 생성, 달력 선택, 모바일 하단 메뉴, 취소 확인창

## 예시 데이터 생성

실제 기록이 없는 테스트 DB에서 사용하는 명령입니다.

```powershell
python manage.py seed_demo_expenses
```

기존 지출이 있으면 기본 실행은 중단합니다. 기존 기록을 유지하며 추가하려면 `--append`, 기존 지출을 지우고 교체하려면 `--replace`를 명시해야 합니다. 실제 가계부에는 `--replace`를 사용하지 마세요.
