import type { UseFormRegisterReturn } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { FieldError } from '@/shared/ui/field-error';
import { Input } from '@/shared/ui/input';

export interface FigmaTokenFieldProps {
  /** A token is kept, and no other is being given. */
  saved: boolean;
  field: UseFormRegisterReturn<'token'>;
  error?: string;
  errorId: string;
  /** Give another token instead of the one kept. */
  onChange(): void;
  onForget(): void;
}

/** The personal access token: the one kept (to change or forget), or a field for one. */
export function FigmaTokenField({ saved, field, error, errorId, onChange, onForget }: FigmaTokenFieldProps) {
  if (saved) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-fg-subtle" data-testid="figma-token-saved">
        <span className="flex-1">Using the Figma token you gave.</span>
        <Button size="sm" variant="ghost" onClick={onChange}>
          Change
        </Button>
        <Button size="sm" variant="ghost" onClick={onForget} data-testid="figma-forget">
          Forget
        </Button>
      </div>
    );
  }
  return (
    <>
      <Input {...field} type="password" autoComplete="off" aria-label="Figma personal access token" data-testid="figma-token" placeholder="Personal access token" invalid={!!error} aria-describedby={error ? errorId : undefined} />
      <FieldError id={errorId} message={error} />
      <p className="text-[11.5px] leading-snug text-fg-subtle">
        Make one in Figma (Settings › Security › Personal access tokens, with read access to files). It is kept encrypted on this computer once it works.
      </p>
    </>
  );
}
