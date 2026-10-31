import {
  AssignmentStatement,
  ASTExprNode,
  BinaryOperator,
  DAGGraph,
  OptimizationMetrics,
  OptimizationResult,
  TACInstruction,
} from './types';
import { generateOriginalTAC } from './tac';

interface ValueOperand {
  name: string; // Printable operand name (e.g. "b", "5", "t1")
  vn: string; // Value number key (e.g. "var:b", "const:5", "node:N1")
  isConstant: boolean;
  constantValue?: number;
}

export class ExpressionOptimizer {
  private tempCounter: number = 1;
  private instructions: TACInstruction[] = [];
  private varVN: Map<string, string> = new Map(); // Variable -> current value number
  private varConst: Map<string, number> = new Map(); // Variable -> current constant value
  private computedSubexprs: Map<string, string> = new Map(); // Value number -> temp holding result
  private cseCount: number = 0;
  private foldCount: number = 0;
  private cseDetails: string[] = [];
  private foldDetails: string[] = [];
  private diagnostics: string[] = [];

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private foldConstant(
    op: BinaryOperator,
    left: number,
    right: number
  ): { canFold: boolean; value?: number; reason?: string } {
    if (op === '/' && right === 0) {
      return {
        canFold: false,
        reason: 'Division by zero cannot be folded at compile time.',
      };
    }

    let result: number;
    switch (op) {
      case '+':
        result = left + right;
        break;
      case '-':
        result = left - right;
        break;
      case '*':
        result = left * right;
        break;
      case '/':
        result = Math.trunc(left / right);
        break;
    }

    return { canFold: true, value: result };
  }

  private evaluateExpr(expr: ASTExprNode): ValueOperand {
    switch (expr.type) {
      case 'Constant': {
        const vn = `const:${expr.value}`;
        return {
          name: expr.value.toString(),
          vn,
          isConstant: true,
          constantValue: expr.value,
        };
      }

      case 'Variable': {
        const varName = expr.name;
        // Check if variable currently holds a known constant
        if (this.varConst.has(varName)) {
          const constVal = this.varConst.get(varName)!;
          return {
            name: varName,
            vn: `const:${constVal}`,
            isConstant: true,
            constantValue: constVal,
          };
        }

        // Get or assign initial value number for variable
        let vn = this.varVN.get(varName);
        if (!vn) {
          vn = `var:${varName}`;
          this.varVN.set(varName, vn);
        }

        return {
          name: varName,
          vn,
          isConstant: false,
        };
      }

      case 'BinaryOp': {
        const leftOp = this.evaluateExpr(expr.left);
        const rightOp = this.evaluateExpr(expr.right);

        // 1. Check for Constant Folding
        if (
          leftOp.isConstant &&
          rightOp.isConstant &&
          leftOp.constantValue !== undefined &&
          rightOp.constantValue !== undefined
        ) {
          const foldRes = this.foldConstant(
            expr.op,
            leftOp.constantValue,
            rightOp.constantValue
          );

          if (foldRes.canFold && foldRes.value !== undefined) {
            this.foldCount++;
            this.foldDetails.push(
              `${leftOp.constantValue} ${expr.op} ${rightOp.constantValue} → ${foldRes.value}`
            );
            const vn = `const:${foldRes.value}`;
            return {
              name: foldRes.value.toString(),
              vn,
              isConstant: true,
              constantValue: foldRes.value,
            };
          } else if (foldRes.reason) {
            this.diagnostics.push(foldRes.reason);
          }
        }

        // 2. Check for Common Subexpression Elimination via Value Numbering
        const opVN = `op:${expr.op}:${leftOp.vn},${rightOp.vn}`;

        if (this.computedSubexprs.has(opVN)) {
          const existingTemp = this.computedSubexprs.get(opVN)!;
          this.cseCount++;
          this.cseDetails.push(
            `Reused '${existingTemp}' for shared subexpression (${leftOp.name} ${expr.op} ${rightOp.name})`
          );
          return {
            name: existingTemp,
            vn: opVN,
            isConstant: false,
          };
        }

        // 3. New computation: allocate temporary and emit instruction
        const temp = this.newTemp();
        this.instructions.push({
          type: 'binary',
          result: temp,
          arg1: leftOp.name,
          op: expr.op,
          arg2: rightOp.name,
        });

        this.computedSubexprs.set(opVN, temp);

        return {
          name: temp,
          vn: opVN,
          isConstant: false,
        };
      }
    }
  }

  public optimize(
    statements: AssignmentStatement[],
    _dag: DAGGraph
  ): OptimizationResult {
    const originalTAC = generateOriginalTAC(statements);

    for (const stmt of statements) {
      const target = stmt.target;
      const operand = this.evaluateExpr(stmt.expr);

      // Emit assignment to target
      this.instructions.push({
        type: 'assign',
        result: target,
        arg1: operand.name,
      });

      // Update variable value number and constant environment
      this.varVN.set(target, operand.vn);
      if (operand.isConstant && operand.constantValue !== undefined) {
        this.varConst.set(target, operand.constantValue);
      } else {
        this.varConst.delete(target);
      }
    }

    // Compute metrics
    const operationsBefore = originalTAC.filter((i) => i.type === 'binary').length;
    const operationsAfter = this.instructions.filter((i) => i.type === 'binary').length;
    const operationsEliminated = Math.max(0, operationsBefore - operationsAfter);

    const metrics: OptimizationMetrics = {
      operationsBefore,
      operationsAfter,
      operationsEliminated,
    };

    // Generate user-friendly explanation
    const explanationParts: string[] = [];

    if (this.cseCount > 0) {
      explanationParts.push(
        `Eliminated ${this.cseCount} redundant operation${
          this.cseCount === 1 ? '' : 's'
        } via Common Subexpression Elimination (CSE).`
      );
    }

    if (this.foldCount > 0) {
      explanationParts.push(
        `Folded ${this.foldCount} constant arithmetic operation${
          this.foldCount === 1 ? '' : 's'
        } at compile time.`
      );
    }

    if (this.diagnostics.length > 0) {
      explanationParts.push(...this.diagnostics);
    }

    if (explanationParts.length === 0) {
      explanationParts.push(
        'No optimization was applicable. All expressions are non-redundant and depend on runtime variable values.'
      );
    }

    const explanation = explanationParts.join(' ');

    return {
      originalTAC,
      optimizedTAC: this.instructions,
      metrics,
      explanation,
      diagnostics: this.diagnostics,
    };
  }
}

export function optimizeStatements(
  statements: AssignmentStatement[],
  dag: DAGGraph
): OptimizationResult {
  const optimizer = new ExpressionOptimizer();
  return optimizer.optimize(statements, dag);
}
