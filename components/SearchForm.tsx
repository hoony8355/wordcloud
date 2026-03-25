'use client';

import { FormEvent, useState } from 'react';

interface SearchFormProps {
  onSubmit: (keyword: string) => Promise<void>;
  loading: boolean;
}

const samples = ['강남 헤어샵', '네이버 광고 대행사', '피지오겔 샴푸', '청양고추빵'];

export default function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [keyword, setKeyword] = useState('강남 헤어샵');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    await onSubmit(keyword);
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 강남 헤어샵, 네이버 광고 대행사"
          className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm outline-none ring-cyan-500 focus:ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? '분석 중...' : '연관 키워드 분석'}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="text-slate-400">샘플 키워드:</span>
        {samples.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setKeyword(sample)}
            className="rounded-full border border-slate-600 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300"
          >
            {sample}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">TIP: 브랜드 + 의도(가격/후기/추천)를 함께 입력하면 더 정밀한 키워드를 얻을 수 있습니다.</p>
    </div>
  );
}
