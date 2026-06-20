export default function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="prog-row">
      <div className="prog-bar">
        <div className="prog-fill" style={{ width: pct + '%' }} />
      </div>
      <span className="prog-txt">{current} of {total}</span>
    </div>
  );
}
