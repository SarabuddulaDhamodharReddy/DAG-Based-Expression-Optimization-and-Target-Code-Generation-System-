import {
  AssignmentStatement,
  ASTExprNode,
  DAGGraph,
  DAGNode,
  BinaryOperator,
} from './types';

export class DAGBuilder {
  private nodes: DAGNode[] = [];
  private nodeMap: Record<string, DAGNode> = {};
  private varMap: Record<string, string> = {}; // variable -> nodeId
  private lookupTable: Record<string, string> = {}; // signature -> nodeId
  private nodeCounter: number = 1;

  private generateId(): string {
    return `N${this.nodeCounter++}`;
  }

  // Get or create a constant leaf node
  private getOrCreateConstantNode(value: number): string {
    const key = `const:${value}`;
    if (this.lookupTable[key]) {
      return this.lookupTable[key];
    }

    const id = this.generateId();
    const node: DAGNode = {
      id,
      type: 'constant',
      value: value.toString(),
      labels: [],
    };

    this.nodes.push(node);
    this.nodeMap[id] = node;
    this.lookupTable[key] = id;
    return id;
  }

  // Get or create a variable leaf node for initial variable values
  private getOrCreateVariableNode(name: string): string {
    // If the variable has already been assigned in the current scope, return its current node
    if (this.varMap[name]) {
      return this.varMap[name];
    }

    // Otherwise, this is the first reference to an initial variable
    const key = `var:${name}`;
    if (this.lookupTable[key]) {
      const existingId = this.lookupTable[key];
      this.varMap[name] = existingId;
      return existingId;
    }

    const id = this.generateId();
    const node: DAGNode = {
      id,
      type: 'variable',
      value: name,
      labels: [],
    };

    this.nodes.push(node);
    this.nodeMap[id] = node;
    this.lookupTable[key] = id;
    this.varMap[name] = id;
    return id;
  }

  // Get or create an operator node with common subexpression elimination
  private getOrCreateOperatorNode(
    op: BinaryOperator,
    leftId: string,
    rightId: string
  ): string {
    const key = `op:${op}:${leftId},${rightId}`;

    if (this.lookupTable[key]) {
      return this.lookupTable[key];
    }

    const id = this.generateId();
    const node: DAGNode = {
      id,
      type: 'operator',
      value: op,
      leftId,
      rightId,
      labels: [],
    };

    this.nodes.push(node);
    this.nodeMap[id] = node;
    this.lookupTable[key] = id;
    return id;
  }

  // Recursively process an AST expression node into DAG nodes
  private processExprNode(expr: ASTExprNode): string {
    switch (expr.type) {
      case 'Constant':
        return this.getOrCreateConstantNode(expr.value);

      case 'Variable':
        return this.getOrCreateVariableNode(expr.name);

      case 'BinaryOp': {
        const leftId = this.processExprNode(expr.left);
        const rightId = this.processExprNode(expr.right);
        return this.getOrCreateOperatorNode(expr.op, leftId, rightId);
      }
    }
  }

  // Process a single assignment statement: target = expr
  public processStatement(stmt: AssignmentStatement): void {
    const target = stmt.target;
    const targetNodeId = this.processExprNode(stmt.expr);

    // If target was previously attached to a different node, detach it
    const previousNodeId = this.varMap[target];
    if (previousNodeId && previousNodeId !== targetNodeId) {
      const prevNode = this.nodeMap[previousNodeId];
      if (prevNode) {
        prevNode.labels = prevNode.labels.filter((l) => l !== target);
      }
    }

    // Attach target label to the new node
    const targetNode = this.nodeMap[targetNodeId];
    if (targetNode && !targetNode.labels.includes(target)) {
      targetNode.labels.push(target);
    }

    // Update the current variable map
    this.varMap[target] = targetNodeId;
  }

  public build(statements: AssignmentStatement[]): DAGGraph {
    for (const stmt of statements) {
      this.processStatement(stmt);
    }

    return {
      nodes: this.nodes,
      nodeMap: this.nodeMap,
      varMap: this.varMap,
    };
  }
}

export function buildDAG(statements: AssignmentStatement[]): DAGGraph {
  const builder = new DAGBuilder();
  return builder.build(statements);
}
