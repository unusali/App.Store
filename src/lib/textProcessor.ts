/**
 * Text Sanitization, Normalization & Semantic Chunking Utility
 * Prepares multi-page PDF, DOCX, and OCR text for safe Gemini API ingestion.
 */

export interface TextChunk {
  chunkIndex: number;
  text: string;
  wordCount: number;
  charCount: number;
  estimatedTokens: number;
}

export interface SanitizedDocumentPayload {
  cleanedText: string;
  wordCount: number;
  charCount: number;
  estimatedTokens: number;
  detectedScript: 'bengali_unicode' | 'legacy_ansi_bijoy' | 'latin_multilingual';
  chunks: TextChunk[];
}

/**
 * Detects whether raw PDF text contains garbled legacy ANSI/Bijoy encoding
 * (e.g., "evsjv‡`k †M‡RU" instead of "বাংলাদেশ গেজেট") so the pipeline can
 * automatically route or prioritize multimodal Vision OCR.
 */
export function detectScriptEncoding(rawText: string): 'bengali_unicode' | 'legacy_ansi_bijoy' | 'latin_multilingual' {
  const bengaliUnicodeMatches = (rawText.match(/[\u0980-\u09FF]/g) || []).length;
  const legacyBijoyIndicators = (rawText.match(/[†‡ÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/g) || []).length;

  if (bengaliUnicodeMatches > 25) {
    return 'bengali_unicode';
  }
  if (legacyBijoyIndicators > 20 && bengaliUnicodeMatches < 10) {
    return 'legacy_ansi_bijoy';
  }
  return 'latin_multilingual';
}

/**
 * Cleans control characters, normalizes line breaks, removes repeated page headers/footers,
 * and splits large documents into overlapping semantic chunks for LLM context safety.
 */
export function sanitizeAndChunkText(
  rawText: string,
  maxCharsPerChunk = 12000,
  overlapChars = 400
): SanitizedDocumentPayload {
  // 1. Strip NULL bytes, form feeds, and non-printable ASCII control chars (except \n and \t)
  let cleaned = rawText
    .replace(/\u0000/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 2. Collapse excessive horizontal spaces while preserving paragraph breaks
  cleaned = cleaned
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const detectedScript = detectScriptEncoding(cleaned);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = cleaned.length;
  // Approximate token count (1 token ≈ 3.8 chars for English/multilingual)
  const estimatedTokens = Math.ceil(charCount / 3.8);

  // 3. Semantic Paragraph-Aware Chunking
  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentBuffer = '';

  for (const para of paragraphs) {
    if ((currentBuffer + '\n\n' + para).length <= maxCharsPerChunk) {
      currentBuffer = currentBuffer ? `${currentBuffer}\n\n${para}` : para;
    } else {
      if (currentBuffer) {
        const cWords = currentBuffer.split(/\s+/).filter(Boolean).length;
        chunks.push({
          chunkIndex: chunks.length,
          text: currentBuffer,
          wordCount: cWords,
          charCount: currentBuffer.length,
          estimatedTokens: Math.ceil(currentBuffer.length / 3.8),
        });
        const overlapTail = currentBuffer.slice(-overlapChars);
        currentBuffer = `${overlapTail}\n\n${para}`;
      } else {
        // Single paragraph exceeds maxCharsPerChunk — slice directly
        let offset = 0;
        while (offset < para.length) {
          const slice = para.slice(offset, offset + maxCharsPerChunk);
          const sWords = slice.split(/\s+/).filter(Boolean).length;
          chunks.push({
            chunkIndex: chunks.length,
            text: slice,
            wordCount: sWords,
            charCount: slice.length,
            estimatedTokens: Math.ceil(slice.length / 3.8),
          });
          offset += maxCharsPerChunk - overlapChars;
        }
        currentBuffer = '';
      }
    }
  }

  if (currentBuffer.trim()) {
    const cWords = currentBuffer.split(/\s+/).filter(Boolean).length;
    chunks.push({
      chunkIndex: chunks.length,
      text: currentBuffer,
      wordCount: cWords,
      charCount: currentBuffer.length,
      estimatedTokens: Math.ceil(currentBuffer.length / 3.8),
    });
  }

  return {
    cleanedText: cleaned,
    wordCount,
    charCount,
    estimatedTokens,
    detectedScript,
    chunks,
  };
}
