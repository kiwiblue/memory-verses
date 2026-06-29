import { createContext } from 'react';

// Provides the data the shared OverlayHeader needs to render the profile
// switcher avatar inside any full-screen overlay, without threading props
// through every overlay component. App supplies the value at the root.
// Shape: { users, currentUser, onUserChange, onOpenProfile }
export const UserSwitcherContext = createContext(null);
