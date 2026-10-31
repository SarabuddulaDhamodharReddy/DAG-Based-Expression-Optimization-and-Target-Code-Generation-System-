import { describe, it, expect } from 'vitest';
import { compileInput, TargetInstruction } from '../index';

// Educational target code interpreter for semantic execution checks
function executeTargetCode(
  instructions: TargetInstruction[],
  initialEnv: Record<string, number> = {}
): Record<string, number> {
  const env: Record<string, number> = { ...initialEnv };
  const registers: Record<string, number> = {};

  for (const instr of instructions) {
    switch (instr.opcode) {
      case 'LOAD':
        if (env[instr.arg2!] === undefined) {
          throw new Error(`Uninitialized memory variable: '${instr.arg2}'`);
        }
        registers[instr.arg1] = env[instr.arg2!];
        break;

      case 'LOADI':
        registers[instr.arg1] = parseInt(instr.arg2!, 10);
        break;

      case 'STORE':
        env[instr.arg1] = registers[instr.arg2!];
        break;

      case 'MOV':
        registers[instr.arg1] = registers[instr.arg2!];
        break;

      case 'ADD':
        registers[instr.arg1] =
          (registers[instr.arg1] ?? 0) + (registers[instr.arg2!] ?? 0);
        break;

      case 'SUB':
        registers[instr.arg1] =
          (registers[instr.arg1] ?? 0) - (registers[instr.arg2!] ?? 0);
        break;

      case 'MUL':
        registers[instr.arg1] =
          (registers[instr.arg1] ?? 0) * (registers[instr.arg2!] ?? 0);
        break;

      case 'DIV':
        registers[instr.arg1] = Math.trunc(
          (registers[instr.arg1] ?? 0) / (registers[instr.arg2!] ?? 1)
        );
        break;

      case 'NEG':
        registers[instr.arg1] = -(registers[instr.arg1] ?? 0);
        break;
    }
  }

  return env;
}

