import {
  AssignmentStatement,
  ASTExprNode,
  TACInstruction,
} from './types';

export function instructionToString(instr: TACInstruction): string {
  if (instr.type === 'binary') {
    return `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
  }
  return `${instr.result} = ${instr.arg1}`;
}

export function formatTAC(instructions: TACInstruction[]): string {
  return instructions.map(instructionToString).join('\n');
}

export class OriginalTACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCounter: number = 1;

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private lowerExpr(expr: ASTExprNode): string {
    switch (expr.type) {
      case 'Constant':
        return expr.value.toString();

      case 'Variable':
        return expr.name;

      case 'BinaryOp': {
        const leftArg = this.lowerExpr(expr.left);
        const rightArg = this.lowerExpr(expr.right);
        const temp = this.newTemp();
        this.instructions.push({
          type: 'binary',
          result: temp,
          arg1: leftArg,
          op: expr.op,
          arg2: rightArg,
        });
        return temp;
      }
    }
  }

  public generate(statements: AssignmentStatement[]): TACInstruction[] {
    for (const stmt of statements) {
      if (stmt.expr.type === 'Constant' || stmt.expr.type === 'Variable') {
        const val = this.lowerExpr(stmt.expr);
        this.instructions.push({
          type: 'assign',
          result: stmt.target,
          arg1: val,
        });
      } else {
        const finalOperand = this.lowerExpr(stmt.expr);
        this.instructions.push({
          type: 'assign',
          result: stmt.target,
          arg1: finalOperand,
        });
      }
    }
    return this.instructions;
  }
}

export function generateOriginalTAC(
  statements: AssignmentStatement[]
): TACInstruction[] {
  const gen = new OriginalTACGenerator();
  return gen.generate(statements);
}
