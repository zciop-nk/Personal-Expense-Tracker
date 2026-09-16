# UI/UX Refactor Notes

## 적용 범위

- 기능 추가 없이 기존 제품 구조 정리
- 페이지/Drawer 지출 폼 공통 partial화
- 미래 지출 날짜 UI 차단
- 카테고리 Combobox keyboard UX
- 영문 eyebrow 축소
- 상단 월 요약과 하단 기록 탐색의 역할 문구 분리
- production 보안 기본 설정 보강
- static asset versioning 정합성
- CSS 디자인 시스템 규칙 문서화

## 유지한 결정

- Django Template + Vanilla JS
- 지출 추가/수정 Drawer
- 예산 Modal
- 모바일 `가계부 / + / 분석`
- 조건에 따라 달라지는 분석 Dashboard

## 이후 코드 변경 규칙

새 기능보다 먼저 `docs/DESIGN_SYSTEM.md`의 기존 컴포넌트와 토큰을 재사용합니다.

## 구조 개선

- `ledger.js`의 원본 소스를 core / filters / form / mobile 4개 모듈로 분리하고 build script로 기존 단일 browser bundle을 생성합니다.
- `charts.js`가 ledger renderer를 덮어쓰던 방식을 제거하고 `window.SseumCharts`의 명시적 enhancement API로 연결했습니다.
- 기존 CSS에서 최종 결과에 쓰이지 않는 중복 선언 233개와 obsolete selector를 보수적으로 제거했습니다.
- `tools/audit_css.py`로 `!important` 및 동일 scope의 duplicate selector가 현재 baseline보다 증가하면 실패하도록 했습니다.
- content hash asset은 `tools/version_static.py`가 생성합니다.
