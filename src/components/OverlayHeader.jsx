import { avatarStyle } from '../data/avatarStyle.js';

// Shared header for every full-screen overlay so they all match the main
// screen header exactly: ‹ back · Memory.bible · user avatar.
export default function OverlayHeader({ onBack, user }) {
  return (
    <div className="vs-header">
      <button className="vs-back" onClick={onBack} aria-label="Back">‹</button>
      <div className="vs-header-logo">
        <span className="ttl-memory">Memory</span>
        <span className="ttl-dot-bible" style={{ color: user?.colour || '#3a8c5c' }}>.bible</span>
      </div>
      {user ? (
        <div
          className="vs-header-avatar avatar"
          style={{ ...avatarStyle(user.colour, user.pattern), '--user-colour': user.colour }}
        >
          {user.name?.charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className="vs-header-spacer" />
      )}
    </div>
  );
}
