import {
  Token,
  TokenType,
  AssignmentStatement,
  ASTExprNode,
  BinaryOperator,
} from './types';

export class ParserError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(`Parser Error [Line ${line}, Col ${column}]: ${message}`);
    this.name = 'ParserError';
    this.line = line;
    this.column = column;
  }
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const token = this.peek();
    throw new ParserError(message, token.line, token.column);
  }

  public parse(): AssignmentStatement[] {
    const statements: AssignmentStatement[] = [];

    // Skip leading newlines
    while (this.match('NEWLINE')) {
      // continue
    }

    while (!this.isAtEnd()) {
      statements.push(this.statement());

      // Statements must be separated by NEWLINE or EOF
      if (!this.isAtEnd() && !this.check('NEWLINE')) {
        const token = this.peek();
        throw new ParserError(
          `Unexpected token '${token.value}'. Each statement must be on a separate line.`,
          token.line,
          token.column
        );
      }

      // Consume trailing newlines
      while (this.match('NEWLINE')) {
        // continue
      }
    }

    return statements;
  }

  private statement(): AssignmentStatement {
    const targetToken = this.peek();

    if (!this.match('IDENTIFIER')) {
      throw new ParserError(
        `Expected variable name for assignment, found '${targetToken.value || targetToken.type}'`,
        targetToken.line,
        targetToken.column
      );
    }

    const target = targetToken.value;

    this.consume(
      'EQUALS',
      `Expected '=' after variable name '${target}', found '${this.peek().value || this.peek().type}'`
    );

    const expr = this.expression();

    return {
      type: 'Assignment',
      target,
      expr,
      line: targetToken.line,
    };
  }

  // Precedence level 1: + and - (left-associative)
  private expression(): ASTExprNode {
    let node = this.term();

    while (this.match('PLUS', 'MINUS')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.type === 'PLUS' ? '+' : '-';
      const right = this.term();
      node = {
        type: 'BinaryOp',
        op,
        left: node,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }

    return node;
  }

  // Precedence level 2: * and / (left-associative)
  private term(): ASTExprNode {
    let node = this.factor();

    while (this.match('STAR', 'SLASH')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.type === 'STAR' ? '*' : '/';
      const right = this.factor();
      node = {
        type: 'BinaryOp',
        op,
        left: node,
        right,
        line: opToken.line,
        column: opToken.column,
      };
    }

    return node;
  }

  // Unary operators or primary
  private factor(): ASTExprNode {
    if (this.match('MINUS')) {
      const opToken = this.previous();
      const inner = this.factor();
      // Represent -x as 0 - x for uniform DAG construction
      return {
        type: 'BinaryOp',
        op: '-',
        left: {
          type: 'Constant',
          value: 0,
          line: opToken.line,
          column: opToken.column,
        },
        right: inner,
        line: opToken.line,
        column: opToken.column,
      };
    }

    if (this.match('PLUS')) {
      // Unary plus is a no-op
      return this.factor();
    }

    return this.primary();
  }

  // Primary: identifier, number, or ( expr )
  private primary(): ASTExprNode {
    const token = this.peek();

    if (this.match('NUMBER')) {
      return {
        type: 'Constant',
        value: parseInt(token.value, 10),
        line: token.line,
        column: token.column,
      };
    }

    if (this.match('IDENTIFIER')) {
      return {
        type: 'Variable',
        name: token.value,
        line: token.line,
        column: token.column,
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', `Expected ')' after expression at line ${token.line}`);
      return expr;
    }

    if (this.isAtEnd() || this.check('NEWLINE')) {
      throw new ParserError(
        'Incomplete expression: expected operand (variable or number) before end of line',
        token.line,
        token.column
      );
    }

    throw new ParserError(
      `Unexpected token '${token.value}' in expression`,
      token.line,
      token.column
    );
  }
}

export function parse(tokens: Token[]): AssignmentStatement[] {
  const parser = new Parser(tokens);
  return parser.parse();
}
