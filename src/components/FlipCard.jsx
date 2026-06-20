import { useState } from 'react';

const TRANSLATIONS = ['esv', 'kjv', 'bsb', 'niv', 'nlt', 'nkjv', 'nasb'];

export default function FlipCard({ verse, version, defaultVersion, verseTranslations, isFlipped, mode, onFlip, onVerseTranslationChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const verseText = verse[version];
  const frontLabel = mode === 'test' ? 'Recall the verse for…' : 'Reference';
  const showHint = mode === 'study';
  const isOverride = version !== defaultVersion;
  const showPicker = mode === 'study' || mode === 'test';

  function handleClick() {
    if (pickerOpen) return;
    if (mode === 'browse') return;
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
    <div className="wrap" onClick={handleClick}>
      <div className={`card${isFlipped ? ' flip' : ''}`}>
        <div className="face">
          <div className="lbl">{frontLabel}</div>
          <div className="ref">{verse.reference}</div>
          {showHint && <div className="hint">tap to reveal</div>}
        </div>
        <div className="face back">
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
          <div className="vtxt">"{verseText}"</div>
          <div className="vref">{verse.reference}</div>
        </div>
      </div>
    </div>
  );
}
