import { useState, useEffect, useRef } from 'react';
import { fetchVerse } from '../api/bible.js';

export default function AddVersePanel({ allVerses, customVerses, currentUser, onAddVerse }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'error' | 'success' | 'added'
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null); // { reference, esv, kjv }
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.code === 'Escape' && open) close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
    setStatus(null);
    setErrorMsg('');
    setResult(null);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading');
    setResult(null);
    setErrorMsg('');
    try {
      const data = await fetchVerse(query.trim());
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
      setStatus('error');
    }
  }

  function alreadyInDeck() {
    if (!result) return false;
    const ref = result.reference.toLowerCase();
    return allVerses.some(v => v.reference.toLowerCase() === ref);
  }

  function handleAdd() {
    onAddVerse(result);
    setStatus('added');
    setTimeout(() => close(), 1500);
  }

  return (
    <div>
      {!open && (
        <button className="add-verse-btn" onClick={() => setOpen(true)}>
          + Add verse
        </button>
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
            <button
              type="submit"
              className="btn"
              style={{ flex: '0 0 auto', padding: '10px 14px' }}
              disabled={status === 'loading'}
            >
              Search
            </button>
          </form>

          {status === 'loading' && (
            <div className="status-msg muted">Searching…</div>
          )}

          {status === 'error' && (
            <div className="status-msg error">{errorMsg}</div>
          )}

          {status === 'added' && (
            <div className="status-msg success">✓ Added!</div>
          )}

          {status === 'success' && result && (
            <div className="verse-preview">
              <div className="preview-ref">{result.reference}</div>

              {[['esv','ESV'],['kjv','KJV'],['niv','NIV'],['nkjv','NKJV'],['nasb','NASB']].map(([key, label]) =>
                result[key] ? (
                  <div className="preview-block" key={key}>
                    <div className="preview-label">{label}</div>
                    <div className="preview-text">{result[key]}</div>
                  </div>
                ) : null
              )}

              {alreadyInDeck() ? (
                <div className="already-msg">Already in your deck</div>
              ) : (
                <button className="btn-add" onClick={handleAdd}>
                  Add to my deck
                </button>
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
