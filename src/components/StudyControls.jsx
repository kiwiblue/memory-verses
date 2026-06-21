export default function StudyControls({ onMark, onNext }) {
  return (
    <div className="ctrls">
      <button className="btn btn-learn" onClick={() => onMark(0)}>Still learning</button>
      <button className="btn btn-ok"    onClick={() => onMark(1)}>Know it ✓</button>
      <button className="btn btn-sk"    onClick={onNext}>→</button>
    </div>
  );
}
