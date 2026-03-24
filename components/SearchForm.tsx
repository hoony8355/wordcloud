'use client';

import { FormEvent, useState } from 'react';

interface SearchFormProps {
  onSubmit: (keyword: string) => Promise<void>;
  loading: boolean;
}

export default function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [keyword, setKeyword] = useState('강남 헤어샵');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    await onSubmit(keyword);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 md:flex-row">
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
  );
}
