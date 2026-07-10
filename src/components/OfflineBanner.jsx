import { useState, useEffect } from 'react';

// Only KJV is bundled with the app (see data/verses.js), so it's the one
// translation guaranteed to work with no connection. Everything else is fetched
// from the server on demand; offline, only verses already viewed (and cached)
// will show.
const OFFLINE_SAFE = new Set(['kjv']);
const LABEL = { kjv: 'KJV', bsb: 'BSB', esv: 'ESV', niv: 'NIV', nkjv: 'NKJV', nasb: 'NASB' };

export default function OfflineBanner({ version }) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;

  const external = version && !OFFLINE_SAFE.has(version);
  return (
    <div className="offline-banner" role="status">
      {external ? (
        <>You're offline — <strong>{LABEL[version] || version.toUpperCase()}</strong> needs a connection. Verses show in KJV where saved.</>
      ) : (
        <>You're offline — only saved verses are available.</>
      )}
    </div>
  );
}
