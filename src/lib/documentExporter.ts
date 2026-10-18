/**
 * Branded HTML & Printable PDF Document Assembler
 * Injects the user's custom logo (e.g. UTechtips emblem), Google Fonts (including Bengali Hind Siliguri),
 * brand color palette, and structured generation output into a standalone exportable HTML/PDF document.
 */

export interface BrandExportConfig {
  brandName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  layoutTemplate: string;
  headerText?: string | null;
  footerText?: string | null;
}

export interface GenerationExportPayload {
  id: number;
  title: string;
  outputType: string;
  contentMarkdown: string;
  structuredOutput: Record<string, any>;
  createdAt: string;
  sourceFileName?: string;
}

function escapeHtml(str: string): string {
  const safe = String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return safe
    .replace(
      /==([^=\n]+)==/g,
      '<mark style="background:#fef08a;color:#0f172a;font-weight:700;padding:1px 5px;border-bottom:2px solid #eab308;border-radius:3px;">$1</mark>'
    )
    .replace(
      /\*\*([^*\n]+)\*\*/g,
      '<mark style="background:#fef08a;color:#0f172a;font-weight:700;padding:1px 5px;border-bottom:2px solid #eab308;border-radius:3px;">$1</mark>'
    );
}

export function assembleBrandedHtmlDocument(
  generation: GenerationExportPayload,
  brand: BrandExportConfig
): string {
  const s = generation.structuredOutput || {};
  const dateStr = new Date(generation.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const logoMarkup = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${escapeHtml(brand.brandName)} Logo" style="height: 52px; width: 52px; object-fit: contain; border-radius: 50%; background: #181C24; padding: 2px;" />`
    : `<div style="height: 48px; width: 48px; border-radius: 10px; background: ${brand.accentColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">${escapeHtml(
        brand.brandName.slice(0, 2).toUpperCase()
      )}</div>`;

  let bodyHtml = '';

  if (generation.outputType === 'summary' && s.executiveOverview) {
    const metricsHtml = Array.isArray(s.metrics) && s.metrics.length
      ? `<div class="metrics-grid">${s.metrics
          .map(
            (m: any) =>
              `<div class="metric-card"><div class="metric-label">${escapeHtml(
                m.label
              )}</div><div class="metric-value">${escapeHtml(m.value)}</div></div>`
          )
          .join('')}</div>`
      : '';

    const takeawaysHtml = Array.isArray(s.keyTakeaways) && s.keyTakeaways.length
      ? `<h3>Key Executive Takeaways</h3><ul class="takeaway-list">${s.keyTakeaways
          .map((t: string) => `<li>${escapeHtml(t)}</li>`)
          .join('')}</ul>`
      : '';

    const recsHtml = Array.isArray(s.actionRecommendations) && s.actionRecommendations.length
      ? `<h3>Actionable Recommendations</h3><ol class="rec-list">${s.actionRecommendations
          .map((r: string) => `<li>${escapeHtml(r)}</li>`)
          .join('')}</ol>`
      : '';

    bodyHtml = `
      ${metricsHtml}
      <div class="section-block">
        <h3>Executive Overview</h3>
        <p>${escapeHtml(s.executiveOverview)}</p>
      </div>
      ${takeawaysHtml}
      ${recsHtml}
    `;
  } else if (generation.outputType === 'qa' && Array.isArray(s.qaPairs)) {
    bodyHtml = s.qaPairs
      .map(
        (qa: any, idx: number) => `
      <div class="qa-card">
        <div class="qa-meta">Q${idx + 1} · ${escapeHtml(qa.category || 'General')}</div>
        <h4>${escapeHtml(qa.question)}</h4>
        <p>${escapeHtml(qa.answer)}</p>
        ${
          qa.sourceEvidence
            ? `<div class="qa-evidence">Source Evidence: ${escapeHtml(qa.sourceEvidence)}</div>`
            : ''
        }
      </div>`
      )
      .join('');
  } else if (generation.outputType === 'paragraphs' && s.leadParagraph) {
    bodyHtml = `
      <p class="lead-paragraph">${escapeHtml(s.leadParagraph)}</p>
      ${(s.thematicParagraphs || [])
        .map(
          (p: any) => `
        <div class="section-block">
          <h3>${escapeHtml(p.heading)} <span class="tone-tag">${escapeHtml(p.tone || '')}</span></h3>
          <p>${escapeHtml(p.body)}</p>
        </div>`
        )
        .join('')}
      ${
        s.closingSynthesis
          ? `<div class="callout-box"><strong>Closing Synthesis:</strong> ${escapeHtml(
              s.closingSynthesis
            )}</div>`
          : ''
      }
    `;
  } else if (generation.outputType === 'image_prompts' && Array.isArray(s.prompts)) {
    bodyHtml = `
      <p>${escapeHtml(s.visualDirectionSummary || '')}</p>
      ${s.prompts
        .map(
          (p: any, i: number) => `
        <div class="qa-card">
          <div class="qa-meta">Prompt 0${i + 1} · ${escapeHtml(p.useCase)} · Aspect Ratio ${escapeHtml(
            p.aspectRatio
          )}</div>
          <h4>${escapeHtml(p.sceneTitle)}</h4>
          <p><strong>Lighting & Style:</strong> ${escapeHtml(p.lightingAndStyle)}</p>
          <pre class="prompt-code">${escapeHtml(p.fullPrompt)}</pre>
          <div class="qa-evidence">Negative Prompt: ${escapeHtml(p.negativePrompt)}</div>
        </div>`
        )
        .join('')}
    `;
  } else if (generation.outputType === 'formatted_document' && Array.isArray(s.sections)) {
    bodyHtml = `
      ${s.subtitle ? `<p class="lead-paragraph">${escapeHtml(s.subtitle)}</p>` : ''}
      ${
        s.abstract
          ? `<div class="callout-box"><strong>Abstract (${escapeHtml(
              s.documentReferenceCode || 'DOC-REF'
            )}):</strong> ${escapeHtml(s.abstract)}</div>`
          : ''
      }
      ${s.sections
        .map(
          (sec: any) => `
        <div class="section-block">
          <h3>${escapeHtml(sec.sectionNumber)}. ${escapeHtml(sec.heading)}</h3>
          <p style="white-space: pre-line;">${escapeHtml(sec.content)}</p>
          ${
            sec.keyCallout
              ? `<div class="callout-box"><strong>Key Insight:</strong> ${escapeHtml(
                  sec.keyCallout
                )}</div>`
              : ''
          }
        </div>`
        )
        .join('')}
      ${
        s.appendixNotes
          ? `<div class="qa-evidence" style="margin-top: 24px;"><strong>Appendix:</strong> ${escapeHtml(
              s.appendixNotes
            )}</div>`
          : ''
      }
    `;
  } else {
    bodyHtml = `<div style="white-space: pre-wrap;">${escapeHtml(generation.contentMarkdown)}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(generation.title)} — ${escapeHtml(brand.brandName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    brand.headingFont
  )}:wght@600;700&family=${encodeURIComponent(
    brand.bodyFont
  )}:wght@400;500;600&family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${brand.bodyFont}', 'Hind Siliguri', sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      padding: 32px 16px;
      line-height: 1.7;
    }
    .page-sheet {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
    }
    .brand-header {
      background: ${brand.primaryColor};
      color: #ffffff;
      padding: 32px 40px;
      border-bottom: 4px solid ${brand.accentColor};
    }
    .brand-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }
    .brand-identity {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-name {
      font-family: '${brand.headingFont}', 'Hind Siliguri', sans-serif;
      font-size: 18px;
      font-weight: 700;
    }
    .brand-sub {
      font-size: 12px;
      opacity: 0.8;
    }
    .doc-meta {
      text-align: right;
      font-size: 12px;
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
    }
    h1.doc-title {
      font-family: '${brand.headingFont}', 'Hind Siliguri', sans-serif;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
    }
    .doc-body {
      padding: 40px;
    }
    h3 {
      font-family: '${brand.headingFont}', 'Hind Siliguri', sans-serif;
      color: ${brand.primaryColor};
      font-size: 18px;
      margin: 24px 0 10px 0;
    }
    p {
      font-size: 15px;
      color: #334155;
      margin-bottom: 14px;
    }
    .lead-paragraph {
      font-size: 17px;
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .metric-label {
      font-size: 12px;
      color: #64748b;
    }
    .metric-value {
      font-size: 18px;
      font-weight: 700;
      color: ${brand.primaryColor};
      margin-top: 4px;
    }
    .takeaway-list, .rec-list {
      padding-left: 22px;
      margin-bottom: 20px;
      color: #334155;
      font-size: 15px;
    }
    .takeaway-list li, .rec-list li {
      margin-bottom: 8px;
    }
    .qa-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .qa-meta {
      font-size: 12px;
      font-weight: 600;
      color: ${brand.accentColor};
      margin-bottom: 6px;
    }
    .qa-card h4 {
      font-family: '${brand.headingFont}', 'Hind Siliguri', sans-serif;
      font-size: 16px;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .qa-evidence {
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 8px;
      font-style: italic;
    }
    .callout-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0;
      font-size: 14px;
      color: #1e293b;
    }
    .prompt-code {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      margin: 10px 0;
    }
    .tone-tag {
      font-size: 12px;
      font-weight: 400;
      color: #64748b;
      margin-left: 8px;
    }
    .brand-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 40px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-sheet { box-shadow: none; border: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <header class="brand-header">
      <div class="brand-top-row">
        <div class="brand-identity">
          ${logoMarkup}
          <div>
            <div class="brand-name">${escapeHtml(brand.brandName)}</div>
            <div class="brand-sub">${escapeHtml(
              brand.headerText || 'Official Branded Document Synthesis'
            )}</div>
          </div>
        </div>
        <div class="doc-meta">
          <div>${escapeHtml(dateStr)}</div>
          <div>${escapeHtml(generation.sourceFileName || '')}</div>
        </div>
      </div>
      <h1 class="doc-title">${escapeHtml(generation.title)}</h1>
    </header>
    <main class="doc-body">
      ${bodyHtml}
    </main>
    <footer class="brand-footer">
      <div>${escapeHtml(brand.footerText || `Prepared by ${brand.brandName}`)}</div>
      <div>Typography: ${escapeHtml(brand.headingFont)} + ${escapeHtml(brand.bodyFont)}</div>
    </footer>
  </div>
</body>
</html>`;
}
