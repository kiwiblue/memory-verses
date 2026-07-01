// Shared avatar style helper used by UserPanel and ProfileModal

export const DEFAULT_PATTERN_OPACITY = 0.3;
export const PATTERN_OPACITY_MIN = 0.05;
export const PATTERN_OPACITY_MAX = 0.6;

// Each pattern's SVG is a function of opacity (0–1) so the fade slider can
// adjust it live; `o` fills in the rgba alpha channel.
export const PATTERNS = [
  { id: 'none',    label: 'Solid' },
  { id: 'dots',    label: 'Dots',    svg: (o) => `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='2' cy='2' r='1.8' fill='rgba(255,255,255,${o})'/></svg>` },
  { id: 'stripes', label: 'Stripes', svg: (o) => `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M-2 2l4-4M0 8l8-8M6 10l4-4' stroke='rgba(255,255,255,${o})' stroke-width='2'/></svg>` },
  { id: 'grid',    label: 'Grid',    svg: (o) => `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 4H8M4 0V8' stroke='rgba(255,255,255,${o})' stroke-width='1'/></svg>` },
  { id: 'waves',   label: 'Waves',   svg: (o) => `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='6'><path d='M0 3Q3 0 6 3Q9 6 12 3' stroke='rgba(255,255,255,${o})' stroke-width='1.5' fill='none'/></svg>`, size: '12px 6px' },
  { id: 'cross',   label: 'Cross',   svg: (o) => `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M5 2V8M2 5H8' stroke='rgba(255,255,255,${o})' stroke-width='1.5'/></svg>`, size: '10px 10px' },
];

export function avatarStyle(colour, patternId, opacity = DEFAULT_PATTERN_OPACITY) {
  const p = PATTERNS.find(x => x.id === patternId);
  const style = { backgroundColor: colour };
  if (p?.svg) {
    const svg = p.svg(opacity);
    style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    style.backgroundSize = p.size || '8px 8px';
    style.backgroundBlendMode = 'overlay';
  }
  return style;
}
