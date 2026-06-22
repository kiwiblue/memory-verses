// Shared avatar style helper used by UserPanel and ProfileModal

export const PATTERNS = [
  { id: 'none',    label: 'Solid' },
  { id: 'dots',    label: 'Dots',    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='2' cy='2' r='1.8' fill='rgba(255,255,255,0.6)'/></svg>` },
  { id: 'stripes', label: 'Stripes', svg: `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M-2 2l4-4M0 8l8-8M6 10l4-4' stroke='rgba(255,255,255,0.6)' stroke-width='2'/></svg>` },
  { id: 'grid',    label: 'Grid',    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 4H8M4 0V8' stroke='rgba(255,255,255,0.5)' stroke-width='1'/></svg>` },
  { id: 'waves',   label: 'Waves',   svg: `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='6'><path d='M0 3Q3 0 6 3Q9 6 12 3' stroke='rgba(255,255,255,0.6)' stroke-width='1.5' fill='none'/></svg>`, size: '12px 6px' },
  { id: 'cross',   label: 'Cross',   svg: `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M5 2V8M2 5H8' stroke='rgba(255,255,255,0.6)' stroke-width='1.5'/></svg>`, size: '10px 10px' },
];

export function avatarStyle(colour, patternId) {
  const p = PATTERNS.find(x => x.id === patternId);
  const style = { backgroundColor: colour };
  if (p?.svg) {
    style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(p.svg)}")`;
    style.backgroundSize = p.size || '8px 8px';
    style.backgroundBlendMode = 'overlay';
  }
  return style;
}
