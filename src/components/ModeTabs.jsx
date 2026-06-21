const MODES = [
  { value: 'learn', label: 'Learn' },
  { value: 'revise', label: 'Revise' },
];

export default function ModeTabs({ mode, onChange }) {
  return (
    <div className="tabs">
      {MODES.map(m => (
        <div
          key={m.value}
          className={`tab${mode === m.value ? ' on' : ''}`}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}
