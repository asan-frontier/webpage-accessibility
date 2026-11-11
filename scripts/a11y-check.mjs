/**
 * 웹 접근성 자동 점검 + 코드 자동 수정 스크립트
 *
 * 사용법:
 *   node a11y-check.mjs <URL>                        — 점검만
 *   node a11y-check.mjs <URL> --fix <소스폴더>       — 점검 + 안전한 항목 자동 수정
 *
 * 예시:
 *   node a11y-check.mjs https://nonprofitstartup26.vercel.app
 *   node a11y-check.mjs https://nonprofitstartup26.vercel.app --fix ../../../Documents/biscon-homepage
 *
 * 필요 조건: Node.js 18+, Chrome 설치
 * 도구:     Lighthouse (접근성 점수) + axe-core (WAVE 대체, 무료)
 *
 * 자동 수정 범위 (--fix):
 *   ✅ <html> lang 속성 누락       → lang="ko" 추가 (index.html)
 *   ✅ <img> alt 속성 누락         → alt="" 추가, 목록 출력 (index.html)
 *   ✅ 터치 타겟 크기 부족          → min-height: 44px 추가 (styles.css)
 *   ✅ <html> 언어 속성 오류        → lang="ko" 수정
 *   ❌ 색상 대비                    → 보고만 (디자인 결정 필요)
 *   ❌ ARIA 패턴 / 헤딩 계층        → 보고만 (맥락 판단 필요)
 *   ❌ 터치 타겟 (간격 문제)        → 보고만 (레이아웃 영향 가능)
 */

import { execSync } from 'child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ── 인수 파싱 ──────────────────────────────────────────────────
const url = process.argv[2];
if (!url) {
  console.error('사용법: node a11y-check.mjs <URL> [--fix <소스폴더>]');
  process.exit(1);
}

const fixIdx = process.argv.indexOf('--fix');
const fixMode = fixIdx !== -1;
const sourceDir = fixMode ? resolve(process.argv[fixIdx + 1] ?? '.') : null;

if (fixMode && !existsSync(sourceDir)) {
  console.error(`소스 폴더를 찾을 수 없습니다: ${sourceDir}`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+$/, '');
const outDir = `a11y-${slug}-${date}`;
mkdirSync(outDir, { recursive: true });

const bar = '─'.repeat(52);
console.log(`\n${bar}`);
console.log(` 웹 접근성 자동 점검`);
console.log(` URL: ${url}`);
if (fixMode) console.log(` 소스 폴더: ${sourceDir}`);
console.log(` 결과 폴더: ${resolve(outDir)}`);
console.log(`${bar}\n`);

// ── 1. Lighthouse ──────────────────────────────────────────────
console.log('[1/2] Lighthouse 실행 중...');
let lhScore = null;
let lhJson = null;
let lhFailed = [];

try {
  execSync(
    `npx --yes lighthouse "${url}" ` +
    `--only-categories=accessibility ` +
    `--output json --output html ` +
    `--output-path "${join(outDir, 'lighthouse')}" ` +
    `--chrome-flags="--headless=new --no-sandbox --disable-gpu" ` +
    `--quiet`,
    { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf-8', timeout: 120000 }
  );

  lhJson = JSON.parse(readFileSync(`${outDir}/lighthouse.report.json`, 'utf-8'));
  lhScore = Math.round(lhJson.categories.accessibility.score * 100);

  lhFailed = Object.values(lhJson.audits)
    .filter(a => a.score !== null && a.score !== undefined && a.score < 1)
    .map(a => ({ id: a.id, title: a.title, score: a.score, details: a.details }))
    .sort((a, b) => a.score - b.score);

  console.log(`      점수: ${lhScore}/100`);
  if (lhFailed.length === 0) {
    console.log(`      실패 항목 없음 ✓`);
  } else {
    console.log(`      실패 항목 ${lhFailed.length}건:`);
    lhFailed.forEach(a => console.log(`        - ${a.title}`));
  }
  console.log(`      HTML 보고서: ${outDir}/lighthouse.report.html`);
} catch (e) {
  console.error(`      ✗ 실행 실패. Chrome이 설치돼 있는지 확인하세요.`);
  console.error(`        ${e.message?.split('\n')[0] ?? ''}`);
}

// ── 2. axe-core (WAVE 대체) ────────────────────────────────────
console.log('\n[2/2] axe-core 실행 중 (WAVE 대체 도구)...');
let axeViolations = [];

try {
  const axeRaw = execSync(
    `npx --yes @axe-core/cli "${url}" --stdout`,
    { encoding: 'utf-8', timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'] }
  );

  const jsonMatch = axeRaw.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    const axeResults = JSON.parse(jsonMatch[0]);
    axeViolations = axeResults[0]?.violations ?? [];

    writeFileSync(`${outDir}/axe-results.json`, JSON.stringify(axeResults, null, 2), 'utf-8');

    if (axeViolations.length === 0) {
      console.log(`      위반 항목 없음 ✓`);
    } else {
      console.log(`      위반 항목 ${axeViolations.length}건:`);
      axeViolations.forEach(v => {
        const impact = { critical: '심각', serious: '중요', moderate: '보통', minor: '경미' }[v.impact] ?? v.impact;
        console.log(`        [${impact}] ${v.description} (${v.nodes.length}곳)`);
      });
    }
    console.log(`      상세 결과: ${outDir}/axe-results.json`);
  }
} catch (e) {
  console.error(`      ✗ 실행 실패.`);
  console.error(`        ${e.message?.split('\n')[0] ?? ''}`);
}

// ── 3. 요약 출력 ───────────────────────────────────────────────
console.log(`\n${bar}`);
console.log(` 점검 결과 요약`);
console.log(`${bar}`);
if (lhScore !== null) {
  const mark = lhScore === 100 ? '✓' : lhScore >= 90 ? '△' : '✗';
  console.log(` Lighthouse 접근성: ${lhScore}/100  ${mark}`);
}
console.log(` axe-core 위반:    ${axeViolations.length}건  ${axeViolations.length === 0 ? '✓' : '✗'}`);
if (lhFailed.length > 0) {
  console.log(`\n Lighthouse 실패 항목 (${lhFailed.length}건):`);
  lhFailed.forEach(a => console.log(`   - ${a.title}`));
}
if (axeViolations.length > 0) {
  const critical = axeViolations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  if (critical.length > 0) {
    console.log(`\n axe-core 심각·중요 항목 (${critical.length}건):`);
    critical.forEach(v => console.log(`   - ${v.description}`));
  }
}
console.log(`\n 결과 저장 위치: ${resolve(outDir)}/`);
console.log(`${bar}\n`);

// ── 4. 요약 JSON 저장 ─────────────────────────────────────────
const summary = {
  url,
  date,
  lighthouse: { score: lhScore, failedCount: lhFailed.length, failed: lhFailed.map(a => ({ id: a.id, title: a.title })) },
  axe: {
    violationCount: axeViolations.length,
    violations: axeViolations.map(v => ({ impact: v.impact, id: v.id, description: v.description, affectedCount: v.nodes.length })),
  },
};
writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2), 'utf-8');

