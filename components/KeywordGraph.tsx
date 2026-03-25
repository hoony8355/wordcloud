'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 900, height: 520 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(420, Math.floor(entry.contentRect.height));
      setSize({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current || !data) return;
    const timer = setTimeout(() => {
      graphRef.current.zoomToFit?.(400, 40);
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  const graphData = useMemo(() => {
    if (!data) {
      return {
        nodes: [{ id: '분석 대기중', group: '핵심', score: 1, source: 'root', searchVolume: 1 }],
        links: []
      };
    }

    return {
      nodes: data.nodes,
      links: data.links
    };
  }, [data]);

  return (
    <div ref={containerRef} className="h-[62vh] min-h-[420px] rounded-xl border border-slate-700 bg-slate-900">
      <ForceGraph2D
        ref={graphRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="#020617"
        cooldownTicks={120}
        linkWidth={(link) => Math.max(1, Number(link.weight ?? 1) * 3)}
        nodeRelSize={7}
        nodeVal={(node) => {
          const volumeBoost = Number(node.searchVolume ?? 0) * 8;
          return Math.max(4, Number(node.score ?? 0.2) * 10 + volumeBoost);
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = String(node.id);
          const fontSize = Math.max(10 / globalScale, 5);
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = groupColor[String(node.group)] ?? '#e2e8f0';
          ctx.beginPath();
          ctx.arc(Number(node.x), Number(node.y), Math.max(3, Number(node.score ?? 0.2) * 7), 0, 2 * Math.PI, false);
          ctx.fill();

          const shouldShowLabel = globalScale > 1.6 || Number(node.score ?? 0) > 0.58 || String(node.source) === 'root';
          if (shouldShowLabel) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(label, Number(node.x) + 8, Number(node.y) + 4);
          }
        }}
      />
    </div>
  );
}
