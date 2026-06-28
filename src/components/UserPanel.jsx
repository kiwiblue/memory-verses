import { useEffect, useRef } from 'react';
import { saveCurrentUserId } from '../data/users.js';
import { avatarStyle } from '../data/avatarStyle.js';

function Avatar({ user, size = 32 }) {
  return (
    <div
      className="avatar"
      style={{ ...avatarStyle(user.colour, user.pattern), width: size, height: size, '--user-colour': user.colour }}
      title={user.name}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserPanel({ users, currentUser, onUserChange, onOpenProfile, onToggle, open }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onToggle(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open, onToggle]);

  function handleSelectUser(user) {
    if (user.id === currentUser?.id) return;
    saveCurrentUserId(user.id);
    onUserChange(user);
    onToggle(false);
  }

  function handleOpenProfile(e, user) {
    e.stopPropagation();
    onToggle(false);
    onOpenProfile(user);
  }

  const multiUser = users.length > 1;

  function handleAvatarClick() {
    if (multiUser) {
      onToggle(!open);
    } else {
      onOpenProfile(currentUser);
    }
  }

  return (
    <div className="user-panel-wrap" ref={wrapRef}>
      {currentUser && (
        <div
          className="avatar"
          style={{ ...avatarStyle(currentUser.colour, currentUser.pattern), '--user-colour': currentUser.colour }}
          onClick={handleAvatarClick}
          title={currentUser.name}
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
      )}

      {multiUser && open && (
        <div className="user-panel">
          <div className="user-panel-hdr">Switch User</div>
          {users.map(u => (
            <div
              key={u.id}
              className={`user-row${u.id === currentUser?.id ? ' active' : ''}`}
              onClick={() => handleSelectUser(u)}
            >
              <Avatar user={u} size={28} />
              <span className="uname">{u.name}</span>
              <button
                className="user-profile-btn"
                onClick={e => handleOpenProfile(e, u)}
              >Profile</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
