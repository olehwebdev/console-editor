import type { Shot } from '../../shared/types';
import { figmaFrameOf, figmaImportSchema } from '../../shared/figma';
import { parseInput } from '../store/parseInput';
import { fetchFigmaFrame } from './fetchFigmaFrame';
import { FigmaToken } from './FigmaToken';
import type { FigmaImporterDeps } from './types';

/** Figma frames brought in as designs, by their link, with a personal access token kept for next time once it works. */
export class FigmaImporter {
  private readonly token: FigmaToken;

  constructor(private readonly deps: FigmaImporterDeps) {
    this.token = new FigmaToken(deps.tokenFile, deps.crypt);
  }

  /** Keeps the frame a link names as a design, with the token given (kept once it has worked) or the one kept. */
  async import(input: unknown): Promise<Shot> {
    const { link, token: given } = parseInput(figmaImportSchema, input, 'Figma import');
    const token = given || (await this.token.get());
    if (!token) throw new Error('Figma needs a personal access token: make one in Figma (Settings › Security)');
    const { name, bytes } = await fetchFigmaFrame(figmaFrameOf(link)!, token, this.deps.api);
    if (given) await this.token.set(given);
    return this.deps.addDesign(name, bytes);
  }

  async hasToken(): Promise<boolean> {
    return (await this.token.get()) !== null;
  }

  forgetToken(): Promise<void> {
    return this.token.clear();
  }
}
