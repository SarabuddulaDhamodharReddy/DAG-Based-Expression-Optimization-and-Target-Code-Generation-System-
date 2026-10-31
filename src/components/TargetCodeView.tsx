import React, { useState } from 'react';
import { DualTargetCodeResult } from '../compiler/types';
import { Cpu, Zap, RotateCcw, BookOpen } from 'lucide-react';

interface TargetCodeViewProps {
  targetCode: DualTargetCodeResult;
}

export const TargetCodeView: React.FC<TargetCodeViewProps> = ({
  targetCode,
}) => {
  const [mode, setMode] = useState<'optimized' | 'unoptimized'>('optimized');

  const activeResult =
    mode === 'optimized' ? targetCode.optimized : targetCode.unoptimized;

  return (
    <div className="target-code-container">
      {/* Mode Selector and Metrics Header */}
      <div className="target-header-row">
        <div className="toggle-button-group">
          <button
            type="button"
            className={`toggle-btn ${mode === 'optimized' ? 'active' : ''}`}
            onClick={() => setMode('optimized')}
          >
            <Zap size={14} />
            <span>Optimized Target Code</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'unoptimized' ? 'active' : ''}`}
            onClick={() => setMode('unoptimized')}
          >
            <RotateCcw size={14} />
            <span>Unoptimized Target Code</span>
          </button>
        </div>

        {/* Counts summary */}
        <div className="target-metrics-summary">
          <div className="target-stat">
            <span className="stat-label">Total Instructions:</span>
            <span className="stat-value">{activeResult.totalInstructions}</span>
          </div>
          <div className="target-stat">
            <span className="stat-label">Arithmetic Instructions:</span>
            <span className="stat-value arithmetic">
              {activeResult.arithmeticInstructions}
            </span>
          </div>
        </div>
      </div>

      {/* Instruction Sequence Display */}
      <div className="assembly-wrapper">
        <div className="assembly-header">
          <span className="assembly-title">
            <Cpu size={15} />
            <span>
              {mode === 'optimized'
                ? 'Optimized Assembly Sequence'
                : 'Unoptimized Assembly Sequence'}
            </span>
          </span>
          <span className="instruction-badge">
            {activeResult.instructions.length} instructions
          </span>
        </div>
        <pre className="code-display assembly-pre">
          {activeResult.rawAssembly || '; No instructions generated'}
        </pre>
      </div>

      {/* Explanation of what the instructions do */}
      <div className="target-explanation-box">
        <p className="explanation-paragraph">
          <strong>Execution Overview: </strong>
          {activeResult.explanation}
        </p>
      </div>

      {/* Educational Explanation Box */}
      <div className="educational-note-card">
        <BookOpen size={16} className="educational-icon" />
        <p className="educational-text">
          Target code generation translates intermediate code into lower-level
          instructions using registers and operations. These instructions are a
          simplified educational target language, not native machine code.
        </p>
      </div>
    </div>
  );
};
