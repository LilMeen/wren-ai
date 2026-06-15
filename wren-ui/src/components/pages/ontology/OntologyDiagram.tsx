import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  OntologyGraph,
  OntologyEntity,
} from '@/hooks/useAIOntologyRecommendation';

interface Props {
  definition: OntologyGraph;
  height?: number;
  compact?: boolean;
}

// lay the entities out on a circle so relationships are easy to read
const layoutNodes = (entities: OntologyEntity[], compact: boolean): Node[] => {
  const count = entities.length || 1;
  const radius = Math.max(160, count * (compact ? 45 : 70));
  const centerX = radius + 80;
  const centerY = radius + 40;

  return entities.map((entity, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    const label = entity.displayName || entity.name;
    const attrCount = entity.attributes?.length || 0;
    return {
      id: entity.name,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      data: {
        label: compact ? (
          label
        ) : (
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
              {entity.sourceModel}
              {attrCount > 0 ? ` · ${attrCount} attrs` : ''}
            </div>
          </div>
        ),
      },
      style: {
        border: '1px solid #7963e0',
        borderRadius: 8,
        padding: compact ? '4px 8px' : '8px 12px',
        background: '#f7f5ff',
        fontSize: compact ? 12 : 13,
        minWidth: compact ? 90 : 140,
      },
    };
  });
};

export default function OntologyDiagram(props: Props) {
  const { definition, height = 420, compact = false } = props;

  const nodes = useMemo<Node[]>(
    () => layoutNodes(definition.entities || [], compact),
    [definition.entities, compact],
  );

  const edges = useMemo<Edge[]>(() => {
    const entityNames = new Set((definition.entities || []).map((e) => e.name));
    return (definition.relationships || [])
      .filter(
        (rel) =>
          entityNames.has(rel.fromEntity) && entityNames.has(rel.toEntity),
      )
      .map((rel, index) => ({
        id: rel.id || `${rel.fromEntity}-${rel.toEntity}-${index}`,
        source: rel.fromEntity,
        target: rel.toEntity,
        label: compact ? undefined : rel.name,
        labelStyle: { fontSize: 11 },
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#7963e0' },
      }));
  }, [definition.relationships, definition.entities, compact]);

  return (
    <div style={{ width: '100%', height }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={!compact}
          nodesConnectable={false}
          elementsSelectable={!compact}
          panOnDrag={!compact}
          zoomOnScroll={!compact}
          proOptions={{ hideAttribution: true }}
        >
          {!compact && <Background />}
          {!compact && <Controls showInteractive={false} />}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
