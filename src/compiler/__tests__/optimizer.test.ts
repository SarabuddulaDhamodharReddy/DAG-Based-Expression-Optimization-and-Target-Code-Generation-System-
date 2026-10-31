import { describe, it, expect } from 'vitest';
import { compileInput, formatTAC, TACInstruction } from '../index';

// Helper to execute TAC instructions for semantic equivalence checks
function executeTAC(
  instructions: TACInstruction[],
  initialEnv: Record<string, number> = {}
): Record<string, number> {
  const env: Record<string, number> = { ...initialEnv };

  const resolveVal = (val: string): number => {
    if (/^-?[0-9]+$/.test(val)) {
      return parseInt(val, 10);
    }
    if (env[val] !== undefined) {
      return env[val];
    }
    throw new Error(`Uninitialized variable: '${val}'`);
  };

  for (const instr of instructions) {
    if (instr.type === 'assign') {
      env[instr.result] = resolveVal(instr.arg1);
    } else if (instr.type === 'binary') {
      const v1 = resolveVal(instr.arg1);
      const v2 = resolveVal(instr.arg2);
      let res: number;
      switch (instr.op) {
        case '+':
          res = v1 + v2;
          break;
        case '-':
          res = v1 - v2;
          break;
        case '*':
          res = v1 * v2;
          break;
        case '/':
          res = Math.trunc(v1 / v2);
          break;
      }
      env[instr.result] = res;
    }
  }

  return env;
}

describe('Step 3: DAG-Based Expression Optimization Tests', () => {
  // Test 1: Common Subexpression Elimination
  it('1. Common subexpression elimination (a = b + c, d = b + c)', () => {
    const input = `a = b + c\nd = b + c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsBefore).toBe(2);
    expect(opt.metrics.operationsAfter).toBe(1);
    expect(opt.metrics.operationsEliminated).toBe(1);

    const code = formatTAC(opt.optimizedTAC);
    expect(code).toBe('t1 = b + c\na = t1\nd = t1');
  });

  // Test 2: Multiple occurrences of the same subexpression
  it('2. Multiple occurrences of the same subexpression across multiple statements', () => {
    const input = [
      'a = b + c',
      'd = a + e',
      'f = b + c',
    ].join('\n');

    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    // Before: 3 additions (b+c, a+e, b+c)
    expect(opt.metrics.operationsBefore).toBe(3);
    // After: 2 additions (b+c computed once, a+e)
    expect(opt.metrics.operationsAfter).toBe(2);
    expect(opt.metrics.operationsEliminated).toBe(1);

    const code = formatTAC(opt.optimizedTAC);
    // f must reuse the temporary for b + c
    expect(code).toContain('f = t1');
  });

  // Test 3: Constant folding
  it('3. Constant folding evaluates integer arithmetic at compile time (x = 10 + 20, y = x * 2)', () => {
    const input = `x = 10 + 20\ny = x * 2`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsBefore).toBe(2);
    expect(opt.metrics.operationsAfter).toBe(0);
    expect(opt.metrics.operationsEliminated).toBe(2);

    const code = formatTAC(opt.optimizedTAC);
    expect(code).toBe('x = 30\ny = 60');
  });

  // Test 4: Nested expressions with operator precedence
  it('4. Nested expressions with operator precedence (x = a + b * c)', () => {
    const input = 'x = a + b * c';
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsBefore).toBe(2);
    expect(opt.metrics.operationsAfter).toBe(2);

    // * must precede +
    const binOps = opt.optimizedTAC.filter((i) => i.type === 'binary');
    expect(binOps[0].op).toBe('*');
    expect(binOps[1].op).toBe('+');
  });

  // Test 5: Parenthesized expressions
  it('5. Parenthesized expressions override standard precedence (x = (a + b) * c)', () => {
    const input = 'x = (a + b) * c';
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsBefore).toBe(2);
    expect(opt.metrics.operationsAfter).toBe(2);

    // + must precede * because of parentheses
    const binOps = opt.optimizedTAC.filter((i) => i.type === 'binary');
    expect(binOps[0].op).toBe('+');
    expect(binOps[1].op).toBe('*');
  });

  // Test 6: Variable reassignment correctness
  it('6. Variable reassignment does not falsely reuse earlier computations (a = b + c, b = 5, d = b + c)', () => {
    const input = `a = b + c\nb = 5\nd = b + c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    // Both b + c operations must be preserved because b changed value
    expect(opt.metrics.operationsBefore).toBe(2);
    expect(opt.metrics.operationsAfter).toBe(2);
    expect(opt.metrics.operationsEliminated).toBe(0);
  });

  // Test 7: Division by zero safety
  it('7. Division by zero is left unfolded with an appropriate diagnostic', () => {
    const input = 'x = 10 / 0';
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsAfter).toBe(1);
    expect(opt.explanation).toMatch(/division by zero/i);
    expect(opt.diagnostics).toBeDefined();
    expect(opt.diagnostics!.length).toBeGreaterThan(0);
  });

  // Test 8: Expressions where no optimization is possible
  it('8. Reports unchanged code and explanation when no optimization is possible', () => {
    const input = 'x = a + b';
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    expect(opt.metrics.operationsEliminated).toBe(0);
    expect(opt.explanation).toMatch(/no optimization was applicable/i);
  });

  // Test 9: Semantic equivalence between original and optimized programs
  it('9. Semantic equivalence between original and optimized TAC on test inputs', () => {
    const input = [
      'a = b + c',
      'd = b + c',
      'e = a * 2',
      'f = 10 + 20',
      'g = d + f',
    ].join('\n');

    const res = compileInput(input);
    expect(res.success).toBe(true);

    const opt = res.optimization!;
    const initialValues = { b: 7, c: 3 };

    const originalEnv = executeTAC(opt.originalTAC, initialValues);
    const optimizedEnv = executeTAC(opt.optimizedTAC, initialValues);

    // Verify all program variables hold identical results
    const userVars = ['a', 'd', 'e', 'f', 'g'];
    for (const v of userVars) {
      expect(optimizedEnv[v]).toBe(originalEnv[v]);
    }

    expect(optimizedEnv['a']).toBe(10);
    expect(optimizedEnv['d']).toBe(10);
    expect(optimizedEnv['e']).toBe(20);
    expect(optimizedEnv['f']).toBe(30);
    expect(optimizedEnv['g']).toBe(40);
  });
});
