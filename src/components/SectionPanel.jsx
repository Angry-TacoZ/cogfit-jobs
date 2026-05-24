export default function SectionPanel({ title, children, defaultOpen = false }) {
  return (
    <details className="section-panel" open={defaultOpen}>
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
