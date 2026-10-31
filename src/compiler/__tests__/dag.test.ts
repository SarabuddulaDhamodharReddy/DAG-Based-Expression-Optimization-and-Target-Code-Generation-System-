import { describe, it, expect } from 'vitest';
import { compileInput } from '../index';

describe('Compiler DAG Construction Tests', () => {
  // Case 1: Simple single assignment
  it('Case 1: parses and constructs DAG for a = b + c', () => {
    const result = compileInput('a = b + c');
    expect(result.success).toBe(true);
    expect(result.statements).toHaveLength(1);

    const dag = result.dag!;
    expect(dag.nodes).toHaveLength(3);

    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(1);
    expect(opNodes[0].value).toBe('+');
    expect(opNodes[0].labels).toContain('a');

    const varNodes = dag.nodes.filter((n) => n.type === 'variable');
    expect(varNodes).toHaveLength(2);
    const varNames = varNodes.map((n) => n.value).sort();
    expect(varNames).toEqual(['b', 'c']);
  });

  // Case 2: Shared subexpression elimination
  it('Case 2: a = b + c followed by d = b + c reuses one shared addition node', () => {
    const input = `a = b + c\nd = b + c`;
    const result = compileInput(input);
    expect(result.success).toBe(true);
    expect(result.statements).toHaveLength(2);

    const dag = result.dag!;
    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(1); // exactly one shared + node
    expect(opNodes[0].value).toBe('+');
    expect(opNodes[0].labels).toEqual(['a', 'd']);
  });

  // Case 3: Operator precedence without parentheses (* before +)
  it('Case 3: x = a + b * c respects operator precedence (* before +)', () => {
    const result = compileInput('x = a + b * c');
    expect(result.success).toBe(true);

    const dag = result.dag!;
    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(2);

    const multNode = opNodes.find((n) => n.value === '*');
    const plusNode = opNodes.find((n) => n.value === '+');

    expect(multNode).toBeDefined();
    expect(plusNode).toBeDefined();

    // The + node must have the * node as its right child
    expect(plusNode!.rightId).toBe(multNode!.id);
    expect(plusNode!.labels).toContain('x');
  });

  // Case 4: Parentheses overriding precedence
  it('Case 4: x = (a + b) * c respects parentheses', () => {
    const result = compileInput('x = (a + b) * c');
    expect(result.success).toBe(true);

    const dag = result.dag!;
    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(2);

    const plusNode = opNodes.find((n) => n.value === '+');
    const multNode = opNodes.find((n) => n.value === '*');

    expect(plusNode).toBeDefined();
    expect(multNode).toBeDefined();

    // The * node must have the + node as its left child
    expect(multNode!.leftId).toBe(plusNode!.id);
    expect(multNode!.labels).toContain('x');
  });

  // Case 5: Variable reassignment correctness
  it('Case 5: a = b + c, b = 5, d = b + c handles reassignment correctly without false reuse', () => {
    const input = `a = b + c\nb = 5\nd = b + c`;
    const result = compileInput(input);
    expect(result.success).toBe(true);

    const dag = result.dag!;
    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(2); // Two different addition nodes

    const firstPlus = opNodes.find((n) => n.labels.includes('a'));
    const secondPlus = opNodes.find((n) => n.labels.includes('d'));

    expect(firstPlus).toBeDefined();
    expect(secondPlus).toBeDefined();
    expect(firstPlus!.id).not.toBe(secondPlus!.id);

    // The constant 5 node should have label 'b'
    const constNode = dag.nodes.find((n) => n.type === 'constant' && n.value === '5');
    expect(constNode).toBeDefined();
    expect(constNode!.labels).toContain('b');

    // Second addition should use the constant node as left child
    expect(secondPlus!.leftId).toBe(constNode!.id);
  });

  // Case 6: Multiple statements with different operators (+, -, *, /)
  it('Case 6: handles multiple statements with different operators (+, -, *, /)', () => {
    const input = [
      'p = a + b',
      'q = p - c',
      'r = q * d',
      's = r / e',
    ].join('\n');

    const result = compileInput(input);
    expect(result.success).toBe(true);
    expect(result.statements).toHaveLength(4);

    const dag = result.dag!;
    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(4);

    const operators = opNodes.map((n) => n.value);
    expect(operators).toContain('+');
    expect(operators).toContain('-');
    expect(operators).toContain('*');
    expect(operators).toContain('/');

    expect(dag.varMap['s']).toBeDefined();
  });

  // Case 7: Invalid syntax and incomplete expressions
  it('Case 7: rejects invalid syntax and incomplete expressions gracefully', () => {
    // Incomplete expression
    const r1 = compileInput('a = b +');
    expect(r1.success).toBe(false);
    expect(r1.error).toMatch(/Incomplete expression|expected/i);

    // Missing equals sign
    const r2 = compileInput('a + b');
    expect(r2.success).toBe(false);
    expect(r2.error).toMatch(/Expected '='/i);

    // Unmatched opening parenthesis
    const r3 = compileInput('x = (a + b');
    expect(r3.success).toBe(false);
    expect(r3.error).toMatch(/Expected '\)'/i);

    // Empty input
    const r4 = compileInput('   \n  ');
    expect(r4.success).toBe(false);
    expect(r4.error).toMatch(/Please enter at least one assignment/i);
  });

  // Case 8: Constant operands
  it('Case 8: handles constant operands such as x = 10 + 20', () => {
    const result = compileInput('x = 10 + 20');
    expect(result.success).toBe(true);

    const dag = result.dag!;
    const constNodes = dag.nodes.filter((n) => n.type === 'constant');
    expect(constNodes).toHaveLength(2);
    const constValues = constNodes.map((n) => n.value).sort();
    expect(constValues).toEqual(['10', '20']);

    const opNodes = dag.nodes.filter((n) => n.type === 'operator');
    expect(opNodes).toHaveLength(1);
    expect(opNodes[0].value).toBe('+');
    expect(opNodes[0].labels).toContain('x');
  });
});
