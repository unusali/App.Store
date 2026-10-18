import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Search,
  Highlighter,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Trash2,
  Loader2,
  Eye,
} from 'lucide-react';
import { renderTextWithYellowHighlights } from '../lib/yellowHighlighter.tsx';

export interface PdfViewerDocumentItem {
  id: string;
  title: string;
  subtitle: string;
  pageCount: number;
  wordCount: number;
  text: string;
  isUploadedFile?: boolean;
  dbFileId?: number;
}

interface AllPdfEasyViewerProps {
  documents: PdfViewerDocumentItem[];
  selectedDocId: string;
  onSelectDocId: (id: string) => void;
  onUploadClick: () => void;
  uploading: boolean;
  onGenerateDetailedYellowAnswer: (doc: PdfViewerDocumentItem) => void;
  onDeleteUploadedFile?: (dbFileId: number) => void;
  language: 'en' | 'bn';
}

export function AllPdfEasyViewer({
  documents,
  selectedDocId,
  onSelectDocId,
  onUploadClick,
  uploading,
  onGenerateDetailedYellowAnswer,
  onDeleteUploadedFile,
  language,
}: AllPdfEasyViewerProps) {
  // Single Easy Method State: 'all' shows all PDFs together; otherwise shows the selected PDF
  const [pdfViewMode, setPdfViewMode] = useState<string>('all');
  const [yellowHighlightPdf, setYellowHighlightPdf] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>(
    {}
  );

  // ONE EASY METHOD to control PDF seeing option
  const runEasyPdfSeeingMethod = (nextMode: string) => {
    setPdfViewMode(nextMode);
    if (nextMode !== 'all') {
      onSelectDocId(nextMode);
    }
  };

  const visibleDocuments =
    pdfViewMode === 'all'
      ? documents
      : documents.filter((d) => d.id === pdfViewMode);

  const toggleExpandDoc = (id: string) => {
    setExpandedDocIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-5">
      {/* Top Unified Control Bar: Easy All-PDF Seeing Dropdown + Search + Yellow Highlight Toggle + Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <h2
              className="text-base md:text-lg font-bold text-slate-900"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
              }}
            >
              {language === 'en'
                ? 'All PDF Seeing Option (Easy Single-Dropdown Method)'
                : 'সব PDF দেখার সহজ অপশন (All PDF Easy Viewer)'}
            </h2>
          </div>
          <p
            className="text-xs text-slate-500"
            style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
          >
            {language === 'en'
              ? `Viewing ${visibleDocuments.length} of ${documents.length} PDFs · Important rules & numbers are highlighted in Yellow Mark`
              : `মোট ${documents.length}টি PDF এর মধ্যে ${visibleDocuments.length}টি দেখানো হচ্ছে · গুরুত্বপূর্ণ ধারা ও তথ্য হলুদ মার্কারে চিহ্নিত`}
          </p>
        </div>

        {/* Easy Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Single Easy Dropdown to See All PDFs or Any Specific PDF */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {language === 'en' ? 'See PDF:' : 'PDF নির্বাচন:'}
            </label>
            <select
              value={pdfViewMode}
              onChange={(e) => runEasyPdfSeeingMethod(e.target.value)}
              style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
              className="px-3 py-2 text-xs font-bold text-slate-900 bg-yellow-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="all">
                {language === 'en'
                  ? `📚 See All PDFs Together (${documents.length} PDFs)`
                  : `📚 সব PDF একসাথে দেখুন (${documents.length}টি PDF)`}
              </option>
              {documents.map((doc, idx) => (
                <option key={doc.id} value={doc.id}>
                  {idx + 1}. {doc.title} ({doc.pageCount}{' '}
                  {language === 'en' ? 'Pages' : 'পৃষ্ঠা'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Search across All PDFs */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Search in all PDFs...'
                  : 'সব PDF-এ খুঁজুন...'
              }
              style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 w-44"
            />
          </div>

          {/* 3. Yellow Highlight Toggle */}
          <button
            type="button"
            onClick={() => setYellowHighlightPdf((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              yellowHighlightPdf
                ? 'bg-yellow-300 text-slate-950 border-yellow-500'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>
              {yellowHighlightPdf
                ? language === 'en'
                  ? 'Yellow Mark: ON'
                  : 'হলুদ মার্ক: চালু'
                : language === 'en'
                ? 'Yellow Mark: OFF'
                : 'হলুদ মার্ক: বন্ধ'}
            </span>
          </button>

          {/* 4. Upload New PDF Button */}
          <button
            type="button"
            onClick={onUploadClick}
            disabled={uploading}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {language === 'en' ? 'Uploading...' : 'আপলোড হচ্ছে...'}
                </span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {language === 'en' ? '+ Upload New PDF' : '+ নতুন PDF আপলোড'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Pill Switcher for Instant 1-Click PDF Selection */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => runEasyPdfSeeingMethod('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
            pdfViewMode === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {language === 'en'
              ? `All PDFs (${documents.length})`
              : `সবগুলো PDF একসাথে (${documents.length}টি)`}
          </span>
        </button>

        {documents.map((doc, idx) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => runEasyPdfSeeingMethod(doc.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              pdfViewMode === doc.id
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[220px]">
              PDF {idx + 1}: {doc.title}
            </span>
            <span className="text-[10px] font-mono opacity-80">
              ({doc.pageCount}p)
            </span>
          </button>
        ))}
      </div>

      {/* All PDFs Reader Grid (Side-by-Side when viewing All PDFs, or Full Width when viewing 1 PDF) */}
      <div
        className={`grid grid-cols-1 ${
          pdfViewMode === 'all' && visibleDocuments.length > 1
            ? 'lg:grid-cols-2'
            : 'lg:grid-cols-1'
        } gap-6 items-start`}
      >
        {visibleDocuments.map((doc, idx) => {
          const isExpanded = !!expandedDocIds[doc.id] || pdfViewMode !== 'all';
          const displayText = isExpanded ? doc.text : doc.text.slice(0, 2600);

          return (
            <div
              key={doc.id}
              className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
            >
              {/* PDF Document Header Bar */}
              <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-emerald-500">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                      PDF #{idx + 1} · {doc.pageCount}{' '}
                      {language === 'en' ? 'PAGES' : 'পৃষ্ঠা'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono tabular-nums">
                      {doc.wordCount.toLocaleString()}{' '}
                      {language === 'en' ? 'words' : 'শব্দ'}
                    </span>
                  </div>
                  <h3
                    className="text-sm md:text-base font-bold text-white mt-1 truncate"
                    style={{
                      fontFamily:
                        "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                    }}
                  >
                    {doc.title}
                  </h3>
                  <p
                    className="text-xs text-slate-300 truncate mt-0.5"
                    style={{
                      fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                    }}
                  >
                    {doc.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onGenerateDetailedYellowAnswer(doc)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-yellow-300 hover:bg-yellow-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {language === 'en'
                        ? 'Detailed Answer (Yellow Mark)'
                        : 'বিস্তারিত উত্তর (হলুদ মার্ক)'}
                    </span>
                  </button>

                  {doc.isUploadedFile &&
                    doc.dbFileId &&
                    onDeleteUploadedFile && (
                      <button
                        type="button"
                        onClick={() => onDeleteUploadedFile(doc.dbFileId!)}
                        className="p-1.5 text-slate-300 hover:text-red-400 bg-slate-800 rounded-lg"
                        title="Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
              </div>

              {/* PDF Page Content Reader with Yellow Highlighter Marks */}
              <div className="p-5 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {language === 'en'
                        ? 'Verified Unicode PDF Content (Yellow Mark Active)'
                        : 'যাচাইকৃত ইউনিকোড PDF কন্টেন্ট (গুরুত্বপূর্ণ পয়েন্ট হলুদ মার্ককৃত)'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpandDoc(doc.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    {isExpanded
                      ? language === 'en'
                        ? 'Compact View'
                        : 'সংক্ষিপ্ত ভিউ'
                      : language === 'en'
                      ? 'Read Full PDF Pages'
                      : 'সম্পূর্ণ PDF পড়ুন'}
                  </button>
                </div>

                <div
                  className="bg-white border border-slate-200 rounded-lg p-4 max-h-[460px] overflow-y-auto text-xs md:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs"
                  style={{
                    fontFamily: "'Hind Siliguri', 'DM Sans', sans-serif",
                  }}
                >
                  {renderTextWithYellowHighlights(
                    displayText,
                    yellowHighlightPdf,
                    searchQuery
                  )}
                  {!isExpanded && doc.text.length > 2600 && (
                    <div className="pt-3 mt-3 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpandDoc(doc.id)}
                        className="px-4 py-1.5 text-xs font-bold text-slate-900 bg-yellow-200 hover:bg-yellow-300 rounded-lg border border-yellow-400 transition-colors"
                      >
                        {language === 'en'
                          ? `Show All ${doc.pageCount} Pages of this PDF`
                          : `এই PDF-এর সম্পূর্ণ ${doc.pageCount} পৃষ্ঠা দেখুন`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
