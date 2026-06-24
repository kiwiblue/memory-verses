import { useState, useEffect, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return (n ?? 0).toLocaleString(); }
function pct(n, total) { return total ? `${Math.round((n / total) * 100)}%` : '—'; }
function avg(n, total) { return total ? (n / total).toFixed(1) : '—'; }

function StatCard({ label, value, sub }) {
  return (
    <div className="adm-card">
      <div className="adm-card-value">{value ?? '—'}</div>
      <div className="adm-card-label">{label}</div>
      {sub && <div className="adm-card-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="adm-section">
      <h2 className="adm-section-title">{title}</h2>
      {children}
    </div>
  );
}

function DistRow({ label, count, total }) {
  const p = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="adm-dist-row">
      <span className="adm-dist-label">{label || '—'}</span>
      <div className="adm-dist-bar-wrap">
        <div className="adm-dist-bar" style={{ width: `${p}%` }} />
      </div>
      <span className="adm-dist-count">{fmt(count)} <span className="adm-dist-pct">({p}%)</span></span>
    </div>
  );
}

function Distribution({ title, data }) {
  const total = Object.values(data || {}).reduce((s, n) => s + n, 0);
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <div className="adm-dist">
      <div className="adm-dist-title">{title}</div>
      {entries.map(([k, v]) => <DistRow key={k} label={k} count={v} total={total} />)}
    </div>
  );
}

