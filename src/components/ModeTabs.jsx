const MODES = ['study', 'test', 'browse'];

export default function ModeTabs({ mode, onChange }) {
  return (
    <div className="tabs">
      {MODES.map(m => (
        <div
          key={m}
          className={`tab${mode === m ? ' on' : ''}`}
          onClick={() => onChange(m)}
        >
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </div>
      ))}
    </div>
  );
}
