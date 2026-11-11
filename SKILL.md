---
name: web-accessibility-check
description: 웹 접근성 점검·수정·보고서 작성 워크플로우. KWCAG 2.2 / WCAG 2.2 AA 기준으로 Lighthouse + axe-core(WAVE 대체, 무료) 자동 점검, 7개 핵심 항목 수동 확인, HTML/CSS/JS 코드 직접 수정, HTML 보고서 생성까지 한 번에 진행. "접근성 점검", "a11y", "WAVE", "Lighthouse 접근성", "스크린리더", "키보드 탐색", "대비 오류", "초점 표시", "ARIA", "WCAG", "KWCAG" 등 키워드가 나올 때 이 스킬을 사용하세요. 새 웹 프로젝트·아티팩트 배포 전 점검, 접근성 관련 민원/문의 대응, 보조기기 사용자 지원 개선 요청 시에도 먼저 이 스킬을 적용하세요.
---

# 웹 접근성 점검 워크플로우

**기준:** 한국형 웹 콘텐츠 접근성 지침(KWCAG) 2.2 (주) / WCAG 2.2 AA (보조)  
**방식:** 자동 점검 → 수동 확인 → 코드 수정 → 재검증 → 보고서  
**적용 대상:** 행사·기관 홈페이지, Claude 아티팩트(HTML), 내부 보고 페이지 등 모든 웹페이지

---

## 0단계: 점검 전 기준선 기록

수정 전 수치를 반드시 기록해두세요. 개선폭이 보고서의 핵심 근거가 됩니다.

| 도구 | 기록 항목 |
|------|-----------|
| Lighthouse | 접근성 점수(0–100), 실패 항목 목록 |
| axe-core | 위반(violations) 건수, 심각도별 분류 |

---

## 1단계: 자동 점검

### 방법 A — 자동화 스크립트 (권장)

스킬 디렉터리의 `scripts/a11y-check.mjs`를 사용하면 Lighthouse + axe-core를 한 번에 실행합니다.

```bash
node scripts/a11y-check.mjs <URL>
# 예: node scripts/a11y-check.mjs https://nonprofitstartup26.vercel.app
```

결과는 `a11y-{slug}-{날짜}/` 폴더에 저장됩니다:
- `lighthouse.report.html` — Lighthouse HTML 보고서
- `axe-results.json` — axe-core 위반 상세
- `summary.json` — 요약 수치

> **최초 1회 필요:** `npx browser-driver-manager install chrome`  
> Chrome 업데이트 후 재실행 필요.

### 방법 B — 수동 실행

**Lighthouse (CLI)**
```bash
npx lighthouse <URL> --only-categories=accessibility --output html --output json --output-path ./lighthouse
```

**axe-core CLI (WAVE 대체 — 무료)**
```bash
npx @axe-core/cli <URL> --stdout
```
> WAVE 무료 버전은 CLI 자동화 불가. axe-core는 동일 엔진 기반 무료 CLI.  
> 보고용 메시지 작성 시 반드시 "WAVE 대신 axe-core CLI(무료) 사용"을 명시하세요.

**Lighthouse (브라우저)**  
Chrome DevTools → Lighthouse 탭 → 접근성만 체크 → PC / Mobile 각각 실행

---

## 2단계: 7개 핵심 항목 수동 확인

코드와 브라우저를 직접 열어 순서대로 확인합니다.

### ① 이미지 대체텍스트
- `<img>`에 `alt` 속성이 있고, 값이 의미 있는 텍스트인지 확인
- CSS `background-image`로 처리된 의미 있는 이미지 → `aria-label` 또는 `<span class="sr-only">`로 보완
- 장식용 이미지 → `alt=""` 또는 CSS background로 처리

### ② 키보드 접근성
- `Tab`으로 모든 버튼·링크·입력 요소에 도달 가능한지 확인
- 캐러셀·슬라이더: Tab 진입 → Enter/Space 활성화
- 다이얼로그(모달): 열릴 때 포커스 내부 이동, 포커스 트랩 작동, Esc로 닫힘

### ③ ARIA 패턴 (아코디언·탭·드롭다운)
- 아코디언 버튼: `aria-expanded="true/false"`, Enter/Space로 펼침·접힘
- 탭 목록(`role="tablist"`): ←/→ 방향키 이동, Home/End 지원
- 패널 연결: `aria-controls`, `aria-labelledby` 적절히 매핑

### ④ 폼 접근성
- 모든 `<input>`/`<select>`/`<textarea>`에 `<label for>` 연결
- 필수 입력: 레이블에 `*` 또는 "필수" 포함
- 오류 처리: `role="alert"` + `aria-live="assertive"` → 오류 시 스크린리더 자동 읽기
- 오류 필드에 `focus()` 이동
- 자동완성: `autocomplete="name"`, `"email"`, `"organization"` 등 적용

