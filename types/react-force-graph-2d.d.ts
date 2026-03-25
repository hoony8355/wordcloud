declare module 'react-force-graph-2d' {
  import { ComponentType, Ref } from 'react';

  interface ForceGraph2DProps {
    ref?: Ref<any>;
    width?: number;
    height?: number;
    cooldownTicks?: number;
    graphData: {
      nodes: unknown[];
      links: unknown[];
    };
    backgroundColor?: string;
    linkWidth?: number | ((link: any) => number);
    nodeRelSize?: number;
    nodeVal?: number | ((node: any) => number);
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  }

  const ForceGraph2D: ComponentType<ForceGraph2DProps>;
  export default ForceGraph2D;
}
