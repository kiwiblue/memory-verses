import { useEffect, useRef } from 'react';

/*
 * useModalA11y(onClose)
 * ---------------------------------------------------------------------------
 * Reusable accessibility behaviour for modal/overlay dialogs:
 *   - Escape closes the dialog (calls onClose, if provided).
 *   - Tab / Shift+Tab is trapped within the dialog's focusable elements.
 *   - On mount, focus moves into the dialog (first focusable element, or the
 *     container itself if nothing focusable is found — guarded so an empty
 *     focusable list never throws).
 *   - On unmount, focus is restored to whatever had focus before the dialog
 *     opened (guarded in case that element no longer exists in the DOM).
 *
 * Usage: const ref = useModalA11y(onClose); <div ref={ref} role="dialog" ...>
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y(onClose) {
  const containerRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Remember what had focus so we can restore it on unmount.
    previousActiveRef.current = document.activeElement;

    // Move focus into the dialog.
    const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      // Nothing focusable inside — fall back to the container itself.
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      container.focus();
    }

    function getFocusable() {
      return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          // No focusable elements — keep focus trapped on the container.
          e.preventDefault();
          container.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const previous = previousActiveRef.current;
      if (previous && document.contains(previous) && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [onClose]);

  return containerRef;
}

export default useModalA11y;
