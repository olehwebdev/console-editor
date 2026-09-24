import { UTF8 } from './constants';

export function withUtf8Charset(contentType: string): string {
  return `${contentType.split(';')[0].trim()}; charset=${UTF8}`;
}
