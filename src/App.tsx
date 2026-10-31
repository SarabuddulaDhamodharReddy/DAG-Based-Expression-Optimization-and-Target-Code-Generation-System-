import { useState } from 'react';
import {
  Play,
  RotateCcw,
  Network,
  Code2,
  Cpu,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import { compileInput, CompilationResult } from './compiler';
import { DAGVisualizer } from './components/DAGVisualizer';
import { IntermediateCodeView } from './components/IntermediateCodeView';
import { TargetCodeView } from './components/TargetCodeView';

const DEFAULT_EXPRESSION = `a = b + c\nd = b + c`;

export default function App() {
  const [expression, setExpression] = useState<string>(DEFAULT_EXPRESSION);
  const [compilationResult, setCompilationResult] =
    useState<CompilationResult | null>(null);
  const [hasAttemptedOptimize, setHasAttemptedOptimize] =
    useState<boolean>(false);

  const handleOptimize = () => {
    setHasAttemptedOptimize(true);
    const result = compileInput(expression);
    setCompilationResult(result);
  };

  const handleReset = () => {
    setExpression(DEFAULT_EXPRESSION);
    setCompilationResult(null);
    setHasAttemptedOptimize(false);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-badge">Compiler Design Project</div>
        <h1 className="header-title">DAG Expression Optimizer</h1>
        <p className="header-subtitle">
          DAG-Based Expression Optimization and Target Code Generation System
        </p>
      </header>

      <main className="main-content">
        {/* Input Card */}
        <section className="card input-card">
          <div className="card-header">
            <h2 className="card-title">Arithmetic Assignment Expressions</h2>
            <span className="card-hint">
              Enter one expression per line (e.g. a = b + c)
            </span>
          </div>

          <textarea
            id="expression-input"
            className="expression-textarea"
            rows={4}
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value);
              // Clear previous error on edit
              if (compilationResult && !compilationResult.success) {
                setCompilationResult(null);
              }
            }}
            placeholder="e.g.&#10;a = b + c&#10;d = b + c"
            spellCheck={false}
          />

          {/* Validation Error Message */}
          {compilationResult && !compilationResult.success && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <div className="error-content">
                <strong>Syntax / Parse Error:</strong>
                <span>{compilationResult.error}</span>
              </div>
            </div>
          )}

          <div className="button-group">
            <button
              id="optimize-btn"
              className="btn btn-primary"
              onClick={handleOptimize}
              type="button"
            >
              <Play size={16} />
              <span>Optimize Expression</span>
            </button>
            <button
              id="reset-btn"
              className="btn btn-secondary"
              onClick={handleReset}
              type="button"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </section>

        {/* 4 Output Sections */}
        <div className="output-grid">
          {/* Section 1: Original Expression */}
          <section className="card output-card">
            <div className="card-header">
              <div className="card-title-group">
                <Code2 size={18} className="section-icon" />
                <h2 className="card-title">Original Expression</h2>
              </div>
            </div>
            <div className="card-body">
              {hasAttemptedOptimize ? (
                <div className="code-display-wrapper">
                  <pre className="code-display">
                    {expression.trim() || '(Empty input)'}
                  </pre>
                  {compilationResult?.success && (
                    <div className="statement-count-badge">
                      {compilationResult.statements?.length} statement
                      {compilationResult.statements?.length === 1 ? '' : 's'}{' '}
                      parsed
                    </div>
                  )}
                </div>
              ) : (
                <div className="placeholder-box">
                  <p>Click Optimize to analyze the expression</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: DAG Visualization */}
          <section className="card output-card dag-section-card">
            <div className="card-header">
              <div className="card-title-group">
                <Network size={18} className="section-icon" />
                <h2 className="card-title">DAG Visualization</h2>
              </div>
              {compilationResult?.success && (
                <span className="node-count-badge">
                  {compilationResult.dag?.nodes.length} Nodes in DAG
                </span>
              )}
            </div>
            <div className="card-body">
              {!hasAttemptedOptimize ? (
                <div className="placeholder-box">
                  <p>Click Optimize to analyze the expression</p>
                </div>
              ) : compilationResult &&
                compilationResult.success &&
                compilationResult.dag ? (
                <DAGVisualizer dag={compilationResult.dag} />
              ) : (
                <div className="placeholder-box error-placeholder">
                  <AlertCircle size={20} className="error-icon" />
                  <p>
                    Unable to build DAG due to syntax error in input expression.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Optimized Intermediate Code */}
          <section className="card output-card tac-section-card">
            <div className="card-header">
              <div className="card-title-group">
                <Terminal size={18} className="section-icon" />
                <h2 className="card-title">Optimized Intermediate Code</h2>
              </div>
              {compilationResult?.success && (
                <span className="node-count-badge">
                  {compilationResult.optimization?.metrics.operationsEliminated}{' '}
                  Ops Eliminated
                </span>
              )}
            </div>
            <div className="card-body">
              {!hasAttemptedOptimize ? (
                <div className="placeholder-box">
                  <p>Click Optimize to analyze the expression</p>
                </div>
              ) : compilationResult &&
                compilationResult.success &&
                compilationResult.optimization ? (
                <IntermediateCodeView
                  optimization={compilationResult.optimization}
                />
              ) : (
                <div className="placeholder-box error-placeholder">
                  <AlertCircle size={20} className="error-icon" />
                  <p>
                    Optimization paused due to syntax error in input expression.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Generated Target Instructions */}
          <section className="card output-card target-section-card">
            <div className="card-header">
              <div className="card-title-group">
                <Cpu size={18} className="section-icon" />
                <h2 className="card-title">Generated Target Instructions</h2>
              </div>
              {compilationResult?.success && compilationResult.targetCode && (
                <span className="node-count-badge">
                  {compilationResult.targetCode.optimized.totalInstructions}{' '}
                  Instructions
                </span>
              )}
            </div>
            <div className="card-body">
              {!hasAttemptedOptimize ? (
                <div className="placeholder-box">
                  <p>Click Optimize to analyze the expression</p>
                </div>
              ) : compilationResult &&
                compilationResult.success &&
                compilationResult.targetCode ? (
                <TargetCodeView targetCode={compilationResult.targetCode} />
              ) : (
                <div className="placeholder-box error-placeholder">
                  <AlertCircle size={20} className="error-icon" />
                  <p>
                    Target code generation paused due to syntax error in input
                    expression.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <p>
          College Compiler Design Viva &bull; DAG Optimization &amp; Code
          Generation
        </p>
      </footer>
    </div>
  );
}
