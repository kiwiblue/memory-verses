export default function StatPills({ stats }) {
  const { unseen = 0, learning = 0, mastered = 0 } = stats || {};
  return (
    <div className="stats">
      <div className="pill un">
        <span className="v">{unseen}</span>
        <span className="k">not yet</span>
      </div>
      <div className="pill le">
        <span className="v">{learning}</span>
        <span className="k">learning</span>
      </div>
      <div className="pill ma">
        <span className="v">{mastered}</span>
        <span className="k">mastered</span>
      </div>
    </div>
  );
}
