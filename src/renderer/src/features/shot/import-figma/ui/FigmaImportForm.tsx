import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { figmaImportSchema } from '@common/figma';
import type { Shot } from '@common/types';
import { KEY } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { FieldError } from '@/shared/ui/field-error';
import { Input } from '@/shared/ui/input';
import { forgetFigmaToken, importFigmaFrame } from '../model';
import { FigmaTokenField } from './FigmaTokenField';

export interface FigmaImportFormProps {
  /** A Figma token is kept (so none has to be given). */
  tokenSaved: boolean;
  onImported(shot: Shot): void;
  onCancel(): void;
}

/**
 * A Figma frame brought in as a design, by its link (Share › Copy link, with the frame selected), with a personal
 * access token the first time. Esc cancels; what Figma refused is said under the form.
 */
export function FigmaImportForm({ tokenSaved, onImported, onCancel }: FigmaImportFormProps) {
  const errorIds = { link: useId(), token: useId(), form: useId() };
  const [saved, setSaved] = useState(tokenSaved);
  // Checked on Import, not as a field is left: leaving the link for the token's buttons would push them down mid-click.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { link: '', token: '' }, resolver: zodResolver(figmaImportSchema) });
  const submit = handleSubmit(async (input) => {
    const result = await importFigmaFrame(input);
    if ('shot' in result) onImported(result.shot);
    else setError('root', { message: result.error });
  });
  return (
    <form
      aria-label="Import a Figma frame"
      data-testid="figma-form"
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface-editor p-2"
      noValidate
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => event.key === KEY.escape && (event.stopPropagation(), onCancel())}
    >
      <Input {...register('link')} autoFocus mono aria-label="Figma frame link" data-testid="figma-link" placeholder="https://www.figma.com/design/…?node-id=…" invalid={!!errors.link} aria-describedby={errors.link ? errorIds.link : undefined} />
      <FieldError id={errorIds.link} message={errors.link?.message} />
      <FigmaTokenField
        saved={saved}
        field={register('token')}
        error={errors.token?.message}
        errorId={errorIds.token}
        onChange={() => setSaved(false)}
        onForget={() => void forgetFigmaToken().then((gone) => gone && setSaved(false))}
      />
      <FieldError id={errorIds.form} message={errors.root?.message} data-testid="figma-error" />
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={isSubmitting} data-testid="figma-import">
          Import
        </Button>
      </div>
    </form>
  );
}
