import React, { useState, useRef } from 'react';
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  Zap,
  Loader2,
  Languages,
  CheckCircle2,
  ExternalLink,
  Highlighter,
  BookOpen,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { renderTextWithYellowHighlights } from '../lib/yellowHighlighter.tsx';

export interface ComposerAttachment {
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
}

export interface InstantReplyPreview {
  title: string;
  snippet: string;
  detailedMarkdown?: string;
  yellowPoints?: string[];
  outputType: string;
  elapsedMs: number;
  isGeneralGeminiAnswer?: boolean;
}

interface WritingPromptBarProps {
  onSubmitPrompt: (payload: {
    prompt: string;
    outputType: string;
    contextKey: string;
    attachedFile: ComposerAttachment | null;
    language: 'en' | 'bn';
    allowGeneralKnowledge?: boolean;
  }) => Promise<void>;
  isGenerating: boolean;
  availableSources: { id: string; label: string }[];
  defaultContextKey?: string;
  activeDocumentText?: string;
  language: 'en' | 'bn';
  onToggleLanguage: () => void;
  lastResponseMs?: number | null;
  instantReply?: InstantReplyPreview | null;
  onClearInstantReply?: () => void;
  onQuickSwitchTab?: (
    tab: 'upload' | 'write' | 'answer' | 'tips' | 'reminder'
  ) => void;
}

const RELEVANT_SUBJECT_KEYWORDS = [
  'gazette',
  'গেজেট',
  'labour',
  'labor',
  'শ্রম',
  'আইন',
  'law',
  'act',
  'rule',
  'বিধি',
  'ধারা',
  'section',
  'chapter',
  'অধ্যায়',
  'schedule',
  'তফসিল',
  'bppcf',
  'profit',
  'মুনাফা',
  '1.5',
  '১.৫',
  '80:20',
  '৮০:২০',
  '80:10:10',
  'worker',
  'শ্রমিক',
  'employee',
  'কর্মচারী',
  'employer',
  'মালিক',
  'leave',
  'ছুটি',
  'maternity',
  'প্রসূতি',
  'overtime',
  'ওভারটাইম',
  'অধিকাল',
  'wage',
  'মজুরি',
  'মজুরী',
  'bonus',
  'বোনাস',
  'fund',
  'তহবিল',
  'board',
  'বোর্ড',
  'trustee',
  'ট্রাস্টি',
  'audit',
  'অডিট',
  'নিরীক্ষা',
  'quorum',
  'কোরাম',
  'retirement',
  'অবসর',
  'death',
  'মৃত্যু',
  'compensation',
  'ক্ষতিপূরণ',
  'summary',
  'summarize',
  'সারসংক্ষেপ',
  'mcq',
  'alert',
  'এলার্ট',
  'q&a',
  'pdf',
  'document',
  'ডকুমেন্ট',
  'tip',
  'টিপস',
  'company',
  'কোম্পানি',
  'oil',
  'তেল',
  'gas',
  'গ্যাস',
  'mineral',
  'খনিজ',
  'foreign',
  'বৈদেশিক',
  'beneficiary',
  'সুবিধাভোগী',
  'eft',
  'grant',
  'অনুদান',
  'union',
  'ইউনিয়ন',
  'working',
  'কর্মঘণ্টা',
  'holiday',
  'উৎসব',
  'termination',
  'ছাঁটাই',
  'gratuity',
  'গ্র্যাচুইটি',
  'welfare',
  'কল্যাণ',
  'ministry',
  'মন্ত্রণালয়',
  '2026',
  '২০২৬',
  '2006',
  '২০০৬',
  '226',
  '২২৬',
  'sro',
  'এসআরও',
  'safety',
  'নিরাপত্তা',
  'canteen',
  'ক্যান্টিন',
  'insurance',
  'বীমা',
  'service',
  'সার্ভিস',
  'appointment',
  'নিয়োগপত্র',
  'পরিচয়পত্র',
  'utechtips',
];

