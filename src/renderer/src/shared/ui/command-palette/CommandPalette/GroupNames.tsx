// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** Group names for the options' descriptions; the visible headings may be virtualized away. */
export function GroupNames({ sections, groupId }: { sections: { heading: string }[]; groupId: (group: number) => string }) {
  return (
    <div hidden>
      {sections.map((section, group) => (
        <span key={group} id={groupId(group)}>
          {section.heading}
        </span>
      ))}
    </div>
  );
}
