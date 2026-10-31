export type TokenType =
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'EQUALS'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'LPAREN'
  | 'RPAREN'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export type BinaryOperator = '+' | '-' | '*' | '/';

export interface VariableNode {
  type: 'Variable';
  name: string;
  line: number;
  column: number;
}

export interface ConstantNode {
  type: 'Constant';
  value: number;
  line: number;
  column: number;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  op: BinaryOperator;
  left: ASTExprNode;
  right: ASTExprNode;
  line: number;
  column: number;
}

export type ASTExprNode = VariableNode | ConstantNode | BinaryOpNode;

export interface AssignmentStatement {
  type: 'Assignment';
  target: string;
  expr: ASTExprNode;
  line: number;
}

export type DAGNodeType = 'variable' | 'constant' | 'operator';

export interface DAGNode {
  id: string; // e.g., "N1", "N2"
  type: DAGNodeType;
  value: string; // Variable name (e.g., "b"), constant integer (e.g., "10"), or op ("+", "-", "*", "/")
  leftId?: string;
  rightId?: string;
  labels: string[]; // Variables whose current definition points to this node (e.g., ["a", "d"])
}

export interface DAGGraph {
  nodes: DAGNode[];
  nodeMap: Record<string, DAGNode>;
  varMap: Record<string, string>; // Current variable -> DAGNode id mapping
}

// Three-Address Code (3AC / TAC) Types
export interface TACBinaryOp {
  type: 'binary';
  result: string; // Target variable or temporary, e.g. "t1"
  arg1: string; // Variable, constant, or temporary
  op: BinaryOperator;
  arg2: string; // Variable, constant, or temporary
}

export interface TACAssign {
  type: 'assign';
  result: string; // Target variable
  arg1: string; // Variable, constant, or temporary
}

export type TACInstruction = TACBinaryOp | TACAssign;

// Optimization Summary
export interface OptimizationMetrics {
  operationsBefore: number;
  operationsAfter: number;
  operationsEliminated: number;
}

export interface OptimizationResult {
  originalTAC: TACInstruction[];
  optimizedTAC: TACInstruction[];
  metrics: OptimizationMetrics;
  explanation: string;
  diagnostics?: string[];
}

// Target Code Generation Types
export type TargetOpcode =
  | 'LOAD'
  | 'LOADI'
  | 'ADD'
  | 'SUB'
  | 'MUL'
  | 'DIV'
  | 'NEG'
  | 'STORE'
  | 'MOV';

export interface TargetInstruction {
  opcode: TargetOpcode;
  arg1: string; // register or variable
  arg2?: string; // register, constant, or variable
}

export interface TargetCodeResult {
  instructions: TargetInstruction[];
  totalInstructions: number;
  arithmeticInstructions: number;
  rawAssembly: string;
  explanation: string;
}

export interface DualTargetCodeResult {
  optimized: TargetCodeResult;
  unoptimized: TargetCodeResult;
}

export interface CompilerResult {
  statements: AssignmentStatement[];
  dag: DAGGraph;
  optimization?: OptimizationResult;
  targetCode?: DualTargetCodeResult;
  errors?: string[];
}
