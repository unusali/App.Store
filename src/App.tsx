import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Palette,
  Archive,
  Trash2,
  Check,
  Loader2,
  LogOut,
  LogIn,
  Search,
  Save,
  Eye,
  PenTool,
  MessageSquareText,
  Lightbulb,
  Clock,
  Plus,
  Bell,
  Play,
  RotateCcw,
  Languages,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import {
  BrandedDocumentCanvas,
  BrandSettingData,
  GenerationData,
} from './components/BrandedDocumentCanvas.tsx';
import { ArchitectureBlueprintView } from './components/ArchitectureBlueprintView.tsx';
import {
  WritingPromptBar,
  ComposerAttachment,
  InstantReplyPreview,
} from './components/WritingPromptBar.tsx';
import {
  ReminderProgressDashboard,
  AccuracyHistoryPoint,
} from './components/ReminderProgressDashboard.tsx';
import {
  AllPdfEasyViewer,
  PdfViewerDocumentItem,
} from './components/AllPdfEasyViewer.tsx';
import {
  extractYellowImportantPoints,
  renderTextWithYellowHighlights,
  formatDigits,
  NUMBER_FONT_OPTIONS,
} from './lib/yellowHighlighter.tsx';
import {
  UTECHTIPS_LOGO_DATA_URI,
  BENGALI_SAMPLE_DOCUMENTS,
} from './lib/utechtipsLogo.ts';

interface FileRecord {
  id: number;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  extractionMethod: string;
  extractionStatus: string;
  extractedText: string;
  pageCount: number;
  wordCount: number;
  metadata?: {
    parser?: string;
    confidence?: number;
    detectedScript?: string;
    chunkCount?: number;
    estimatedTokens?: number;
  };
  createdAt: string;
}

interface TipItem {
  id: number;
  category: string;
  titleEn: string;
  titleBn: string;
  detailEn: string;
  detailBn: string;
  sourceDoc: string;
}

// Single Unified Interface for Reminder (MCQ + Important Alert)
export type ReminderViewMode = 'mcq' | 'important_alert' | 'both';

interface UnifiedReminderItem {
  id: number;
  importanceLevel: 'CRITICAL' | 'HIGH' | 'MANDATORY';
  statutoryRuleEn: string;
  statutoryRuleBn: string;
  // Alert fields
  alertTitleEn: string;
  alertTitleBn: string;
  alertMessageEn: string;
  alertMessageBn: string;
  // MCQ fields (4 options)
  questionEn: string;
  questionBn: string;
  optionsEn: string[];
  optionsBn: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
  selectedOptionIndex: number | null;
  // Countdown / Trigger fields
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  alertTriggered: boolean;
}

const DEFAULT_TIPS: TipItem[] = [
  {
    id: 1,
    category: 'BPPCF Gazette 2026 · Rule 226Gha (বিধি ২২৬ঘ)',
    titleEn: '1.5% Net Profit Contribution Rule',
    titleBn: 'নীট মুনাফার ১.৫% কেন্দ্রীয় তহবিলে প্রদেয় চাঁদা',
    detailEn:
      '100% foreign-invested oil, gas, and mineral exploration companies must contribute 1.5% of their annual net profit into the central BPPCF account via bank cheque.',
    detailBn:
      'শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ অনুসন্ধান কোম্পানিসমূহ তাহাদের বাৎসরিক নীট মুনাফার ১.৫% অর্থ কেন্দ্রীয় BPPCF তহবিলে চেকের মাধ্যমে জমা প্রদান করিবে।',
    sourceDoc: 'Bangladesh_Gazette_SRO_50_Law_2026_BPPCF.pdf',
  },
  {
    id: 2,
    category: 'BPPCF Gazette 2026 · Rule 226Uma (বিধি ২২৬ঙ)',
    titleEn: '80% Beneficiary vs. 20% Emergency Welfare Split',
    titleBn: '৮০% সুবিধাভোগী ও ২০% আপদকালীন কল্যাণ হিসাব বণ্টন',
    detailEn:
      '80% of the fund is distributed equally via EFT to workers with 9+ months of service. The remaining 20% goes to the Emergency Welfare Account (5 Lakh BDT workplace death/disability grant; 3 Lakh BDT natural death grant).',
    detailBn:
      'তহবিলের মোট অর্থের ৮০% কমপক্ষে ৯ মাস চাকুরীরত সুবিধাভোগীদের মধ্যে EFT মারফত সমভাবে বণ্টন করা হইবে এবং ২০% আপদকালীন কল্যাণ হিসাবে জমা থাকিবে (কর্মক্ষেত্রে মৃত্যু/অক্ষমতায় ৫ লক্ষ টাকা ও স্বাভাবিক মৃত্যুতে ৩ লক্ষ টাকা অনুদান)।',
    sourceDoc: 'Bangladesh_Gazette_SRO_50_Law_2026_BPPCF.pdf',
  },
  {
    id: 3,
    category: 'Bangladesh Labour Act 2006 · Section 46 (ধারা ৪৬)',
    titleEn: '16-Week Paid Maternity Benefit Calculation',
    titleBn: '১৬ সপ্তাহের সবেতন প্রসূতি কল্যাণ সুবিধা গণনা',
    detailEn:
      'Female workers with at least 6 months of service prior to delivery are entitled to 8 weeks pre-natal + 8 weeks post-natal (16 weeks total) paid maternity leave calculated on their 3-month average daily wage.',
    detailBn:
      'কমপক্ষে ৬ মাস চাকুরী পূর্ণ করিয়াছেন এমন নারী শ্রমিক প্রসবের পূর্বে ৮ সপ্তাহ ও প্রসবের পরে ৮ সপ্তাহ (মোট ১৬ সপ্তাহ) পূর্ববর্তী ৩ মাসের গড় মজুরীর ভিত্তিতে সবেতন প্রসূতি কল্যাণ সুবিধা পাইবেন।',
    sourceDoc: 'Bangladesh_Labour_Act_2006_Consolidated_Chapters_1_to_21.pdf',
  },
  {
    id: 4,
    category: 'Bangladesh Labour Act 2006 · Section 100 & 108 (ধারা ১০০ ও ১০৮)',
    titleEn: 'Working Hours & Double Overtime Rate',
    titleBn: 'দৈনিক কর্মঘণ্টা ও দ্বিগুণ হারে অধিকাল (Overtime) ভাতা',
    detailEn:
      'Standard adult working hours are 8 hours/day (max 10 hours with overtime) and 48 hours/week. Overtime must be paid at 2x (double) the basic wage and dearness allowance.',
    detailBn:
      'প্রাপ্তবয়স্ক শ্রমিকের সাধারণ কর্মঘণ্টা দৈনিক ৮ ঘণ্টা (ওভারটাইমসহ সর্বোচ্চ ১০ ঘণ্টা) এবং সপ্তাহে ৪৮ ঘণ্টা। অধিকাল কর্মের জন্য মূল মজুরী ও মহার্ঘ ভাতার দ্বিগুণ (২ গুণ) হারে ভাতা প্রদান বাধ্যতামূলক।',
    sourceDoc: 'Bangladesh_Labour_Act_2006_Consolidated_Chapters_1_to_21.pdf',
  },
  {
    id: 5,
    category: 'UTechtips Document Formation Tip',
    titleEn: 'Bijoy ANSI to Unicode Bengali OCR Preservation',
    titleBn: 'বিজয় (Bijoy ANSI) হইতে ইউনিকোড বাংলা ওসিআর রূপান্তর',
    detailEn:
      'When uploading older Bangladesh Gazette or legal PDFs encoded in Bijoy ANSI fonts, use Vision OCR mode + Hind Siliguri font in Brand Kit for crisp Bengali Unicode PDF exports.',
    detailBn:
      'পুরাতন বিজয় ফন্টে লেখা গেজেট বা আইনি পিডিএফ আপলোড করিলে স্বয়ংক্রিয়ভাবে ইউনিকোড বাংলায় রূপান্তরিত হয় এবং Hind Siliguri ফন্টের মাধ্যমে ঝকঝকে পিডিএফ ও এইচটিএমএল আউটপুট পাওয়া যায়।',
    sourceDoc: 'UTechtips Studio Guide',
  },
];

