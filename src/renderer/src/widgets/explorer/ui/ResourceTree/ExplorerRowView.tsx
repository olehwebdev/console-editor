import type { ComponentType } from 'react';
import type { ExplorerRowOf, ExplorerRowType } from '../../lib';
import { ROW_RENDERERS } from './rowRenderers';
import type { RowProps } from './types';

/** Renders a row with its type's component. Generic so each row reaches its own component without a cast. */
export function ExplorerRowView<T extends ExplorerRowType>(props: RowProps<ExplorerRowOf<T>>) {
  const Row: ComponentType<RowProps<ExplorerRowOf<T>>> = ROW_RENDERERS[props.row.type];
  return <Row {...props} />;
}
