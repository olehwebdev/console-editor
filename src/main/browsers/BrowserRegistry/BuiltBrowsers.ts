import type { FoundBrowser } from '../types';
import type { BuiltBrowser } from '../webkit';

/** The browser builds the app downloads (WebKit's), as the registry lists them: as browsers, with their versions, downloaded or not. */
export class BuiltBrowsers {
  private built: BuiltBrowser[] = [];

  constructor(private readonly source?: { list(): Promise<BuiltBrowser[]> }) {}

  /** Asks again which there are, and which are downloaded. */
  async refresh(): Promise<void> {
    this.built = (await this.source?.list().catch((): BuiltBrowser[] => [])) ?? [];
  }

  browsers(): FoundBrowser[] {
    return this.built.map((b) => b.browser);
  }

  has(id: string): boolean {
    return this.built.some((b) => b.browser.id === id);
  }

  version(id: string): string | null | undefined {
    return this.built.find((b) => b.browser.id === id)?.version;
  }

  /** What the UI is told of a build: whether it is downloaded; null for a browser that isn't one. */
  state(id: string): { downloaded: boolean } | null {
    const built = this.built.find((b) => b.browser.id === id);
    return built ? { downloaded: built.downloaded } : null;
  }
}
