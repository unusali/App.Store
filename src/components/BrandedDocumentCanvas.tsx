import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode,
  Printer,
  PenLine,
  Eye,
  Bold,
  Heading2,
  List,
  Quote,
  Highlighter,
} from 'lucide-react';
import { assembleBrandedHtmlDocument } from '../lib/documentExporter.ts';
import {
  renderTextWithYellowHighlights,
  extractYellowImportantPoints,
} from '../lib/yellowHighlighter.tsx';

export interface BrandSettingData {
  id?: number;
  brandName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  layoutTemplate: string; // 'executive_brief' | 'editorial_report' | 'technical_spec' | 'minimal_memo'
  headerText?: string | null;
  footerText?: string | null;
}

export interface GenerationData {
  id: number;
  fileId: number;
  outputType: string;
  title: string;
  promptInstructions?: string | null;
  contentMarkdown: string;
  structuredOutput: any;
  modelUsed: string;
  createdAt: string;
}

interface BrandedDocumentCanvasProps {
  generation: GenerationData;
  brand: BrandSettingData;
  sourceFileName?: string;
  onUpdateGeneration?: (updated: GenerationData) => void;
}

export function BrandedDocumentCanvas({
  generation,
  brand,
  sourceFileName,
  onUpdateGeneration,
}: BrandedDocumentCanvasProps) {
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [yellowMarkEnabled, setYellowMarkEnabled] = useState(true);
  const [editableTitle, setEditableTitle] = useState(generation.title);
  const [editableMarkdown, setEditableMarkdown] = useState(
    generation.contentMarkdown
  );

  useEffect(() => {
    setEditableTitle(generation.title);
    setEditableMarkdown(generation.contentMarkdown);
  }, [generation]);

  const structured = generation.structuredOutput || {};
  const template = brand.layoutTemplate || 'executive_brief';

  const yellowImportantPoints = extractYellowImportantPoints(
    structured,
    editableMarkdown
  );

  const handleSaveManualEdits = () => {
    const updated: GenerationData = {
      ...generation,
      title: editableTitle,
      contentMarkdown: editableMarkdown,
      structuredOutput: isEditingDoc ? {} : generation.structuredOutput,
    };
    if (onUpdateGeneration) {
      onUpdateGeneration(updated);
    }
    setIsEditingDoc(false);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(`# ${editableTitle}\n\n${editableMarkdown}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([`# ${editableTitle}\n\n${editableMarkdown}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${
      editableTitle
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '_')
        .slice(0, 50) || 'document'
    }.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBrandedHtml = () => {
    const htmlContent = assembleBrandedHtmlDocument(
      {
        ...generation,
        title: editableTitle,
        contentMarkdown: editableMarkdown,
        sourceFileName,
      },
      brand
    );
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.brandName.toLowerCase()}_branded_document_${generation.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyPromptText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIdx(idx);
    setTimeout(() => setCopiedPromptIdx(null), 2000);
  };

  const formattedDate = new Date(generation.createdAt).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  const outputTypeLabel: Record<string, string> = {
    summary: 'Detailed Executive Summary',
    qa: 'Detailed Q&A Knowledge Bank',
    paragraphs: 'Detailed Narrative Synthesis',
    image_prompts: 'AI Image Prompt Suite',
    mcq_alert: 'MCQ & Important Alerts',
    formatted_document: 'Detailed Branded Document',
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            {outputTypeLabel[generation.outputType] || generation.outputType}
          </span>
          <span aria-hidden="true">·</span>
          <span>Brand: {brand.brandName}</span>
          {sourceFileName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[180px]">{sourceFileName}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Yellow Highlight Important Points Toggle */}
          <button
            type="button"
            onClick={() => setYellowMarkEnabled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              yellowMarkEnabled
                ? 'bg-yellow-300 text-slate-950 border-yellow-500 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>
              {yellowMarkEnabled
                ? 'Yellow Mark: ON (হলুদ মার্ক চালু)'
                : 'Yellow Mark: OFF'}
            </span>
          </button>

          <button
            onClick={() => {
              if (isEditingDoc) {
                handleSaveManualEdits();
              } else {
                setIsEditingDoc(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isEditingDoc
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEditingDoc ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Apply & Preview</span>
              </>
            ) : (
              <>
                <PenLine className="w-3.5 h-3.5" />
                <span>Write / Edit Doc</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadBrandedHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export HTML</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .MD</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Live Branded Document Sheet */}
      <div
        id="printable-branded-canvas"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
        style={{
          fontFamily: `'${brand.bodyFont}', 'Hind Siliguri', sans-serif`,
        }}
      >
        {/* Top Branded Header Variant based on layoutTemplate */}
        {template === 'executive_brief' && (
          <div
            className="px-8 py-6 text-white"
            style={{
              backgroundColor: brand.primaryColor,
              borderBottom: `4px solid ${brand.accentColor}`,
            }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-3.5">
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.brandName} logo`}
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 object-contain rounded-full bg-slate-900 p-0.5 shrink-0"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0"
                    style={{ backgroundColor: brand.accentColor }}
                  >
                    {brand.brandName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div
                    className="text-base font-bold tracking-tight"
                    style={{
                      fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                    }}
                  >
                    {brand.brandName}
                  </div>
                  <div className="text-xs text-white/75">
                    {brand.headerText || 'Executive Intelligence Brief'}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-white/80 tabular-nums">
                <div>{formattedDate}</div>
                {sourceFileName && (
                  <div className="truncate max-w-[220px]">{sourceFileName}</div>
                )}
              </div>
            </div>

            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight leading-snug"
              style={{
                fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                textWrap: 'balance',
              }}
            >
              {editableTitle}
            </h2>
          </div>
        )}

        {template === 'editorial_report' && (
          <div className="px-8 pt-8 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.brandName} logo`}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-contain"
                  />
                )}
                <span
                  className="text-sm font-bold tracking-tight"
                  style={{ color: brand.primaryColor }}
                >
                  {brand.brandName}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">
                  {brand.headerText || 'Editorial Synthesis'}
                </span>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {formattedDate}
              </span>
            </div>

            <h2
              className="text-3xl font-bold tracking-tight leading-tight mb-3"
              style={{
                fontFamily: `'${brand.headingFont}', 'Hind Siliguri', serif`,
                color: brand.primaryColor,
                textWrap: 'balance',
              }}
            >
              {editableTitle}
            </h2>
            <div
              className="h-1 w-20 rounded-full"
              style={{ backgroundColor: brand.accentColor }}
            />
          </div>
        )}

        {template === 'technical_spec' && (
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-3">
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.brandName} logo`}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-contain"
                  />
                )}
                <span className="font-bold text-slate-900">
                  {brand.brandName}
                </span>
                <span>/</span>
                <span>SPEC-{generation.id.toString().padStart(4, '0')}</span>
              </div>
              <div className="tabular-nums">
                DATE: {formattedDate} · SOURCE: {sourceFileName || 'DOCUMENT'}
              </div>
            </div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                color: brand.primaryColor,
              }}
            >
              {editableTitle}
            </h2>
          </div>
        )}

        {template === 'minimal_memo' && (
          <div className="px-8 pt-8 pb-5 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {brand.logoUrl && (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.brandName} logo`}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-contain"
                  />
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: brand.accentColor }}
                >
                  MEMORANDUM · {brand.brandName}
                </span>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {formattedDate}
              </span>
            </div>
            <h2
              className="text-2xl font-bold text-slate-900"
              style={{
                fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
              }}
            >
              {editableTitle}
            </h2>
          </div>
        )}

        {/* DIRECT DOCUMENT WRITING & EDITING MODE */}
        {isEditingDoc ? (
          <div className="p-8 space-y-4 bg-slate-50/40">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700 mr-2">
                  Document Editor Bar:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditableMarkdown(
                      (prev) => `${prev} ==Important Yellow Highlight== `
                    )
                  }
                  className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-yellow-300 border border-yellow-500 rounded-md hover:bg-yellow-400 flex items-center gap-1"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>+ Yellow Mark (হলুদ মার্ক)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditableMarkdown(
                      (prev) => `${prev}\n\n### New Section Heading\n`
                    )
                  }
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>+ Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditableMarkdown((prev) => `${prev} **Bold Text** `)
                  }
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>+ Bold</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditableMarkdown((prev) => `${prev}\n- Bullet item`)
                  }
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>+ Bullet</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditableMarkdown(
                      (prev) => `${prev}\n\n> **Key Callout:** Important note`
                    )
                  }
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>+ Callout</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveManualEdits}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Done Writing & Update Sheet
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Content (Wrap any phrase in ==double equals== to highlight in yellow mark)
              </label>
              <textarea
                value={editableMarkdown}
                onChange={(e) => setEditableMarkdown(e.target.value)}
                rows={14}
                style={{
                  fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                }}
                className="w-full p-4 text-sm text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 leading-relaxed"
              />
            </div>
          </div>
        ) : (
          /* Body Content Area by Output Type */
          <div className="p-8 space-y-8 text-slate-800 leading-relaxed">
            {/* DEDICATED YELLOW HIGHLIGHTED IMPORTANT POINTS BOX */}
            {yellowMarkEnabled && yellowImportantPoints.length > 0 && (
              <div className="p-5 rounded-xl bg-yellow-50/90 border-2 border-yellow-400/90 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-yellow-400 text-slate-950">
                      <Highlighter className="w-3.5 h-3.5" />
                    </span>
                    <h3
                      className="text-sm md:text-base font-bold text-slate-950"
                      style={{
                        fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                      }}
                    >
                      Important Points — Highlighted in Yellow Mark (গুরুত্বপূর্ণ পয়েন্টসমূহ)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold bg-yellow-300 text-slate-950 px-2 py-0.5 rounded border border-yellow-500">
                    {yellowImportantPoints.length} Key Points
                  </span>
                </div>

                <ul className="space-y-2">
                  {yellowImportantPoints.map((pt, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm md:text-base text-slate-900 leading-relaxed"
                    >
                      <span className="font-mono text-xs font-bold bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded shrink-0 mt-0.5 tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="bg-yellow-200/90 text-slate-950 font-semibold px-2 py-0.5 rounded-xs border-b-2 border-yellow-400">
                        {pt.replace(/==/g, '').replace(/\*\*/g, '')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 1. SUMMARY VIEW */}
            {generation.outputType === 'summary' && (
              <div className="space-y-6">
                {structured.metrics && structured.metrics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {structured.metrics.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-slate-50 border border-slate-200/80"
                      >
                        <div className="text-xs text-slate-500 mb-1">
                          {m.label}
                        </div>
                        <div
                          className="text-lg font-bold tabular-nums"
                          style={{ color: brand.primaryColor }}
                        >
                          <mark
                            className={
                              yellowMarkEnabled
                                ? 'bg-yellow-200 text-slate-950 px-1.5 py-0.5 rounded-xs border-b-2 border-yellow-400'
                                : 'bg-transparent text-inherit'
                            }
                          >
                            {m.value}
                          </mark>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {structured.executiveOverview && (
                  <div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{
                        fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                        color: brand.primaryColor,
                      }}
                    >
                      Detailed Executive Overview
                    </h3>
                    <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                      {renderTextWithYellowHighlights(
                        structured.executiveOverview,
                        yellowMarkEnabled
                      )}
                    </p>
                  </div>
                )}

                {structured.keyTakeaways &&
                  structured.keyTakeaways.length > 0 && (
                    <div>
                      <h3
                        className="text-base font-bold mb-3"
                        style={{
                          fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                          color: brand.primaryColor,
                        }}
                      >
                        Detailed Key Takeaways
                      </h3>
                      <ul className="space-y-2.5">
                        {structured.keyTakeaways.map(
                          (item: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm md:text-base text-slate-700"
                            >
                              <span
                                className="font-mono text-xs font-bold mt-1 shrink-0 tabular-nums"
                                style={{ color: brand.accentColor }}
                              >
                                0{i + 1}.
                              </span>
                              <span>
                                {renderTextWithYellowHighlights(
                                  item,
                                  yellowMarkEnabled
                                )}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {structured.actionRecommendations &&
                  structured.actionRecommendations.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <h3
                        className="text-base font-bold mb-3"
                        style={{
                          fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                          color: brand.primaryColor,
                        }}
                      >
                        Actionable Recommendations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {structured.actionRecommendations.map(
                          (rec: string, i: number) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700"
                            >
                              <span
                                className="font-semibold mr-1.5"
                                style={{ color: brand.accentColor }}
                              >
                                #{i + 1}
                              </span>
                              {renderTextWithYellowHighlights(
                                rec,
                                yellowMarkEnabled
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {!structured.executiveOverview && (
                  <div className="whitespace-pre-wrap text-sm md:text-base text-slate-700">
                    {renderTextWithYellowHighlights(
                      editableMarkdown,
                      yellowMarkEnabled
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Q&A VIEW */}
            {generation.outputType === 'qa' && (
              <div className="space-y-4">
                {(structured.qaPairs || []).length > 0 ? (
                  structured.qaPairs.map((qa: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span
                          className="font-semibold"
                          style={{ color: brand.accentColor }}
                        >
                          Question {idx + 1} · {qa.category}
                        </span>
                      </div>
                      <h4
                        className="text-base font-bold text-slate-900"
                        style={{
                          fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                        }}
                      >
                        {qa.question}
                      </h4>
                      <p className="text-sm md:text-base text-slate-800 leading-relaxed">
                        {renderTextWithYellowHighlights(
                          qa.answer,
                          yellowMarkEnabled
                        )}
                      </p>
                      {qa.sourceEvidence && (
                        <div className="text-xs text-slate-700 pt-2 border-t border-slate-200/80">
                          <span className="font-bold mr-1">
                            Source Evidence:
                          </span>
                          <mark
                            className={
                              yellowMarkEnabled
                                ? 'bg-yellow-200 text-slate-950 font-semibold px-1.5 py-0.5 rounded-xs border-b border-yellow-400'
                                : 'bg-transparent'
                            }
                          >
                            {String(qa.sourceEvidence).replace(/==/g, '')}
                          </mark>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-slate-700">
                    {renderTextWithYellowHighlights(
                      editableMarkdown,
                      yellowMarkEnabled
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. PARAGRAPHS VIEW */}
            {generation.outputType === 'paragraphs' && (
              <div className="space-y-6">
                {structured.leadParagraph ? (
                  <>
                    <p
                      className="text-base md:text-lg font-medium leading-relaxed"
                      style={{ color: brand.primaryColor }}
                    >
                      {renderTextWithYellowHighlights(
                        structured.leadParagraph,
                        yellowMarkEnabled
                      )}
                    </p>

                    {(structured.thematicParagraphs || []).map(
                      (para: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-base font-bold"
                              style={{
                                fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                                color: brand.primaryColor,
                              }}
                            >
                              {para.heading}
                            </h3>
                            {para.tone && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-500">
                                  Tone: {para.tone}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                            {renderTextWithYellowHighlights(
                              para.body,
                              yellowMarkEnabled
                            )}
                          </p>
                        </div>
                      )
                    )}

                    {structured.closingSynthesis && (
                      <div className="p-5 rounded-lg bg-yellow-50/70 border border-yellow-300">
                        <div className="text-xs font-bold text-slate-900 mb-1">
                          Closing Synthesis (Key Conclusion)
                        </div>
                        <p className="text-sm md:text-base text-slate-800 leading-relaxed">
                          {renderTextWithYellowHighlights(
                            structured.closingSynthesis,
                            yellowMarkEnabled
                          )}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="whitespace-pre-wrap text-sm md:text-base text-slate-700">
                    {renderTextWithYellowHighlights(
                      editableMarkdown,
                      yellowMarkEnabled
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. AI IMAGE GENERATION PROMPTS VIEW */}
            {generation.outputType === 'image_prompts' && (
              <div className="space-y-6">
                {(structured.prompts || []).length > 0 ? (
                  <>
                    {structured.visualDirectionSummary && (
                      <p className="text-sm text-slate-600">
                        {renderTextWithYellowHighlights(
                          structured.visualDirectionSummary,
                          yellowMarkEnabled
                        )}
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {(structured.prompts || []).map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h4
                                  className="text-base font-bold text-slate-900"
                                  style={{
                                    fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                                  }}
                                >
                                  0{idx + 1}. {item.sceneTitle}
                                </h4>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  <span>Use Case: {item.useCase}</span>
                                  <span className="mx-1.5">·</span>
                                  <span className="font-mono">
                                    Aspect Ratio: {item.aspectRatio}
                                  </span>
                                  <span className="mx-1.5">·</span>
                                  <span>{item.lightingAndStyle}</span>
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  copyPromptText(item.fullPrompt, idx)
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
                                style={{ backgroundColor: brand.accentColor }}
                              >
                                {copiedPromptIdx === idx ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied Prompt</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Prompt</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="p-3.5 rounded bg-white border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed">
                              {item.fullPrompt}
                            </div>

                            {item.negativePrompt && (
                              <div className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">
                                  Negative Prompt:
                                </span>{' '}
                                {item.negativePrompt}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-slate-700">
                    {renderTextWithYellowHighlights(
                      editableMarkdown,
                      yellowMarkEnabled
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. FORMATTED DOCUMENT VIEW (OR MCQ_ALERT FALLBACK) */}
            {(generation.outputType === 'formatted_document' ||
              generation.outputType === 'mcq_alert') && (
              <div className="space-y-6">
                {(structured.sections || []).length > 0 ? (
                  <>
                    {structured.subtitle && (
                      <p className="text-base font-medium text-slate-600">
                        {renderTextWithYellowHighlights(
                          structured.subtitle,
                          yellowMarkEnabled
                        )}
                      </p>
                    )}

                    {structured.abstract && (
                      <div className="p-5 rounded-lg bg-slate-50 border border-slate-200">
                        <div
                          className="text-xs font-bold mb-1"
                          style={{ color: brand.accentColor }}
                        >
                          ABSTRACT ·{' '}
                          {structured.documentReferenceCode || 'DOC-REF-2026'}
                        </div>
                        <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                          {renderTextWithYellowHighlights(
                            structured.abstract,
                            yellowMarkEnabled
                          )}
                        </p>
                      </div>
                    )}

                    {(structured.sections || []).map(
                      (sec: any, idx: number) => (
                        <div key={idx} className="space-y-2.5 pt-2">
                          <h3
                            className="text-lg font-bold"
                            style={{
                              fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                              color: brand.primaryColor,
                            }}
                          >
                            {sec.sectionNumber}. {sec.heading}
                          </h3>
                          <p className="text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                            {renderTextWithYellowHighlights(
                              sec.content,
                              yellowMarkEnabled
                            )}
                          </p>
                          {sec.keyCallout && (
                            <div
                              className={`p-3.5 rounded-lg border text-xs md:text-sm font-semibold ${
                                yellowMarkEnabled
                                  ? 'bg-yellow-100/90 border-yellow-400 text-slate-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <span className="font-bold mr-2 underline decoration-yellow-500">
                                Important Point:
                              </span>
                              {String(sec.keyCallout).replace(/==/g, '')}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {structured.appendixNotes && (
                      <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          Appendix & Notes:
                        </span>{' '}
                        {renderTextWithYellowHighlights(
                          structured.appendixNotes,
                          yellowMarkEnabled
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="whitespace-pre-wrap text-sm md:text-base text-slate-700 leading-relaxed">
                    {renderTextWithYellowHighlights(
                      editableMarkdown,
                      yellowMarkEnabled
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Branded Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>{brand.footerText || `Prepared by ${brand.brandName}`}</div>
          <div className="tabular-nums">
            Font Pairing: {brand.headingFont} + {brand.bodyFont} (Bengali: Hind
            Siliguri)
          </div>
        </div>
      </div>
    </div>
  );
}
