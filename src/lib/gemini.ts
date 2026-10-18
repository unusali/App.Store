import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { sanitizeAndChunkText, TextChunk } from './textProcessor.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ExtractionResult {
  extractedText: string;
  extractionMethod: 'native_parser' | 'ocr_vision' | 'hybrid';
  pageCount: number;
  wordCount: number;
  metadata: {
    parser: string;
    confidence: number;
    detectedScript: string;
    chunkCount: number;
    estimatedTokens: number;
    chunksPreview?: Pick<TextChunk, 'chunkIndex' | 'wordCount' | 'charCount' | 'estimatedTokens'>[];
  };
}

/**
 * Converts mammoth HTML output into clean Markdown preserving headings (H1-H4),
 * bullet lists, and paragraphs for DOCX files.
 */
function htmlToStructuredText(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export async function extractTextFromUploadedFile(params: {
  fileName: string;
  mimeType: string;
  base64Data: string;
}): Promise<ExtractionResult> {
  const { fileName, mimeType, base64Data } = params;
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;
  const buffer = Buffer.from(cleanBase64, 'base64');

  // 1. Plain text, Markdown, CSV
  if (
    mimeType.startsWith('text/') ||
    fileName.toLowerCase().endsWith('.txt') ||
    fileName.toLowerCase().endsWith('.md') ||
    fileName.toLowerCase().endsWith('.csv')
  ) {
    const rawText = buffer.toString('utf-8');
    const processed = sanitizeAndChunkText(rawText);
    return {
      extractedText: processed.cleanedText,
      extractionMethod: 'native_parser',
      pageCount: Math.max(1, Math.ceil(processed.wordCount / 300)),
      wordCount: processed.wordCount,
      metadata: {
        parser: 'utf8-text-sanitizer',
        confidence: 1.0,
        detectedScript: processed.detectedScript,
        chunkCount: processed.chunks.length,
        estimatedTokens: processed.estimatedTokens,
        chunksPreview: processed.chunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          wordCount: c.wordCount,
          charCount: c.charCount,
          estimatedTokens: c.estimatedTokens,
        })),
      },
    };
  }

  // 2. DOCX files — Extract headings and paragraphs via Mammoth HTML + sanitizer
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const structuredText = htmlToStructuredText(htmlResult.value || '');
    const fallbackRaw = !structuredText
      ? (await mammoth.extractRawText({ buffer })).value
      : structuredText;
    const processed = sanitizeAndChunkText(
      fallbackRaw || 'No readable text found in DOCX file.'
    );

    return {
      extractedText: processed.cleanedText,
      extractionMethod: 'native_parser',
      pageCount: Math.max(1, Math.ceil(processed.wordCount / 320)),
      wordCount: processed.wordCount,
      metadata: {
        parser: 'mammoth-docx-heading-paragraph',
        confidence: 0.99,
        detectedScript: processed.detectedScript,
        chunkCount: processed.chunks.length,
        estimatedTokens: processed.estimatedTokens,
        chunksPreview: processed.chunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          wordCount: c.wordCount,
          charCount: c.charCount,
          estimatedTokens: c.estimatedTokens,
        })),
      },
    };
  }

  // 3. Multi-page PDF & Scanned Images — Gemini 3.8 Flash Vision OCR (handles Unicode Bengali & legacy Bijoy PDFs)
  const supportedVisionMime =
    mimeType === 'application/pdf' || mimeType.startsWith('image/')
      ? mimeType
      : fileName.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : 'image/png';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: supportedVisionMime,
            data: cleanBase64,
          },
        },
        {
          text: `Perform high-accuracy multi-page OCR and structural text extraction on "${fileName}".
- If the document contains Bengali (বাংলা) or multilingual script (including scanned pages or legacy Bijoy/ANSI fonts), output clean, standard Unicode Bengali and English text accurately.
- Preserve all chapter titles, section numbers (ধারা / বিধি), sub-clauses, tables, and schedules in clean Markdown structure.
- Output only the extracted document text without introductory commentary.`,
        },
      ],
    },
  });

  const rawExtracted = (response.text || '').trim();
  const processed = sanitizeAndChunkText(
    rawExtracted || `[OCR completed for ${fileName}, but no legible text was detected.]`
  );

  return {
    extractedText: processed.cleanedText,
    extractionMethod: 'ocr_vision',
    pageCount: Math.max(1, Math.ceil(processed.wordCount / 280)),
    wordCount: processed.wordCount,
    metadata: {
      parser: 'gemini-3.8-flash-multipage-ocr',
      confidence: 0.99,
      detectedScript: processed.detectedScript,
      chunkCount: processed.chunks.length,
      estimatedTokens: processed.estimatedTokens,
      chunksPreview: processed.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        wordCount: c.wordCount,
        charCount: c.charCount,
        estimatedTokens: c.estimatedTokens,
      })),
    },
  };
}

