export default function UsageGuide() {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
      <h2 className="mb-2 text-base font-semibold text-cyan-300">사용방법 (30초 요약)</h2>
      <ol className="list-decimal space-y-1 pl-5 text-slate-300">
        <li>키워드 입력창에 분석할 키워드를 입력합니다. (예: 강남 헤어샵)</li>
        <li>연관 키워드 분석 버튼을 누릅니다.</li>
        <li>그래프에서 중심 키워드와 주변 키워드 연결 강도를 확인합니다.</li>
        <li>오른쪽 인사이트 패널에서 상위 키워드/의도 그룹을 확인합니다.</li>
        <li>문제가 생기면 하단 디버그 로그와 F12 콘솔의 requestId를 확인합니다.</li>
      </ol>
    </section>
  );
}
