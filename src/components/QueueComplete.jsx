export default function QueueComplete({ stats, onBrowse }) {
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
      <button className="btn qc-browse" onClick={onBrowse}>Browse full deck →</button>
    </div>
  );
}
