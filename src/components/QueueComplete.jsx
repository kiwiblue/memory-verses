export default function QueueComplete({ stats, onBrowse, onRestart, onLearnNewVerse }) {
  return (
    <div className="queue-complete">
      <div className="qc-icon">✓</div>
      <div className="qc-title">Today's session complete</div>
      <div className="qc-sub">Come back tomorrow for your next review.</div>
      <div className="qc-stats">
        <span className="qc-pill qc-unseen">{stats.unseen} to go</span>
        <span className="qc-pill qc-learning">{stats.learning} learning</span>
        <span className="qc-pill qc-mastered">{stats.mastered} mastered</span>
      </div>
      <div className="qc-actions">
        {onLearnNewVerse && (
          <button className="btn btn-ok qc-learn-new" onClick={onLearnNewVerse}>
            Learn a new verse →
          </button>
        )}
        <button className="btn qc-browse" onClick={onBrowse}>Revise full deck →</button>
        <button className="btn qc-again" onClick={onRestart}>Practice again ↺</button>
      </div>
    </div>
  );
}
