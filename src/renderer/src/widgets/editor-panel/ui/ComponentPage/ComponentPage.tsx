import { useInspectorStore } from '@/entities/inspector';
import { ComponentDetails } from './ComponentDetails';
import { ComponentHeader } from './ComponentHeader';
import { NoComponent } from './NoComponent';
import { PlainElement } from './PlainElement';

/** The component picked last, or one of its chain's, as the page holds it. */
export function ComponentPage() {
  const component = useInspectorStore((s) => s.component);
  if (!component) return <NoComponent />;
  const { framework } = component;
  return (
    <div className="h-full overflow-y-auto bg-surface-editor" data-testid="component-page">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-8 pb-16 pt-10">
        <ComponentHeader component={component} />
        {framework ? <ComponentDetails component={{ ...component, framework }} /> : <PlainElement component={component} />}
      </div>
    </div>
  );
}
