import { describe, expect, it } from 'vitest';
import { workspaceDetail, workspaceInitial, workspaceLabel } from '@/entities/workspace/lib/label';

const ws = (name: string, host: string, title = '') => ({ name, host, title });

describe('workspace labels', () => {
  it('is called by its name, else by its host', () => {
    expect(workspaceLabel(ws('  Checkout fix ', 'shop.example.com'))).toBe('Checkout fix');
    expect(workspaceLabel(ws('', 'shop.example.com'))).toBe('shop.example.com');
    expect(workspaceLabel(ws(' ', ''))).toBe('New workspace');
  });

  it("puts the name's or host's first character on its tile, but not an IP address's", () => {
    expect(workspaceInitial(ws('checkout', 'a.com'))).toBe('C');
    expect(workspaceInitial(ws('🚀 launch', 'a.com'))).toBe('🚀');
    expect(workspaceInitial(ws('', 'www.github.com'))).toBe('G');
    expect(workspaceInitial(ws('', 'localhost:3000'))).toBe('L');
    expect(workspaceInitial(ws('', '127.0.0.1:5174'))).toBe('');
    expect(workspaceInitial(ws('', '[::1]:8080'))).toBe('');
    expect(workspaceInitial(ws('', ''))).toBe('');
  });

  it('tells two workspaces on one site apart by their page titles', () => {
    expect(workspaceDetail(ws('', 'a.com', 'Checkout'))).toBe('Checkout');
    expect(workspaceDetail(ws('Fix', 'a.com'))).toBe('a.com');
    expect(workspaceDetail(ws('', 'a.com'))).toBe('');
  });
});
