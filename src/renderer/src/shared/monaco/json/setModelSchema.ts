import { monaco } from '../setup';
import { schemas } from './schemas';

/** Where each model's schema is registered: a name of its own, which nothing fetches. */
const SCHEMA_URI_PREFIX = 'inmemory://schema/';

/**
 * Gives a model's JSON the keys and types of a schema (completion, hovers), or takes them away with
 * undefined. A value of another type is a warning, not an error: sending the wrong type is a fair
 * test. Comments and trailing commas stay errors: the page's JSON.parse would refuse them.
 */
export function setModelSchema(modelUri: string, schema: object | undefined): void {
  if (schema) schemas.set(modelUri, schema);
  else if (!schemas.delete(modelUri)) return;
  monaco.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    enableSchemaRequest: false,
    schemaValidation: 'warning',
    schemas: [...schemas].map(([uri, entry]) => ({ uri: `${SCHEMA_URI_PREFIX}${encodeURIComponent(uri)}`, fileMatch: [uri], schema: entry })),
  });
}
