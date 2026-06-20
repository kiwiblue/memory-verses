# Bible Memory Card App

A digital companion to an existing physical Bible verse memory card deck. Reference on the front of each card, verse text on the back. Users flip cards, track progress, and test recall.

## Tech stack

- **Cloudflare Pages** — static hosting
- **Cloudflare Workers** — API layer
- **Cloudflare D1** — SQLite at the edge; stores verse data and per-user progress
- **Cloudflare KV** — cross-device progress sync keyed by user ID
- PartyKit deferred to v2 (real-time group study rooms)

## Bible version API

Use **scripture.api.bible** (American Bible Society). Fetch each verse in each translation once at build/seed time and cache in D1. No runtime API calls during study sessions. Target translations: ESV (default), KJV, NIV, NLT, CSB.

For ESV specifically, api.esv.org has cleaner response formatting and is worth using for that translation.

## Verse data

Source: a physical card deck (CSV to be provided). Schema:

```
reference, esv_text, kjv_text, niv_text, nlt_text, csb_text
```

Seed D1 from this CSV. Each row is one card.

## Feature scope

### v1 (build this first)

- Flip cards with CSS 3D animation — reference front, verse back
- Three study modes: **Study** (flip + mark), **Test** (type from memory), **Browse** (auto-reveal, navigate freely)
- Translation toggle (ESV / KJV / NIV / NLT) — switches live without reloading
- Per-card progress: `unseen | learning | mastered`
- Simple spaced repetition: learning cards surface more often than mastered
- Progress persists in localStorage; syncs to KV when user is identified
- Keyboard shortcuts: space = flip, K = know it, L = still learning, arrow keys = navigate

### v2

- Fill-in-the-blank mode with progressive difficulty (blank every 5th word → 3rd → 2nd)
- First-letter hints on blanked words
- "Reverse mode" — show verse text, recall the reference
- Session stats and progress charts
- Multiple deck sets (if further card ranges are released)

### v3

- PartyKit study room (room code, group quiz, speed completion)
- Head-to-head quiz mode

## UI reference

See `reference/mockup.html` for a working prototype of the flip card UI including all three study modes, translation switching, and the progress stat pills. Use this as the design and interaction reference — replicate the behaviour, adapt the markup for the actual framework.

Key UI decisions already made:
- Card height ~220px, perspective 1200px, flip transition 0.55s cubic-bezier(.45,0,.55,1)
- Three-tab mode switcher above the card
- "Still learning / Know it / →" control row below the card in Study mode
- Stat pills (not yet / learning / mastered) below controls
- Version selector top-right
- Progress bar top of screen

## Data model (D1)

```sql
CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  reference TEXT NOT NULL,
  esv_text TEXT,
  kjv_text TEXT,
  niv_text TEXT,
  nlt_text TEXT,
  csb_text TEXT
);

CREATE TABLE progress (
  user_id TEXT NOT NULL,
  verse_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('unseen','learning','mastered')) DEFAULT 'unseen',
  seen_count INTEGER DEFAULT 0,
  last_seen INTEGER, -- unix timestamp
  PRIMARY KEY (user_id, verse_id),
  FOREIGN KEY (verse_id) REFERENCES verses(id)
);
```

## Project conventions

- Framework: React (Vite) or plain HTML/JS — decide based on complexity at scaffolding time
- No unnecessary dependencies; prefer platform APIs (Cloudflare) over third-party services
- All God, Jesus, Holy Spirit references in UI copy are capitalised (He, His, Him)
- Keep the UI clean and minimal — no gradients, no heavy animations beyond the card flip