const DEFAULT_UNIFIED_REMINDERS: UnifiedReminderItem[] = [
  {
    id: 1,
    importanceLevel: 'CRITICAL',
    statutoryRuleEn: 'Gazette 2026 · Rules 226Gha & 226Uma(5)',
    statutoryRuleBn: 'গেজেট ২০২৬ · বিধি ২২৬ঘ ও ২২৬ঙ(৫)',
    alertTitleEn: 'BPPCF 1.5% Profit Contribution & 2-Month EFT Disbursement Alert',
    alertTitleBn: 'BPPCF ১.৫% মুনাফা জমা ও ২ মাসের মধ্যে EFT বণ্টন সতর্কবার্তা',
    alertMessageEn:
      '100% foreign-invested oil, gas & mineral companies must deposit 1.5% of net profit to BPPCF and disburse 80% equally via EFT within 2 months of receipt.',
    alertMessageBn:
      'শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ কোম্পানিসমূহকে নীট মুনাফার ১.৫% জমা দিতে হবে এবং অর্থ প্রাপ্তির ২ মাসের মধ্যে ৮০% অর্থ সুবিধাভোগীদের ব্যাংক হিসাবে EFT মারফত বণ্টন করতে হবে।',
    questionEn:
      'What percentage of annual net profit must eligible oil/gas companies contribute to BPPCF, and within what time limit must the 80% beneficiary share be disbursed via EFT?',
    questionBn:
      'প্রযোজ্য তেল, গ্যাস ও খনিজ কোম্পানিসমূহকে বাৎসরিক নীট মুনাফার কত শতাংশ BPPCF তহবিলে জমা দিতে হবে এবং অর্থ প্রাপ্তির কত সময়ের মধ্যে ৮০% অর্থ EFT মারফত বণ্টন করতে হবে?',
    optionsEn: [
      '1.5% net profit & within 2 months of receipt',
      '5.0% net profit & within 6 months of receipt',
      '2.5% net profit & within 30 working days',
      '1.0% net profit & within 9 months of service',
    ],
    optionsBn: [
      '১.৫% নীট মুনাফা এবং অর্থ প্রাপ্তির ২ মাসের মধ্যে',
      '৫.০% নীট মুনাফা এবং অর্থ প্রাপ্তির ৬ মাসের মধ্যে',
      '২.৫% নীট মুনাফা এবং ৩০ কর্মদিবসের মধ্যে',
      '১.০% নীট মুনাফা এবং ৯ মাসের মধ্যে',
    ],
    correctIndex: 0,
    explanationEn:
      'Under Rule 226Gha, companies contribute 1.5% of net profit; under Rule 226Uma(5), 80% is disbursed equally via EFT within 2 months.',
    explanationBn:
      'বিধি ২২৬ঘ অনুযায়ী নীট মুনাফার ১.৫% জমা দিতে হয় এবং বিধি ২২৬ঙ(৫) অনুযায়ী অর্থ প্রাপ্তির ২ (দুই) মাসের মধ্যে ৮০% অর্থ সুবিধাভোগীদের ব্যাংক হিসাবে EFT মারফত প্রেরণ বাধ্যতামূলক।',
    selectedOptionIndex: null,
    remainingSeconds: 60,
    totalSeconds: 60,
    isRunning: false,
    alertTriggered: false,
  },
  {
    id: 2,
    importanceLevel: 'HIGH',
    statutoryRuleEn: 'Gazette 2026 · Rule 226Uma(7)',
    statutoryRuleBn: 'গেজেট ২০২৬ · বিধি ২২৬ঙ(৭)',
    alertTitleEn: 'Emergency Welfare Grant Alert (5 Lakh vs. 3 Lakh BDT)',
    alertTitleBn: 'আপদকালীন কল্যাণ হিসাব অনুদান এলার্ট (৫ লক্ষ ও ৩ লক্ষ টাকা)',
    alertMessageEn:
      'From the 20% Emergency Welfare Account: 5,00,000 BDT is granted for workplace death/permanent disability, and 3,00,000 BDT for natural death.',
    alertMessageBn:
      '২০% আপদকালীন কল্যাণ হিসাব হইতে কর্মক্ষেত্রে দুর্ঘটনাজনিত মৃত্যু বা স্থায়ী অক্ষমতায় ৫ (পাঁচ) লক্ষ টাকা এবং স্বাভাবিক মৃত্যুতে ৩ (তিন) লক্ষ টাকা অনুদান প্রদান করা হইবে।',
    questionEn:
      'Under Rule 226Uma(7), what are the grant amounts from the 20% Emergency Welfare Account for workplace death/permanent disability vs. natural death?',
    questionBn:
      'বিধি ২২৬ঙ(৭) অনুযায়ী কর্মক্ষেত্রে মৃত্যু/স্থায়ী অক্ষমতা এবং স্বাভাবিক মৃত্যুর ক্ষেত্রে আপদকালীন কল্যাণ অনুদান কত?',
    optionsEn: [
      '2 Lakh BDT (workplace) & 1 Lakh BDT (natural)',
      '5 Lakh BDT (workplace) & 3 Lakh BDT (natural)',
      '10 Lakh BDT (workplace) & 5 Lakh BDT (natural)',
      '3 Lakh BDT (workplace) & 2 Lakh BDT (natural)',
    ],
    optionsBn: [
      '২ লক্ষ টাকা (কর্মক্ষেত্রে) ও ১ লক্ষ টাকা (স্বাভাবিক)',
      '৫ লক্ষ টাকা (কর্মক্ষেত্রে) ও ৩ লক্ষ টাকা (স্বাভাবিক)',
      '১০ লক্ষ টাকা (কর্মক্ষেত্রে) ও ৫ লক্ষ টাকা (স্বাভাবিক)',
      '৩ লক্ষ টাকা (কর্মক্ষেত্রে) ও ২ লক্ষ টাকা (স্বাভাবিক)',
    ],
    correctIndex: 1,
    explanationEn:
      'Rule 226Uma(7) specifies 5,00,000 BDT for workplace accident death/permanent disability and 3,00,000 BDT for natural death while in service.',
    explanationBn:
      'বিধি ২২৬ঙ(৭) অনুসারে কর্মক্ষেত্রে মৃত্যু বা স্থায়ী অক্ষমতায় ৫,০০,০০০ টাকা এবং চাকুরীরত অবস্থায় স্বাভাবিক মৃত্যুতে ৩,০০,০০০ টাকা এককালীন অনুদান প্রদেয়।',
    selectedOptionIndex: null,
    remainingSeconds: 120,
    totalSeconds: 120,
    isRunning: false,
    alertTriggered: false,
  },
  {
    id: 3,
    importanceLevel: 'CRITICAL',
    statutoryRuleEn: 'Labour Act 2006 · Sections 30 & 123',
    statutoryRuleBn: 'বাংলাদেশ শ্রম আইন ২০০৬ · ধারা ৩০ ও ১২৩',
    alertTitleEn: '30 Working Days Final Dues Settlement Deadline Alert',
    alertTitleBn: '৩০ কর্মদিবসের মধ্যে চূড়ান্ত পাওনা পরিশোধের জরুরি এলার্ট',
    alertMessageEn:
      'Upon termination, retrenchment, discharge, or retirement, the employer MUST pay all final settlement dues within a maximum of 30 working days.',
    alertMessageBn:
      'শ্রমিকের চাকুরীর অবসান, ছাঁটাই, ডিসচার্জ বা অবসরের পরবর্তী সর্বোচ্চ ৩০ (ত্রিশ) কর্মদিবসের মধ্যে মালিক কর্তৃক সকল চূড়ান্ত পাওনা পরিশোধ বাধ্যতামূলক।',
    questionEn:
      'Within how many working days must an employer settle all final dues of a worker after cessation of employment under Sections 30 & 123?',
    questionBn:
      'ধারা ৩০ ও ১২৩ অনুযায়ী চাকুরীর অবসানের পরবর্তী সর্বোচ্চ কত কর্মদিবসের মধ্যে শ্রমিকের চূড়ান্ত সকল পাওনা পরিশোধ করতে হবে?',
    optionsEn: [
      'Within 7 working days',
      'Within 15 working days',
      'Within 30 working days',
      'Within 60 working days',
    ],
    optionsBn: [
      '৭ কর্মদিবসের মধ্যে',
      '১৫ কর্মদিবসের মধ্যে',
      '৩০ কর্মদিবসের মধ্যে',
      '৬০ কর্মদিবসের মধ্যে',
    ],
    correctIndex: 2,
    explanationEn:
      'Sections 30 and 123 strictly mandate that all unpaid wages and final settlement benefits must be paid within 30 working days.',
    explanationBn:
      'ধারা ৩০ এবং ধারা ১২৩ অনুযায়ী চাকুরীর অবসানের তারিখ হইতে সর্বোচ্চ ৩০ কর্মদিবসের মধ্যে শ্রমিকের সমুদয় পাওনা পরিশোধ করিতে হইবে।',
    selectedOptionIndex: null,
    remainingSeconds: 180,
    totalSeconds: 180,
    isRunning: false,
    alertTriggered: false,
  },
  {
    id: 4,
    importanceLevel: 'MANDATORY',
    statutoryRuleEn: 'Labour Act 2006 · Section 46 & 108',
    statutoryRuleBn: 'বাংলাদেশ শ্রম আইন ২০০৬ · ধারা ৪৬ ও ১০৮',
    alertTitleEn: '16-Week Paid Maternity & 2x Overtime Compliance Alert',
    alertTitleBn: '১৬ সপ্তাহের সবেতন প্রসূতি ছুটি ও দ্বিগুণ ওভারটাইম ভাতা এলার্ট',
    alertMessageEn:
      'Female workers with 6+ months service receive 16 weeks (8 pre-natal + 8 post-natal) paid maternity benefit. Overtime is strictly 2x basic wage + dearness allowance.',
    alertMessageBn:
      'কমপক্ষে ৬ মাস চাকুরী পূর্ণ করা নারী শ্রমিক ১৬ সপ্তাহ (৮+৮) সবেতন প্রসূতি কল্যাণ সুবিধা পাইবেন এবং ওভারটাইম ভাতা মূল মজুরী ও মহার্ঘ ভাতার দ্বিগুণ হইবে।',
    questionEn:
      'What is the total duration of paid maternity leave under Section 46, and what is the statutory overtime rate under Section 108?',
    questionBn:
      'ধারা ৪৬ অনুযায়ী সবেতন প্রসূতি কল্যাণ ছুটির মোট মেয়াদ কত এবং ধারা ১০৮ অনুযায়ী ওভারটাইম ভাতার হার কত?',
    optionsEn: [
      '12 weeks maternity leave & 1.5x overtime rate',
      '16 weeks (8+8) maternity leave & 2x (double) overtime rate',
      '14 weeks maternity leave & 2x overtime rate',
      '20 weeks maternity leave & 1.5x overtime rate',
    ],
    optionsBn: [
      '১২ সপ্তাহ প্রসূতি ছুটি ও ১.৫ গুণ ওভারটাইম ভাতা',
      '১৬ সপ্তাহ (৮+৮) প্রসূতি ছুটি ও ২ গুণ (দ্বিগুণ) ওভারটাইম ভাতা',
      '১৪ সপ্তাহ প্রসূতি ছুটি ও ২ গুণ ওভারটাইম ভাতা',
      '২০ সপ্তাহ প্রসূতি ছুটি ও ১.৫ গুণ ওভারটাইম ভাতা',
    ],
    correctIndex: 1,
    explanationEn:
      'Section 46 grants 8 weeks preceding and 8 weeks succeeding delivery (16 weeks total), and Section 108 mandates double (2x) overtime pay.',
    explanationBn:
      'ধারা ৪৬ অনুযায়ী প্রসবের পূর্বে ৮ সপ্তাহ ও পরে ৮ সপ্তাহ (মোট ১৬ সপ্তাহ) সবেতন ছুটি এবং ধারা ১০৮ অনুযায়ী দ্বিগুণ (২ গুণ) হারে ওভারটাইম ভাতা প্রদেয়।',
    selectedOptionIndex: null,
    remainingSeconds: 90,
    totalSeconds: 90,
    isRunning: false,
    alertTriggered: false,
  },
  {
    id: 5,
    importanceLevel: 'CRITICAL',
    statutoryRuleEn: 'Gazette 2026 · Rules 226Nya & 226Tha',
    statutoryRuleBn: 'গেজেট ২০২৬ · বিধি ২২৬ঞ ও ২২৬ঠ',
    alertTitleEn: 'March 31 Annual CA Audit & Government Report Deadline Alert',
    alertTitleBn: '৩১ শে মার্চের মধ্যে বাৎসরিক অডিট ও প্রতিবেদন দাখিলের এলার্ট',
    alertMessageEn:
      'BPPCF accounts must be audited annually by a Chartered Accountant firm and the Annual Report must be submitted to the Government by March 31 every year.',
    alertMessageBn:
      'প্রতি বৎসর Chartered Accountant ফার্ম দ্বারা নিরীক্ষা সম্পন্ন করিয়া ৩১ শে মার্চের মধ্যে সরকারের নিকট বার্ষিক প্রতিবেদন দাখিল করা বাধ্যতামূলক।',
    questionEn:
      'By which statutory deadline each year must the BPPCF Board submit its audited Annual Report to the Government under Rule 226Tha?',
    questionBn:
      'বিধি ২২৬ঠ অনুযায়ী প্রতি বৎসর কোন তারিখের মধ্যে সরকারের নিকট BPPCF-এর নিরীক্ষিত বার্ষিক প্রতিবেদন দাখিল করতে হবে?',
    optionsEn: [
      'By March 31 every year',
      'By June 30 every year',
      'By December 31 every year',
      'By January 31 every year',
    ],
    optionsBn: [
      'প্রতি বৎসর ৩১ শে মার্চের মধ্যে',
      'প্রতি বৎসর ৩০ শে জুনের মধ্যে',
      'প্রতি বৎসর ৩১ শে ডিসেম্বরের মধ্যে',
      'প্রতি বৎসর ৩১ শে জানুয়ারির মধ্যে',
    ],
    correctIndex: 0,
    explanationEn:
      'Rule 226Tha mandates submitting the annual activity and audit report to the Government by March 31 of each calendar year.',
    explanationBn:
      'বিধি ২২৬ঠ অনুযায়ী প্রতি বৎসর ৩১ শে মার্চের মধ্যে তহবিলের বার্ষিক কার্যাবলী ও নিরীক্ষা প্রতিবেদন সরকারের নিকট পেশ করা বাধ্যতামূলক।',
    selectedOptionIndex: null,
    remainingSeconds: 150,
    totalSeconds: 150,
    isRunning: false,
    alertTriggered: false,
  },
];

const HEADING_FONTS = [
  'Plus Jakarta Sans',
  'Hind Siliguri',
  'Outfit',
  'Bricolage Grotesque',
  'Playfair Display',
  'Fraunces',
];

const BODY_FONTS = ['DM Sans', 'Hind Siliguri', 'Plus Jakarta Sans', 'Lora'];

const LAYOUT_TEMPLATES = [
  {
    id: 'executive_brief',
    label: 'Executive Brief',
    description:
      'High-contrast UTechtips brand header banner with structured KPI metric cards',
  },
  {
    id: 'editorial_report',
    label: 'Editorial Report',
    description:
      'Magazine-grade typographic hierarchy with accent rule dividers',
  },
  {
    id: 'technical_spec',
    label: 'Technical Spec',
    description:
      'Monospace metadata bar and engineering specification structure',
  },
  {
    id: 'minimal_memo',
    label: 'Minimal Memo',
    description: 'Clean executive memorandum layout optimized for print & PDF',
  },
];

