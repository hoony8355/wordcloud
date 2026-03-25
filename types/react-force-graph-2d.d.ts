declare module 'react-force-graph-2d' {
  import { ComponentType } from 'react';

  interface ForceGraph2DProps {
    graphData: {
      nodes: Array<Record<string, unknown>>;
      links: Array<Record<string, unknown>>;
    };
    backgroundColor?: string;
    linkWidth?: number | ((link: Record<string, unknown>) => number);
    nodeRelSize?: number;
    nodeVal?: number | ((node: Record<string, unknown>) => number);
    nodeCanvasObject?: (
      node: Record<string, unknown>,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => void;
  }

  const ForceGraph2D: ComponentType<ForceGraph2DProps>;
  export default ForceGraph2D;
}