describe('Step 4: Target Code Generation Tests', () => {
  // Test 1: Simple addition
  it('1. Simple addition generates LOAD, ADD, and STORE', () => {
    const res = compileInput('x = a + b');
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    const asm = tc.rawAssembly;

    expect(asm).toContain('LOAD');
    expect(asm).toContain('ADD');
    expect(asm).toContain('STORE x');
    expect(tc.arithmeticInstructions).toBe(1);

    const env = executeTargetCode(tc.instructions, { a: 15, b: 25 });
    expect(env['x']).toBe(40);
  });

  // Test 2: Multiplication with nested addition
  it('2. Multiplication with nested addition preserves evaluation dependencies (x = (a + b) * c)', () => {
    const res = compileInput('x = (a + b) * c');
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    const opcodes = tc.instructions.map((i) => i.opcode);

    // ADD must precede MUL
    const addIdx = opcodes.indexOf('ADD');
    const mulIdx = opcodes.indexOf('MUL');
    expect(addIdx).toBeGreaterThan(-1);
    expect(mulIdx).toBeGreaterThan(addIdx);

    const env = executeTargetCode(tc.instructions, { a: 3, b: 4, c: 5 });
    expect(env['x']).toBe(35); // (3 + 4) * 5 = 35
  });

  // Test 3: Repeated subexpression reused by multiple assignments
  it('3. Repeated subexpression reused by multiple assignments without duplicate arithmetic', () => {
    const input = `a = b + c\nd = b + c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    // Should have only 1 ADD instruction
    expect(tc.arithmeticInstructions).toBe(1);

    const asm = tc.rawAssembly;
    expect(asm).toContain('STORE a');
    expect(asm).toContain('STORE d');

    const env = executeTargetCode(tc.instructions, { b: 12, c: 8 });
    expect(env['a']).toBe(20);
    expect(env['d']).toBe(20);
  });

  // Test 4: Constant expressions after optimization
  it('4. Constant expressions generate LOADI and STORE with 0 arithmetic instructions', () => {
    const input = `x = 10 + 20\ny = x * 2`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    expect(tc.arithmeticInstructions).toBe(0);

    const asm = tc.rawAssembly;
    expect(asm).toContain('LOADI');
    expect(asm).toContain('STORE x');
    expect(asm).toContain('STORE y');

    const env = executeTargetCode(tc.instructions);
    expect(env['x']).toBe(30);
    expect(env['y']).toBe(60);
  });

  // Test 5: Variable reassignment
  it('5. Variable reassignment does not falsely reuse register values', () => {
    const input = `a = b + c\nb = 5\nd = b + c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    // 2 additions because b changed
    expect(tc.arithmeticInstructions).toBe(2);

    const env = executeTargetCode(tc.instructions, { b: 2, c: 10 });
    expect(env['a']).toBe(12); // initial b (2) + c (10)
    expect(env['b']).toBe(5); // b reassigned to 5
    expect(env['d']).toBe(15); // new b (5) + c (10)
  });

  // Test 6: Subtraction and division
  it('6. Subtraction and division generate SUB and DIV correctly', () => {
    const input = `q = a - b\nr = q / c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    const opcodes = tc.instructions.map((i) => i.opcode);
    expect(opcodes).toContain('SUB');
    expect(opcodes).toContain('DIV');

    const env = executeTargetCode(tc.instructions, { a: 25, b: 5, c: 4 });
    expect(env['q']).toBe(20);
    expect(env['r']).toBe(5); // 20 / 4 = 5
  });

  // Test 7: Negative values and NEG instruction
  it('7. Negative values generate NEG or LOADI with negative numbers', () => {
    const input = 'x = -a';
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const tc = res.targetCode!.optimized;
    const opcodes = tc.instructions.map((i) => i.opcode);
    expect(opcodes).toContain('NEG');

    const env = executeTargetCode(tc.instructions, { a: 42 });
    expect(env['x']).toBe(-42);
  });

  // Test 8: Invalid source input
  it('8. Rejects invalid source input and returns error without crashing', () => {
    const res = compileInput('x = a +');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.targetCode).toBeUndefined();
  });

  // Test 9: Optimized vs Unoptimized outputs
  it('9. Differentiates between optimized and unoptimized target code outputs', () => {
    const input = `a = b + c\nd = b + c`;
    const res = compileInput(input);
    expect(res.success).toBe(true);

    const { optimized, unoptimized } = res.targetCode!;
    // Unoptimized has 2 additions, optimized has 1 addition
    expect(unoptimized.arithmeticInstructions).toBe(2);
    expect(optimized.arithmeticInstructions).toBe(1);
    expect(optimized.totalInstructions).toBeLessThan(
      unoptimized.totalInstructions
    );
  });

  // Test 10: Correct semantic results on complex program
  it('10. Semantic execution check on complex program verifies accuracy', () => {
    const input = [
      'x = a + b * c',
      'y = (a + b) * c',
      'z = x + y',
      'w = 100 / 4',
      'ans = z - w',
    ].join('\n');

    const res = compileInput(input);
    expect(res.success).toBe(true);

    const initial = { a: 2, b: 3, c: 4 };
    const optEnv = executeTargetCode(res.targetCode!.optimized.instructions, initial);
    const unoptEnv = executeTargetCode(res.targetCode!.unoptimized.instructions, initial);

    // x = 2 + 3 * 4 = 14
    // y = (2 + 3) * 4 = 20
    // z = 14 + 20 = 34
    // w = 25
    // ans = 34 - 25 = 9
    expect(optEnv['x']).toBe(14);
    expect(optEnv['y']).toBe(20);
    expect(optEnv['z']).toBe(34);
    expect(optEnv['w']).toBe(25);
    expect(optEnv['ans']).toBe(9);

    // Both optimized and unoptimized target codes must yield identical results
    expect(unoptEnv).toEqual(optEnv);
  });
});