// ── 5. 자동 수정 (--fix 모드) ─────────────────────────────────
if (!fixMode) {
  console.log(`요약 JSON: ${outDir}/summary.json`);
  process.exit(0);
}

console.log(`\n${bar}`);
console.log(` 자동 수정 시작`);
console.log(`${bar}`);

const applied = [];   // 적용된 수정
const flagged = [];   // 수동 확인 필요

const indexPath  = join(sourceDir, 'index.html');
const stylesPath = join(sourceDir, 'styles.css');

let indexHtml  = existsSync(indexPath)  ? readFileSync(indexPath,  'utf-8') : null;
let stylesCss  = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf-8') : null;

// ── axe-core 위반 처리 ────────────────────────────────────────
for (const v of axeViolations) {

  // ① html-has-lang / html-lang-valid: <html>에 lang="ko" 추가·수정
  if ((v.id === 'html-has-lang' || v.id === 'html-lang-valid') && indexHtml) {
    if (!/<html[^>]+lang=/i.test(indexHtml)) {
      indexHtml = indexHtml.replace(/<html(\s|>)/i, '<html lang="ko"$1');
      applied.push('html-has-lang: <html>에 lang="ko" 추가');
    } else {
      indexHtml = indexHtml.replace(/<html([^>]*)\slang="[^"]*"/i, '<html$1 lang="ko"');
      applied.push('html-lang-valid: lang 속성을 "ko"로 수정');
    }
  }

  // ② image-alt: alt 속성 없는 <img>에 alt="" 추가 (장식용으로 처리)
  if (v.id === 'image-alt' && indexHtml) {
    const affectedSnippets = v.nodes.map(n => n.html ?? '').filter(Boolean);
    let count = 0;
    for (const snippet of affectedSnippets) {
      // 스니펫에서 src 추출 → 해당 img 태그에 alt="" 추가
      const srcMatch = snippet.match(/src="([^"]+)"/);
      if (srcMatch) {
        const src = srcMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(<img[^>]*src="${src}"[^>]*?)(?<!alt="[^"]*")(>|\\s*/>)`, 'i');
        if (pattern.test(indexHtml)) {
          indexHtml = indexHtml.replace(pattern, `$1 alt=""$2`);
          count++;
        }
      }
    }
    if (count > 0) {
      applied.push(`image-alt: alt="" 추가 (${count}개) — 의미 있는 이미지라면 적절한 alt 텍스트로 수동 수정 필요`);
    }
  }

  // ③ 그 외: 보고만
  if (!['html-has-lang', 'html-lang-valid', 'image-alt'].includes(v.id)) {
    const impact = { critical: '심각', serious: '중요', moderate: '보통', minor: '경미' }[v.impact] ?? v.impact;
    flagged.push(`[${impact}] ${v.description} (axe: ${v.id})`);
  }
}

