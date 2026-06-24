# Memory.bible

A progressive web app for memorising Bible verses using spaced repetition, flip cards, and fill-in-the-blank exercises.

**Live:** [memory.bible](https://memory.bible)

## Overview

Memory.bible is a digital companion to a physical Bible verse memory card deck. Users learn verses through a structured exercise flow (flip card → fill blanks → type from memory), then revisit them on a spaced repetition schedule that adapts to their skill level.

## Features

- **Learn** — flip cards, fill-in-the-blank, and typing exercises with progressive difficulty
- **Revise** — spaced repetition queue with skill-aware exercise selection (beginner / intermediate / advanced)
- **Manage deck** — drag to reorder, add via search or curated list, stats rings per verse
- **Multiple translations** — KJV, BSB, ESV, NIV, NKJV, NASB
- **Age brackets** — child / youth / adult verse sets
- **Cloud sync** — progress syncs across devices when signed in
- **Admin** — password-protected dashboard with usage stats and feedback inbox

## Tech Stack

- **Frontend:** React + Vite, deployed on Cloudflare Pages
- **Backend:** Cloudflare Workers (Pages Functions)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Email:** Resend (password reset, feedback notifications)
- **Push notifications:** Web Push (VAPID)

## Development

```bash
npm install
npm run dev
```

Requires a `.env` file with:
```
VITE_ESV_TOKEN=
VITE_API_BIBLE_KEY=
```

## Deployment

Deployed automatically via Cloudflare Pages on push to `main`.

```bash
# Apply database migrations
wrangler d1 migrations apply memory-verses-db --remote
```

## Project Structure

```
app/
├── src/
│   ├── components/       # React components
│   ├── data/             # Local storage, spaced repetition, auth
│   ├── api/              # Bible translation API clients
│   └── index.css         # All styles
├── functions/api/        # Cloudflare Workers endpoints
└── migrations/           # D1 SQL migrations
```

## Copyright

© 2024–2025 Chris Sandford. All rights reserved.

Built with assistance from Claude (Anthropic).
