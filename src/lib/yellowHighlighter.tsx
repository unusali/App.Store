import React from 'react';

const EN_TO_BN_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function formatDigits(
  value: string | number,
  language: 'en' | 'bn'
): string {
  const str = String(value);
  if (language === 'bn') {
    return str.replace(/[0-9]/g, (d) => EN_TO_BN_DIGITS[d] || d);
  }
  return str.replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] || d);
}

export const NUMBER_FONT_OPTIONS = [
  {
    id: "'Hind Siliguri', 'Plus Jakarta Sans', sans-serif",
    labelEn: '১০ Hind Siliguri Bold (Bangla + EN)',
    labelBn: '১০ হিন্দ শিলিগুড়ি (Hind Siliguri)',
  },
  {
    id: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
    labelEn: '10 / ১০ Plus Jakarta Sans',
    labelBn: '১০ প্লাস জাকার্তা স্যান্স (Jakarta)',
  },
  {
    id: "'Space Grotesk', 'Hind Siliguri', sans-serif",
    labelEn: '10 / ১০ Space Grotesk Display',
    labelBn: '১০ স্পেস গ্রোটেস্ক (Space Grotesk)',
  },
  {
    id: "'Fraunces', 'Hind Siliguri', serif",
    labelEn: '10 / ১০ Fraunces Serif Number',
    labelBn: '১০ ফ্রন্সেস সেরিফ (Fraunces Serif)',
  },
  {
    id: "'JetBrains Mono', 'Hind Siliguri', monospace",
    labelEn: '10 / ১০ JetBrains Tabular Mono',
    labelBn: '১০ জেটব্রেইনস মনো (Tabular Mono)',
  },
];

/**
 * Renders text with bright yellow highlighter marks (<mark>) on:
 * 1. Explicit ==highlighted text== or **bold important points**
 * 2. Key statutory rules, sections, percentages, deadlines, and monetary/time figures
 * 3. Optional search query matches
 */
export function renderTextWithYellowHighlights(
  text: string | undefined | null,
  enableYellow: boolean = true,
  searchQuery: string = ''
): React.ReactNode {
  if (!text) return null;
  if (!enableYellow && !searchQuery.trim()) {
    return text.replace(/==/g, '').replace(/\*\*/g, '');
  }

  const cleanedSearch = searchQuery.trim();
  const explicitRegex = /(==[^=\n]+==|\*\*[^*\n]+\*\*)/g;
  const segments = text.split(explicitRegex);

  const autoImportantRegex =
    /((?:বিধি|ধারা|অধ্যায়|তফসিল|এস\.আর\.ও\.?\s*নং|Rule|Section|Chapter|Schedule|S\.R\.O\.?\s*No\.?)\s*[০-৯0-9ক-হA-Za-z\-–—/()]+|[০-৯0-9]+(?:\.[০-৯0-9]+)?%|৮০\s*:\s*২০|80\s*:\s*20|৮০\s*:\s*১০\s*:\s*১০|80\s*:\s*10\s*:\s*10|[০-৯0-9]+\s*(?:সপ্তাহ|মাস|দিন|কর্মদিবস|বছর|ঘণ্টা|গুণ|কোটি|লক্ষ|টাকা|weeks|months|days|working days|years|hours|times|Crore|Taka)|BPPCF)/gi;

  const renderAutoHighlightedSegment = (
    seg: string,
    keyPrefix: string
  ): React.ReactNode => {
    if (!enableYellow) {
      return seg;
    }

    const parts = seg.split(autoImportantRegex);
    return parts.map((part, idx) => {
      if (!part) return null;
      const isMatch = autoImportantRegex.test(part);
      autoImportantRegex.lastIndex = 0;

      if (isMatch) {
        return (
          <mark
            key={`${keyPrefix}-auto-${idx}`}
            className="bg-yellow-200/95 text-slate-950 font-semibold px-1 py-0.5 rounded-xs border-b-2 border-yellow-400 font-number"
          >
            {part}
          </mark>
        );
      }

      if (cleanedSearch && part.toLowerCase().includes(cleanedSearch.toLowerCase())) {
        const escaped = cleanedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sRegex = new RegExp(`(${escaped})`, 'gi');
        const subParts = part.split(sRegex);
        return (
          <React.Fragment key={`${keyPrefix}-search-${idx}`}>
            {subParts.map((sp, sIdx) =>
              sp.toLowerCase() === cleanedSearch.toLowerCase() ? (
                <mark
                  key={sIdx}
                  className="bg-yellow-300 text-slate-950 font-bold px-1 py-0.5 rounded-xs ring-1 ring-yellow-500 font-number"
                >
                  {sp}
                </mark>
              ) : (
                sp
              )
            )}
          </React.Fragment>
        );
      }

      return <React.Fragment key={`${keyPrefix}-txt-${idx}`}>{part}</React.Fragment>;
    });
  };

  return segments.map((segment, index) => {
    if (!segment) return null;

    if (
      (segment.startsWith('==') && segment.endsWith('==')) ||
      (segment.startsWith('**') && segment.endsWith('**'))
    ) {
      const inner = segment.slice(2, -2);
      return (
        <mark
          key={`exp-${index}`}
          className="bg-yellow-200 text-slate-950 font-bold px-1.5 py-0.5 rounded-xs border-b-2 border-yellow-400 font-number"
        >
          {inner}
        </mark>
      );
    }

    return (
      <React.Fragment key={`seg-${index}`}>
        {renderAutoHighlightedSegment(segment, `seg-${index}`)}
      </React.Fragment>
    );
  });
}

/**
 * Extracts top important points from any generation object for the Yellow Highlight Summary box.
 */
export function extractYellowImportantPoints(
  structuredOutput: any,
  contentMarkdown: string
): string[] {
  const points: string[] = [];

  if (Array.isArray(structuredOutput?.importantPointsYellow)) {
    points.push(...structuredOutput.importantPointsYellow);
  }
  if (Array.isArray(structuredOutput?.keyTakeaways)) {
    points.push(...structuredOutput.keyTakeaways);
  }
  if (Array.isArray(structuredOutput?.sections)) {
    for (const sec of structuredOutput.sections) {
      if (sec?.keyCallout) {
        points.push(sec.keyCallout);
      }
    }
  }
  if (Array.isArray(structuredOutput?.qaPairs)) {
    for (const qa of structuredOutput.qaPairs.slice(0, 4)) {
      if (qa?.answer) {
        points.push(`${qa.question} — ${qa.answer}`);
      }
    }
  }
  if (Array.isArray(structuredOutput?.items)) {
    for (const item of structuredOutput.items.slice(0, 4)) {
      if (item?.alertMessage || item?.explanation) {
        points.push(
          `${item.statutoryRule || 'Important'}: ${
            item.alertMessage || item.explanation
          }`
        );
      }
    }
  }

  if (points.length === 0 && contentMarkdown) {
    const matches = contentMarkdown.match(/==([^=\n]+)==|\*\*([^*\n]+)\*\*/g);
    if (matches) {
      for (const m of matches.slice(0, 5)) {
        points.push(m.replace(/==|\*\*/g, '').trim());
      }
    }
  }

  const unique = Array.from(new Set(points.map((p) => p.trim()).filter(Boolean)));
  return unique.slice(0, 6);
}
