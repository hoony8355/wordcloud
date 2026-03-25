'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { AnalyzeResponse } from '@/types/keyword';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface KeywordGraphProps {
  data?: AnalyzeResponse;
}

const groupColor: Record<string, string> = {
  핵심: '#22d3ee',
  정보탐색: '#60a5fa',
  구매검토: '#f97316',
  행동유도: '#34d399',
  세부니즈: '#a78bfa',
  '브랜드/지역': '#f43f5e',
  '비교/후기': '#facc15'
};

export default function KeywordGraph({ data }: KeywordGraphProps) {
  const graphData = useMemo(() => {
    if (!data) {
      return {
        nodes: [{ id: '분석 대기중', group: '핵심', score: 1, source: 'root' }],
        links: []
      };
    }

    return {
      nodes: data.nodes,
      links: data.links
    };
  }, [data]);

  return (
    <div className="h-[520px] rounded-xl border border-slate-700 bg-slate-900">
      <ForceGraph2D
        graphData={graphData}
        backgroundColor="#020617"
        linkWidth={(link) => Math.max(1, Number(link.weight ?? 1) * 4)}
        nodeRelSize={8}
        nodeVal={(node) => Math.max(4, Number(node.score ?? 0.2) * 14)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = String(node.id);
          const fontSize = Math.max(10 / globalScale, 5);
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = groupColor[String(node.group)] ?? '#e2e8f0';
          ctx.beginPath();
          ctx.arc(Number(node.x), Number(node.y), Math.max(3, Number(node.score ?? 0.2) * 8), 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(label, Number(node.x) + 8, Number(node.y) + 4);
        }}
      />
    </div>
  );
}
