import { useState, useEffect, useRef } from 'react';
import { fetchVerse } from '../api/bible.js';

const ALL_VERSIONS = [
  ['kjv',  'KJV'],
  ['bsb',  'BSB'],
  ['esv',  'ESV'],
  ['niv',  'NIV'],
  ['nkjv', 'NKJV'],
  ['nasb', 'NASB'],
];

export default function AddVersePanel({ allVerses, customVerses, currentUser, preferredVersion, onAddVerse }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [status, setStatus]   = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult]   = useState(null);
  const [added, setAdded]     = useState(null); // which translation key was just added
  const inputRef = useRef(null);

  const pref = preferredVersion || currentUser?.translation || 'esv';

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.code === 'Escape' && open) close(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false); setQuery(''); setStatus(null);
    setErrorMsg(''); setResult(null); setAdded(null);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading'); setResult(null); setErrorMsg(''); setAdded(null);
    try {
      const data = await fetchVerse(query.trim());
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
      setStatus('error');
    }
  }

  function inDeck() {
    if (!result) return false;
    const ref = result.reference.toLowerCase();
    return allVerses.some(v => v.reference.toLowerCase() === ref);
  }

  function handleAdd(key) {
    onAddVerse({ ...result, _preferredVersion: key });
    setAdded(key);
    setTimeout(() => close(), 1200);
  }

  // Ordered list: preferred first, then the rest
  const orderedVersions = result
    ? [
        [pref, ALL_VERSIONS.find(([k]) => k === pref)?.[1] || pref.toUpperCase()],
        ...ALL_VERSIONS.filter(([k]) => k !== pref),
      ].filter(([k]) => result[k])
    : [];

  return (
    <div>
      {!open && (
        <button className="add-verse-btn" onClick={() => setOpen(true)}>+ Add verse</button>
      )}

      {open && (
        <div className="add-verse-panel">
          <form className="search-row" onSubmit={handleSearch}>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. Romans 12:2"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="btn" style={{ flex: '0 0 auto', padding: '10px 14px' }}
              disabled={status === 'loading'}>
              Search
            </button>
          </form>

          {status === 'loading' && <div className="status-msg muted">Searching…</div>}
          {status === 'error'   && <div className="status-msg error">{errorMsg}</div>}

          {status === 'success' && result && (
            <div className="verse-preview">
              <div className="preview-ref">{result.reference}</div>

              {inDeck() ? (
                <div className="already-msg">Already in your deck</div>
              ) : added ? (
                <div className="status-msg success">✓ Added!</div>
              ) : (
                <div className="version-list">
                  {orderedVersions.map(([key, label], i) => (
                    <div key={key} className={`version-row${key === pref ? ' version-row-pref' : ''}`}>
                      <div className="version-row-meta">
                        <span className="version-tag">{label}</span>
                        {key === pref && <span className="version-pref-badge">your translation</span>}
                      </div>
                      <div className="version-row-text">{result[key]}</div>
                      <button
                        className={`version-add-btn${key === pref ? ' version-add-btn-pref' : ''}`}
                        onClick={() => handleAdd(key)}
                      >
                        {key === pref ? 'Add to deck' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <span className="cancel-link" onClick={close}>Cancel</span>
            </div>
          )}

          {(status === null || status === 'error') && (
            <span className="cancel-link" onClick={close}>Cancel</span>
          )}
        </div>
      )}
    </div>
  );
}
