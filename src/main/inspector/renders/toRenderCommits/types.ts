import type { RenderCommit, RenderedComponent } from '../../../../shared/types';

/** A commit as the page summed it up, checked; its components name their function by id (`type`), located after. */
export type PageCommit = Omit<RenderCommit, 'id' | 'frameId' | 'components'> & { components: Array<Omit<RenderedComponent, 'location'> & { type: number }> };

/** An object the page sent, read key by key. */
export type Item = Record<string, unknown>;
