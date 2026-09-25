import { FormSection } from './FormSection';

/** A block rule has no fields of its own: what it does. */
export function BlockFields() {
  return (
    <FormSection title="What happens">
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Matching requests fail before they are sent, as with an ad blocker. The page itself is never blocked; ws:, data: and blob: URLs can't be.
      </p>
    </FormSection>
  );
}
