import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import type { GraphNode, KnowledgeGraph, RelationshipType } from '@/engine/types';
import { RELATIONSHIP_LABELS } from '@/engine/graph/expand';
import { cx } from '@/components/ui';

type FlowNodeData = GraphNode & { selected?: boolean; dim?: boolean; [key: string]: unknown };
type FlowNode = Node<FlowNodeData, 'standard'>;

const EDGE_COLORS: Record<RelationshipType | 'recommends' | 'certifies', string> = {
  recommends: '#0b2545',
  normative_reference: '#2a4a8a',
  test_method: '#0284c7',
  terminology: '#64748b',
  safety: '#e11d48',
  installation: '#059669',
  related_product: '#7c3aed',
  allied: '#d97706',
  superseded_by: '#e8772e',
  part_of: '#94a3b8',
  certifies: '#e8772e',
};

const KIND_STYLE: Record<GraphNode['kind'], string> = {
  product: 'bg-primary text-primary-fg border-primary',
  primary: 'bg-surface-raised border-primary/60 text-ink',
  related: 'bg-surface-raised border-line text-ink',
  certification: 'bg-tone-saffron-bg border-saffron-300 text-saffron-800 dark:text-saffron-400',
};

function StandardNode({ data }: NodeProps<FlowNode>) {
  return (
    <div
      className={cx(
        'w-[210px] rounded-xl border-2 px-3 py-2 shadow-card transition-all',
        KIND_STYLE[data.kind],
        data.selected && 'ring-2 ring-saffron-400 ring-offset-2',
        data.dim && 'opacity-30',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary/50 !border-0 !size-2" />
      <div className={cx('text-[12px] font-semibold font-mono truncate', data.kind === 'product' && 'font-sans text-[13px]')}>{data.label}</div>
      {data.sublabel && <div className={cx('mt-0.5 text-[10.5px] leading-snug line-clamp-2', data.kind === 'product' ? 'text-primary-fg/80' : 'text-ink-muted')}>{data.sublabel}</div>}
      {data.kind !== 'product' && data.category && <div className="mt-1 text-[9.5px] uppercase tracking-wide text-ink-muted">{data.category.replace('-', ' ')}</div>}
      <Handle type="source" position={Position.Right} className="!bg-primary/50 !border-0 !size-2" />
    </div>
  );
}

const nodeTypes = { standard: StandardNode };

/** Layered layout: product → primary → related (grouped by relationship) → certification. */
function layout(graph: KnowledgeGraph): { nodes: FlowNode[]; edges: Edge[] } {
  const GAP_Y = 96;
  const COL_X = [0, 340, 700, 1060];
  const columns: GraphNode[][] = [[], [], [], []];
  for (const n of graph.nodes) columns[n.kind === 'product' ? 0 : n.kind === 'primary' ? 1 : n.kind === 'related' ? 2 : 3].push(n);

  // Order related nodes by relationship type of their first incoming edge for visual grouping
  const typeOrder = Object.keys(RELATIONSHIP_LABELS);
  const firstType = (id: string) => graph.edges.find((e) => e.target === id || e.source === id)?.type ?? 'allied';
  columns[2].sort((a, b) => typeOrder.indexOf(firstType(a.id)) - typeOrder.indexOf(firstType(b.id)));

  const maxLen = Math.max(...columns.map((c) => c.length), 1);
  const totalH = (maxLen - 1) * GAP_Y;
  const nodes: FlowNode[] = [];
  columns.forEach((col, ci) => {
    const colH = (col.length - 1) * GAP_Y;
    col.forEach((n, i) => {
      nodes.push({
        id: n.id,
        type: 'standard',
        position: { x: COL_X[ci], y: (totalH - colH) / 2 + i * GAP_Y },
        data: { ...n },
        draggable: true,
      });
    });
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.type === 'recommends' ? undefined : e.label,
    type: 'smoothstep',
    animated: e.type === 'recommends',
    style: { stroke: EDGE_COLORS[e.type], strokeWidth: e.type === 'recommends' ? 2 : 1.5 },
    labelStyle: { fontSize: 10, fill: '#475569' },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[e.type], width: 14, height: 14 },
  }));
  return { nodes, edges };
}

export function StandardsGraph({ graph, onSelect, height = 560 }: { graph: KnowledgeGraph; onSelect?: (node: GraphNode) => void; height?: number }) {
  // Remount the canvas when the graph identity changes so node/edge state re-initialises cleanly.
  const key = useMemo(() => graph.nodes.map((n) => n.id).join('|') + '#' + graph.edges.length, [graph]);
  return <GraphCanvas key={key} graph={graph} onSelect={onSelect} height={height} />;
}

function GraphCanvas({ graph, onSelect, height }: { graph: KnowledgeGraph; onSelect?: (node: GraphNode) => void; height: number }) {
  const initial = useMemo(() => layout(graph), [graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selected, setSelected] = useState<string | null>(null);

  const onNodeClick = useCallback(
    (_: unknown, node: FlowNode) => {
      const id = node.id === selected ? null : node.id;
      setSelected(id);
      const neighbours = new Set<string>();
      if (id) {
        neighbours.add(id);
        for (const e of initial.edges) {
          if (e.source === id) neighbours.add(e.target);
          if (e.target === id) neighbours.add(e.source);
        }
      }
      setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, selected: n.id === id, dim: id ? !neighbours.has(n.id) : false } })));
      setEdges((es) => es.map((e) => ({ ...e, style: { ...e.style, opacity: id && e.source !== id && e.target !== id ? 0.15 : 1 } })));
      if (id) onSelect?.(node.data);
    },
    [initial.edges, onSelect, selected, setEdges, setNodes],
  );

  return (
    <div className="card overflow-hidden" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={(n) => ((n.data as FlowNodeData).kind === 'product' ? '#0b2545' : (n.data as FlowNodeData).kind === 'certification' ? '#e8772e' : '#b3c2e0')} />
      </ReactFlow>
    </div>
  );
}

export function GraphLegend() {
  const items: Array<[string, string]> = [
    ['Recommended', EDGE_COLORS.recommends],
    ...(Object.entries(RELATIONSHIP_LABELS) as [RelationshipType, string][]).map(([k, v]): [string, string] => [v, EDGE_COLORS[k]]),
    ['Certification mapping', EDGE_COLORS.certifies],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink-muted">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ background: color }} /> {label}
        </li>
      ))}
    </ul>
  );
}
