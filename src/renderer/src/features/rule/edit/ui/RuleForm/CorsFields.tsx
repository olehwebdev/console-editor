import { FormSection } from './FormSection';

/** A CORS rule has no fields of its own: what it does. */
export function CorsFields() {
  return (
    <FormSection title="What happens">
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Responses get Access-Control-Allow-Origin set to the requesting page's origin, with credentials allowed and every response header readable.
        Preflight (OPTIONS) requests get a success that allows the method and headers asked for, even when the server rejects them. Each redirect hop
        must match too.
      </p>
    </FormSection>
  );
}
