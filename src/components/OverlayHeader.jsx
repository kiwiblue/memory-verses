import { useContext, useState } from 'react';
import { avatarStyle } from '../data/avatarStyle.js';
import Icon from './Icon.jsx';
import UserPanel from './UserPanel.jsx';
import { UserSwitcherContext } from './UserSwitcherContext.js';

// Shared header for every full-screen overlay so they all match the main
// screen header exactly: ‹ back · Memory.bible · user avatar (profile switcher).
export default function OverlayHeader({ onBack, user, onHome }) {
  const switcher = useContext(UserSwitcherContext);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="vs-header">
      <button className="vs-back" onClick={onBack} aria-label="Back"><Icon name="back" size={26} /></button>
      <div
        className="vs-header-logo"
        onClick={onHome}
        style={onHome ? { cursor: 'pointer' } : undefined}
        role={onHome ? 'button' : undefined}
        aria-label={onHome ? 'Go to main screen' : undefined}
      >
        <span className="ttl-memory">Memory</span>
        <span className="ttl-dot-bible" style={{ color: user?.colour || 'var(--color-brand)' }}>.bible</span>
      </div>
      {switcher?.currentUser ? (
        <UserPanel
          users={switcher.users}
          currentUser={switcher.currentUser}
          open={panelOpen}
          onToggle={setPanelOpen}
          onUserChange={switcher.onUserChange}
          onOpenProfile={switcher.onOpenProfile}
        />
      ) : user ? (
        <div
          className="vs-header-avatar avatar"
          style={{ ...avatarStyle(user.colour, user.pattern, user.patternOpacity), '--user-colour': user.colour }}
        >
          {user.name?.charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className="vs-header-spacer" />
      )}
    </div>
  );
}