// BILINGUAL PRESET ANSWERS (Bangla & English) for both uploaded PDFs
const INITIAL_FORMATION_PREVIEWS_BN: Record<'gazette' | 'labour_act', GenerationData> = {
  gazette: {
    id: 101,
    fileId: 1,
    outputType: 'formatted_document',
    title:
      'বাংলাদেশ শ্রম বিধিমালা সংশোধন গেজেট ২০২৬ — BPPCF তহবিল গঠন ও পরিচালনা কাঠামো',
    contentMarkdown: `**উপ-শিরোনাম:** শ্রম ও কর্মসংস্থান মন্ত্রণালয় প্রজ্ঞাপন (এস.আর.ও. নং ৫০-আইন/২০২৬ — ১৬ ফেব্রুয়ারি, ২০২৬)\n\n**সারসংক্ষেপ (Abstract):** বাংলাদেশ শ্রম আইন, ২০০৬ এর ধারা ৩৫১ ও ধারা ২৩২(৩) অনুযায়ী শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ অনুসন্ধান কোম্পানিসমূহের শ্রমিক-কর্মচারীদের জন্য 'Beneficiaries' Profit Participation Central Fund (BPPCF)' গঠন, নীট মুনাফার ১.৫% প্রদেয় চাঁদা, ৮০:২০ অনুপাতে হিসাব বণ্টন এবং পরিচালনা বোর্ডের পূর্ণাঙ্গ বিধিমালা।`,
    structuredOutput: {
      title:
        'বাংলাদেশ শ্রম বিধিমালা সংশোধন গেজেট ২০২৬ — BPPCF তহবিল গঠন ও পরিচালনা কাঠামো',
      subtitle:
        'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · শ্রম ও কর্মসংস্থান মন্ত্রণালয় (এস.আর.ও. নং ৫০-আইন/২০২৬ · ১৬ ফেব্রুয়ারি, ২০২৬)',
      documentReferenceCode: 'SRO-50-LAW-2026-BPPCF',
      abstract:
        'বাংলাদেশ শ্রম আইন, ২০০৬ এর ধারা ৩৫১ ও ধারা ২৩২(৩) অনুযায়ী শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী তেল, গ্যাস ও খনিজ খাতের কোম্পানিসমূহের জন্য Beneficiaries’ Profit Participation Central Fund (BPPCF) গঠন ও পরিচালনার লক্ষ্যে বিধি ২২৬ক হইতে ২২৬ঠ সন্নিবেশিত হইয়াছে।',
      sections: [
        {
          sectionNumber: '২২৬ক–২২৬গ',
          heading: 'BPPCF গঠন, প্রধান কার্যালয় ও মহাপরিচালক নিয়োগ',
          content:
            'বিধিমালা কার্যকর হইবার ০৬ (ছয়) মাসের মধ্যে সরকার তেল এবং গ্যাসের মিশ্রণ, পরিশোধন বা খনিজ মওজুদের কাজে সংশ্লিষ্ট শতভাগ বৈদেশিক মুদ্রা বিনিয়োগকারী কোম্পানির জন্য BPPCF গঠন করিবে। বোর্ডের প্রধান কার্যালয় ঢাকায় অবস্থিত হইবে এবং একজন অতিরিক্ত সচিব পদমর্যাদার কর্মকর্তা মহাপরিচালক ও সদস্য-সচিব হিসাবে দায়িত্ব পালন করিবেন।',
          keyCallout:
            'কার্যকর হইবার ৬ মাসের মধ্যে তহবিল ও পরিচালনা বোর্ড গঠন বাধ্যতামূলক।',
        },
        {
          sectionNumber: '২২৬ঘ–২২৬ঙ',
          heading: 'তহবিলের অর্থের উৎস (১.৫% নীট মুনাফা) ও ৮০:২০ হিসাব বণ্টন',
          content:
            'সংশ্লিষ্ট আন্তর্জাতিক কোম্পানিসমূহ তাহাদের নীট মুনাফার ১.৫% অর্থ কেন্দ্রীয় তহবিলে চেকের মাধ্যমে জমা প্রদান করিবে। প্রাপ্ত মোট অর্থের ৮০% "সুবিধাভোগী হিসাব"-এ (৯ মাস চাকরি পূর্ণ হওয়া শ্রমিকদের মধ্যে EFT মারফত সমভাবে বণ্টনযোগ্য) এবং ২০% "আপদকালীন কল্যাণ হিসাব"-এ জমা হইবে।',
          keyCallout:
            'কর্মক্ষেত্রে মৃত্যু বা স্থায়ী অক্ষমতায় ৫ (পাঁচ) লক্ষ টাকা এবং স্বাভাবিক মৃত্যুতে ৩ (তিন) লক্ষ টাকা অনুদান।',
        },
        {
          sectionNumber: '২২৬চ–২২৬ঠ',
          heading: 'পরিচালনা বোর্ড, কোরাম, নিরীক্ষা (Audit) ও বার্ষিক প্রতিবেদন',
          content:
            'শ্রম ও কর্মসংস্থান মন্ত্রণালয়ের মন্ত্রী/উপদেষ্টা চেয়ারম্যান এবং সচিব ভাইস-চেয়ারম্যান হইবেন। মনোনীত সদস্যদের মেয়াদ ৩ বৎসর এবং প্রতি ৩ মাসে অন্তত একবার সভা অনুষ্ঠিত হইবে। প্রতি বৎসর Chartered Accountant দ্বারা নিরীক্ষা সম্পন্ন করিয়া ৩১ শে মার্চের মধ্যে সরকারের নিকট বার্ষিক প্রতিবেদন দাখিল করিতে হইবে।',
          keyCallout:
            'মহাপরিচালক বোর্ডের চেয়ারম্যানের অনুমতিক্রমে বাৎসরিক সর্বোচ্চ ৫ লক্ষ টাকা আকস্মিক ব্যয় মঞ্জুর করিতে পারিবেন।',
        },
      ],
      appendixNotes:
        'বাংলাদেশ গেজেট অতিরিক্ত সংখ্যা (পৃষ্ঠা ১২৯১৭–১২৯২৩), ১৬ ফেব্রুয়ারি ২০২৬ খ্রিষ্টাব্দ / ০৩ ফাল্গুন ১৪৩২ বঙ্গাব্দ হইতে সংকলিত।',
    },
    modelUsed: 'gemini-3.8-flash',
    createdAt: new Date().toISOString(),
  },
  labour_act: {
    id: 102,
    fileId: 2,
    outputType: 'summary',
    title:
      'বাংলাদেশ শ্রম আইন, ২০০৬ (২০০৬ সনের ৪২ নং আইন) — অধ্যায় ১–২১ ও তফসিল ১–৫ সারসংক্ষেপ',
    contentMarkdown:
      'বাংলাদেশ শ্রম আইন, ২০০৬ এর নিয়োগ, কর্মঘণ্টা, ছুটি, প্রসূতি কল্যাণ, নিরাপত্তা, মজুরী বোর্ড, ক্ষতিপূরণ, ট্রেড ইউনিয়ন এবং মুনাফায় শ্রমিকের অংশগ্রহণ সংক্রান্ত মূল বিধানসমূহ।',
    structuredOutput: {
      executiveOverview:
        'বাংলাদেশ শ্রম আইন, ২০০৬ (২০১৩ সনের ৩০ নং আইন দ্বারা সংশোধিত) বাংলাদেশের শ্রমিক নিয়োগ, চাকুরীর শর্তাবলী, ন্যূনতম মজুরী, কর্মকালীন নিরাপত্তা, প্রসূতি কল্যাণ, ট্রেড ইউনিয়ন ও শিল্প বিরোধ নিষ্পত্তি এবং কোম্পানীর মুনাফায় শ্রমিকের অংশগ্রহণ সংক্রান্ত মূল সংহত আইন।',
      metrics: [
        { label: 'দৈনিক ও সাপ্তাহিক কর্মঘণ্টা', value: '৮ ঘণ্টা / ৪৮ ঘণ্টা' },
        { label: 'সবেতন প্রসূতি কল্যাণ ছুটি', value: '১৬ সপ্তাহ (৮+৮)' },
        { label: 'মুনাফায় শ্রমিকের অংশগ্রহণ', value: 'নীট মুনাফার ৫% (৮০:১০:১০)' },
      ],
      keyTakeaways: [
        'ধারা ৫ ও ৬: নিয়োগপত্র ও ছবিসহ পরিচয়পত্র প্রদান বাধ্যতামূলক এবং মালিকের খরচে সার্ভিস বহি সংরক্ষণ করিতে হইবে।',
        'ধারা ১৯ ও ১৫১: কর্মকালীন দুর্ঘটনায় মৃত্যুতে ৪৫ দিনের মজুরী/গ্র্যাচুইটিসহ পঞ্চম তফসিল অনুসারে ক্ষতিপূরণ এবং স্বাভাবিক অবসরের বয়স ৬০ বৎসর (ধারা ২৮)।',
        'ধারা ৪৬: প্রসবের পূর্বে ৮ সপ্তাহ ও পরে ৮ সপ্তাহ (মোট ১৬ সপ্তাহ) সবেতন প্রসূতি কল্যাণ সুবিধা।',
        'ধারা ১০৮ ও ১১৫–১১৮: অধিকাল (Overtime) ভাতা মূল মজুরী ও মহার্ঘ ভাতার দ্বিগুণ; বাৎসরিক নৈমিত্তিক ছুটি ১০ দিন, পীড়া ছুটি ১৪ দিন ও উৎসব ছুটি ১১ দিন।',
        'ধারা ১৭৯ ও ২৩৪: ন্যূনতম ৩০% শ্রমিকের সদস্যপদ সাপেক্ষে ট্রেড ইউনিয়ন গঠন এবং প্রযোজ্য কোম্পানীর নীট মুনাফার ৫% অর্থ অংশগ্রহণ ও কল্যাণ তহবিলে প্রদান।',
      ],
      actionRecommendations: [
        '১০০ বা ততোধিক স্থায়ী শ্রমিক কর্মরত প্রতিষ্ঠানে বাধ্যতামূলক গ্রুপ বীমা (ধারা ৯৯) ও ক্যান্টিন চালু করা।',
        '৫০ বা ততোধিক শ্রমিক কর্মরত কারখানায় সেইফটি কমিটি (ধারা ৯০ক) এবং অংশগ্রহণকারী কমিটি (ধারা ২০৫) গঠন করা।',
        'চাকুরীর অবসানের পরবর্তী সর্বোচ্চ ৩০ কর্মদিবসের মধ্যে শ্রমিকের চূড়ান্ত সকল পাওনা পরিশোধ নিশ্চিত করা (ধারা ৩০ ও ১২৩)।',
      ],
    },
    modelUsed: 'gemini-3.8-flash',
    createdAt: new Date().toISOString(),
  },
};

const INITIAL_FORMATION_PREVIEWS_EN: Record<'gazette' | 'labour_act', GenerationData> = {
  gazette: {
    id: 101,
    fileId: 1,
    outputType: 'formatted_document',
    title:
      'Bangladesh Labour Rules Amendment Gazette 2026 — BPPCF Fund & Governance Framework',
    contentMarkdown: `**Subtitle:** Ministry of Labour and Employment Notification (S.R.O. No. 50-Law/2026 — February 16, 2026)\n\n**Abstract:** Pursuant to Section 351 and Section 232(3) of the Bangladesh Labour Act, 2006, this Gazette establishes the 'Beneficiaries' Profit Participation Central Fund (BPPCF)' for 100% foreign-invested oil, gas, and mineral exploration companies, mandating a 1.5% net profit contribution, an 80:20 fund allocation split, and a statutory Board of Directors.`,
    structuredOutput: {
      title:
        'Bangladesh Labour Rules Amendment Gazette 2026 — BPPCF Fund & Governance Framework',
      subtitle:
        'Government of the People’s Republic of Bangladesh · Ministry of Labour and Employment (S.R.O. No. 50-Law/2026 · Feb 16, 2026)',
      documentReferenceCode: 'SRO-50-LAW-2026-BPPCF-EN',
      abstract:
        'Under Sections 351 and 232(3) of the Bangladesh Labour Act, 2006, Rules 226Ka through 226Tha are inserted into the Bangladesh Labour Rules, 2015 to establish and govern the Beneficiaries’ Profit Participation Central Fund (BPPCF) for 100% foreign-invested oil, gas, and mineral sector companies.',
      sections: [
        {
          sectionNumber: '226Ka–226Ga',
          heading: 'Establishment of BPPCF, Head Office & Director General',
          content:
            'Within 06 (six) months of the Rules taking effect, the Government shall establish the Beneficiaries’ Profit Participation Central Fund (BPPCF) for 100% foreign-invested companies engaged in oil/gas blending, refining, or mineral exploration. The Head Office shall be in Dhaka, and an Additional Secretary-rank officer shall serve as Director General and Member-Secretary.',
          keyCallout:
            'Mandatory formation of the BPPCF Fund and Board within 6 months of Gazette enforcement.',
        },
        {
          sectionNumber: '226Gha–226Uma',
          heading: 'Fund Source (1.5% Net Profit) & 80:20 Account Distribution',
          content:
            'Applicable international oil, gas, and mineral companies must deposit 1.5% of their annual net profit into the central BPPCF account by cheque. Of the total collected amount, 80% is credited to the "Beneficiaries Account" (distributed equally via EFT to workers with 9+ months of service) and 20% to the "Emergency Welfare Account".',
          keyCallout:
            'BDT 5,00,000 grant for workplace death/permanent disability and BDT 3,00,000 for natural death.',
        },
        {
          sectionNumber: '226Cha–226Tha',
          heading: 'Board of Directors, Quorum, Audit & Annual Report by March 31',
          content:
            'The Minister/Adviser of Labour and Employment serves as Chairman and the Secretary as Vice-Chairman. Nominated members hold a 3-year term, and Board meetings must be held at least once every 3 months. Annual accounts must be audited by a Chartered Accountant firm and submitted to the Government by March 31 each year.',
          keyCallout:
            'The Director General may sanction up to BDT 5,00,000 annually for unforeseen contingencies with Chairman approval.',
        },
      ],
      appendixNotes:
        'Compiled and translated from Bangladesh Gazette Extraordinary (Pages 12917–12923), dated February 16, 2026 / 03 Falgun 1432 BS.',
    },
    modelUsed: 'gemini-3.8-flash',
    createdAt: new Date().toISOString(),
  },
  labour_act: {
    id: 102,
    fileId: 2,
    outputType: 'summary',
    title:
      'Bangladesh Labour Act, 2006 (Act No. XLII of 2006) — Chapters 1–21 & Schedules 1–5 Executive Summary',
    contentMarkdown:
      'Comprehensive executive summary of the Bangladesh Labour Act, 2006 covering employment conditions, working hours, leave entitlements, maternity benefits, occupational safety, wages, compensation, trade unions, and company profit participation.',
    structuredOutput: {
      executiveOverview:
        'The Bangladesh Labour Act, 2006 (amended by Act No. XXX of 2013) is the principal consolidated statute governing worker appointment, service rules, minimum wages, industrial health and safety, maternity welfare, trade unions, industrial dispute resolution, and worker participation in company profits.',
      metrics: [
        { label: 'Daily & Weekly Working Hours', value: '8 Hrs / 48 Hrs' },
        { label: 'Paid Maternity Leave', value: '16 Weeks (8+8)' },
        { label: 'Company Profit Participation', value: '5% Net Profit (80:10:10)' },
      ],
      keyTakeaways: [
        'Sections 5 & 6: Mandatory issuance of formal Appointment Letter and Photo ID Card; Service Book must be maintained at the employer’s expense.',
        'Sections 19, 28 & 151: Workplace death compensation equals 45 days’ wages/gratuity per year plus Schedule V compensation; natural retirement age is 60 years.',
        'Section 46: 8 weeks pre-natal + 8 weeks post-natal (16 weeks total) paid maternity benefit for female workers with 6+ months of service.',
        'Sections 108 & 115–118: Overtime allowance is 2x (double) basic wage + dearness allowance; annual Casual Leave is 10 days, Sick Leave 14 days, and Festival Holidays 11 days.',
        'Sections 179 & 234: Minimum 30% worker membership required to form a Trade Union; eligible companies must allocate 5% of net profit to Participation & Welfare Funds.',
      ],
      actionRecommendations: [
        'Establish mandatory Group Insurance (Section 99) and Canteen facilities in establishments employing 100 or more permanent workers.',
        'Constitute a Safety Committee (Section 90A) and Participation Committee (Section 205) in factories employing 50 or more workers.',
        'Ensure all final settlement dues and wages are paid within 30 working days of employment termination or retirement (Sections 30 & 123).',
      ],
    },
    modelUsed: 'gemini-3.8-flash',
    createdAt: new Date().toISOString(),
  },
};

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

// Subtle Web Audio API chime when an Important Alert fires (no external audio file needed)
function playAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