export type GenerationOutputType =
  | 'summary'
  | 'qa'
  | 'paragraphs'
  | 'image_prompts'
  | 'mcq_alert'
  | 'formatted_document';

async function fastGenerateStructured(
  contents: string,
  responseSchema: Record<string, unknown>
): Promise<any> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return JSON.parse((res.text || '{}').trim());
  } catch {
    const fallback = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return JSON.parse((fallback.text || '{}').trim());
  }
}

export async function generateDocumentOutput(params: {
  fileName: string;
  extractedText: string;
  outputType: GenerationOutputType;
  customInstructions?: string;
  brandName?: string;
  layoutTemplate?: string;
  language?: 'en' | 'bn';
  allowGeneralKnowledge?: boolean;
}): Promise<{
  title: string;
  contentMarkdown: string;
  structuredOutput: Record<string, unknown>;
}> {
  const {
    fileName,
    extractedText,
    outputType,
    customInstructions,
    brandName = 'UTechtips',
    layoutTemplate = 'executive_brief',
    language = 'bn',
    allowGeneralKnowledge = false,
  } = params;

  // Compact context window (max 4,500 chars) so response returns in ~1 second
  const sanitized = sanitizeAndChunkText(extractedText, 4500, 150);
  const safeContextText = allowGeneralKnowledge
    ? `GENERAL GEMINI KNOWLEDGE QUERY (User explicitly requested Gemini AI to answer this off-topic / general question in detail): ${
        customInstructions || extractedText
      }`
    : (sanitized.chunks[0]?.text || extractedText).slice(0, 4500);

  const languageDirective =
    language === 'en'
      ? '\nOUTPUT LANGUAGE: Detailed, comprehensive ENGLISH.\nYELLOW HIGHLIGHT RULE: Wrap all important points, key facts, percentages, dates, numbers, and critical takeaways inside ==double equals== (for example: ==important fact==) so they are highlighted in yellow mark.'
      : '\nOUTPUT LANGUAGE: Detailed, comprehensive Unicode BANGLA (বাংলা).\nYELLOW HIGHLIGHT RULE: সকল গুরুত্বপূর্ণ পয়েন্ট, মূল তথ্য, সংখ্যা, তারিখ এবং মূল কথা ==ডাবল ইকুয়াল== চিহ্নের ভেতরে লিখুন (যেমন: ==গুরুত্বপূর্ণ তথ্য==) যাতে সেগুলো হলুদ মার্কারে হাইলাইট হয়।';

  const extraPrompt = customInstructions?.trim()
    ? `${languageDirective}\nUser Request: ${customInstructions.trim()}${
        allowGeneralKnowledge
          ? '\nIMPORTANT: Answer the User Request directly and comprehensively using Gemini AI general knowledge, even though it is outside the uploaded PDF topic.'
          : ''
      }`
    : languageDirective;

  if (outputType === 'summary') {
    const parsed = await fastGenerateStructured(
      `Generate a detailed Executive Summary (with 4-5 detailed takeaways, 3 metrics, 3 actionable recommendations, and 4 yellow-highlighted important points) from "${fileName}" for "${brandName}". Wrap key phrases in ==...==.${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          executiveOverview: { type: Type.STRING },
          importantPointsYellow: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          keyTakeaways: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          metrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
              },
              required: ['label', 'value'],
            },
          },
          actionRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'title',
          'executiveOverview',
          'importantPointsYellow',
          'keyTakeaways',
          'metrics',
          'actionRecommendations',
        ],
      }
    );

    const md = [
      `### Executive Overview\n\n${parsed.executiveOverview || ''}`,
      parsed.importantPointsYellow?.length
        ? `### Important Points (Yellow Highlighted)\n\n${parsed.importantPointsYellow
            .map((p: string) => `- ==${p.replace(/==/g, '')}==`)
            .join('\n')}`
        : '',
      parsed.keyTakeaways?.length
        ? `### Key Strategic Takeaways\n\n${parsed.keyTakeaways
            .map((t: string) => `- ${t}`)
            .join('\n')}`
        : '',
      parsed.actionRecommendations?.length
        ? `### Actionable Recommendations\n\n${parsed.actionRecommendations
            .map((r: string, i: number) => `${i + 1}. ${r}`)
            .join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      title: parsed.title || `Executive Summary: ${fileName}`,
      contentMarkdown: md,
      structuredOutput: parsed,
    };
  }

  if (outputType === 'qa') {
    const parsed = await fastGenerateStructured(
      `Extract 5 detailed Questions and Answers (Q&A) with rule citations and yellow-highlighted important points (==...==) from "${fileName}".${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          importantPointsYellow: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          qaPairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                category: { type: Type.STRING },
                sourceEvidence: { type: Type.STRING },
              },
              required: ['question', 'answer', 'category', 'sourceEvidence'],
            },
          },
        },
        required: ['title', 'importantPointsYellow', 'qaPairs'],
      }
    );

    const md = (parsed.qaPairs || [])
      .map(
        (item: any, idx: number) =>
          `#### Q${idx + 1}: ${item.question}\n**Category:** ${item.category}\n\n${item.answer}\n\n> *Source Evidence:* ==${item.sourceEvidence}==`
      )
      .join('\n\n---\n\n');

    return {
      title: parsed.title || `Q&A Knowledge Bank: ${fileName}`,
      contentMarkdown: md,
      structuredOutput: parsed,
    };
  }

  if (outputType === 'paragraphs') {
    const parsed = await fastGenerateStructured(
      `Write a detailed 3-section paragraph synthesis of "${fileName}" for "${brandName}", wrapping important points and rules in ==...==.${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          importantPointsYellow: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          leadParagraph: { type: Type.STRING },
          thematicParagraphs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                tone: { type: Type.STRING },
                body: { type: Type.STRING },
              },
              required: ['heading', 'tone', 'body'],
            },
          },
          closingSynthesis: { type: Type.STRING },
        },
        required: [
          'title',
          'importantPointsYellow',
          'leadParagraph',
          'thematicParagraphs',
          'closingSynthesis',
        ],
      }
    );

    const md = [
      `${parsed.leadParagraph || ''}`,
      ...(parsed.thematicParagraphs || []).map(
        (p: any) => `### ${p.heading}\n\n${p.body}`
      ),
      parsed.closingSynthesis
        ? `### Synthesis & Conclusion\n\n${parsed.closingSynthesis}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      title: parsed.title || `Deep-Dive Narrative: ${fileName}`,
      contentMarkdown: md,
      structuredOutput: parsed,
    };
  }

  if (outputType === 'image_prompts') {
    const parsed = await fastGenerateStructured(
      `Generate 3 detailed AI Image Prompts from "${fileName}".${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          visualDirectionSummary: { type: Type.STRING },
          prompts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneTitle: { type: Type.STRING },
                useCase: { type: Type.STRING },
                aspectRatio: { type: Type.STRING },
                lightingAndStyle: { type: Type.STRING },
                fullPrompt: { type: Type.STRING },
                negativePrompt: { type: Type.STRING },
              },
              required: [
                'sceneTitle',
                'useCase',
                'aspectRatio',
                'lightingAndStyle',
                'fullPrompt',
                'negativePrompt',
              ],
            },
          },
        },
        required: ['title', 'visualDirectionSummary', 'prompts'],
      }
    );

    const md = [
      `### Visual Direction\n\n${parsed.visualDirectionSummary || ''}`,
      ...(parsed.prompts || []).map(
        (p: any, i: number) =>
          `#### ${i + 1}. ${p.sceneTitle} (${p.useCase} · ${p.aspectRatio})\n**Style & Lighting:** ${p.lightingAndStyle}\n\n**Prompt:**\n\`\`\`text\n${p.fullPrompt}\n\`\`\`\n*Negative Prompt:* ${p.negativePrompt}`
      ),
    ].join('\n\n');

    return {
      title: parsed.title || `AI Visual Prompt Suite: ${fileName}`,
      contentMarkdown: md,
      structuredOutput: parsed,
    };
  }

  if (outputType === 'mcq_alert') {
    const parsed = await fastGenerateStructured(
      `Generate 4 detailed Multiple-Choice Questions (4 options each) + Important Alerts with yellow-highlighted explanations (==...==) from "${fileName}".${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                importanceLevel: { type: Type.STRING },
                alertTitle: { type: Type.STRING },
                alertMessage: { type: Type.STRING },
                statutoryRule: { type: Type.STRING },
              },
              required: [
                'question',
                'options',
                'correctIndex',
                'explanation',
                'importanceLevel',
                'alertTitle',
                'alertMessage',
                'statutoryRule',
              ],
            },
          },
        },
        required: ['title', 'items'],
      }
    );

    const md = (parsed.items || [])
      .map(
        (item: any, idx: number) =>
          `#### MCQ ${idx + 1}: ${item.question}\n` +
          (item.options || [])
            .map(
              (opt: string, oIdx: number) =>
                `- **${String.fromCharCode(65 + oIdx)}.** ${opt}`
            )
            .join('\n') +
          `\n\n> **Correct Answer:** ==Option ${String.fromCharCode(
            65 + (item.correctIndex || 0)
          )}== — ${item.explanation}\n> **Important Alert (${item.importanceLevel}):** ==${item.alertTitle}== — ${item.alertMessage} *(${item.statutoryRule})*`
      )
      .join('\n\n---\n\n');

    return {
      title: parsed.title || `MCQ & Important Alerts: ${fileName}`,
      contentMarkdown: md,
      structuredOutput: parsed,
    };
  }

  // 'formatted_document'
  const parsed = await fastGenerateStructured(
    `Create a detailed, structured Formatted Document (3 comprehensive sections, detailed explanations, and 4-5 yellow-highlighted important points wrapped in ==...==) from "${fileName}" for "${brandName}" (${layoutTemplate}).${extraPrompt}\n\nSOURCE:\n${safeContextText}`,
    {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        documentReferenceCode: { type: Type.STRING },
        abstract: { type: Type.STRING },
        importantPointsYellow: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sectionNumber: { type: Type.STRING },
              heading: { type: Type.STRING },
              content: { type: Type.STRING },
              keyCallout: { type: Type.STRING },
            },
            required: ['sectionNumber', 'heading', 'content', 'keyCallout'],
          },
        },
        appendixNotes: { type: Type.STRING },
      },
      required: [
        'title',
        'subtitle',
        'documentReferenceCode',
        'abstract',
        'importantPointsYellow',
        'sections',
        'appendixNotes',
      ],
    }
  );

  const md = [
    `**Subtitle:** ${parsed.subtitle || ''}\n\n**Abstract:** ${parsed.abstract || ''}`,
    ...(parsed.sections || []).map(
      (s: any) =>
        `### ${s.sectionNumber}. ${s.heading}\n\n${s.content}\n\n> **Key Callout:** ${s.keyCallout}`
    ),
    parsed.appendixNotes ? `### Appendix & Notes\n\n${parsed.appendixNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    title: parsed.title || `Formatted Report: ${fileName}`,
    contentMarkdown: md,
    structuredOutput: parsed,
  };
}

export async function translateDocumentGeneration(params: {
  title: string;
  contentMarkdown: string;
  outputType: GenerationOutputType;
  targetLanguage: 'en' | 'bn';
  brandName?: string;
}): Promise<{
  title: string;
  contentMarkdown: string;
  structuredOutput: Record<string, unknown>;
}> {
  const {
    title,
    contentMarkdown,
    outputType,
    targetLanguage,
    brandName = 'UTechtips',
  } = params;

  return generateDocumentOutput({
    fileName: title,
    extractedText: `DOCUMENT TITLE: ${title}\n\nCONTENT:\n${contentMarkdown}`,
    outputType,
    customInstructions:
      targetLanguage === 'en'
        ? 'Translate and adapt this entire document into crisp, accurate English while preserving every legal section number, rule, metric, and takeaway.'
        : 'এই সম্পূর্ণ ডকুমেন্টটি নির্ভুল ও প্রমিত বাংলায় (Unicode Bangla) অনুবাদ ও রূপান্তর করুন এবং সকল ধারা, বিধি ও সংখ্যা অক্ষুণ্ণ রাখুন।',
    brandName,
    language: targetLanguage,
  });
}
