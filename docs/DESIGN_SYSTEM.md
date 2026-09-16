# SSEUM Design System

> 씀(SSEUM)의 UI를 디자인과 개발에서 같은 언어로 관리하기 위한 최소 디자인 시스템입니다.
> Toss Design System처럼 **Foundation → Component → Pattern → Rule** 순서로 관리하되, 현재 제품에 실제로 쓰는 요소만 포함합니다.

## 1. Principles

1. **기록이 먼저 보인다** — 장식보다 금액, 날짜, 카테고리, 소비 흐름을 우선합니다.
2. **노란색은 강조에만 쓴다** — 브랜드 색은 주요 CTA, 선택/진행 상태에 제한합니다.
3. **같은 역할은 같은 컴포넌트로 표현한다** — 페이지마다 새로운 버튼/입력 스타일을 만들지 않습니다.
4. **상태를 색 하나에 의존하지 않는다** — focus, error, disabled 상태는 border, text, icon, ARIA를 함께 사용합니다.
5. **모바일은 축소판이 아니다** — 가계부와 분석의 우선순위를 분리하되 같은 토큰과 컴포넌트를 사용합니다.

## 2. Foundation

### Color

| Token | Value | Usage |
|---|---|---|
| `--color-ink` | `#111318` | 제목/강한 텍스트 |
| `--color-text` | `#20242D` | 기본 본문 |
| `--color-muted` | `#737C89` | 보조 설명 |
| `--color-line` | `#DDE2E8` | 기본 border |
| `--color-surface` | `#FFFFFF` | 카드/입력 배경 |
| `--color-surface-soft` | `#F4F6F8` | 앱 배경 |
| `--color-brand` | `#FFE860` | 핵심 CTA/진행률/브랜드 강조 |
| `--color-brand-hover` | `#F3DC4D` | 브랜드 hover |
| `--color-danger` | `#C75050` | 삭제/오류/예산 초과 |
| `--color-focus` | `#D5C33B` | focus border |
| `--color-focus-ring` | `rgba(255,232,96,.20)` | focus ring |

카테고리 색상은 의미 색상이 아니라 구분용 색상입니다. 성공/실패 의미로 사용하지 않습니다.

### Typography

- 기본: `SUIT`, system sans-serif
- Display: 32–40px / 800
- Section title: 20px / 800
- Body: 14–16px / 400–600
- Caption: 최소 12px
- 한글 UI에서는 불필요한 영문 eyebrow를 사용하지 않습니다. 브랜드 hero의 `SSEUM · PERSONAL EXPENSE TRACKER`만 예외입니다.

### Radius

- `--radius-sm: 8px` — 작은 control
- `--radius-md: 12px` — 일반 card
- `--radius-control: 14px` — button/input
- pill은 의미가 있는 badge/chip에만 `999px`

### Spacing

4px 배수 체계를 기본으로 사용합니다: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`.
새 컴포넌트에서 임의의 13px, 17px 같은 값을 추가하지 않습니다.

## 3. Components

### Button

종류는 4개만 유지합니다.

- `primary-button`: 저장/적용/등록
- `secondary-button`: 취소/보조 액션
- `icon-button`: 아이콘 단독 액션
- `danger`: 삭제 확인처럼 파괴적 액션

상태: `default → hover → focus-visible → disabled`.
브랜드 노란색은 Primary에만 사용합니다.

### Text Field / Amount Field

모든 입력은 같은 상태 규칙을 사용합니다.

- Default: 흰 배경 + 중립 border
- Hover: border만 한 단계 진하게
- Focus: `--color-focus` + 약한 ring
- Error: danger border + 텍스트 오류 메시지
- Disabled: 낮은 대비 + pointer interaction 없음

Number input의 browser spinner는 사용하지 않습니다.

### Search Field

Text Field와 같은 focus rule을 사용합니다. 검색 입력만 별도 강한 outline을 만들지 않습니다.

### Category Combobox

- 클릭/포커스: 목록 열기
- `ArrowDown`, `ArrowUp`: 옵션 이동
- `Enter`: 선택
- `Escape`: 닫기
- 선택 옵션은 `aria-selected=true`
- 새 카테고리 생성은 검색 결과가 없을 때만 표시

### Date Picker

- 입력 영역 전체가 trigger
- 실제 지출 작성에서는 오늘 이후 날짜 disabled
- 현재 월보다 미래 월로 이동 불가
- 서버의 날짜 validation과 UI 규칙을 동일하게 유지

### Modal

짧고 독립적인 설정/확인에 사용합니다.
현재 사용: 월 예산, 삭제 확인.
폼 항목이 많아지는 기능은 Modal로 확장하지 않습니다.

### Drawer

목록 맥락을 유지하면서 작성/수정할 때 사용합니다.
현재 사용: 지출 추가/수정.
페이지와 Drawer는 `_expense_form.html`을 공유합니다.

### Card

정보를 모두 박스로 감싸지 않습니다. 다음에만 Card를 사용합니다.

- 월 소비 핵심 요약
- 월 예산
- 분석 결과처럼 독립된 정보 단위

섹션 분리는 가능하면 whitespace, heading, divider를 우선합니다.

## 4. Product Patterns

### Home Month vs Ledger Filter

상단 월 선택은 **월 소비 요약/예산의 기준 월**입니다.
하단 필터는 **전체 지출 기록 탐색 조건**입니다.
서로 자동으로 연결하지 않습니다. UI 문구에서 두 역할을 구분합니다.

### Desktop

- 지출 추가/수정: Drawer
- 예산: Modal
- 기록과 분석: 한 화면에서 연속 탐색

### Mobile

- Bottom navigation: `가계부 / + / 분석`
- 기록과 분석의 정보 우선순위를 분리
- 같은 component token을 사용하고 모바일 전용 디자인 언어를 따로 만들지 않음

## 5. Accessibility

- 모든 icon-only button에 `aria-label`
- keyboard focus는 `:focus-visible`로 명확히 표시
- modal/drawer는 `aria-modal=true`
- Combobox option은 `role=option`, 선택 시 `aria-selected`
- disabled calendar date는 실제 `disabled` attribute 사용
- 주요 메시지는 `role=status` 또는 `role=alert`
- 본문 최소 12px 유지

## 6. CSS Governance

1. 같은 selector를 파일 아래쪽에서 다시 정의해 해결하지 않습니다.
2. `!important`는 `[hidden]` 같은 utility 또는 외부 제약을 이겨야 할 때만 허용합니다.
3. 새 UI를 추가하기 전에 기존 Button/Input/Card/Modal/Drawer로 표현 가능한지 확인합니다.
4. 상태 스타일은 해당 컴포넌트 정의 옆에 둡니다.
5. 임시 수정은 `FINAL UI PASS vXX` 블록으로 누적하지 않습니다. 원본 selector를 수정합니다.
6. 사용하지 않는 selector는 제거합니다.

## 7. Component Checklist

새 UI를 merge하기 전 확인합니다.

- [ ] 기존 token을 사용했는가?
- [ ] 동일 역할의 기존 component가 없는가?
- [ ] hover / focus-visible / disabled / error 상태가 필요한가?
- [ ] keyboard만으로 사용할 수 있는가?
- [ ] 360px 모바일에서 깨지지 않는가?
- [ ] 새 `!important`를 추가하지 않았는가?
- [ ] 동일 selector를 다시 덮어쓰지 않았는가?
