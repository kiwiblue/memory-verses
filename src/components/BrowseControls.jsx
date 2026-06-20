export default function BrowseControls({ onPrev, onNext }) {
  return (
    <div className="ctrls">
      <button className="btn btn-sk" onClick={onPrev}>← Prev</button>
      <button className="btn btn-sk" onClick={onNext}>Next →</button>
    </div>
  );
}
