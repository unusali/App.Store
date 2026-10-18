import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CheckCircle2, HelpCircle, TrendingUp, Award } from 'lucide-react';

export interface AccuracyHistoryPoint {
  step: string;
  accuracyPct: number;
  answeredPct: number;
  correctCount: number;
  answeredCount: number;
}

interface ReminderProgressDashboardProps {
  totalMcqs: number;
  answeredCount: number;
  correctCount: number;
  history: AccuracyHistoryPoint[];
  language: 'en' | 'bn';
}

export function ReminderProgressDashboard({
  totalMcqs,
  answeredCount,
  correctCount,
  history,
  language,
}: ReminderProgressDashboardProps) {
  const unansweredCount = Math.max(0, totalMcqs - answeredCount);
  const incorrectCount = Math.max(0, answeredCount - correctCount);

  const answeredRatioPct =
    totalMcqs > 0 ? Math.round((answeredCount / totalMcqs) * 100) : 0;
  const accuracyPct =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  // Pie chart data for Answered (Correct / Incorrect) vs. Unanswered MCQs
  const pieData = [
    {
      name: language === 'en' ? 'Correct Answered' : 'সঠিক উত্তর',
      value: correctCount,
      color: '#059669', // emerald-600
    },
    {
      name: language === 'en' ? 'Incorrect Answered' : 'ভুল উত্তর',
      value: incorrectCount,
      color: '#ef4444', // red-500
    },
    {
      name: language === 'en' ? 'Unanswered MCQs' : 'উত্তর বাকি (Unanswered)',
      value: unansweredCount,
      color: '#cbd5e1', // slate-300
    },
  ];

  // Fallback slice when everything is 0
  const activePieData =
    totalMcqs > 0
      ? pieData
      : [
          {
            name: language === 'en' ? 'No MCQs' : 'কোনো প্রশ্ন নেই',
            value: 1,
            color: '#e2e8f0',
          },
        ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-5 shadow-2xs">
      {/* Top Header & KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3
              className="text-base font-bold text-slate-900 font-display"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
              }}
            >
              {language === 'en'
                ? 'MCQ Progress & Accuracy Analytics Dashboard'
                : 'MCQ অগ্রগতি ও সঠিক উত্তরের হার ড্যাশবোর্ড'}
            </h3>
          </div>
          <p
            className="text-xs text-slate-500 mt-0.5"
            style={{ fontFamily: "'DM Sans', 'Hind Siliguri', sans-serif" }}
          >
            {language === 'en'
              ? 'Live visualization of Answered vs. Unanswered MCQ ratio and Correct Answer % over time'
              : 'উত্তর দেওয়া বনাম বাকি থাকা MCQ অনুপাত এবং সময়ের সাথে সঠিক উত্তরের শতকরা হার (%)'}
          </p>
        </div>

        {/* 4 Compact KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">
              {language === 'en' ? 'Answered Ratio' : 'উত্তর প্রদান'}
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {answeredCount}/{totalMcqs} ({answeredRatioPct}%)
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">
              {language === 'en' ? 'Unanswered' : 'উত্তর বাকি'}
            </div>
            <div className="text-sm font-bold text-slate-700 font-mono tabular-nums mt-0.5">
              {unansweredCount} MCQs
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <div className="text-[11px] font-medium text-emerald-800">
              {language === 'en' ? 'Correct Accuracy' : 'সঠিক উত্তরের হার'}
            </div>
            <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              {accuracyPct}% ({correctCount})
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-amber-50/70 border border-amber-200/80">
            <div className="text-[11px] font-medium text-amber-900">
              {language === 'en' ? 'Attempts Logged' : 'মোট প্রচেষ্টা'}
            </div>
            <div className="text-sm font-bold text-amber-800 font-mono tabular-nums mt-0.5">
              {history.length}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Chart (5 cols): Answered vs. Unanswered Donut Chart */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
              <span
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                }}
              >
                {language === 'en'
                  ? 'Answered vs. Unanswered MCQs'
                  : 'উত্তরকৃত বনাম উত্তর বাকি MCQ অনুপাত'}
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">
              {answeredCount} : {unansweredCount}
            </span>
          </div>

          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {activePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value} MCQ`,
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {answeredRatioPct}%
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {language === 'en' ? 'Completed' : 'সম্পন্ন'}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shrink-0" />
              <span className="text-slate-700 truncate">
                {language === 'en' ? 'Correct' : 'সঠিক'} ({correctCount})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-500 shrink-0" />
              <span className="text-slate-700 truncate">
                {language === 'en' ? 'Incorrect' : 'ভুল'} ({incorrectCount})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 shrink-0" />
              <span className="text-slate-700 truncate">
                {language === 'en' ? 'Pending' : 'বাকি'} ({unansweredCount})
              </span>
            </div>
          </div>
        </div>

        {/* Right Chart (7 cols): Percentage of Correct Answers Over Time AreaChart */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif",
                }}
              >
                {language === 'en'
                  ? 'Correct Answers % Over Time (Accuracy Trend)'
                  : 'সময়ের সাথে সঠিক উত্তরের শতকরা হার (Accuracy %)'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? `Current: ${accuracyPct}%`
                  : `বর্তমান হার: ${accuracyPct}%`}
              </span>
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorAccuracy"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient
                    id="colorAnswered"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    name === 'accuracyPct'
                      ? language === 'en'
                        ? 'Correct Answer %'
                        : 'সঠিক উত্তরের হার (%)'
                      : language === 'en'
                      ? 'Answered Completion %'
                      : 'উত্তর সম্পন্ন (%)',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="answeredPct"
                  stroke="#2563eb"
                  strokeWidth={1.75}
                  fillOpacity={1}
                  fill="url(#colorAnswered)"
                />
                <Area
                  type="monotone"
                  dataKey="accuracyPct"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAccuracy)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-600">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
                <span>
                  {language === 'en'
                    ? 'Correct Answer %'
                    : 'সঠিক উত্তরের শতকরা হার (%)'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-blue-600 inline-block" />
                <span>
                  {language === 'en'
                    ? 'Answered Ratio %'
                    : 'উত্তর প্রদানের হার (%)'}
                </span>
              </span>
            </div>
            <span className="text-slate-500">
              {language === 'en'
                ? 'Updates live as you answer MCQs below'
                : 'নিচের MCQ উত্তর দেওয়ার সাথে সাথে আপডেট হয়'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
