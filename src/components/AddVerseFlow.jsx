import { useState, useRef, useEffect, useMemo } from 'react';
import { fetchVerse } from '../api/bible.js';
import Icon from './Icon.jsx';
import OverlayHeader from './OverlayHeader.jsx';
import { VERSES } from '../data/verses.js';
import { COLLECTIONS, POPULAR_VERSE_IDS } from '../data/collections.js';

const POPULAR_VERSES = POPULAR_VERSE_IDS.map(id => VERSES.find(v => v.id === id)).filter(Boolean);

function collectionVerses(collection) {
  return collection.verseIds.map(id => VERSES.find(v => v.id === id)).filter(Boolean);
}

function inDeck(verse, allVerses) {
  return allVerses.some(v => String(v.id) === String(verse.id));
}

function versionText(verse, preferredVersion) {
  return verse[preferredVersion] || verse.kjv || verse.bsb || '';
}

// ── Verse row ──────────────────────────────────────────────────────────────────
function VerseRow({ verse, preferredVersion, allVerses, addedIds, onAdd, onLearn }) {
  const already = inDeck(verse, allVerses);
  const added = addedIds?.has(String(verse.id));
  const text = versionText(verse, preferredVersion);
  const preview = text.length > 65 ? text.slice(0, 65) + '…' : text;

  return (
    <div className="av-verse-row">
      <div className="av-verse-info">
        <span className="av-verse-ref">{verse.reference}</span>
        <span className="av-verse-preview">{preview}</span>
      </div>
      {already ? (
        <span className="av-badge-indeck">In deck</span>
      ) : added ? (
        <span className="av-badge-added">Added</span>
      ) : (
        <div className="av-verse-btns">
          <button className="av-plus-btn" onClick={() => onAdd(verse)} title="Add to deck"><Icon name="add" size={16} /></button>
          {onLearn && (
            <button className="av-learn-row-btn" onClick={() => onLearn(verse)}>Learn</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hub view ───────────────────────────────────────────────────────────────────
function HubView({ allVerses, preferredVersion, onSearch, onCollections, onAddDeck, onLearnNow }) {
  const [addedIds, setAddedIds] = useState(new Set());

  function handleAdd(verse) {
    onAddDeck(verse);
    setAddedIds(prev => new Set([...prev, String(verse.id)]));
  }

  return (
    <div className="av-view">
      <h2 className="av-view-title">Add new verse</h2>

      <div className="av-hub-btns">
        <button className="av-hub-btn" onClick={onSearch}>Search</button>
        <button className="av-hub-btn" onClick={onCollections}>Collections</button>
      </div>

      <div className="av-section-hdr">Popular Verses</div>
      <div className="av-verse-list">
        {POPULAR_VERSES.map(v => (
          <VerseRow
            key={v.id}
            verse={v}
            preferredVersion={preferredVersion}
            allVerses={allVerses}
            addedIds={addedIds}
            onAdd={handleAdd}
            onLearn={onLearnNow}
          />
        ))}
      </div>
    </div>
  );
}

// ── Search view ────────────────────────────────────────────────────────────────
function SearchView({ allVerses, preferredVersion, onAddDeck, onLearnNow }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [addedState, setAddedState] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading'); setResult(null); setErrorMsg(''); setAddedState(null);
    try {
      const data = await fetchVerse(query.trim());
      setResult(data); setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Verse not found.'); setStatus('error');
    }
  }

  const alreadyInDeck = result
    ? allVerses.some(v => v.reference.toLowerCase() === result.reference.toLowerCase())
    : false;

  const text = result ? (result[preferredVersion] || result.kjv || '') : '';

  function handleAdd() { onAddDeck(result); setAddedState('deck'); }
  function handleLearn() { onLearnNow(result); }

  return (
    <div className="av-view">
      <h2 className="av-view-title">Search for verse</h2>

      <form className="av-search-form" onSubmit={handleSearch}>
        <input
          ref={inputRef}
          className="av-search-input"
          type="text"
          placeholder="John 3:16"
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setStatus(null); setAddedState(null); }}
        />
        <button className="av-search-btn" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '…' : 'Search'}
        </button>
      </form>

      {status === 'error' && <p className="av-error">{errorMsg}</p>}

      {status === 'success' && result && (
        <div className="av-search-result">
          <div className="av-result-ref">{result.reference}</div>
          <div className="av-result-text">{text}</div>
          {alreadyInDeck ? (
            <div className="av-result-actions">
              <span className="av-badge-indeck">Already in your deck</span>
            </div>
          ) : addedState === 'deck' ? (
            <div className="av-result-actions">
              <span className="av-badge-added">Added to deck!</span>
            </div>
          ) : (
            <div className="av-result-actions">
              <button className="av-pill-btn av-pill-deck" onClick={handleAdd}>+ Deck</button>
              <button className="av-pill-btn av-pill-learn" onClick={handleLearn}>+ Learn Now</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Collections list ───────────────────────────────────────────────────────────
function CollectionsView({ onSelect }) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? COLLECTIONS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : COLLECTIONS;

  return (
    <div className="av-view">
      <h2 className="av-view-title">Collections</h2>

      <div className="av-search-form" style={{ marginBottom: 16 }}>
        <input
          className="av-search-input"
          type="text"
          placeholder="Filter…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="av-collection-list">
        {filtered.map(col => (
          <button key={col.id} className="av-collection-btn" onClick={() => onSelect(col)}>
            <span className="av-collection-name">{col.name}</span>
            <span className="av-collection-count">{col.verseIds.length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Collection detail ──────────────────────────────────────────────────────────
function CollectionDetailView({ collection, allVerses, preferredVersion, onAddDeck, onLearnNow }) {
  const verses = useMemo(() => collectionVerses(collection), [collection]);
  const [addedIds, setAddedIds] = useState(new Set());
  const [allAdded, setAllAdded] = useState(false);

  function handleAdd(verse) {
    onAddDeck(verse);
    setAddedIds(prev => new Set([...prev, String(verse.id)]));
  }

  function handleAddAll() {
    const toAdd = verses.filter(v => !inDeck(v, allVerses) && !addedIds.has(String(v.id)));
    toAdd.forEach(v => onAddDeck(v));
    setAddedIds(prev => new Set([...prev, ...toAdd.map(v => String(v.id))]));
    setAllAdded(true);
  }

  const allInDeck = verses.every(v => inDeck(v, allVerses) || addedIds.has(String(v.id)));

  return (
    <div className="av-view">
      <h2 className="av-view-title">{collection.name} Collection</h2>

      <button
        className={`av-add-all-btn${allInDeck || allAdded ? ' av-add-all-done' : ''}`}
        onClick={handleAddAll}
        disabled={allInDeck || allAdded}
      >
        {allInDeck || allAdded ? <><Icon name="check" size={16} /> All in deck</> : '+Add whole collection'}
      </button>

      <div className="av-verse-list">
        {verses.map(v => (
          <VerseRow
            key={v.id}
            verse={v}
            preferredVersion={preferredVersion}
            allVerses={allVerses}
            addedIds={addedIds}
            onAdd={handleAdd}
            onLearn={onLearnNow}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function AddVerseFlow({
  allVerses, preferredVersion, user,
  onAddDeck, onLearnNow, onClose,
}) {
  const [view, setView] = useState('hub');
  const [selectedCollection, setSelectedCollection] = useState(null);

  function goBack() {
    if (view === 'search' || view === 'collections') { setView('hub'); }
    else if (view === 'detail') { setView('collections'); }
    else { onClose(); }
  }

  return (
    <div className="av-overlay">
      <div className="av-hdr-panel">
        <OverlayHeader onBack={goBack} user={user} />
      </div>
      <div className="av-sheet">
      <div className="av-panel">

        {view === 'hub' && (
          <HubView
            allVerses={allVerses}
            preferredVersion={preferredVersion}
            onSearch={() => setView('search')}
            onCollections={() => setView('collections')}
            onAddDeck={onAddDeck}
            onLearnNow={onLearnNow}
          />
        )}
        {view === 'search' && (
          <SearchView
            allVerses={allVerses}
            preferredVersion={preferredVersion}
            onAddDeck={onAddDeck}
            onLearnNow={onLearnNow}
          />
        )}
        {view === 'collections' && (
          <CollectionsView
            onSelect={col => { setSelectedCollection(col); setView('detail'); }}
          />
        )}
        {view === 'detail' && selectedCollection && (
          <CollectionDetailView
            collection={selectedCollection}
            allVerses={allVerses}
            preferredVersion={preferredVersion}
            onAddDeck={onAddDeck}
            onLearnNow={onLearnNow}
          />
        )}
      </div>
      </div>
      </div>
  );
}
