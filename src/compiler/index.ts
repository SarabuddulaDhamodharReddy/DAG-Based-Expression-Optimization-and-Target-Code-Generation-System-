import {
  AssignmentStatement,
  DAGGraph,
  OptimizationResult,
  DualTargetCodeResult,
} from './types';
import { tokenize } from './lexer';
import { parse } from './parser';
import { buildDAG } from './dag';
import { optimizeStatements } from './optimizer';
import { generateTargetCode } from './codegen';

export * from './types';
export * from './lexer';
export * from './parser';
export * from './dag';
export * from './tac';
export * from './optimizer';
export * from './codegen';

export interface CompilationResult {
  success: boolean;
  statements?: AssignmentStatement[];
  dag?: DAGGraph;
  optimization?: OptimizationResult;
  targetCode?: DualTargetCodeResult;
  error?: string;
}

export function compileInput(input: string): CompilationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Please enter at least one assignment expression.',
    };
  }

  try {
    const tokens = tokenize(input);
    const statements = parse(tokens);

    if (statements.length === 0) {
      return {
        success: false,
        error: 'No assignment statements found in input.',
      };
    }

    const dag = buildDAG(statements);
    const optimization = optimizeStatements(statements, dag);
    const targetCode = generateTargetCode(optimization);

    return {
      success: true,
      statements,
      dag,
      optimization,
      targetCode,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}
