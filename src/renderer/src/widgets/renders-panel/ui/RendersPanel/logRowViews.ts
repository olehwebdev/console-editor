import type { ComponentType } from 'react';
import { CommitHeader } from './CommitHeader';
import { MoreRow } from './MoreRow';
import { RenderedRow } from './RenderedRow';
import type { LogRowKind, LogRowProps } from './types';

/** What draws each kind of row of the Renders log. */
export const LOG_ROW_VIEWS: Record<LogRowKind, ComponentType<LogRowProps>> = { heading: CommitHeader, component: RenderedRow, more: MoreRow };