function StudioWorkspace() {
  const {
    firebaseUser,
    authError,
    signInWithGoogle,
    logout,
    fetchWithAuth,
  } = useAuth();

  // Top Header Navigation
  const [activeNav, setActiveNav] = useState<
    'studio' | 'branding' | 'archive' | 'architecture'
  >('studio');

  // Primary Studio Action Tab Buttons:
  // 'upload' (Upload Docs) | 'write' (Write What You Want) | 'answer' (Answer & Content) | 'tips' (Tips) | 'reminder' (Reminder MCQ & Alert)
  const [studioTab, setStudioTab] = useState<
    'upload' | 'write' | 'answer' | 'tips' | 'reminder'
  >('write');

  // Language State: 'bn' (Bangla / বাংলা) | 'en' (English)
  const [language, setLanguage] = useState<'en' | 'bn'>('bn');
  const [numberFont, setNumberFont] = useState<string>(
    NUMBER_FONT_OPTIONS[0].id
  );
  const [translatingAnswer, setTranslatingAnswer] = useState(false);

  const handleChangeNumberFont = (fontValue: string) => {
    setNumberFont(fontValue);
    document.documentElement.style.setProperty('--app-number-font', fontValue);
  };

  const [previewDocKey, setPreviewDocKey] = useState<'gazette' | 'labour_act'>(
    'gazette'
  );

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [generations, setGenerations] = useState<GenerationData[]>([]);
  const [activeGeneration, setActiveGeneration] =
    useState<GenerationData | null>(INITIAL_FORMATION_PREVIEWS_BN.gazette);

  // Tips state
  const [tips, setTips] = useState<TipItem[]>(DEFAULT_TIPS);
  const [newTipTitle, setNewTipTitle] = useState('');
  const [newTipDetail, setNewTipDetail] = useState('');

  // UNIFIED REMINDER (MCQ & IMPORTANT ALERT) STATE — Controlled by ONE Dropdown & ONE Method
  const [reminderModeDropdown, setReminderModeDropdown] =
    useState<ReminderViewMode>('both');
  const [reminders, setReminders] = useState<UnifiedReminderItem[]>(
    DEFAULT_UNIFIED_REMINDERS
  );
  const [accuracyHistory, setAccuracyHistory] = useState<AccuracyHistoryPoint[]>([
    {
      step: 'Start',
      accuracyPct: 0,
      answeredPct: 0,
      correctCount: 0,
      answeredCount: 0,
    },
    {
      step: 'Q1 Check',
      accuracyPct: 100,
      answeredPct: 20,
      correctCount: 1,
      answeredCount: 1,
    },
    {
      step: 'Q2 Check',
      accuracyPct: 50,
      answeredPct: 40,
      correctCount: 1,
      answeredCount: 2,
    },
    {
      step: 'Q3 Check',
      accuracyPct: 67,
      answeredPct: 60,
      correctCount: 2,
      answeredCount: 3,
    },
    {
      step: 'Q4 Check',
      accuracyPct: 75,
      answeredPct: 80,
      correctCount: 3,
      answeredCount: 4,
    },
  ]);
  const [activePopupAlert, setActivePopupAlert] =
    useState<UnifiedReminderItem | null>(null);
  const [generatingReminderAi, setGeneratingReminderAi] = useState(false);

  // Unified single-form inputs for adding a custom MCQ or Important Alert
  const [formInputTitleOrQuestion, setFormInputTitleOrQuestion] = useState('');
  const [formInputDetailOrOptions, setFormInputDetailOrOptions] = useState('');
  const [formImportanceLevel, setFormImportanceLevel] = useState<
    'CRITICAL' | 'HIGH' | 'MANDATORY'
  >('CRITICAL');
  const [formTimerSeconds, setFormTimerSeconds] = useState(60);

  const [brand, setBrand] = useState<BrandSettingData>({
    brandName: 'UTechtips',
    logoUrl: UTECHTIPS_LOGO_DATA_URI,
    primaryColor: '#181C24',
    accentColor: '#00C838',
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'DM Sans',
    layoutTemplate: 'executive_brief',
    headerText: 'UTECHTIPS · DOCUMENT INTELLIGENCE & LEGAL SYNTHESIS',
    footerText: 'Prepared by UTechtips DocuForge Studio · Verified OCR Formation',
  });

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [composerGenerating, setComposerGenerating] = useState(false);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const [instantReply, setInstantReply] =
    useState<InstantReplyPreview | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingOcrText, setSavingOcrText] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [editedOcrText, setEditedOcrText] = useState<string>('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<string>('all');
  const [archiveSearch, setArchiveSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  const getPresetsForLanguage = (lang: 'en' | 'bn') =>
    lang === 'en'
      ? INITIAL_FORMATION_PREVIEWS_EN
      : INITIAL_FORMATION_PREVIEWS_BN;

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // ============================================================================
  // SINGLE UNIFIED METHOD FOR REMINDER (MCQ & IMPORTANT ALERT)
  // Handles: 'change_dropdown' | 'answer_mcq' | 'trigger_alert' | 'toggle_timer' | 'reset_item' | 'add_custom' | 'ai_generate'
  // ============================================================================
  const runUnifiedReminderMethod = async (params: {
    action:
      | 'change_dropdown'
      | 'answer_mcq'
      | 'trigger_alert'
      | 'toggle_timer'
      | 'reset_item'
      | 'add_custom'
      | 'ai_generate';
    dropdownType?: ReminderViewMode;
    itemId?: number;
    optionIndex?: number;
  }) => {
    const { action, dropdownType, itemId, optionIndex } = params;

    // 1. Change Type via Dropdown
    if (action === 'change_dropdown' && dropdownType) {
      setReminderModeDropdown(dropdownType);
      return;
    }

    // 2. Answer an MCQ Option (and append live accuracy point over time)
    if (action === 'answer_mcq' && typeof itemId === 'number' && typeof optionIndex === 'number') {
      const nextReminders = reminders.map((item) =>
        item.id === itemId
          ? { ...item, selectedOptionIndex: optionIndex }
          : item
      );
      setReminders(nextReminders);

      const total = nextReminders.length;
      const ansCount = nextReminders.filter(
        (r) => r.selectedOptionIndex !== null
      ).length;
      const corrCount = nextReminders.filter(
        (r) => r.selectedOptionIndex === r.correctIndex
      ).length;
      const accPct = ansCount > 0 ? Math.round((corrCount / ansCount) * 100) : 0;
      const ansPct = total > 0 ? Math.round((ansCount / total) * 100) : 0;

      const timeLabel = new Date().toLocaleTimeString([], {
        minute: '2-digit',
        second: '2-digit',
      });
      setAccuracyHistory((prev) => [
        ...prev.slice(-9),
        {
          step: `${timeLabel}`,
          accuracyPct: accPct,
          answeredPct: ansPct,
          correctCount: corrCount,
          answeredCount: ansCount,
        },
      ]);

      if (activePopupAlert && activePopupAlert.id === itemId) {
        setActivePopupAlert((prev) =>
          prev ? { ...prev, selectedOptionIndex: optionIndex } : null
        );
      }
      return;
    }

    // 3. Trigger an Important Alert Immediately (with Audio Chime & In-App Alert Modal)
    if (action === 'trigger_alert' && typeof itemId === 'number') {
      const target = reminders.find((r) => r.id === itemId);
      if (target) {
        playAlertChime();
        setActivePopupAlert(target);
        setReminders((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, alertTriggered: true, isRunning: false }
              : item
          )
        );
      }
      return;
    }

    // 4. Start / Pause Countdown Timer for an Important Alert / MCQ
    if (action === 'toggle_timer' && typeof itemId === 'number') {
      setReminders((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isRunning: !item.isRunning,
                alertTriggered: false,
              }
            : item
        )
      );
      return;
    }

    // 5. Reset MCQ Selection & Timer
    if (action === 'reset_item' && typeof itemId === 'number') {
      setReminders((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                selectedOptionIndex: null,
                remainingSeconds: item.totalSeconds,
                isRunning: false,
                alertTriggered: false,
              }
            : item
        )
      );
      return;
    }

    // 6. Add Custom MCQ / Important Alert from the Single Unified Form
    if (action === 'add_custom') {
      if (!formInputTitleOrQuestion.trim()) return;
      const rawLines = formInputDetailOrOptions
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const parsedOptions =
        rawLines.length >= 2
          ? rawLines.slice(0, 4)
          : [
              rawLines[0] || 'Correct Statutory Rule (সঠিক বিধান)',
              'Alternative Option B (বিকল্প খ)',
              'Alternative Option C (বিকল্প গ)',
              'None of the above (কোনোটিই নয়)',
            ];

      const newItem: UnifiedReminderItem = {
        id: Date.now(),
        importanceLevel: formImportanceLevel,
        statutoryRuleEn: `${formImportanceLevel} · Custom Reminder`,
        statutoryRuleBn: `${formImportanceLevel} · কাস্টম রিমাইন্ডার`,
        alertTitleEn: formInputTitleOrQuestion.trim(),
        alertTitleBn: formInputTitleOrQuestion.trim(),
        alertMessageEn:
          rawLines.join(' ') || formInputTitleOrQuestion.trim(),
        alertMessageBn:
          rawLines.join(' ') || formInputTitleOrQuestion.trim(),
        questionEn: formInputTitleOrQuestion.trim(),
        questionBn: formInputTitleOrQuestion.trim(),
        optionsEn: parsedOptions,
        optionsBn: parsedOptions,
        correctIndex: 0,
        explanationEn:
          rawLines.join(' ') || 'Verified custom reminder item.',
        explanationBn:
          rawLines.join(' ') || 'কাস্টম রিমাইন্ডার নোট ও উত্তর।',
        selectedOptionIndex: null,
        remainingSeconds: Math.max(10, Number(formTimerSeconds) || 60),
        totalSeconds: Math.max(10, Number(formTimerSeconds) || 60),
        isRunning: true,
        alertTriggered: false,
      };

      setReminders((prev) => [newItem, ...prev]);
      setFormInputTitleOrQuestion('');
      setFormInputDetailOrOptions('');
      showToast(
        'success',
        language === 'en'
          ? 'Added new MCQ & Important Alert Reminder!'
          : 'নতুন MCQ ও জরুরি এলার্ট রিমাইন্ডার যুক্ত হয়েছে!'
      );
      return;
    }

    // 7. AI-Generate 5 New MCQs & Important Alerts from Active Document using the Same Single Method
    if (action === 'ai_generate') {
      setGeneratingReminderAi(true);
      try {
        const sourceDoc = selectedFile
          ? { name: selectedFile.originalName, text: selectedFile.extractedText }
          : previewDocKey === 'gazette'
          ? BENGALI_SAMPLE_DOCUMENTS[0]
          : BENGALI_SAMPLE_DOCUMENTS[1];

        const res = await fetchWithAuth('/api/composer', {
          method: 'POST',
          body: JSON.stringify({
            prompt:
              language === 'en'
                ? `Generate 5 high-importance Multiple Choice Questions (MCQs) with 4 options and Important Compliance Alerts from "${sourceDoc.name}".`
                : `"${sourceDoc.name}" থেকে ৫টি গুরুত্বপূর্ণ বহুনির্বাচনী প্রশ্ন (MCQ) এবং জরুরি সতর্কবার্তা (Important Alert) তৈরি করুন।`,
            outputType: 'mcq_alert',
            contextText: sourceDoc.text,
            contextFileName: sourceDoc.name,
            brandName: brand.brandName,
            layoutTemplate: brand.layoutTemplate,
            language,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate MCQs & Alerts.');
        }

        const aiItems: any[] = data.generation?.structuredOutput?.items || [];
        if (aiItems.length > 0) {
          const converted: UnifiedReminderItem[] = aiItems.map(
            (item: any, idx: number) => ({
              id: Date.now() + idx,
              importanceLevel:
                String(item.importanceLevel).toUpperCase().includes('CRIT')
                  ? 'CRITICAL'
                  : String(item.importanceLevel).toUpperCase().includes('MAND')
                  ? 'MANDATORY'
                  : 'HIGH',
              statutoryRuleEn: item.statutoryRule || sourceDoc.name,
              statutoryRuleBn: item.statutoryRule || sourceDoc.name,
              alertTitleEn: item.alertTitle || item.question,
              alertTitleBn: item.alertTitle || item.question,
              alertMessageEn: item.alertMessage || item.explanation,
              alertMessageBn: item.alertMessage || item.explanation,
              questionEn: item.question,
              questionBn: item.question,
              optionsEn:
                Array.isArray(item.options) && item.options.length >= 2
                  ? item.options
                  : ['Option A', 'Option B', 'Option C', 'Option D'],
              optionsBn:
                Array.isArray(item.options) && item.options.length >= 2
                  ? item.options
                  : ['অপশন ক', 'অপশন খ', 'অপশন গ', 'অপশন ঘ'],
              correctIndex:
                typeof item.correctIndex === 'number' ? item.correctIndex : 0,
              explanationEn: item.explanation || '',
              explanationBn: item.explanation || '',
              selectedOptionIndex: null,
              remainingSeconds: 60,
              totalSeconds: 60,
              isRunning: false,
              alertTriggered: false,
            })
          );
          setReminders((prev) => [...converted, ...prev]);
          showToast(
            'success',
            language === 'en'
              ? `Generated ${converted.length} new MCQs & Important Alerts from "${sourceDoc.name}".`
              : `"${sourceDoc.name}" থেকে ${converted.length}টি নতুন MCQ ও জরুরি এলার্ট তৈরি হয়েছে।`
          );
        }
      } catch (err: any) {
        showToast(
          'error',
          err.message || 'Could not generate AI MCQs & Alerts.'
        );
      } finally {
        setGeneratingReminderAi(false);
      }
    }
  };

  // Live countdown ticker that automatically pops up the Important Alert & MCQ when timer reaches 00:00
  useEffect(() => {
    const interval = setInterval(() => {
      setReminders((prev) =>
        prev.map((r) => {
          if (!r.isRunning || r.alertTriggered) return r;
          if (r.remainingSeconds <= 1) {
            playAlertChime();
            const triggeredItem = {
              ...r,
              remainingSeconds: 0,
              isRunning: false,
              alertTriggered: true,
            };
            setActivePopupAlert(triggeredItem);
            return triggeredItem;
          }
          return { ...r, remainingSeconds: r.remainingSeconds - 1 };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Toggle English - Bangla across workspace and active documents
  const handleToggleLanguage = async () => {
    const nextLang: 'en' | 'bn' = language === 'en' ? 'bn' : 'en';
    setLanguage(nextLang);

    if (!activeGeneration || activeGeneration.id === 101) {
      setActiveGeneration(getPresetsForLanguage(nextLang).gazette);
      showToast(
        'success',
        nextLang === 'en'
          ? 'Switched to English (EN) — Workspace, MCQs, Alerts & Answer updated.'
          : 'বাংলা (Bangla) ভাষায় পরিবর্তন করা হয়েছে — সকল উত্তর, MCQ ও জরুরি এলার্ট বাংলায় দেখানো হচ্ছে।'
      );
      return;
    }

    if (activeGeneration.id === 102) {
      setActiveGeneration(getPresetsForLanguage(nextLang).labour_act);
      showToast(
        'success',
        nextLang === 'en'
          ? 'Switched to English (EN) — Workspace, MCQs, Alerts & Answer updated.'
          : 'বাংলা (Bangla) ভাষায় পরিবর্তন করা হয়েছে — সকল উত্তর, MCQ ও জরুরি এলার্ট বাংলায় দেখানো হচ্ছে।'
      );
      return;
    }

    setTranslatingAnswer(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeGeneration.title,
          contentMarkdown: activeGeneration.contentMarkdown,
          outputType: activeGeneration.outputType,
          targetLanguage: nextLang,
          brandName: brand.brandName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.generation) {
        setActiveGeneration(data.generation);
      }
      showToast(
        'success',
        nextLang === 'en'
          ? 'Translated Answer & Workspace to English.'
          : 'উত্তর ও ওয়ার্কস্পেস বাংলায় অনুবাদ করা হয়েছে।'
      );
    } catch {
      showToast(
        'success',
        nextLang === 'en'
          ? 'Switched Workspace to English.'
          : 'ওয়ার্কস্পেস বাংলায় পরিবর্তন করা হয়েছে।'
      );
    } finally {
      setTranslatingAnswer(false);
    }
  };

  useEffect(() => {
    if (selectedFile) {
      setEditedOcrText(selectedFile.extractedText);
    } else {
      setEditedOcrText('');
    }
  }, [selectedFileId, files]);

  useEffect(() => {
    if (!firebaseUser) {
      setFiles([]);
      setGenerations([]);
      setSelectedFileId(null);
      setActiveGeneration(getPresetsForLanguage(language)[previewDocKey]);
      return;
    }

    let cancelled = false;
    async function loadProfile() {
      setWorkspaceLoading(true);
      setStatusMessage(null);
      try {
        const res = await fetchWithAuth('/api/me');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load workspace data.');
        }
        if (cancelled) return;

        if (data.brandSetting) {
          setBrand({
            ...data.brandSetting,
            logoUrl: data.brandSetting.logoUrl || UTECHTIPS_LOGO_DATA_URI,
          });
        }
        const loadedFiles: FileRecord[] = data.files || [];
        const loadedGens: GenerationData[] = data.generations || [];
        setFiles(loadedFiles);
        setGenerations(loadedGens);

        if (loadedFiles.length > 0) {
          setSelectedFileId(loadedFiles[0].id);
        }
        if (loadedGens.length > 0) {
          setActiveGeneration(loadedGens[0]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatusMessage({
            type: 'error',
            text:
              err.message || 'Could not synchronize workspace with database.',
          });
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  // Handle interactive Writing & Prompt Bar submission
  const handleComposerSubmit = async (payload: {
    prompt: string;
    outputType: string;
    contextKey: string;
    attachedFile: ComposerAttachment | null;
    language: 'en' | 'bn';
    allowGeneralKnowledge?: boolean;
  }) => {
    const startedAt = performance.now();
    setComposerGenerating(true);
    setStatusMessage(null);
    try {
      let contextText = '';
      let contextFileName = '';
      let fileId: number | undefined = undefined;

      if (payload.contextKey === 'gazette') {
        contextText = BENGALI_SAMPLE_DOCUMENTS[0].text.slice(0, 3500);
        contextFileName = BENGALI_SAMPLE_DOCUMENTS[0].name;
      } else if (payload.contextKey === 'labour_act') {
        contextText = BENGALI_SAMPLE_DOCUMENTS[1].text.slice(0, 3500);
        contextFileName = BENGALI_SAMPLE_DOCUMENTS[1].name;
      } else if (payload.contextKey.startsWith('file_')) {
        const idNum = Number(payload.contextKey.replace('file_', ''));
        const matched = files.find((f) => f.id === idNum);
        if (matched) {
          fileId = matched.id;
          contextText = matched.extractedText.slice(0, 3500);
          contextFileName = matched.originalName;
        }
      }

      const res = await fetchWithAuth('/api/composer', {
        method: 'POST',
        body: JSON.stringify({
          prompt: payload.prompt,
          outputType: payload.outputType,
          fileId,
          contextText,
          contextFileName,
          attachedFile: payload.attachedFile,
          brandName: brand.brandName,
          layoutTemplate: brand.layoutTemplate,
          language: payload.language,
          allowGeneralKnowledge: Boolean(payload.allowGeneralKnowledge),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate from writing bar.');
      }

      const elapsedMs = Math.max(
        180,
        Math.round(performance.now() - startedAt)
      );
      setLastResponseMs(elapsedMs);

      if (data.uploadedFile) {
        setFiles((prev) => [data.uploadedFile, ...prev]);
        setSelectedFileId(data.uploadedFile.id);
      }

      const newGen: GenerationData = data.generation;
      setGenerations((prev) => [newGen, ...prev]);
      setActiveGeneration(newGen);

      const cleanSnippet = String(newGen.contentMarkdown || '')
        .replace(/[#*>_`~-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 260);

      const yellowPoints = extractYellowImportantPoints(
        newGen.structuredOutput,
        newGen.contentMarkdown
      );

      setInstantReply({
        title: newGen.title,
        snippet: cleanSnippet,
        detailedMarkdown: newGen.contentMarkdown,
        yellowPoints,
        outputType: payload.outputType,
        elapsedMs,
        isGeneralGeminiAnswer: Boolean(payload.allowGeneralKnowledge),
      });

      // If user selected 'mcq_alert' in the dropdown, also populate the Reminder MCQ & Alert list and open Reminder tab!
      const mcqAlertItems: any[] = newGen.structuredOutput?.items || [];
      if (payload.outputType === 'mcq_alert' && mcqAlertItems.length > 0) {
        const converted: UnifiedReminderItem[] = mcqAlertItems.map(
          (item: any, idx: number) => ({
            id: Date.now() + idx,
            importanceLevel:
              String(item.importanceLevel).toUpperCase().includes('CRIT')
                ? 'CRITICAL'
                : String(item.importanceLevel).toUpperCase().includes('MAND')
                ? 'MANDATORY'
                : 'HIGH',
            statutoryRuleEn: item.statutoryRule || contextFileName || 'AI MCQ',
            statutoryRuleBn: item.statutoryRule || contextFileName || 'AI MCQ',
            alertTitleEn: item.alertTitle || newGen.title,
            alertTitleBn: item.alertTitle || newGen.title,
            alertMessageEn: item.alertMessage || item.explanation,
            alertMessageBn: item.alertMessage || item.explanation,
            questionEn: item.question,
            questionBn: item.question,
            optionsEn:
              Array.isArray(item.options) && item.options.length >= 2
                ? item.options
                : ['Option A', 'Option B', 'Option C', 'Option D'],
            optionsBn:
              Array.isArray(item.options) && item.options.length >= 2
                ? item.options
                : ['অপশন ক', 'অপশন খ', 'অপশন গ', 'অপশন ঘ'],
            correctIndex:
              typeof item.correctIndex === 'number' ? item.correctIndex : 0,
            explanationEn: item.explanation || '',
            explanationBn: item.explanation || '',
            selectedOptionIndex: null,
            remainingSeconds: 60,
            totalSeconds: 60,
            isRunning: false,
            alertTriggered: false,
          })
        );
        setReminders((prev) => [...converted, ...prev]);
        setStudioTab('reminder');
        showToast(
          'success',
          language === 'en'
            ? `Generated ${converted.length} MCQs & Important Alerts — opened in Reminder tab!`
            : `${converted.length}টি নতুন MCQ ও জরুরি এলার্ট তৈরি হয়েছে! রিমাইন্ডার ট্যাবে দেখানো হচ্ছে।`
        );
        return;
      }

      // Also auto-add a new Tip from the generated output if takeaways exist
      const takeaways: string[] =
        newGen.structuredOutput?.keyTakeaways ||
        newGen.structuredOutput?.actionRecommendations ||
        [];
      if (takeaways.length > 0) {
        setTips((prev) => [
          {
            id: Date.now(),
            category: `AI Generated Tip · ${newGen.outputType.toUpperCase()}`,
            titleEn: newGen.title,
            titleBn: newGen.title,
            detailEn: takeaways[0],
            detailBn: takeaways[0],
            sourceDoc: contextFileName || 'Writing Bar Synthesis',
          },
          ...prev,
        ]);
      }

      setStudioTab('answer');
      showToast(
        'success',
        language === 'en'
          ? `Generated "${newGen.title}" — displaying in Answer & Content.`
          : `"${newGen.title}" তৈরি সম্পন্ন — উত্তর ও কন্টেন্ট ট্যাবে দেখানো হচ্ছে।`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Writing Bar synthesis failed.');
    } finally {
      setComposerGenerating(false);
    }
  };

  // Handle real file upload (PDF, DOCX, TXT, PNG, JPG)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMessage(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      if (firebaseUser) {
        const res = await fetchWithAuth('/api/files/upload', {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileSize: file.size,
            base64Data,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'File upload failed.');
        }

        const newFile: FileRecord = data.file;
        setFiles((prev) => [newFile, ...prev]);
        setSelectedFileId(newFile.id);
        showToast(
          'success',
          `Extracted & saved ${newFile.wordCount.toLocaleString()} words from "${newFile.originalName}".`
        );
      } else {
        const res = await fetch('/api/composer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Extract and format the key content, takeaways, and rules from "${file.name}".`,
            outputType: 'formatted_document',
            attachedFile: {
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              fileSize: file.size,
              base64Data,
            },
            brandName: brand.brandName,
            layoutTemplate: brand.layoutTemplate,
            language,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload extraction failed.');
        if (data.generation) {
          setActiveGeneration(data.generation);
          setStudioTab('answer');
          showToast(
            'success',
            `Extracted & formatted "${file.name}" into Answer view.`
          );
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error extracting text from file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle loading one of the uploaded Bengali PDF presets
  const handleLoadSamplePreset = async (
    preset: (typeof BENGALI_SAMPLE_DOCUMENTS)[0],
    key: 'gazette' | 'labour_act'
  ) => {
    setPreviewDocKey(key);
    setActiveGeneration(getPresetsForLanguage(language)[key]);

    if (!firebaseUser) {
      showToast(
        'success',
        language === 'en'
          ? `Loaded "${preset.name}" (${preset.pageCount} pages).`
          : `"${preset.name}" (${preset.pageCount} পৃষ্ঠা) লোড হয়েছে।`
      );
      return;
    }

    setUploading(true);
    try {
      const res = await fetchWithAuth('/api/files/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileName: preset.name,
          mimeType: preset.mimeType,
          fileSize: preset.fileSize,
          pageCount: preset.pageCount,
          preExtractedText: preset.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load preset.');

      const newFile: FileRecord = data.file;
      setFiles((prev) => [newFile, ...prev]);
      setSelectedFileId(newFile.id);
      showToast(
        'success',
        `Loaded "${newFile.originalName}" (${newFile.pageCount} pages) into workspace.`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load sample document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEditedOcr = async () => {
    if (!selectedFile) return;
    setSavingOcrText(true);
    try {
      const res = await fetchWithAuth(`/api/files/${selectedFile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ extractedText: editedOcrText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save OCR text.');

      setFiles((prev) =>
        prev.map((f) => (f.id === selectedFile.id ? data.file : f))
      );
      showToast('success', 'Updated sanitized text in PostgreSQL.');
    } catch (err: any) {
      showToast('error', err.message || 'Could not update extracted text.');
    } finally {
      setSavingOcrText(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      const res = await fetchWithAuth(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete file.');

      const remaining = files.filter((f) => f.id !== fileId);
      setFiles(remaining);
      setGenerations((prev) => prev.filter((g) => g.fileId !== fileId));
      if (selectedFileId === fileId) {
        setSelectedFileId(remaining[0]?.id || null);
      }
      showToast('success', 'Deleted file and associated outputs.');
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting file.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBrand((prev) => ({ ...prev, logoUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      showToast('error', 'Sign in to save custom branding to the database.');
      return;
    }
    setSavingBrand(true);
    try {
      const res = await fetchWithAuth('/api/brand-settings', {
        method: 'PUT',
        body: JSON.stringify(brand),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save brand kit.');
      setBrand(data.brandSetting);
      showToast('success', 'Saved UTechtips brand kit to Cloud SQL PostgreSQL.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save brand settings.');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleAddCustomTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipTitle.trim() || !newTipDetail.trim()) return;
    setTips((prev) => [
      {
        id: Date.now(),
        category: 'Custom UTechtips Note',
        titleEn: newTipTitle.trim(),
        titleBn: newTipTitle.trim(),
        detailEn: newTipDetail.trim(),
        detailBn: newTipDetail.trim(),
        sourceDoc: selectedFile?.originalName || 'Workspace Note',
      },
      ...prev,
    ]);
    setNewTipTitle('');
    setNewTipDetail('');
    showToast(
      'success',
      language === 'en'
        ? 'Added new Tip to your workspace.'
        : 'নতুন টিপস সংরক্ষণ করা হয়েছে।'
    );
  };

  const filteredGenerations = generations.filter((g) => {
    const matchesType =
      archiveTypeFilter === 'all' || g.outputType === archiveTypeFilter;
    const matchesSearch =
      !archiveSearch.trim() ||
      g.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      g.contentMarkdown.toLowerCase().includes(archiveSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const availableComposerSources = [
    ...files.map((f) => ({
      id: `file_${f.id}`,
      label: f.originalName,
    })),
    {
      id: 'gazette',
      label:
        language === 'en'
          ? 'Bangladesh Gazette 2026 (BPPCF Rules)'
          : 'বাংলাদেশ গেজেট ২০২৬ (BPPCF বিধিমালা)',
    },
    {
      id: 'labour_act',
      label:
        language === 'en'
          ? 'Bangladesh Labour Act, 2006 (239 Pages)'
          : 'বাংলাদেশ শ্রম আইন, ২০০৬ (২৩৯ পৃষ্ঠা)',
    },
  ];

  // Unified list of all PDFs for the Easy All-PDF Viewer
  const allPdfDocuments: PdfViewerDocumentItem[] = [
    {
      id: 'gazette',
      title: BENGALI_SAMPLE_DOCUMENTS[0].name,
      subtitle:
        language === 'en'
          ? 'S.R.O. No. 50-Law/2026 — BPPCF Rules 226A–226L (1.5% Profit & 80:20 Distribution)'
          : 'এস.আর.ও. নং ৫০-আইন/২০২৬ — বিধি ২২৬ক–২২৬ঠ (BPPCF ১.৫% মুনাফা ও ৮০:২০ বণ্টন)',
      pageCount: BENGALI_SAMPLE_DOCUMENTS[0].pageCount,
      wordCount: BENGALI_SAMPLE_DOCUMENTS[0].text.split(/\s+/).length,
      text: BENGALI_SAMPLE_DOCUMENTS[0].text,
    },
    {
      id: 'labour_act',
      title: BENGALI_SAMPLE_DOCUMENTS[1].name,
      subtitle:
        language === 'en'
          ? 'Bangladesh Labour Act, 2006 (Act XLII of 2006) — Consolidated Chapters 1–21 & Schedules 1–5'
          : 'বাংলাদেশ শ্রম আইন, ২০০৬ (২০০৬ সনের ৪২ নং আইন) — অধ্যায় ১–২১ ও তফসিল ১–৫',
      pageCount: BENGALI_SAMPLE_DOCUMENTS[1].pageCount,
      wordCount: BENGALI_SAMPLE_DOCUMENTS[1].text.split(/\s+/).length,
      text: BENGALI_SAMPLE_DOCUMENTS[1].text,
    },
    ...files.map((f) => ({
      id: `file_${f.id}`,
      title: f.originalName,
      subtitle: `${f.mimeType} · ${f.extractionMethod}`,
      pageCount: f.pageCount,
      wordCount: f.wordCount,
      text: f.extractedText,
      isUploadedFile: true,
      dbFileId: f.id,
    })),
  ];

  // Unified Action Tab Buttons definition so every button has the exact same clean style & height
  const STUDIO_ACTION_TABS = [
    {
      id: 'upload' as const,
      label:
        language === 'en'
          ? 'Upload & All PDFs'
          : 'সব PDF ও আপলোড (All PDFs)',
      icon: Upload,
      badge:
        language === 'en'
          ? `${allPdfDocuments.length} PDFs`
          : `${formatDigits(allPdfDocuments.length, 'bn')}টি PDF`,
    },
    {
      id: 'write' as const,
      label:
        language === 'en' ? 'Write What You Want' : 'যা চান লিখুন (Write)',
      icon: PenTool,
      badge: language === 'en' ? 'Prompt' : 'প্রম্পট',
    },
    {
      id: 'answer' as const,
      label:
        language === 'en' ? 'Answer & Content' : 'উত্তর ও কন্টেন্ট (Answer)',
      icon: MessageSquareText,
      badge: language === 'en' ? 'Yellow Mark' : 'হলুদ মার্ক',
    },
    {
      id: 'tips' as const,
      label: language === 'en' ? 'Tips' : 'টিপস (Tips)',
      icon: Lightbulb,
      badge: formatDigits(tips.length, language),
    },
    {
      id: 'reminder' as const,
      label:
        language === 'en'
          ? 'Reminder (MCQ & 1 Alert)'
          : 'রিমাইন্ডার (MCQ ও ১টি এলার্ট)',
      icon: Bell,
      badge: language === 'en' ? '1 Alert' : '১টি এলার্ট',
    },
  ];

  const currentPresets = getPresetsForLanguage(language);

  // Keep only ONE single active Important Alert (first item in reminders)
  const singleActiveAlert = reminders[0] || DEFAULT_UNIFIED_REMINDERS[0];

  // Calculate MCQ score
  const answeredCount = reminders.filter(
    (r) => r.selectedOptionIndex !== null
  ).length;
  const correctCount = reminders.filter(
    (r) => r.selectedOptionIndex === r.correctIndex
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          UTechtips Studio
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('studio');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'studio'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-emerald-600'
                : ''
            }`}
          >
            {language === 'en' ? 'Workspace' : 'ওয়ার্কস্পেস'}
          </a>
          <a
            href="#branding"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('branding');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'branding'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-emerald-600'
                : ''
            }`}
          >
            {language === 'en' ? 'Brand Kit' : 'ব্র্যান্ড কিট'}
          </a>
          <a
            href="#archive"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('archive');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'archive'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-emerald-600'
                : ''
            }`}
          >
            {language === 'en' ? 'Output Archive' : 'আর্কাইভ'}
          </a>
          <a
            href="#architecture"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('architecture');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'architecture'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-emerald-600'
                : ''
            }`}
          >
            {language === 'en' ? 'Architecture Spec' : 'আর্কিটেকচার'}
          </a>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {firebaseUser ? (
            <button
              onClick={logout}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out ({firebaseUser.email?.split('@')[0]})</span>
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* IN-APP IMPORTANT ALERT + MCQ POPUP BANNER (Fires when an Alert triggers or countdown reaches 00:00) */}
      {activePopupAlert && (
        <div className="max-w-[1360px] w-full mx-auto px-6 pt-4">
          <div className="bg-slate-900 text-white border-2 border-amber-400 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    {activePopupAlert.importanceLevel} IMPORTANCE ALERT ·{' '}
                    {language === 'en'
                      ? activePopupAlert.statutoryRuleEn
                      : activePopupAlert.statutoryRuleBn}
                  </div>
                  <h3
                    className="text-base md:text-lg font-bold text-white mt-0.5"
                    style={{
                      fontFamily:
                        "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                    }}
                  >
                    {language === 'en'
                      ? activePopupAlert.alertTitleEn
                      : activePopupAlert.alertTitleBn}
                  </h3>
                  <p
                    className="text-xs md:text-sm text-slate-200 mt-1 leading-relaxed"
                    style={{
                      fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                    }}
                  >
                    {language === 'en'
                      ? activePopupAlert.alertMessageEn
                      : activePopupAlert.alertMessageBn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopupAlert(null)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick MCQ Verification inside the Alert Popup */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-emerald-300">
                {language === 'en'
                  ? 'Quick MCQ Check for this Alert:'
                  : 'এই এলার্টের সাথে যুক্ত বহুনির্বাচনী প্রশ্ন (MCQ):'}
              </div>
              <div
                className="text-sm font-bold text-white"
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                }}
              >
                {language === 'en'
                  ? activePopupAlert.questionEn
                  : activePopupAlert.questionBn}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(language === 'en'
                  ? activePopupAlert.optionsEn
                  : activePopupAlert.optionsBn
                ).map((opt, oIdx) => {
                  const isSelected =
                    activePopupAlert.selectedOptionIndex === oIdx;
                  const isCorrect = activePopupAlert.correctIndex === oIdx;
                  const hasAnswered =
                    activePopupAlert.selectedOptionIndex !== null;

                  let btnClass =
                    'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500';
                  if (hasAnswered) {
                    if (isCorrect) {
                      btnClass =
                        'bg-emerald-950 border-emerald-500 text-emerald-200 font-semibold';
                    } else if (isSelected) {
                      btnClass = 'bg-red-950 border-red-500 text-red-200';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() =>
                        runUnifiedReminderMethod({
                          action: 'answer_mcq',
                          itemId: activePopupAlert.id,
                          optionIndex: oIdx,
                        })
                      }
                      style={{
                        fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                      }}
                      className={`p-2.5 rounded-lg border text-left text-xs flex items-center justify-between gap-2 transition-colors ${btnClass}`}
                    >
                      <span>
                        <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                      </span>
                      {hasAnswered && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {hasAnswered && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error-only Banner (Reduced alerts: only show if there is an actual error and no popup alert is open) */}
      {!activePopupAlert && (statusMessage?.type === 'error' || authError) && (
        <div className="max-w-[1360px] w-full mx-auto px-6 pt-4">
          <div className="px-4 py-3 rounded-lg border text-xs font-medium flex items-center justify-between bg-red-50 border-red-200 text-red-800">
            <span>{statusMessage?.text || authError}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs underline ml-4 whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-6 space-y-6">
        {/* VIEW 4: ARCHITECTURE BLUEPRINT */}
        {activeNav === 'architecture' && <ArchitectureBlueprintView />}

        {/* MAIN WORKSPACE WITH UNIFORM EASY-TO-FIND ACTION TAB BUTTONS + ENGLISH - BANGLA BUTTON */}
        {activeNav === 'studio' && (
          <div className="space-y-6">
            {/* Compact Brand Identity + Uniform 6-Button Navigation Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <img
                    src={brand.logoUrl || UTECHTIPS_LOGO_DATA_URI}
                    alt="UTechtips Logo"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-contain shrink-0 bg-slate-900 p-0.5"
                  />
                  <div>
                    <h1
                      className="text-lg md:text-xl font-bold tracking-tight text-slate-900 font-display"
                      style={{
                        fontFamily:
                          "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                      }}
                    >
                      {language === 'en'
                        ? 'UTechtips Document Intelligence & Writing Studio'
                        : 'UTechtips ডকুমেন্ট ইন্টেলিজেন্স ও রাইটিং স্টুডিও'}
                    </h1>
                    <p
                      className="text-xs text-slate-500"
                      style={{
                        fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                      }}
                    >
                      {language === 'en'
                        ? 'Select a button below: Upload Docs, Write What You Want, Answer & Content, Tips, Reminder (MCQ & Alert), or English - বাংলা'
                        : 'নিচের বাটন থেকে নির্বাচন করুন: ফাইল আপলোড, যা চান লিখুন, উত্তর ও কন্টেন্ট, টিপস, রিমাইন্ডার (MCQ ও এলার্ট) অথবা English - বাংলা'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* ১০ Number Font Selector */}
                  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-400 rounded-lg px-2.5 py-1.5">
                    <span
                      className="text-xs font-extrabold text-slate-950 font-number"
                      style={{ fontFamily: numberFont }}
                    >
                      ১০
                    </span>
                    <select
                      value={numberFont}
                      onChange={(e) => handleChangeNumberFont(e.target.value)}
                      style={{ fontFamily: numberFont }}
                      className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                      title="Change Number Font (১০ / 10)"
                    >
                      {NUMBER_FONT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {language === 'en' ? opt.labelEn : opt.labelBn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setActiveNav('branding')}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>
                      {language === 'en'
                        ? 'Customize Brand Kit'
                        : 'ব্র্যান্ড কিট সাজান'}
                    </span>
                  </button>
                </div>
              </div>

              {/* UNIFORM 6-BUTTON ACTION BAR:
                  1. Upload Docs | 2. Write What You Want | 3. Answer & Content | 4. Tips | 5. Reminder (MCQ & Alert) | 6. English - বাংলা */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {STUDIO_ACTION_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = studioTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudioTab(tab.id)}
                      style={{
                        fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                      }}
                      className={`flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50/80 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className="text-xs font-bold whitespace-nowrap truncate">
                          {tab.label}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0 ${
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}

                {/* 6th UNIFORM BUTTON: English - বাংলা */}
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  disabled={translatingAnswer}
                  style={{
                    fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                  }}
                  className={`flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border text-left transition-all ${
                    language === 'en'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs hover:bg-emerald-800'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {translatingAnswer ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin text-white" />
                    ) : (
                      <Languages className="w-4 h-4 shrink-0 text-white" />
                    )}
                    <span className="text-xs font-bold whitespace-nowrap truncate">
                      English - বাংলা
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-emerald-100 whitespace-nowrap shrink-0">
                    {language === 'en' ? 'EN → বাং' : 'বাং → EN'}
                  </span>
                </button>
              </div>

              {/* Short Black 1-Second Chat Box / Prompt Box (Always Ready) */}
              <WritingPromptBar
                onSubmitPrompt={handleComposerSubmit}
                isGenerating={composerGenerating}
                availableSources={availableComposerSources}
                defaultContextKey={
                  selectedFileId ? `file_${selectedFileId}` : previewDocKey
                }
                activeDocumentText={
                  selectedFile
                    ? selectedFile.extractedText
                    : previewDocKey === 'gazette'
                    ? BENGALI_SAMPLE_DOCUMENTS[0].text
                    : BENGALI_SAMPLE_DOCUMENTS[1].text
                }
                language={language}
                onToggleLanguage={handleToggleLanguage}
                lastResponseMs={lastResponseMs}
                instantReply={instantReply}
                onClearInstantReply={() => setInstantReply(null)}
                onQuickSwitchTab={(t) => setStudioTab(t)}
              />
            </div>

            {/* =========================================================
                TAB 1: ALL PDF SEEING OPTION + UPLOAD DOCS (EASY SINGLE-DROPDOWN METHOD)
               ========================================================= */}
            {studioTab === 'upload' && (
              <div className="space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <AllPdfEasyViewer
                  documents={allPdfDocuments}
                  selectedDocId={
                    selectedFileId ? `file_${selectedFileId}` : previewDocKey
                  }
                  onSelectDocId={(id) => {
                    if (id === 'gazette') {
                      handleLoadSamplePreset(
                        BENGALI_SAMPLE_DOCUMENTS[0],
                        'gazette'
                      );
                    } else if (id === 'labour_act') {
                      handleLoadSamplePreset(
                        BENGALI_SAMPLE_DOCUMENTS[1],
                        'labour_act'
                      );
                    } else if (id.startsWith('file_')) {
                      setSelectedFileId(Number(id.replace('file_', '')));
                    }
                  }}
                  onUploadClick={() => fileInputRef.current?.click()}
                  uploading={uploading}
                  onGenerateDetailedYellowAnswer={(doc) => {
                    if (doc.id === 'gazette') {
                      setPreviewDocKey('gazette');
                      setSelectedFileId(null);
                      setActiveGeneration(currentPresets.gazette);
                      setStudioTab('answer');
                    } else if (doc.id === 'labour_act') {
                      setPreviewDocKey('labour_act');
                      setSelectedFileId(null);
                      setActiveGeneration(currentPresets.labour_act);
                      setStudioTab('answer');
                    } else {
                      handleComposerSubmit({
                        prompt:
                          language === 'en'
                            ? `Provide a detailed answer and executive breakdown of "${doc.title}" with important points highlighted in yellow mark.`
                            : `"${doc.title}" এর বিস্তারিত উত্তর ও গুরুত্বপূর্ণ পয়েন্টসমূহ হলুদ মার্কসহ লিখুন।`,
                        outputType: 'formatted_document',
                        contextKey: doc.id,
                        attachedFile: null,
                        language,
                      });
                    }
                  }}
                  onDeleteUploadedFile={handleDeleteFile}
                  language={language}
                />
              </div>
            )}

            {/* =========================================================
                TAB 2: WRITE WHAT YOU WANT (3-Card Live Workspace Snapshot)
               ========================================================= */}
            {studioTab === 'write' && (
              <div className="space-y-6">
                {/* Unified 3-Card Snapshot below the Short Black Prompt Box: Answer Preview | Top Tips | Reminder MCQ & Alert */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card 1: Current Answer Snapshot */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-emerald-700">
                          {language === 'en'
                            ? 'Answer & Content'
                            : 'উত্তর ও কন্টেন্ট'}
                        </span>
                        <span>
                          {language === 'en' ? 'English Mode' : 'বাংলা মোড'}
                        </span>
                      </div>
                      <h3
                        className="text-base font-bold text-slate-900 line-clamp-2"
                        style={{
                          fontFamily: `'${brand.headingFont}', 'Hind Siliguri', sans-serif`,
                        }}
                      >
                        {activeGeneration?.title ||
                          currentPresets.gazette.title}
                      </h3>
                      <p
                        className="text-xs text-slate-700 line-clamp-4 leading-relaxed"
                        style={{
                          fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                        }}
                      >
                        {renderTextWithYellowHighlights(
                          activeGeneration?.contentMarkdown ||
                            currentPresets.gazette.contentMarkdown,
                          true
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudioTab('answer')}
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-900 bg-yellow-200 hover:bg-yellow-300 border border-yellow-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en'
                          ? 'Open Detailed Answer (Yellow Mark)'
                          : 'হলুদ মার্কসহ বিস্তারিত উত্তর দেখুন'}
                      </span>
                    </button>
                  </div>

                  {/* Card 2: Smart Tips Snapshot */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-amber-700">
                          {language === 'en'
                            ? 'UTechtips Key Tips'
                            : 'গুরুত্বপূর্ণ টিপস (Tips)'}
                        </span>
                        <span>
                          {tips.length}{' '}
                          {language === 'en' ? 'Saved' : 'টি টিপস'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tips.slice(0, 2).map((tip) => (
                          <div
                            key={tip.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            style={{
                              fontFamily:
                                "'DM Sans', 'Hind Siliguri', sans-serif",
                            }}
                          >
                            <div className="font-bold text-slate-900 truncate">
                              {language === 'en' ? tip.titleEn : tip.titleBn}
                            </div>
                            <p className="text-slate-600 line-clamp-2 mt-0.5">
                              {renderTextWithYellowHighlights(
                                language === 'en' ? tip.detailEn : tip.detailBn,
                                true
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudioTab('tips')}
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en'
                          ? `Open All Tips (${tips.length})`
                          : `সকল টিপস দেখুন (${tips.length})`}
                      </span>
                    </button>
                  </div>

                  {/* Card 3: Reminder (MCQ & ONLY 1 Single Alert) Snapshot */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-blue-700">
                          {language === 'en'
                            ? 'Reminder: MCQ & 1 Active Alert'
                            : 'রিমাইন্ডার: MCQ ও ১টি জরুরি এলার্ট'}
                        </span>
                        <span className="tabular-nums font-semibold text-slate-700">
                          1 Alert · {correctCount}/{reminders.length} MCQ
                        </span>
                      </div>

                      {/* ONLY ONE ALERT SHOWN HERE */}
                      <div
                        className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5 text-xs"
                        style={{
                          fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 rounded">
                            ONLY 1 ACTIVE ALERT ({singleActiveAlert.importanceLevel})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              runUnifiedReminderMethod({
                                action: 'trigger_alert',
                                itemId: singleActiveAlert.id,
                              })
                            }
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 rounded shrink-0"
                          >
                            {language === 'en' ? 'Show Alert' : 'এলার্ট দেখুন'}
                          </button>
                        </div>
                        <div className="font-bold text-slate-900">
                          {language === 'en'
                            ? singleActiveAlert.alertTitleEn
                            : singleActiveAlert.alertTitleBn}
                        </div>
                        <p className="text-slate-700 line-clamp-2">
                          {renderTextWithYellowHighlights(
                            language === 'en'
                              ? singleActiveAlert.alertMessageEn
                              : singleActiveAlert.alertMessageBn,
                            true
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudioTab('reminder')}
                      className="w-full py-2 px-3 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en'
                          ? 'Open Reminder (MCQ & Important Alert)'
                          : 'রিমাইন্ডার খুলুন (MCQ ও জরুরি এলার্ট)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 3: ANSWER & CONTENT (Full Branded Document Canvas + Direct Editor)
               ========================================================= */}
            {studioTab === 'answer' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {language === 'en'
                        ? 'Switch Preset Answer or Language:'
                        : 'উত্তরপত্র বা ভাষা পরিবর্তন করুন:'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDocKey('gazette');
                        setActiveGeneration(currentPresets.gazette);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activeGeneration?.id === 101
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'en'
                        ? 'PDF 1: Bangladesh Gazette 2026 (BPPCF)'
                        : 'পিডিএফ ১: বাংলাদেশ গেজেট ২০২৬ (BPPCF)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDocKey('labour_act');
                        setActiveGeneration(currentPresets.labour_act);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activeGeneration?.id === 102
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'en'
                        ? 'PDF 2: Bangladesh Labour Act, 2006'
                        : 'পিডিএফ ২: বাংলাদেশ শ্রম আইন, ২০০৬'}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleLanguage}
                      disabled={translatingAnswer}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {translatingAnswer ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Languages className="w-3.5 h-3.5" />
                      )}
                      <span>
                        English - বাংলা (
                        {language === 'en'
                          ? 'Switch to বাংলা'
                          : 'Switch to English'}
                        )
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioTab('write')}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>
                        {language === 'en'
                          ? 'Write New Prompt'
                          : 'নতুন প্রম্পট লিখুন'}
                      </span>
                    </button>
                  </div>
                </div>

                <BrandedDocumentCanvas
                  generation={activeGeneration || currentPresets.gazette}
                  brand={brand}
                  sourceFileName={
                    selectedFile?.originalName ||
                    (previewDocKey === 'gazette'
                      ? BENGALI_SAMPLE_DOCUMENTS[0].name
                      : BENGALI_SAMPLE_DOCUMENTS[1].name)
                  }
                  onUpdateGeneration={(updated) => setActiveGeneration(updated)}
                />
              </div>
            )}

            {/* =========================================================
                TAB 4: TIPS (Smart Document & Legal Tips + Add Custom Tip)
               ========================================================= */}
            {studioTab === 'tips' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleAddCustomTip}
                  className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">
                      {language === 'en'
                        ? 'Add New UTechtips Note / Tip'
                        : 'নতুন টিপস / নোট যুক্ত করুন'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'en'
                        ? 'Save key legal rules, study takeaways, or formatting tips'
                        : 'গুরুত্বপূর্ণ আইনি নিয়ম, নোট বা টিপস সংরক্ষণ করুন'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Tip Title' : 'টিপস শিরোনাম'}
                    </label>
                    <input
                      type="text"
                      value={newTipTitle}
                      onChange={(e) => setNewTipTitle(e.target.value)}
                      placeholder={
                        language === 'en'
                          ? 'e.g., Rule 226Chha Board Quorum Rule'
                          : 'যেমন: বিধি ২২৬ছ বোর্ড সভার কোরাম নিয়ম'
                      }
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en'
                        ? 'Tip Content / Explanation'
                        : 'বিস্তারিত বিবরণ'}
                    </label>
                    <textarea
                      value={newTipDetail}
                      onChange={(e) => setNewTipDetail(e.target.value)}
                      rows={4}
                      placeholder={
                        language === 'en'
                          ? 'Write the tip or legal takeaway in English or বাংলা...'
                          : 'বাংলা বা English-এ আপনার টিপস লিখুন...'
                      }
                      required
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {language === 'en' ? 'Save Tip' : 'টিপস সংরক্ষণ করুন'}
                    </span>
                  </button>
                </form>

                <div className="lg:col-span-8 space-y-3">
                  {tips.map((tip, idx) => (
                    <div
                      key={tip.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-emerald-700">
                          Tip 0{idx + 1} · {tip.category}
                        </span>
                        <span className="truncate max-w-[220px]">
                          {tip.sourceDoc}
                        </span>
                      </div>
                      <h3
                        className="text-base font-bold text-slate-900"
                        style={{
                          fontFamily:
                            "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                        }}
                      >
                        {language === 'en' ? tip.titleEn : tip.titleBn}
                      </h3>
                      <p
                        className="text-sm text-slate-700 leading-relaxed"
                        style={{
                          fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif",
                        }}
                      >
                        {language === 'en' ? tip.detailEn : tip.detailBn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 5: UNIFIED REMINDER (MCQ & IMPORTANT ALERT VIA SINGLE DROPDOWN & ONE METHOD)
               ========================================================= */}
            {studioTab === 'reminder' && (
              <div className="space-y-6">
                {/* Top Control Bar with Single Type Dropdown & AI Auto-Generator */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2
                      className="text-base md:text-lg font-bold text-slate-900 font-display"
                      style={{
                        fontFamily:
                          "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                      }}
                    >
                      {language === 'en'
                        ? 'Reminder Studio: MCQ Practice & High-Importance Alerts'
                        : 'রিমাইন্ডার স্টুডিও: বহুনির্বাচনী প্রশ্ন (MCQ) ও জরুরি সতর্কবার্তা (Alert)'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {language === 'en'
                        ? `Change your Reminder Type by Dropdown below · Score: ${correctCount}/${answeredCount} Correct (${reminders.length} Total)`
                        : `নিচের ড্রপডাউন থেকে রিমাইন্ডার টাইপ পরিবর্তন করুন · স্কোর: ${correctCount}/${answeredCount} সঠিক (মোট ${reminders.length}টি)`}
                    </p>
                  </div>

                  {/* SINGLE DROPDOWN TO CHANGE REMINDER TYPE + ONE-METHOD AI GENERATOR */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        {language === 'en' ? 'Reminder Type:' : 'রিমাইন্ডার টাইপ:'}
                      </label>
                      <select
                        value={reminderModeDropdown}
                        onChange={(e) =>
                          runUnifiedReminderMethod({
                            action: 'change_dropdown',
                            dropdownType: e.target.value as ReminderViewMode,
                          })
                        }
                        className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:border-emerald-600"
                      >
                        <option value="both">
                          {language === 'en'
                            ? '1. Both: MCQ + Important Alert (Combined)'
                            : '১. একসাথে: MCQ + জরুরি এলার্ট (Combined)'}
                        </option>
                        <option value="mcq">
                          {language === 'en'
                            ? '2. Only MCQ Quiz Mode (4 Options)'
                            : '২. শুধু বহুনির্বাচনী প্রশ্ন (MCQ Quiz Mode)'}
                        </option>
                        <option value="important_alert">
                          {language === 'en'
                            ? '3. Only Important Alert & Timer Mode'
                            : '৩. শুধু জরুরি ইম্পর্ট্যান্স এলার্ট ও টাইমার (Alert Mode)'}
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        runUnifiedReminderMethod({ action: 'ai_generate' })
                      }
                      disabled={generatingReminderAi}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {generatingReminderAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {language === 'en'
                              ? 'Generating from PDF...'
                              : 'তৈরি হচ্ছে...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {language === 'en'
                              ? 'AI Generate 5 MCQs & Alerts'
                              : 'AI দিয়ে ৫টি নতুন MCQ ও এলার্ট তৈরি করুন'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* RECHARTS PROGRESS DASHBOARD CARD: Answered vs. Unanswered Ratio + Correct Answer % Over Time */}
                <ReminderProgressDashboard
                  totalMcqs={reminders.length}
                  answeredCount={answeredCount}
                  correctCount={correctCount}
                  history={accuracyHistory}
                  language={language}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Single Unified Form using the exact same Dropdown & Method */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runUnifiedReminderMethod({ action: 'add_custom' });
                    }}
                    className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        {language === 'en'
                          ? 'Add Custom MCQ / Important Alert'
                          : 'নতুন MCQ অথবা জরুরি এলার্ট যুক্ত করুন'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'en'
                          ? 'Uses one unified method based on your selected dropdown type'
                          : 'একই মেথড ও ড্রপডাউন ব্যবহার করে MCQ বা এলার্ট তৈরি করুন'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'en'
                          ? 'Select Mode (Dropdown)'
                          : 'টাইপ নির্বাচন করুন (Dropdown)'}
                      </label>
                      <select
                        value={reminderModeDropdown}
                        onChange={(e) =>
                          runUnifiedReminderMethod({
                            action: 'change_dropdown',
                            dropdownType: e.target.value as ReminderViewMode,
                          })
                        }
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      >
                        <option value="both">
                          {language === 'en'
                            ? 'MCQ + Important Alert (Both)'
                            : 'MCQ + জরুরি এলার্ট (উভয়ই)'}
                        </option>
                        <option value="mcq">
                          {language === 'en'
                            ? 'MCQ Question Only'
                            : 'বহুনির্বাচনী প্রশ্ন (MCQ)'}
                        </option>
                        <option value="important_alert">
                          {language === 'en'
                            ? 'Important Alert Only'
                            : 'জরুরি সতর্কবার্তা (Important Alert)'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'en'
                          ? 'Importance Level'
                          : 'গুরুত্বের মাত্রা (Importance)'}
                      </label>
                      <select
                        value={formImportanceLevel}
                        onChange={(e) =>
                          setFormImportanceLevel(
                            e.target.value as 'CRITICAL' | 'HIGH' | 'MANDATORY'
                          )
                        }
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="CRITICAL">
                          CRITICAL (অতীব জরুরি সতর্কবার্তা)
                        </option>
                        <option value="HIGH">HIGH (গুরুত্বপূর্ণ নিয়ম)</option>
                        <option value="MANDATORY">
                          MANDATORY (বাধ্যতামূলক আইনি বিধান)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {reminderModeDropdown === 'important_alert'
                          ? language === 'en'
                            ? 'Important Alert Title'
                            : 'জরুরি এলার্ট শিরোনাম'
                          : language === 'en'
                          ? 'MCQ Question / Alert Title'
                          : 'MCQ প্রশ্ন / এলার্ট শিরোনাম'}
                      </label>
                      <input
                        type="text"
                        value={formInputTitleOrQuestion}
                        onChange={(e) =>
                          setFormInputTitleOrQuestion(e.target.value)
                        }
                        placeholder={
                          language === 'en'
                            ? 'e.g., What is the quorum for BPPCF Board meetings?'
                            : 'যেমন: BPPCF বোর্ড সভার কোরাম হওয়ার শর্ত কী?'
                        }
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {reminderModeDropdown === 'important_alert'
                          ? language === 'en'
                            ? 'Alert Message & Statutory Rule'
                            : 'এলার্টের বিস্তারিত বিবরণ ও ধারা'
                          : language === 'en'
                          ? '4 Options (1 per line — Put Correct Answer on Line 1)'
                          : '৪টি অপশন (প্রতি লাইনে ১টি — প্রথম লাইনে সঠিক উত্তর লিখুন)'}
                      </label>
                      <textarea
                        value={formInputDetailOrOptions}
                        onChange={(e) =>
                          setFormInputDetailOrOptions(e.target.value)
                        }
                        rows={4}
                        placeholder={
                          reminderModeDropdown === 'important_alert'
                            ? language === 'en'
                              ? 'Write the important compliance alert message...'
                              : 'জরুরি সতর্কবার্তার বিস্তারিত লিখুন...'
                            : language === 'en'
                            ? 'Line 1 (Correct): At least 50% members including Chairman\nLine 2: 2 members\nLine 3: All members\nLine 4: None'
                            : '১ম লাইন (সঠিক উত্তর): চেয়ারম্যানসহ কমপক্ষে ৫০% সদস্য\n২য় লাইন: ২ জন সদস্য\n৩য় লাইন: সকল সদস্য\n৪র্থ লাইন: কোনোটিই নয়'
                        }
                        className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'en'
                          ? 'Alert Countdown Seconds'
                          : 'এলার্ট কাউন্টডাউন সময় (সেকেন্ড)'}
                      </label>
                      <select
                        value={formTimerSeconds}
                        onChange={(e) =>
                          setFormTimerSeconds(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value={15}>15 Seconds (Quick Alert Test)</option>
                        <option value={30}>30 Seconds</option>
                        <option value={60}>60 Seconds (1 Minute)</option>
                        <option value={300}>300 Seconds (5 Minutes)</option>
                        <option value={900}>900 Seconds (15 Minutes)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {language === 'en'
                          ? 'Save & Activate Reminder'
                          : 'রিমাইন্ডার সংরক্ষণ ও চালু করুন'}
                      </span>
                    </button>
                  </form>

                  {/* Right: ONLY ONE SINGLE IMPORTANT ALERT + Clean MCQ Quiz List */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* =======================================================
                        SINGLE IMPORTANT ALERT CARD (All extra alerts reduced to 1)
                       ======================================================= */}
                    {(reminderModeDropdown === 'important_alert' ||
                      reminderModeDropdown === 'both') && (
                      <div className="bg-amber-50/90 border-2 border-amber-400 rounded-xl p-5 space-y-3 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-200">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-red-600 text-white">
                              ONLY 1 ACTIVE ALERT ({singleActiveAlert.importanceLevel})
                            </span>
                            <span
                              className="text-xs font-bold text-amber-950"
                              style={{
                                fontFamily:
                                  "'DM Sans', 'Hind Siliguri', sans-serif",
                              }}
                            >
                              {language === 'en'
                                ? singleActiveAlert.statutoryRuleEn
                                : singleActiveAlert.statutoryRuleBn}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold tabular-nums">
                              {formatCountdown(singleActiveAlert.remainingSeconds)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                runUnifiedReminderMethod({
                                  action: 'toggle_timer',
                                  itemId: singleActiveAlert.id,
                                })
                              }
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                                singleActiveAlert.isRunning
                                  ? 'bg-amber-200 text-amber-950'
                                  : 'bg-white text-slate-800 border border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              <Play className="w-3 h-3" />
                              <span>
                                {singleActiveAlert.isRunning
                                  ? language === 'en'
                                    ? 'Pause'
                                    : 'থামান'
                                  : language === 'en'
                                  ? 'Start Timer'
                                  : 'টাইমার'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runUnifiedReminderMethod({
                                  action: 'trigger_alert',
                                  itemId: singleActiveAlert.id,
                                })
                              }
                              className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Bell className="w-3 h-3" />
                              <span>
                                {language === 'en'
                                  ? 'Trigger Alert'
                                  : 'এলার্ট দেখুন'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h3
                              className="text-base font-bold text-slate-950"
                              style={{
                                fontFamily:
                                  "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                              }}
                            >
                              {language === 'en'
                                ? singleActiveAlert.alertTitleEn
                                : singleActiveAlert.alertTitleBn}
                            </h3>
                            <p
                              className="text-xs md:text-sm text-slate-900 leading-relaxed"
                              style={{
                                fontFamily:
                                  "'DM Sans', 'Hind Siliguri', sans-serif",
                              }}
                            >
                              {renderTextWithYellowHighlights(
                                language === 'en'
                                  ? singleActiveAlert.alertMessageEn
                                  : singleActiveAlert.alertMessageBn,
                                true
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        CLEAN MCQ QUIZ CARDS (No duplicate alerts on each card)
                       ======================================================= */}
                    {(reminderModeDropdown === 'mcq' ||
                      reminderModeDropdown === 'both') &&
                      reminders.map((rem, idx) => {
                        const options =
                          language === 'en' ? rem.optionsEn : rem.optionsBn;
                        const hasAnswered = rem.selectedOptionIndex !== null;

                        return (
                          <div
                            key={rem.id}
                            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <span
                                className="text-xs font-semibold text-slate-500"
                                style={{
                                  fontFamily:
                                    "'DM Sans', 'Hind Siliguri', sans-serif",
                                }}
                              >
                                {language === 'en'
                                  ? rem.statutoryRuleEn
                                  : rem.statutoryRuleBn}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  runUnifiedReminderMethod({
                                    action: 'reset_item',
                                    itemId: rem.id,
                                  })
                                }
                                title="Reset MCQ"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded flex items-center gap-1 text-[11px]"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>
                                  {language === 'en' ? 'Reset' : 'রিসেট'}
                                </span>
                              </button>
                            </div>

                            <h3
                              className="text-sm md:text-base font-bold text-slate-900"
                              style={{
                                fontFamily:
                                  "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                              }}
                            >
                              <span className="text-emerald-700 mr-1.5">
                                MCQ Q{idx + 1}:
                              </span>
                              {language === 'en'
                                ? rem.questionEn
                                : rem.questionBn}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {options.map((optionText, oIdx) => {
                                const isSelected =
                                  rem.selectedOptionIndex === oIdx;
                                const isCorrect = rem.correctIndex === oIdx;

                                let optionStyle =
                                  'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300';
                                if (hasAnswered) {
                                  if (isCorrect) {
                                    optionStyle =
                                      'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold';
                                  } else if (isSelected && !isCorrect) {
                                    optionStyle =
                                      'bg-red-50 border-red-400 text-red-900';
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() =>
                                      runUnifiedReminderMethod({
                                        action: 'answer_mcq',
                                        itemId: rem.id,
                                        optionIndex: oIdx,
                                      })
                                    }
                                    style={{
                                      fontFamily:
                                        "'DM Sans', 'Hind Siliguri', sans-serif",
                                    }}
                                    className={`p-3 rounded-xl border text-left text-xs md:text-sm transition-all flex items-center justify-between gap-2 ${optionStyle}`}
                                  >
                                    <span>
                                      <strong className="mr-1.5">
                                        {String.fromCharCode(65 + oIdx)}.
                                      </strong>
                                      {optionText}
                                    </span>
                                    {hasAnswered && isCorrect && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                    {hasAnswered &&
                                      isSelected &&
                                      !isCorrect && (
                                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                      )}
                                  </button>
                                );
                              })}
                            </div>

                            {hasAnswered && (
                              <div
                                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                                  rem.selectedOptionIndex === rem.correctIndex
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-red-50/70 border-red-200 text-red-900'
                                }`}
                                style={{
                                  fontFamily:
                                    "'DM Sans', 'Hind Siliguri', sans-serif",
                                }}
                              >
                                <div className="font-bold mb-0.5">
                                  {rem.selectedOptionIndex === rem.correctIndex
                                    ? language === 'en'
                                      ? 'Correct Answer!'
                                      : 'সঠিক উত্তর!'
                                    : language === 'en'
                                    ? `Incorrect — Correct Option is ${String.fromCharCode(
                                        65 + rem.correctIndex
                                      )}`
                                    : `ভুল উত্তর — সঠিক অপশন হলো ${String.fromCharCode(
                                        65 + rem.correctIndex
                                      )}`}
                                </div>
                                <div>
                                  {renderTextWithYellowHighlights(
                                    language === 'en'
                                      ? rem.explanationEn
                                      : rem.explanationBn,
                                    true
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CUSTOM BRANDING STUDIO */}
        {activeNav === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={handleSaveBrandSettings}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-lg font-bold text-slate-900 font-display">
                  Custom Brand Kit & Layout Templates
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your UTechtips logo, brand colors, Google Fonts, and
                  document layout template
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand / Organization Name
                </label>
                <input
                  type="text"
                  value={brand.brandName}
                  onChange={(e) =>
                    setBrand({ ...brand, brandName: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Brand Logo (Uploaded UTechtips Emblem Active)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt="Brand logo preview"
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 object-contain rounded-full border border-slate-200 bg-slate-900 p-0.5"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: brand.primaryColor }}
                    >
                      {brand.brandName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Upload Custom Image
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBrand({
                        ...brand,
                        brandName: 'UTechtips',
                        logoUrl: UTECHTIPS_LOGO_DATA_URI,
                        primaryColor: '#181C24',
                        accentColor: '#00C838',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Reset UTechtips Logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.primaryColor}
                      onChange={(e) =>
                        setBrand({ ...brand, primaryColor: e.target.value })
                      }
                      className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brand.primaryColor}
                      onChange={(e) =>
                        setBrand({ ...brand, primaryColor: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accent Highlight Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brand.accentColor}
                      onChange={(e) =>
                        setBrand({ ...brand, accentColor: e.target.value })
                      }
                      className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brand.accentColor}
                      onChange={(e) =>
                        setBrand({ ...brand, accentColor: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heading Font Family
                  </label>
                  <select
                    value={brand.headingFont}
                    onChange={(e) =>
                      setBrand({ ...brand, headingFont: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {HEADING_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Body Prose Font Family
                  </label>
                  <select
                    value={brand.bodyFont}
                    onChange={(e) =>
                      setBrand({ ...brand, bodyFont: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {BODY_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Document Layout Template
                </label>
                <div className="space-y-2">
                  {LAYOUT_TEMPLATES.map((tpl) => {
                    const active = brand.layoutTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          setBrand({ ...brand, layoutTemplate: tpl.id })
                        }
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          active
                            ? 'border-emerald-600 bg-emerald-50/40'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {tpl.label}
                          </span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingBrand}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Palette className="w-4 h-4" />
                <span>
                  {savingBrand
                    ? 'Saving Brand Kit to PostgreSQL...'
                    : 'Save Brand Settings'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <BrandedDocumentCanvas
                generation={activeGeneration || currentPresets.gazette}
                brand={brand}
                sourceFileName="Live Brand Template Preview"
                onUpdateGeneration={(updated) => setActiveGeneration(updated)}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: OUTPUT ARCHIVE & DATABASE HISTORY */}
        {activeNav === 'archive' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-display">
                  Generated Output Archive
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Showing {filteredGenerations.length} of {generations.length}{' '}
                  outputs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Search title or content..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Single Dropdown Filter for Output Archive Type */}
                <select
                  value={archiveTypeFilter}
                  onChange={(e) => setArchiveTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">All Output Types</option>
                  <option value="formatted_document">Formatted Documents</option>
                  <option value="mcq_alert">Reminder MCQs & Alerts</option>
                  <option value="summary">Summaries</option>
                  <option value="qa">Q&A Banks</option>
                  <option value="paragraphs">Paragraphs</option>
                  <option value="image_prompts">Image Prompts</option>
                </select>
              </div>
            </div>

            {filteredGenerations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                <Archive className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">
                  No Matching Generations Found
                </h3>
                <p className="text-xs text-slate-500">
                  Use the &ldquo;Write What You Want&rdquo; tab to generate new
                  answers, MCQs, and documents.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Output Type</th>
                      <th className="py-3 px-4">Source File</th>
                      <th className="py-3 px-4 text-right">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {filteredGenerations.map((gen) => {
                      const sourceFile = files.find(
                        (f) => f.id === gen.fileId
                      );
                      return (
                        <tr key={gen.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {gen.title}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {gen.outputType.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 truncate max-w-[220px]">
                            {sourceFile?.originalName || `File #${gen.fileId}`}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500 tabular-nums">
                            {new Date(gen.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setActiveGeneration(gen);
                                setActiveNav('studio');
                                setStudioTab('answer');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Open Answer</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudioWorkspace />
    </AuthProvider>
  );
}