### ⑤ 글자 대비
- 목표: axe-core color-contrast 위반 0건
- WCAG AA 기준: 일반 텍스트 4.5:1 / 큰 텍스트(18pt+) 3:1
- 확인 도구: webaim.org/resources/contrastchecker
- CSS 변수로 색상 관리하면 일괄 수정 용이

### ⑥ 초점 표시
- Tab 이동 시 포커스된 요소에 눈에 보이는 윤곽선이 있는지 확인
- `outline: none` 전체 제거 → `:focus-visible`로 대체
- 마우스 사용자: 윤곽선 없음 / 키보드 사용자: 윤곽선 표시가 이상적

### ⑦ 페이지 구조
- 본문 바로가기(`<a href="#main" class="skip-link">`) 최상단에 있는지
- h1→h2→h3 순서 계층 오류 없는지
- `<html lang="ko">` 언어 속성 설정 여부

---

## 3단계: 자주 나오는 추가 항목

자동 점검 결과에 등장하면 함께 수정하세요.

| 항목 | 확인 방법 | 수정 |
|------|-----------|------|
| `<dl>` 구조 오류 | `<dl>` 안에 `<dt>/<dd>` 외 다른 자식 | `<div>`로 묶기 |
| 외부 링크 새 창 안내 | `target="_blank"` 링크에 숨김 텍스트 없는지 | JS로 자동 삽입 |
| 다이얼로그 accessible name | `role="dialog"`에 `aria-labelledby` 없는지 | 추가 |
| `text-align: justify` | CSS에 justify 사용 여부 | left/start로 교체 |
| 중복 링크 | 같은 텍스트·href 링크 2개 이상 | `?ref=` 파라미터로 구분 |
| 터치 타겟 크기 | 버튼·링크 높이 44px 미만 (WCAG 2.5.8) | `min-height: 44px` 추가 |

---

## 4단계: 수정 우선순위

| 우선순위 | 해당 항목 |
|----------|-----------|
| P1 (즉시) | 글자 대비 오류, 폼 레이블 누락, heading 구조 오류 |
| P2 (이번 배포) | 폼 오류 처리, 다이얼로그 이름, 포커스 트랩, Skip Nav, 언어 속성 |
| P3 (다음 기회) | 방향키 키보드 패턴, 외부 링크 안내, 터치 타겟, ARIA 세부 보완 |

---

## 5단계: 수정 후 재검증

- 자동화 스크립트 재실행 → 수치 비교
- 목표: Lighthouse 접근성 100점, axe-core 위반 0건
- 키보드로 주요 흐름 직접 탐색하여 포커스 이동이 자연스러운지 확인

---

## 6단계: 보고서 작성

수정 완료 후 HTML 아티팩트로 보고서를 생성합니다.

**보고서 구성:**
1. **요약 수치** — Lighthouse 점수, axe-core 위반 건수 (수정 전·후)
2. **점수 변화 표** — 도구별 수정 전·후 비교
3. **7개 체크 항목 결과** — 각 항목별 확인 결과 + 상세 내역 (토글)
4. **키보드 탐색 상세** — Tab 외 추가 키 요소 표 (Tab / Enter / Space / ←→ / Home·End / Esc)
5. **수정 항목 전체 목록** — 번호, 항목, KWCAG/WCAG 조항, 수정 내용, 효과
6. **미해결 항목** — 원인, 시도한 방법, 해결 가능한 방법

> 보고서는 기술팀 외 비기술 직원·경영진도 읽을 수 있도록 쉬운 언어로 작성하세요.  
> axe-core를 WAVE 대체 도구로 사용했음을 보고서 첫머리에 명시하세요.

---

## 해결하기 어려운 항목 (미해결로 처리)

| 항목 | 원인 | 대안 |
|------|------|------|
| YouTube 자막 부재 | YouTube Studio에서 자막 업로드 필요 | 자막 업로드 요청 |
| iOS VoiceOver DOM 순서 | CSS 레이아웃 무관, DOM 순서만 따름. `aria-owns` 무시 | 시각적 레이아웃 재설계 필요 시 범위 외 처리 |
| 서드파티 임베드 콘텐츠 | 지도, 외부 폼 등 플랫폼 자체 한계 | 해당 플랫폼에 개선 요청 |

---

## 스크린리더 테스트 (가능한 경우)

| 플랫폼 | 스크린리더 | 주요 단축키 |
|--------|-----------|------------|
| Mac | VoiceOver | Cmd+F5 켜기 / VO+→ 다음 요소 / VO+U 로터 |
| Windows | NVDA (무료) | Insert+F7 링크 목록 / H 헤딩 이동 |
| iOS | VoiceOver | 설정 → 손쉬운 사용 → VoiceOver |
| Android | TalkBack | 설정 → 접근성 → TalkBack |

> iOS VoiceOver 확인이 어렵다면 "iOS 미확인"으로 보고서에 명시하세요.
