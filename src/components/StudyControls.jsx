export default function StudyControls({ onMark, onNext }) {
  return (
    <div className="ctrls">
      <button className="btn btn-learn" onClick={() => onMark('learning')}>Still learning</button>
      <button className="btn btn-ok" onClick={() => onMark('mastered')}>Know it ✓</button>
      <button className="btn btn-sk" onClick={onNext}>→</button>
    </div>
  );
}
