import { READ_ONLY_URI_AUTHORITY } from './constants';

/** Whether a model is an original source, shown read-only. */
export function isReadOnlyModel(model: { uri: { authority: string } }): boolean {
  return model.uri.authority === READ_ONLY_URI_AUTHORITY;
}
