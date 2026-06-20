export default function FlipCard({ verse, version, isFlipped, mode, onFlip }) {
  const verseText = verse[version];
  const frontLabel = mode === 'test' ? 'Recall the verse for…' : 'Reference';
  const showHint = mode === 'study';

  function handleClick() {
    if (mode === 'browse') return;
    onFlip();
  }

  return (
    <div className="wrap" onClick={handleClick}>
      <div className={`card${isFlipped ? ' flip' : ''}`}>
        <div className="face">
          <div className="lbl">{frontLabel}</div>
          <div className="ref">{verse.reference}</div>
          {showHint && <div className="hint">tap to reveal</div>}
        </div>
        <div className="face back">
          <div className="badge">{version.toUpperCase()}</div>
          <div className="vtxt">"{verseText}"</div>
          <div className="vref">{verse.reference}</div>
        </div>
      </div>
    </div>
  );
}
