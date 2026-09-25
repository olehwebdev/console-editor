import { HEX, JSON_ESCAPES, JSON_LITERALS, JSON_NUMBER, JSON_WHITESPACE, UNICODE_ESCAPE_LENGTH } from './constants';
import { JsonSyntaxError } from './JsonSyntaxError';
import type { JsonEntry, JsonNode } from './types';

/** Reads one JSON document into a `JsonNode` tree with the offset of every value and key. */
export class JsonParser {
  private pos = 0;

  constructor(private readonly text: string) {}

  parse(): JsonNode {
    const node = this.value();
    this.space();
    if (this.pos < this.text.length) this.fail('Unexpected text after the value');
    return node;
  }

  private value(): JsonNode {
    this.space();
    const start = this.pos;
    const c = this.text[start];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"') return { kind: 'string', value: this.string(), start, end: this.pos };
    const literal = c === undefined ? undefined : JSON_LITERALS[c];
    if (literal) {
      if (!this.text.startsWith(literal.text, start)) this.fail(`Expected ${literal.text}`);
      this.pos += literal.text.length;
      return literal.kind === 'null' ? { kind: 'null', start, end: this.pos } : { kind: 'boolean', value: literal.value!, start, end: this.pos };
    }
    JSON_NUMBER.lastIndex = start;
    const number = JSON_NUMBER.exec(this.text);
    if (!number) this.fail(c === undefined ? 'Unexpected end of text' : `Unexpected ${JSON.stringify(c)}`);
    this.pos += number[0].length;
    return { kind: 'number', raw: number[0], start, end: this.pos };
  }

  private object(): JsonNode {
    const start = this.pos++;
    const entries: JsonEntry[] = [];
    this.space();
    if (this.text[this.pos] === '}') return { kind: 'object', entries, start, end: ++this.pos };
    for (;;) {
      this.space();
      if (this.text[this.pos] !== '"') this.fail('Expected a key');
      const keyStart = this.pos;
      const key = this.string();
      const keyEnd = this.pos;
      this.space();
      this.expect(':');
      entries.push({ key, keyStart, keyEnd, value: this.value() });
      this.space();
      if (this.text[this.pos] === '}') return { kind: 'object', entries, start, end: ++this.pos };
      this.expect(',');
    }
  }

  private array(): JsonNode {
    const start = this.pos++;
    const items: JsonNode[] = [];
    this.space();
    if (this.text[this.pos] === ']') return { kind: 'array', items, start, end: ++this.pos };
    for (;;) {
      items.push(this.value());
      this.space();
      if (this.text[this.pos] === ']') return { kind: 'array', items, start, end: ++this.pos };
      this.expect(',');
    }
  }

  /** A string from its opening quote; leaves `pos` after the closing one. */
  private string(): string {
    let out = '';
    let run = ++this.pos;
    for (;;) {
      const c = this.text[this.pos];
      if (c === undefined) this.fail('Unterminated string');
      if (c === '"') break;
      if (c < ' ') this.fail('Control character in a string');
      if (c !== '\\') {
        this.pos++;
        continue;
      }
      out += this.text.slice(run, this.pos);
      out += this.escape();
      run = this.pos;
    }
    out += this.text.slice(run, this.pos++);
    return out;
  }

  /** An escape from its backslash. */
  private escape(): string {
    const c = this.text[this.pos + 1] ?? '';
    this.pos += 2;
    if (c !== 'u') {
      if (!Object.hasOwn(JSON_ESCAPES, c)) this.fail('Unknown escape');
      return JSON_ESCAPES[c]!;
    }
    const hex = this.text.slice(this.pos, this.pos + UNICODE_ESCAPE_LENGTH);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Bad \\u escape');
    this.pos += UNICODE_ESCAPE_LENGTH;
    return String.fromCharCode(parseInt(hex, HEX));
  }

  private space(): void {
    while (JSON_WHITESPACE.has(this.text[this.pos] ?? '')) this.pos++;
  }

  private expect(c: string): void {
    if (this.text[this.pos] !== c) this.fail(`Expected ${JSON.stringify(c)}`);
    this.pos++;
  }

  private fail(message: string): never {
    throw new JsonSyntaxError(message, this.pos);
  }
}
