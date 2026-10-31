import { Token, TokenType } from './types';

export class LexerError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(`Lexer Error [Line ${line}, Col ${column}]: ${message}`);
    this.name = 'LexerError';
    this.line = line;
    this.column = column;
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  while (index < input.length) {
    const char = input[index];

    // Handle newlines
    if (char === '\n') {
      tokens.push({ type: 'NEWLINE', value: '\n', line, column });
      index++;
      line++;
      column = 1;
      continue;
    }

    // Skip horizontal whitespace
    if (char === ' ' || char === '\t' || char === '\r') {
      index++;
      column++;
      continue;
    }

    // Identifiers: [a-zA-Z_][a-zA-Z0-9_]*
    if (/[a-zA-Z_]/.test(char)) {
      const startCol = column;
      let ident = '';
      while (index < input.length && /[a-zA-Z0-9_]/.test(input[index])) {
        ident += input[index];
        index++;
        column++;
      }
      tokens.push({
        type: 'IDENTIFIER',
        value: ident,
        line,
        column: startCol,
      });
      continue;
    }

    // Numbers: [0-9]+
    if (/[0-9]/.test(char)) {
      const startCol = column;
      let numStr = '';
      while (index < input.length && /[0-9]/.test(input[index])) {
        numStr += input[index];
        index++;
        column++;
      }
      tokens.push({
        type: 'NUMBER',
        value: numStr,
        line,
        column: startCol,
      });
      continue;
    }

    // Single-character tokens
    let singleType: TokenType | null = null;
    switch (char) {
      case '=':
        singleType = 'EQUALS';
        break;
      case '+':
        singleType = 'PLUS';
        break;
      case '-':
        singleType = 'MINUS';
        break;
      case '*':
        singleType = 'STAR';
        break;
      case '/':
        singleType = 'SLASH';
        break;
      case '(':
        singleType = 'LPAREN';
        break;
      case ')':
        singleType = 'RPAREN';
        break;
      default:
        throw new LexerError(`Unexpected character '${char}'`, line, column);
    }

    tokens.push({
      type: singleType,
      value: char,
      line,
      column,
    });
    index++;
    column++;
  }

  tokens.push({
    type: 'EOF',
    value: '',
    line,
    column,
  });

  return tokens;
}
