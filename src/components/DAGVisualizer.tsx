import React from 'react';
import { DAGGraph, DAGNode } from '../compiler/types';

interface DAGVisualizerProps {
  dag: DAGGraph;
}

interface PositionedNode {
  node: DAGNode;
  x: number;
  y: number;
  level: number;
}

export const DAGVisualizer: React.FC<DAGVisualizerProps> = ({ dag }) => {
  const { nodes, nodeMap } = dag;

  if (nodes.length === 0) {
    return <div className="placeholder-box"><p>No nodes in DAG</p></div>;
  }

  // 1. Calculate levels for each node (leaves at level 0, operators higher)
  const levelMap: Record<string, number> = {};

  const calculateLevel = (id: string, visited: Set<string> = new Set()): number => {
    if (levelMap[id] !== undefined) return levelMap[id];
    if (visited.has(id)) return 0; // prevent cycle

    visited.add(id);
    const node = nodeMap[id];
    if (!node || node.type !== 'operator') {
      levelMap[id] = 0;
      return 0;
    }

    const leftLevel = node.leftId ? calculateLevel(node.leftId, new Set(visited)) : 0;
    const rightLevel = node.rightId ? calculateLevel(node.rightId, new Set(visited)) : 0;
    const lvl = Math.max(leftLevel, rightLevel) + 1;
    levelMap[id] = lvl;
    return lvl;
  };

  nodes.forEach((n) => calculateLevel(n.id));

  const maxLevel = Math.max(...Object.values(levelMap), 0);

  // 2. Group nodes by display row (highest operators at top, leaves at bottom)
  // row 0: maxLevel, row maxLevel: level 0
  const rows: Record<number, DAGNode[]> = {};
  for (let r = 0; r <= maxLevel; r++) {
    rows[r] = [];
  }

  nodes.forEach((node) => {
    const lvl = levelMap[node.id] || 0;
    const row = maxLevel - lvl;
    rows[row].push(node);
  });

  // 3. Compute (x, y) coordinates
  const rowHeight = 100;
  const paddingY = 60;
  const minColWidth = 130;

  let maxRowLen = 1;
  Object.values(rows).forEach((rowNodes) => {
    if (rowNodes.length > maxRowLen) maxRowLen = rowNodes.length;
  });

  const svgWidth = Math.max(540, (maxRowLen + 1) * minColWidth);
  const svgHeight = Math.max(260, (maxLevel + 1) * rowHeight + paddingY * 1.5);

  const posMap: Record<string, PositionedNode> = {};

  Object.entries(rows).forEach(([rowStr, rowNodes]) => {
    const row = parseInt(rowStr, 10);
    const count = rowNodes.length;
    const spacing = svgWidth / (count + 1);

    rowNodes.forEach((node, idx) => {
      const x = (idx + 1) * spacing;
      const y = paddingY + row * rowHeight;
      posMap[node.id] = {
        node,
        x,
        y,
        level: levelMap[node.id],
      };
    });
  });

  return (
    <div className="dag-visualizer-container">
      {/* SVG Diagram */}
      <div className="dag-svg-wrapper">
        <svg
          className="dag-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ minWidth: `${Math.min(svgWidth, 600)}px` }}
        >
          <defs>
            {/* Arrowhead marker */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="26"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
            </marker>
          </defs>

          {/* Render Edges (Children) */}
          {nodes.map((node) => {
            if (node.type !== 'operator') return null;
            const parentPos = posMap[node.id];
            if (!parentPos) return null;

            return (
              <g key={`edges-${node.id}`}>
                {node.leftId && posMap[node.leftId] && (
                  <g>
                    <line
                      x1={parentPos.x}
                      y1={parentPos.y}
                      x2={posMap[node.leftId].x}
                      y2={posMap[node.leftId].y}
                      stroke="#94a3b8"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />
                    {/* Edge Label Left */}
                    <text
                      x={(parentPos.x * 2 + posMap[node.leftId].x) / 3}
                      y={(parentPos.y * 2 + posMap[node.leftId].y) / 3 - 6}
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      L
                    </text>
                  </g>
                )}

                {node.rightId && posMap[node.rightId] && (
                  <g>
                    <line
                      x1={parentPos.x}
                      y1={parentPos.y}
                      x2={posMap[node.rightId].x}
                      y2={posMap[node.rightId].y}
                      stroke="#94a3b8"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />
                    {/* Edge Label Right */}
                    <text
                      x={(parentPos.x * 2 + posMap[node.rightId].x) / 3}
                      y={(parentPos.y * 2 + posMap[node.rightId].y) / 3 - 6}
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      R
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = posMap[node.id];
            if (!pos) return null;

            const isOp = node.type === 'operator';
            const isConst = node.type === 'constant';

            return (
              <g key={`node-${node.id}`} className="dag-node-group">
                {/* Node Shape */}
                {isOp ? (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="22"
                    fill="#eff6ff"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                  />
                ) : (
                  <rect
                    x={pos.x - 24}
                    y={pos.y - 18}
                    width="48"
                    height="36"
                    rx="8"
                    fill={isConst ? '#f0fdf4' : '#f8fafc'}
                    stroke={isConst ? '#16a34a' : '#475569'}
                    strokeWidth="2"
                  />
                )}

                {/* Node ID Badge above */}
                <text
                  x={pos.x}
                  y={pos.y - (isOp ? 28 : 24)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#475569"
                >
                  {node.id}
                </text>

                {/* Node Value / Operator */}
                <text
                  x={pos.x}
                  y={pos.y + 5}
                  textAnchor="middle"
                  fontSize={isOp ? '18' : '13'}
                  fontWeight="700"
                  fill={isOp ? '#1d4ed8' : isConst ? '#15803d' : '#0f172a'}
                >
                  {node.value}
                </text>

                {/* Attached Variable Labels */}
                {node.labels.length > 0 && (
                  <g>
                    <rect
                      x={pos.x - (node.labels.join(', ').length * 4.5 + 10)}
                      y={pos.y + (isOp ? 28 : 24)}
                      width={node.labels.join(', ').length * 9 + 20}
                      height="20"
                      rx="10"
                      fill="#fef3c7"
                      stroke="#d97706"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + (isOp ? 42 : 38)}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#92400e"
                    >
                      {`= ${node.labels.join(', ')}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* DAG Node Table */}
      <div className="dag-table-wrapper">
        <h4 className="dag-table-title">DAG Node Specifications</h4>
        <table className="dag-table">
          <thead>
            <tr>
              <th>Node ID</th>
              <th>Node Type</th>
              <th>Value / Op</th>
              <th>Left Child</th>
              <th>Right Child</th>
              <th>Attached Labels</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id}>
                <td>
                  <span className="node-id-badge">{node.id}</span>
                </td>
                <td>
                  <span className={`node-type-tag type-${node.type}`}>
                    {node.type}
                  </span>
                </td>
                <td className="node-val-cell">
                  <strong>{node.value}</strong>
                </td>
                <td>{node.leftId || '—'}</td>
                <td>{node.rightId || '—'}</td>
                <td>
                  {node.labels.length > 0 ? (
                    <span className="label-badge">
                      {node.labels.join(', ')}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
