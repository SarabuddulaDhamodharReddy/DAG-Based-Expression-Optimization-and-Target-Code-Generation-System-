import {
  TACInstruction,
  TargetInstruction,
  TargetCodeResult,
  DualTargetCodeResult,
  OptimizationResult,
} from './types';

export function formatTargetInstruction(instr: TargetInstruction): string {
  if (instr.arg2 !== undefined) {
    return `${instr.opcode.padEnd(5)} ${instr.arg1}, ${instr.arg2}`;
  }
  return `${instr.opcode.padEnd(5)} ${instr.arg1}`;
}

export function formatAssembly(instructions: TargetInstruction[]): string {
  return instructions.map(formatTargetInstruction).join('\n');
}

export class TargetCodeGenerator {
  private instructions: TargetInstruction[] = [];
  private tempToReg: Map<string, string> = new Map(); // temporary (e.g. t1) -> register (e.g. R1)
  private regCounter: number = 1;

  private allocateReg(): string {
    return `R${this.regCounter++}`;
  }

  private isConstant(val: string): boolean {
    return /^-?[0-9]+$/.test(val);
  }


  public generate(tacList: TACInstruction[]): TargetCodeResult {
    this.instructions = [];
    this.tempToReg.clear();
    this.regCounter = 1;

    for (const instr of tacList) {
      if (instr.type === 'assign') {
        const { result, arg1 } = instr;

        if (this.tempToReg.has(arg1)) {
          // arg1 is in a register (from a previous computation)
          const srcReg = this.tempToReg.get(arg1)!;
          this.instructions.push({
            opcode: 'STORE',
            arg1: result,
            arg2: srcReg,
          });
        } else if (this.isConstant(arg1)) {
          // Direct constant assignment: LOADI R1, 10; STORE x, R1
          const reg = 'R1';
          this.instructions.push({
            opcode: 'LOADI',
            arg1: reg,
            arg2: arg1,
          });
          this.instructions.push({
            opcode: 'STORE',
            arg1: result,
            arg2: reg,
          });
        } else {
          // Direct variable copy: LOAD R1, b; STORE a, R1
          const reg = 'R1';
          this.instructions.push({
            opcode: 'LOAD',
            arg1: reg,
            arg2: arg1,
          });
          this.instructions.push({
            opcode: 'STORE',
            arg1: result,
            arg2: reg,
          });
        }
      } else if (instr.type === 'binary') {
        const { result, arg1, op, arg2 } = instr;

        // Check for unary negation pattern: 0 - x -> LOAD R1, x; NEG R1
        if (arg1 === '0' && op === '-') {
          const destReg = this.allocateReg();
          if (this.isConstant(arg2)) {
            this.instructions.push({
              opcode: 'LOADI',
              arg1: destReg,
              arg2: arg2,
            });
          } else if (this.tempToReg.has(arg2)) {
            const srcReg = this.tempToReg.get(arg2)!;
            this.instructions.push({
              opcode: 'MOV',
              arg1: destReg,
              arg2: srcReg,
            });
          } else {
            this.instructions.push({
              opcode: 'LOAD',
              arg1: destReg,
              arg2: arg2,
            });
          }
          this.instructions.push({
            opcode: 'NEG',
            arg1: destReg,
          });
          this.tempToReg.set(result, destReg);
          continue;
        }

        // Standard binary operation: destReg = arg1 op arg2
        let destReg: string;
        let leftReg: string;

        if (this.tempToReg.has(arg1)) {
          // Reuse register of temporary arg1
          leftReg = this.tempToReg.get(arg1)!;
          destReg = leftReg;
        } else {
          destReg = this.allocateReg();
          if (this.isConstant(arg1)) {
            this.instructions.push({
              opcode: 'LOADI',
              arg1: destReg,
              arg2: arg1,
            });
          } else {
            this.instructions.push({
              opcode: 'LOAD',
              arg1: destReg,
              arg2: arg1,
            });
          }
          leftReg = destReg;
        }

        // Load right operand
        let rightReg: string;
        if (this.tempToReg.has(arg2) && this.tempToReg.get(arg2) !== leftReg) {
          rightReg = this.tempToReg.get(arg2)!;
        } else {
          rightReg = this.allocateReg();
          if (this.isConstant(arg2)) {
            this.instructions.push({
              opcode: 'LOADI',
              arg1: rightReg,
              arg2: arg2,
            });
          } else {
            this.instructions.push({
              opcode: 'LOAD',
              arg1: rightReg,
              arg2: arg2,
            });
          }
        }

        // Emit arithmetic instruction
        let opcode: 'ADD' | 'SUB' | 'MUL' | 'DIV';
        switch (op) {
          case '+':
            opcode = 'ADD';
            break;
          case '-':
            opcode = 'SUB';
            break;
          case '*':
            opcode = 'MUL';
            break;
          case '/':
            opcode = 'DIV';
            break;
        }

        this.instructions.push({
          opcode,
          arg1: leftReg,
          arg2: rightReg,
        });

        // Store result mapping
        this.tempToReg.set(result, leftReg);
      }
    }

    const arithmeticOps = new Set(['ADD', 'SUB', 'MUL', 'DIV', 'NEG']);
    const arithmeticInstructions = this.instructions.filter((i) =>
      arithmeticOps.has(i.opcode)
    ).length;

    const rawAssembly = formatAssembly(this.instructions);

    return {
      instructions: this.instructions,
      totalInstructions: this.instructions.length,
      arithmeticInstructions,
      rawAssembly,
      explanation: `Generated ${this.instructions.length} target instruction(s) (${arithmeticInstructions} arithmetic operation(s)) using register allocation.`,
    };
  }
}

export function generateTargetCode(
  optimization: OptimizationResult
): DualTargetCodeResult {
  const genOptimized = new TargetCodeGenerator();
  const optimized = genOptimized.generate(optimization.optimizedTAC);

  const genUnoptimized = new TargetCodeGenerator();
  const unoptimized = genUnoptimized.generate(optimization.originalTAC);

  return {
    optimized,
    unoptimized,
  };
}