// ── Lighthouse 실패 처리 ──────────────────────────────────────
for (const audit of lhFailed) {

  // ④ target-size: 크기 부족 항목 → styles.css에 min-height: 44px 추가
  if (audit.id === 'target-size' && stylesCss) {
    const items = audit.details?.items ?? [];
    const sizeIssues   = [];  // 크기 자체가 작은 것
    const spacingIssues = []; // 간격 문제 (스크롤 위치 등)

    for (const item of items) {
      const explanation = item.node?.explanation ?? '';
      if (/insufficient size/i.test(explanation) && !/partially obscured/i.test(explanation)) {
        // CSS 클래스 추출
        const cls = item.node?.selector?.match(/\.([a-zA-Z][\w-]*)\s*$/)?.[1];
        if (cls) sizeIssues.push({ cls, selector: item.node.selector });
      } else {
        spacingIssues.push(item.node?.nodeLabel ?? item.node?.snippet ?? '(알 수 없는 요소)');
      }
    }

    // 크기 부족 → CSS에 min-height/min-width 추가
    for (const { cls } of sizeIssues) {
      const rulePattern = new RegExp(`(\\.${cls}\\s*\\{[^}]*)\\}`, 's');
      if (rulePattern.test(stylesCss) && !stylesCss.includes(`min-height: 44px`)) {
        stylesCss = stylesCss.replace(rulePattern, `$1  min-height: 44px; min-width: 44px;\n}`);
        applied.push(`target-size: .${cls}에 min-height: 44px; min-width: 44px 추가`);
      }
    }

    // 간격/스크롤 문제 → 보고만
    if (spacingIssues.length > 0) {
      flagged.push(
        `target-size (간격·스크롤 문제): ${spacingIssues.join(', ')} — ` +
        `레이아웃 또는 scroll-margin-top 조정 필요 (수동 확인)`
      );
    }
  }

  // ⑤ document-title 누락 → <head>에 <title> 추가
  if (audit.id === 'document-title' && indexHtml && !/<title>/i.test(indexHtml)) {
    indexHtml = indexHtml.replace(/(<head[^>]*>)/i, '$1\n  <title>페이지 제목</title>');
    applied.push('document-title: <title> 태그 추가 — 실제 페이지 제목으로 수정 필요');
  }

  // ⑥ bypass (Skip Nav) 누락 → <body> 직후에 삽입
  if (audit.id === 'bypass' && indexHtml && !indexHtml.includes('skip-link')) {
    const skipLink = `<a href="#main" class="skip-link" style="position:absolute;left:-9999px;top:0;z-index:9999;padding:8px 16px;background:#000;color:#fff;border-radius:0 0 4px 0">본문 바로가기</a>`;
    indexHtml = indexHtml.replace(/(<body[^>]*>)/i, `$1\n${skipLink}`);
    applied.push('bypass: 본문 바로가기(skip-link) 추가 — CSS .skip-link:focus { left:0 } 도 추가 권장');
  }

  // ⑦ 그 외: 보고만
  if (!['target-size', 'document-title', 'bypass'].includes(audit.id)) {
    flagged.push(`${audit.title} (Lighthouse: ${audit.id}) — 수동 확인 필요`);
  }
}

// ── 파일 저장 ─────────────────────────────────────────────────
if (applied.length > 0) {
  if (indexHtml && existsSync(indexPath)) writeFileSync(indexPath,  indexHtml,  'utf-8');
  if (stylesCss && existsSync(stylesPath)) writeFileSync(stylesPath, stylesCss, 'utf-8');
}

// ── 결과 출력 ─────────────────────────────────────────────────
if (applied.length === 0 && flagged.length === 0) {
  console.log(' 수정할 항목 없음 ✓\n');
} else {
  if (applied.length > 0) {
    console.log(` ✅ 자동 수정 완료 (${applied.length}건):`);
    applied.forEach(m => console.log(`   - ${m}`));
  }
  if (flagged.length > 0) {
    console.log(`\n ⚠️  수동 확인 필요 (${flagged.length}건):`);
    flagged.forEach(m => console.log(`   - ${m}`));
  }
}

// ── fixes.json 저장 ───────────────────────────────────────────
const fixReport = { applied, flagged };
writeFileSync(`${outDir}/fixes.json`, JSON.stringify(fixReport, null, 2), 'utf-8');
console.log(`\n 수정 내역: ${outDir}/fixes.json`);
console.log(`${bar}\n`);
