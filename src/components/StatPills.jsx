export default function StatPills({ progress }) {
  const vals = Object.values(progress);
  const unseen = vals.filter(s => s === 'unseen').length;
  const learning = vals.filter(s => s === 'learning').length;
  const mastered = vals.filter(s => s === 'mastered').length;

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
