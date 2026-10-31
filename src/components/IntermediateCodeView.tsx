import React from 'react';
import { OptimizationResult } from '../compiler/types';
import { formatTAC } from '../compiler/tac';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface IntermediateCodeViewProps {
  optimization: OptimizationResult;
}

export const IntermediateCodeView: React.FC<IntermediateCodeViewProps> = ({
  optimization,
}) => {
  const { originalTAC, optimizedTAC, metrics, explanation, diagnostics } =
    optimization;

  const originalTACStr = formatTAC(originalTAC);
  const optimizedTACStr = formatTAC(optimizedTAC);

  return (
    <div className="intermediate-code-container">
      {/* Three Metrics Summary */}
      <div className="metrics-summary-grid">
        <div className="metric-box">
          <span className="metric-label">Operations Before</span>
          <span className="metric-value value-neutral">
            {metrics.operationsBefore}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Operations After</span>
          <span className="metric-value value-primary">
            {metrics.operationsAfter}
          </span>
        </div>

        <div className="metric-box highlight">
          <span className="metric-label">Operations Eliminated</span>
          <span
            className={`metric-value ${
              metrics.operationsEliminated > 0 ? 'value-success' : 'value-muted'
            }`}
          >
            {metrics.operationsEliminated}
          </span>
        </div>
      </div>

      {/* Optimization Explanation */}
      <div
        className={`explanation-card ${
          metrics.operationsEliminated > 0 ? 'has-opt' : 'no-opt'
        }`}
      >
        <div className="explanation-header">
          {metrics.operationsEliminated > 0 ? (
            <CheckCircle2 size={18} className="explanation-icon success" />
          ) : (
            <Info size={18} className="explanation-icon info" />
          )}
          <strong>Optimization Explanation:</strong>
        </div>
        <p className="explanation-text">{explanation}</p>
        {diagnostics && diagnostics.length > 0 && (
          <div className="diagnostic-note">
            <AlertTriangle size={15} />
            <span>{diagnostics.join('; ')}</span>
          </div>
        )}
      </div>

      {/* Original vs Optimized 3AC Comparison */}
      <div className="tac-comparison-grid">
        <div className="tac-column">
          <div className="tac-column-header">
            <h4>Original Three-Address Code</h4>
            <span className="tac-badge">{originalTAC.length} instructions</span>
          </div>
          <pre className="code-display tac-pre">{originalTACStr || '(Empty)'}</pre>
        </div>

        <div className="tac-column">
          <div className="tac-column-header">
            <h4>Optimized Three-Address Code</h4>
            <span className="tac-badge optimized">
              {optimizedTAC.length} instructions
            </span>
          </div>
          <pre className="code-display tac-pre optimized-pre">
            {optimizedTACStr || '(Empty)'}
          </pre>
        </div>
      </div>
    </div>
  );
};