function checkIsRelevantToDocumentTopic(
  prompt: string,
  activeDocumentText?: string
): boolean {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return true;

  // 1. Check against core legal/gazette/labour/document keywords
  for (const kw of RELEVANT_SUBJECT_KEYWORDS) {
    if (lower.includes(kw)) {
      return true;
    }
  }

  // 2. Check if any meaningful word (>= 4 characters) from the user's prompt appears in the active document text
  if (activeDocumentText) {
    const docLower = activeDocumentText.toLowerCase();
    const words = lower
      .split(/[\s,.;:?!()[\]"'-]+/)
      .filter((w) => w.length >= 4);
    const STOP_WORDS = new Set([
      'what',
      'when',
      'where',
      'which',
      'who',
      'whom',
      'whose',
      'why',
      'how',
      'tell',
      'give',
      'make',
      'write',
      'about',
      'from',
      'with',
      'that',
      'this',
      'have',
      'will',
      'your',
      'সম্পর্কে',
      'বলুন',
      'লিখুন',
      'জানতে',
      'চাই',
      'কীভাবে',
      'কাকে',
      'বলতে',
      'বোঝায়',
    ]);
    for (const w of words) {
      if (!STOP_WORDS.has(w) && docLower.includes(w)) {
        return true;
      }
    }
  }

  return false;
}

const OUTPUT_MODE_OPTIONS = [
  {
    id: 'formatted_document',
    labelEn: 'Detailed Answer (Yellow Mark)',
    labelBn: 'বিস্তারিত উত্তর (হলুদ মার্ক)',
  },
  {
    id: 'mcq_alert',
    labelEn: 'MCQ & 1 Alert',
    labelBn: 'MCQ ও ১টি এলার্ট',
  },
  {
    id: 'summary',
    labelEn: 'Summary & Tips',
    labelBn: 'সারসংক্ষেপ ও টিপস',
  },
  {
    id: 'qa',
    labelEn: 'Detailed Q&A',
    labelBn: 'বিস্তারিত প্রশ্নোত্তর (Q&A)',
  },
  {
    id: 'paragraphs',
    labelEn: 'Paragraphs',
    labelBn: 'বিস্তারিত অনুচ্ছেদ',
  },
  {
    id: 'image_prompts',
    labelEn: 'Image Prompts',
    labelBn: 'ইমেজ প্রম্পট',
  },
];

const QUICK_CHIPS_BN = [
  {
    label: '⚡ গেজেট ২০২৬ বিস্তারিত উত্তর (হলুদ মার্ক)',
    prompt:
      'বাংলাদেশ গেজেট ২০২৬ (BPPCF বিধি ২২৬ক–২২৬ঠ) এর বিস্তারিত উত্তর, ১.৫% মুনাফা ও ৮০:২০ বণ্টন গুরুত্বপূর্ণ পয়েন্টসহ লিখুন।',
    mode: 'formatted_document',
    context: 'gazette',
  },
  {
    label: '⚡ ৫টি MCQ ও ১টি এলার্ট',
    prompt:
      'বাংলাদেশ গেজেট ২০২৬ ও শ্রম আইন থেকে গুরুত্বপূর্ণ MCQ প্রশ্ন ও জরুরি এলার্ট তৈরি করুন।',
    mode: 'mcq_alert',
    context: 'gazette',
  },
  {
    label: '⚡ শ্রম আইন ২০০৬ বিস্তারিত Q&A',
    prompt:
      'বাংলাদেশ শ্রম আইন ২০০৬ অনুযায়ী কর্মঘণ্টা, ওভারটাইম ও প্রসূতি কল্যাণ ছুটি সম্পর্কে বিস্তারিত প্রশ্নোত্তর দিন।',
    mode: 'qa',
    context: 'labour_act',
  },
];

const QUICK_CHIPS_EN = [
  {
    label: '⚡ Gazette 2026 Detailed Answer (Yellow Mark)',
    prompt:
      'Provide a detailed answer on Bangladesh Gazette 2026 (BPPCF 1.5% profit rule & 80:20 split) with key important points.',
    mode: 'formatted_document',
    context: 'gazette',
  },
  {
    label: '⚡ Instant MCQ & 1 Alert',
    prompt:
      'Generate high-importance MCQs (4 options) and Critical Alert from the Gazette.',
    mode: 'mcq_alert',
    context: 'gazette',
  },
  {
    label: '⚡ Labour Act Detailed Q&A',
    prompt:
      'Provide detailed Q&A on working hours, 2x overtime, and 16-week maternity leave under Labour Act 2006.',
    mode: 'qa',
    context: 'labour_act',
  },
];

export function WritingPromptBar({
  onSubmitPrompt,
  isGenerating,
  availableSources,
  defaultContextKey = 'gazette',
  activeDocumentText,
  language,
  onToggleLanguage,
  lastResponseMs,
  instantReply,
  onClearInstantReply,
  onQuickSwitchTab,
}: WritingPromptBarProps) {
  const [promptText, setPromptText] = useState('');
  const [outputType, setOutputType] = useState('formatted_document');
  const [contextKey, setContextKey] = useState(defaultContextKey);
  const [attachedFile, setAttachedFile] = useState<ComposerAttachment | null>(
    null
  );

  // State when user asks an irrelevant / off-topic question
  const [pendingIrrelevantRequest, setPendingIrrelevantRequest] = useState<{
    prompt: string;
    outputType: string;
    contextKey: string;
    attachedFile: ComposerAttachment | null;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        base64Data: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmIrrelevantGeminiAnswer = async () => {
    if (!pendingIrrelevantRequest || isGenerating) return;
    const req = pendingIrrelevantRequest;
    setPendingIrrelevantRequest(null);
    setPromptText('');

    await onSubmitPrompt({
      prompt: req.prompt,
      outputType: req.outputType,
      contextKey: req.contextKey,
      attachedFile: req.attachedFile,
      language,
      allowGeneralKnowledge: true,
    });
  };

  const handleSend = async (override?: {
    prompt: string;
    mode: string;
    context: string;
    forceGeneral?: boolean;
  }) => {
    if (isGenerating) return;
    const finalPrompt = override ? override.prompt : promptText.trim();
    const finalMode = override ? override.mode : outputType;
    const finalContext = override ? override.context : contextKey;

    if (!finalPrompt && !attachedFile) return;

    // If there is already a pending irrelevant confirmation and the user types "yes" / "ok" / "হ্যাঁ"
    const affirmativeWords = [
      'yes',
      'y',
      'ok',
      'okay',
      'sure',
      'হ্যাঁ',
      'হা',
      'জি',
      'জী',
      'দাও',
      'দিন',
      'উত্তর দিন',
    ];
    if (
      pendingIrrelevantRequest &&
      !override &&
      affirmativeWords.includes(finalPrompt.toLowerCase())
    ) {
      await handleConfirmIrrelevantGeminiAnswer();
      return;
    }

    // Check if the question is relevant to the uploaded/active PDF topic
    if (
      !override?.forceGeneral &&
      !attachedFile &&
      !checkIsRelevantToDocumentTopic(finalPrompt, activeDocumentText)
    ) {
      setPendingIrrelevantRequest({
        prompt: finalPrompt,
        outputType: finalMode,
        contextKey: finalContext,
        attachedFile,
      });
      return;
    }

    setPendingIrrelevantRequest(null);
    const currentAttachment = attachedFile;
    setPromptText('');
    setAttachedFile(null);

    await onSubmitPrompt({
      prompt: finalPrompt,
      outputType: finalMode,
      contextKey: finalContext,
      attachedFile: currentAttachment,
      language,
      allowGeneralKnowledge: Boolean(override?.forceGeneral),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const quickChips = language === 'en' ? QUICK_CHIPS_EN : QUICK_CHIPS_BN;

  return (
    <div className="w-full bg-slate-950 text-white border-2 border-slate-800 rounded-2xl p-3 shadow-lg transition-all focus-within:border-emerald-500 space-y-2">
      {/* Compact Top Strip: 1-Click Instant Chips + Speed Badge + See All PDFs + English-Bangla */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 shrink-0 tabular-nums">
            <Zap className="w-3 h-3" />
            <span>
              {lastResponseMs
                ? `${(lastResponseMs / 1000).toFixed(2)}s`
                : language === 'en'
                ? '1s Fast Chat'
                : '১ সেকেন্ডে উত্তর'}
            </span>
          </span>

          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOutputType(chip.mode);
                setContextKey(chip.context);
                handleSend({
                  prompt: chip.prompt,
                  mode: chip.mode,
                  context: chip.context,
                  forceGeneral: false,
                });
              }}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-emerald-500/60 transition-colors whitespace-nowrap shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onQuickSwitchTab && (
            <button
              type="button"
              onClick={() => onQuickSwitchTab('upload')}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-yellow-300 hover:bg-yellow-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3 h-3" />
              <span>
                {language === 'en' ? 'See All PDFs' : 'সব PDF দেখুন'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Languages className="w-3 h-3" />
            <span>English - বাংলা ({language === 'en' ? 'EN' : 'বাং'})</span>
          </button>
        </div>
      </div>

      {/* Attached File Chip (if any) */}
      {attachedFile && (
        <div className="px-1 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[200px]">
              {attachedFile.fileName}
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-slate-400 hover:text-red-400 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Short Black Input Row */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-black border border-slate-800 rounded-xl px-2.5 py-1.5">
        {/* Attach Button (+) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={language === 'en' ? 'Attach File' : 'ফাইল যুক্ত করুন'}
          className="p-2 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors shrink-0"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>

        {/* Compact Source Doc Dropdown */}
        <select
          value={contextKey}
          onChange={(e) => setContextKey(e.target.value)}
          className="px-2 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 max-w-[145px] truncate shrink-0"
        >
          {availableSources.map((src) => (
            <option key={src.id} value={src.id}>
              {src.label}
            </option>
          ))}
          <option value="scratch">
            {language === 'en' ? 'No PDF (Direct)' : 'PDF ছাড়া লিখুন'}
          </option>
        </select>

        {/* Compact Type Dropdown */}
        <select
          value={outputType}
          onChange={(e) => setOutputType(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-bold text-yellow-300 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-yellow-400 shrink-0"
        >
          {OUTPUT_MODE_OPTIONS.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {language === 'en' ? mode.labelEn : mode.labelBn}
            </option>
          ))}
        </select>

        {/* Short Single-Line Black Input */}
        <input
          ref={inputRef}
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
          placeholder={
            language === 'en'
              ? 'Ask anything for a detailed answer with yellow-marked key points (1s)...'
              : 'এখানে প্রশ্ন লিখুন ও Enter চাপুন — হলুদ মার্কসহ বিস্তারিত উত্তর (১ সেকেন্ডে)...'
          }
          className="flex-1 min-w-[160px] px-2 py-1.5 text-sm text-white placeholder:text-slate-400 bg-transparent focus:outline-none"
        />

        {/* Instant Send Button */}
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isGenerating || (!promptText.trim() && !attachedFile)}
          className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>1s...</span>
            </>
          ) : (
            <>
              <span>{language === 'en' ? 'Send' : 'পাঠান'}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* IRRELEVANT SUBJECT CHECK PROMPT: Asks user if they want Gemini AI to answer off-topic question */}
      {pendingIrrelevantRequest && (
        <div
          className="bg-slate-900 border-2 border-yellow-400 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
        >
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-yellow-300 text-sm">
                {language === 'en'
                  ? `Not Relevant Subject: "${pendingIrrelevantRequest.prompt}"`
                  : `এই প্রশ্নটি আপনার ডকুমেন্টের বিষয়ের সাথে প্রাসঙ্গিক নয় (Not Relevant Subject): "${pendingIrrelevantRequest.prompt}"`}
              </div>
              <p className="text-slate-200 leading-relaxed">
                {language === 'en'
                  ? 'This question is outside your uploaded PDF/Legal topic (Bangladesh Gazette 2026 & Labour Act 2006). Do you want me to answer this question directly from Gemini AI?'
                  : 'আপনার প্রশ্নটি বর্তমান পিডিএফ/আইনি ডকুমেন্টের বিষয়ের বাইরে। আপনি কি তবুও Gemini AI থেকে এই বিষয়ের বিস্তারিত উত্তর (হলুদ মার্কসহ) পেতে চান?'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmIrrelevantGeminiAnswer}
              disabled={isGenerating}
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-yellow-300 hover:bg-yellow-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? 'Yes, Answer from Gemini'
                  : 'হ্যাঁ, Gemini থেকে উত্তর দিন'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPendingIrrelevantRequest(null)}
              className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              {language === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
          </div>
        </div>
      )}

      {/* Detailed Prompt Answer Card with Yellow-Highlighted Important Points */}
      {instantReply && (
        <div
          className="bg-white text-slate-900 border-2 border-yellow-400 rounded-xl p-4 space-y-3 shadow-md"
          style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm text-slate-950 truncate">
                {instantReply.title}
              </span>
              {instantReply.isGeneralGeminiAnswer && (
                <span className="text-[11px] font-bold bg-slate-900 text-yellow-300 px-2 py-0.5 rounded shrink-0">
                  Gemini AI General Answer
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-yellow-300 text-slate-950 px-2 py-0.5 rounded border border-yellow-500 shrink-0">
                <Highlighter className="w-3 h-3" />
                <span>
                  {language === 'en' ? 'Yellow Marked' : 'হলুদ মার্ককৃত'}
                </span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tabular-nums shrink-0">
                {(instantReply.elapsedMs / 1000).toFixed(2)}s
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onQuickSwitchTab && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickSwitchTab(
                      instantReply.outputType === 'mcq_alert'
                        ? 'reminder'
                        : 'answer'
                    )
                  }
                  className="px-3 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {instantReply.outputType === 'mcq_alert'
                      ? language === 'en'
                        ? 'Open MCQ & Alert Tab'
                        : 'MCQ ও এলার্ট ট্যাবে দেখুন'
                      : language === 'en'
                      ? 'Open Full Branded Sheet'
                      : 'সম্পূর্ণ ব্র্যান্ডেড শিট দেখুন'}
                  </span>
                </button>
              )}
              {onClearInstantReply && (
                <button
                  type="button"
                  onClick={onClearInstantReply}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Yellow Highlighted Important Points List */}
          {instantReply.yellowPoints && instantReply.yellowPoints.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-300 space-y-1.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Highlighter className="w-3.5 h-3.5 text-yellow-700" />
                <span>
                  {language === 'en'
                    ? 'Important Points (Highlighted in Yellow Mark):'
                    : 'গুরুত্বপূর্ণ পয়েন্টসমূহ (হলুদ মার্কারে চিহ্নিত):'}
                </span>
              </div>
              <ul className="space-y-1.5">
                {instantReply.yellowPoints.map((pt, idx) => (
                  <li key={idx} className="text-xs md:text-sm leading-relaxed">
                    <span className="font-mono font-bold text-slate-800 mr-1.5">
                      {idx + 1}.
                    </span>
                    <mark className="bg-yellow-200 text-slate-950 font-semibold px-1.5 py-0.5 rounded-xs border-b-2 border-yellow-400">
                      {pt.replace(/==/g, '').replace(/\*\*/g, '')}
                    </mark>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Answer Content with Yellow Highlights */}
          <div className="max-h-64 overflow-y-auto pr-1 text-xs md:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {renderTextWithYellowHighlights(
              instantReply.detailedMarkdown || instantReply.snippet,
              true
            )}
          </div>
        </div>
      )}
    </div>
  );
}
