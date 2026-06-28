import { useState } from 'react';
import Icon from './Icon.jsx';

// Living style guide — renders every design token and component sample on one
// page. Open at ?styleguide. Toggle light/dark to audit both themes at once.

const COLOR_GROUPS = [
  ['Brand', ['--color-brand', '--color-brand-dark', '--color-brand-muted', '--color-brand-subtle', '--color-brand-accent']],
  ['Success', ['--color-success', '--color-success-bg']],
  ['Warning', ['--color-warning', '--color-warning-dark', '--color-warning-text', '--color-warning-bg']],
  ['Danger', ['--color-danger', '--color-danger-dark', '--color-danger-bg', '--color-danger-muted', '--color-danger-accent']],
  ['Info', ['--color-info', '--color-info-bg']],
  ['Accents', ['--color-mastery', '--color-star', '--color-star-bg', '--color-learn-today-bg']],
  ['Skill', ['--color-skill-easy', '--color-skill-moderate', '--color-skill-hard']],
  ['Surfaces', ['--color-header-bg', '--color-bg', '--color-surface', '--color-surface-sunken', '--color-surface-hover']],
  ['Text', ['--color-text-primary', '--color-text-secondary', '--color-text-muted', '--color-text-faint', '--color-text-inverse']],
  ['Borders', ['--color-border', '--color-border-strong', '--color-border-subtle']],
];

const FONT_SIZES = ['--font-size-2xs', '--font-size-xs', '--font-size-sm', '--font-size-base', '--font-size-md', '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-3xl'];
const RADII = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full'];
const SHADOWS = ['--shadow-sm', '--shadow-md', '--shadow-lg'];
const ICON_NAMES = ['back', 'forward', 'up', 'down', 'close', 'check', 'star', 'drag', 'add', 'info', 'streak', 'ranking', 'book', 'calendar', 'celebrate', 'moon', 'sun'];

function tokenVal(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function Swatch({ name }) {
  return (
    <div className="sg-swatch">
      <div className="sg-chip" style={{ background: `var(${name})` }} />
      <div className="sg-swatch-meta">
        <code>{name.replace('--color-', '')}</code>
        <span>{tokenVal(name)}</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="sg-section">
      <h2 className="sg-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');
  const [starOn, setStarOn] = useState(true);
  const [toggleOn, setToggleOn] = useState(true);

  function flip() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  }

  return (
    <div className="sg-page">
      <header className="sg-top">
        <div>
          <h1 className="sg-h1">Memory.bible — Style Guide</h1>
          <p className="sg-sub">Single source of truth for tokens &amp; components. Edit values in <code>:root</code> (index.css).</p>
        </div>
        <button className="sg-theme-btn" onClick={flip}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} /> {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </header>

      <Section title="Colour tokens">
        {COLOR_GROUPS.map(([label, names]) => (
          <div key={label} className="sg-color-group">
            <h3 className="sg-h3">{label}</h3>
            <div className="sg-swatches">
              {names.map(n => <Swatch key={n} name={n} />)}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Typography">
        {FONT_SIZES.map(fs => (
          <div key={fs} className="sg-type-row" style={{ fontSize: `var(${fs})` }}>
            <span>The quick brown fox — Romans 3:23</span>
            <code className="sg-type-tag">{fs.replace('--font-size-', '')} · {tokenVal(fs)}</code>
          </div>
        ))}
      </Section>

      <Section title="Radius">
        <div className="sg-row">
          {RADII.map(r => (
            <div key={r} className="sg-radius-demo" style={{ borderRadius: `var(${r})` }}>
              <code>{r.replace('--radius-', '')}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shadows">
        <div className="sg-row">
          {SHADOWS.map(s => (
            <div key={s} className="sg-shadow-demo" style={{ boxShadow: `var(${s})` }}>
              <code>{s.replace('--shadow-', '')}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Icons (Phosphor · fill)">
        <div className="sg-icons">
          {ICON_NAMES.map(n => (
            <div key={n} className="sg-icon-cell">
              <Icon name={n} size={24} />
              <code>{n}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="sg-row sg-wrap">
          <button className="ob-btn-primary">Primary</button>
          <button className="btn">Default</button>
          <button className="btn btn-ok">OK</button>
          <button className="pm-save-btn">SAVE</button>
          <button className="pm-edit-link">Edit</button>
          <button className="vs-ex-btn">Exercise option</button>
          <button className="ex-skip-btn">Skip <Icon name="forward" size={16} /></button>
          <button className="type-hint-btn">Hint</button>
        </div>
        <div className="sg-row sg-wrap" style={{ marginTop: 12 }}>
          <button className="dp-circle-btn dp-btn-info"><Icon name="info" size={16} /></button>
          <button className="dp-circle-btn dp-btn-add"><Icon name="add" size={16} /></button>
          <button className="dp-circle-btn dp-btn-del"><Icon name="close" size={16} /></button>
          <button className="dp-learn-today-btn">learn today</button>
          <button className={`vs-action-btn vs-action-star${starOn ? ' vs-starred' : ''}`} onClick={() => setStarOn(s => !s)}>
            <Icon name="star" size={16} weight={starOn ? 'fill' : 'regular'} /> {starOn ? 'Starred' : 'Star'}
          </button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="sg-row sg-wrap">
          <span className="dp-badge dp-badge-today">learn today</span>
          <span className="dp-badge dp-badge-upnext">up next</span>
          <span className="dp-badge dp-badge-easy">easy</span>
          <span className="dp-badge dp-badge-mod">moderate</span>
          <span className="dp-badge dp-badge-hard">hard</span>
        </div>
      </Section>

      <Section title="Toggle">
        <div className="push-toggle-row" style={{ maxWidth: 320 }}>
          <span className="push-toggle-label">Daily Memory Reminder</span>
          <button className={`push-toggle-btn${toggleOn ? ' on' : ''}`} onClick={() => setToggleOn(t => !t)}>
            {toggleOn ? 'On' : 'Off'}
          </button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="sg-row sg-wrap" style={{ alignItems: 'flex-start' }}>
          <input className="pm-input" placeholder="Text input" style={{ maxWidth: 220 }} />
          <select className="pm-select" style={{ maxWidth: 220 }}><option>Select option</option></select>
          <div className="tabs" style={{ maxWidth: 280 }}>
            <div className="tab on">Child</div>
            <div className="tab">Youth</div>
            <div className="tab">Adult</div>
          </div>
        </div>
      </Section>

      <Section title="Card">
        <div className="pm-card" style={{ maxWidth: 360 }}>
          <div className="pm-card-title-row">
            <span className="pm-card-title">Card title</span>
            <button className="pm-edit-link">Edit</button>
          </div>
          <div className="pm-info-row"><span className="pm-info-key">Key:</span><span className="pm-info-val">Value</span></div>
          <div className="pm-info-row"><span className="pm-info-key">Another:</span><span className="pm-info-val">Value</span></div>
        </div>
      </Section>
    </div>
  );
}
