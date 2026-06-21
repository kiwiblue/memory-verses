import { useState, useEffect, useRef } from 'react';

const TRANSLATIONS = ['kjv', 'bsb'];


export default function FlipCard({ verse, version, defaultVersion, verseTranslations, isFlipped, mode, onFlip, onVerseTranslationChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cardHeight, setCardHeight] = useState(200);
  const backRef = useRef(null);
  const wrapRef = useRef(null);

  const verseText = verse[version] ?? null;
  const frontLabel = mode === 'revise' ? 'Recall the verse for…' : 'Reference';
  const showHint = mode === 'learn';
  const isOverride = version !== defaultVersion;
  const showPicker = mode === 'learn' || mode === 'revise';

  useEffect(() => {
    const el = backRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setCardHeight(Math.max(200, el.scrollHeight));
    });
    observer.observe(el);
    setCardHeight(Math.max(200, el.scrollHeight));
    return () => observer.disconnect();
  }, [verse, version, isFlipped]);

  const verseLen = verseText ? verseText.length : 0;
  const vtxtFontSize = verseLen > 300 ? '11px' : verseLen > 200 ? '12px' : '13px';

  function handleClick() {
    if (pickerOpen) return;
    onFlip();
  }

  function handleBadgeClick(e) {
    e.stopPropagation();
    if (!showPicker) return;
    setPickerOpen(o => !o);
  }

  function handlePickerClick(e) {
    e.stopPropagation();
  }

  function handleOptClick(e, trans) {
    e.stopPropagation();
    if (trans === version) {
      setPickerOpen(false);
      return;
    }
    onVerseTranslationChange(verse.id, trans === defaultVersion ? null : trans);
    setPickerOpen(false);
  }

  return (
    <div className="wrap" ref={wrapRef} style={{ minHeight: cardHeight }} onClick={handleClick}>
      <div className={`card${isFlipped ? ' flip' : ''}`} style={{ minHeight: cardHeight }}>
        <div className="face">
          <div className="lbl">{frontLabel}</div>
          <div className="ref">{verse.reference}</div>
          {showHint && <div className="hint">tap to reveal</div>}
        </div>
        <div className="face back" ref={backRef}>
          <div
            className={`badge${isOverride ? ' badge-override' : ''}`}
            onClick={handleBadgeClick}
          >
            {version.toUpperCase()}
            {isOverride && <span className="badge-dot" />}
          </div>
          {pickerOpen && showPicker && (
            <div className="trans-picker" onClick={handlePickerClick}>
              {TRANSLATIONS.map(t => (
                <button
                  key={t}
                  className={`trans-opt${t === version ? ' active' : ''}`}
                  onClick={(e) => handleOptClick(e, t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {verseText === null
            ? <div className="vtxt loading">Loading…</div>
            : <div className="vtxt" style={{ fontSize: vtxtFontSize }}>"{verseText}"</div>
          }
          <div className="vref">{verse.reference}</div>
        </div>
      </div>
    </div>
  );
}
