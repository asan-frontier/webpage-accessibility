# 웹페이지 접근성 점검 스킬

KWCAG 2.2 / WCAG 2.2 AA 기준으로 웹페이지 접근성을 자동 점검·수정하는 Claude Code 스킬입니다.

## 사용 도구

- **Lighthouse** — 접근성 점수 (0–100)
- **axe-core CLI** — 위반 항목 상세 점검 (WAVE 대체, 무료 오픈소스)

## 설치

`SKILL.md`와 `scripts/` 폴더를 `~/.claude/skills/web-accessibility-check/` 에 복사합니다.

```bash
# 클론 후
cp -r . ~/.claude/skills/web-accessibility-check
```

## 자동화 스크립트 사용법

```bash
# 점검만
node scripts/a11y-check.mjs <URL>

# 점검 + 안전한 항목 자동 수정
node scripts/a11y-check.mjs <URL> --fix <소스폴더>
```

**최초 1회:** `npx browser-driver-manager install chrome` 실행 필요 (Chrome 업데이트 후 재실행)

## 자동 수정 범위

| 항목 | 처리 |
|------|------|
| `<html>` lang 속성 누락 | ✅ 자동 추가 |
| `<img>` alt 속성 누락 | ✅ 자동 추가 (`alt=""`) |
| 터치 타겟 크기 부족 | ✅ CSS에 min-height 추가 |
| 색상 대비 오류 | ⚠️ 보고만 (디자인 결정 필요) |
| ARIA / 헤딩 계층 | ⚠️ 보고만 (맥락 판단 필요) |

## 필요 조건

- Node.js 18+
- Chrome 설치