// ── Password gate ─────────────────────────────────────────────────────────────
function LoginGate({ onAuth }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function attempt(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${pw}` },
      });
      if (res.ok) {
        sessionStorage.setItem('mv-admin-pw', pw);
        onAuth(pw, await res.json());
      } else {
        setErr('Incorrect password.');
      }
    } catch {
      setErr('Could not connect.');
    }
    setBusy(false);
  }

  return (
    <div className="adm-gate">
      <div className="adm-gate-box">
        <div className="adm-gate-title">Admin</div>
        <form onSubmit={attempt} className="adm-gate-form">
          <input
            type="password" className="adm-gate-input"
            placeholder="Admin password"
            value={pw} onChange={e => setPw(e.target.value)}
            autoFocus
          />
          {err && <div className="adm-gate-err">{err}</div>}
          <button className="adm-gate-btn" disabled={busy || !pw}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const TYPE_LABELS = { bug: 'Bug report', feature: 'Feature request', general: 'General feedback' };

function FeedbackSection({ feedback }) {
  const f = feedback || {};
  const recent = f.recent || [];
  return (
    <Section title={`Feedback (${fmt(f.total)})`}>
      {f.total > 0 && (
        <div className="adm-dists" style={{ marginBottom: 16 }}>
          <Distribution title="By type" data={f.by_type} />
        </div>
      )}
      {recent.length === 0 ? (
        <p className="adm-empty">No feedback yet.</p>
      ) : (
        <div className="adm-feedback-list">
          {recent.map(item => (
            <div key={item.id} className="adm-feedback-item">
              <div className="adm-feedback-meta">
                <span className={`adm-feedback-type adm-feedback-type-${item.type}`}>
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                <span className="adm-feedback-email">{item.email || 'unknown'}</span>
                <span className="adm-feedback-ts">{new Date(item.ts * 1000).toLocaleDateString()}</span>
              </div>
              <p className="adm-feedback-msg">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Dashboard({ stats, onRefresh, refreshing }) {
  const u = stats.users    || {};
  const p = stats.progress || {};
  const e = stats.events   || {};

  const totalProfiles = u.synced_profiles || 0;
  const funnel = e.onboarding_funnel || {};

  return (
    <div className="adm-dash">
      <div className="adm-dash-hdr">
        <h1 className="adm-dash-title">memory.bible admin</h1>
        <div className="adm-dash-meta">
          <span className="adm-dash-ts">
            Generated {stats.generated_at ? new Date(stats.generated_at * 1000).toLocaleString() : '—'}
          </span>
          <button className="adm-refresh-btn" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <Section title="Users">
        <div className="adm-cards">
          <StatCard label="Registered accounts" value={fmt(u.registered)} />
          <StatCard label="Synced profiles" value={fmt(u.synced_profiles)} />
          <StatCard label="Active today" value={fmt(e.active_today)} />
          <StatCard label="Active this week" value={fmt(e.active_week)} />
          <StatCard label="Active this month" value={fmt(e.active_month)} />
          <StatCard label="Active this year" value={fmt(e.active_year)} />
        </div>
        <div className="adm-dists">
          <Distribution title="Age bracket" data={u.by_bracket} />
          <Distribution title="Translation" data={u.by_translation} />
        </div>
      </Section>

      <Section title="Progress">
        <div className="adm-cards">
          <StatCard label="Verses learning" value={fmt(p.total_learning)}
            sub={`avg ${avg(p.total_learning, totalProfiles)} per profile`} />
          <StatCard label="Verses mastered" value={fmt(p.total_mastered)}
            sub={`avg ${avg(p.total_mastered, totalProfiles)} per profile`} />
          <StatCard label="Custom verses added" value={fmt(p.total_custom_verses)}
            sub={`avg ${avg(p.total_custom_verses, totalProfiles)} per profile`} />
        </div>
      </Section>

      <Section title="Exercises">
        <div className="adm-cards">
          <StatCard label="Total completed" value={fmt(e.exercises_completed)} />
          <StatCard label="Avg errors / exercise" value={e.avg_errors_per_exercise?.toFixed(2) ?? '—'} />
        </div>
        <div className="adm-dists">
          <Distribution title="By type" data={e.exercises_by_type} />
        </div>
      </Section>

      <Section title="Onboarding funnel">
        {Object.keys(funnel).length === 0 ? (
          <p className="adm-empty">No onboarding data yet — starts accumulating from now.</p>
        ) : (
          <div className="adm-funnel">
            {[0,1,2,3].map(step => {
              const labels = ['Welcome','Translation','Verse picker','Personalise'];
              const count = funnel[step] || 0;
              const first = funnel[0] || 1;
              return (
                <div key={step} className="adm-funnel-row">
                  <span className="adm-funnel-label">Step {step + 1}: {labels[step]}</span>
                  <div className="adm-dist-bar-wrap">
                    <div className="adm-dist-bar adm-dist-bar-blue"
                      style={{ width: `${Math.round((count / first) * 100)}%` }} />
                  </div>
                  <span className="adm-dist-count">{fmt(count)} <span className="adm-dist-pct">({pct(count, first)})</span></span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Preferences">
        <div className="adm-dists">
          <Distribution title="Colour" data={u.by_colour} />
          <Distribution title="Pattern" data={u.by_pattern} />
        </div>
      </Section>

      <FeedbackSection feedback={stats.feedback} />

      <Section title="Raw event counts">
        {Object.keys(e.by_type || {}).length === 0 ? (
          <p className="adm-empty">No events yet — telemetry starts accumulating from now.</p>
        ) : (
          <div className="adm-event-table">
            {Object.entries(e.by_type).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
              <div key={type} className="adm-event-row">
                <code className="adm-event-type">{type}</code>
                <span className="adm-event-count">{fmt(count)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [pw, setPw]           = useState(() => sessionStorage.getItem('mv-admin-pw') || '');
  const [stats, setStats]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed]   = useState(false);

  // Auto-try saved password on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('mv-admin-pw');
    if (!saved) return;
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setAuthed(true); setStats(data); } })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${pw}` } });
      if (res.ok) setStats(await res.json());
    } catch {}
    setRefreshing(false);
  }, [pw]);

  if (!authed || !stats) {
    return (
      <LoginGate onAuth={(password, data) => {
        setPw(password);
        setStats(data);
        setAuthed(true);
      }} />
    );
  }

  return <Dashboard stats={stats} onRefresh={refresh} refreshing={refreshing} />;
}
