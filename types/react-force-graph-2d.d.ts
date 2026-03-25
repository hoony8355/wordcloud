declare module 'react-force-graph-2d' {
  import { ComponentType } from 'react';

  interface ForceGraph2DProps {
    graphData: {
      nodes: unknown[];
      links: unknown[];
    };
    backgroundColor?: string;
    linkWidth?: number | ((link: any) => number);
    nodeRelSize?: number;
    nodeVal?: number | ((node: any) => number);
    nodeCanvasObject?: (
      node: any,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => void;
  }

  const ForceGraph2D: ComponentType<ForceGraph2DProps>;
  export default ForceGraph2D;
}
