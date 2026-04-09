import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

const ROLE_COLORS = {
  protein_source: '#6366f1', vitamin_mineral: '#10b981', capsule_shell: '#f59e0b',
  sweetener: '#ec4899', flavoring: '#8b5cf6', filler_binder: '#64748b',
  carrier_oil: '#f97316', electrolyte_salt: '#06b6d4', emulsifier: '#14b8a6',
  lubricant: '#a78bfa', coloring: '#fb7185', thickener_stabilizer: '#22d3ee',
  coating: '#c084fc', anti_caking: '#94a3b8', prebiotic_fiber: '#34d399',
  preservative: '#fbbf24', disintegrant: '#f87171', acid_buffer: '#38bdf8',
  active_ingredient: '#818cf8',
}

function ScoreRing({ score, size = 48 }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{pct}</span>
      </div>
    </div>
  )
}

function MiniBar({ value, label, color }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  )
}

function RecCard({ rec, rank, productUrl }) {
  const [expanded, setExpanded] = useState(false)
  const roleColor = ROLE_COLORS[rec.functional_role] || '#6366f1'
  const isFormVariant = rec.family_type === 'form_variant'
  const typeLabel = isFormVariant ? 'Form Variant' : 'Functional Sub'
  const typeColor = isFormVariant ? '#6366f1' : '#ec4899'
  const displayScore = rec.weighted_score ?? rec.final_score
  const scoreColor = displayScore >= 0.8 ? '#10b981' : displayScore >= 0.6 ? '#f59e0b' : '#ef4444'

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid var(--border)',
        borderRadius: '1rem',
        padding: 0,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(99,102,241,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Color accent strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: `linear-gradient(90deg, ${roleColor}, ${roleColor}66)` }} />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          {/* Rank + Score ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#{rank}</span>
            <ScoreRing score={displayScore} size={52} />
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top line: company + product */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
              {productUrl ? (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: 'var(--primary-light)',
                    letterSpacing: '-0.01em',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    cursor: 'pointer',
                  }}
                >
                  {rec.company_name}
                </a>
              ) : (
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>{rec.company_name}</span>
              )}
              {productUrl ? (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'monospace',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {rec.product_sku}
                </a>
              ) : (
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                  {rec.product_sku}
                </span>
              )}
            </div>

            {/* Substitution: current → substitute */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500,
                padding: '0.25rem 0.625rem', background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.375rem', border: '1px solid var(--border)',
              }}>
                {rec.current_canonical_name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: 16, height: 1, background: 'var(--primary)', opacity: 0.5 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 700 }}>→</span>
                <div style={{ width: 16, height: 1, background: 'var(--success)', opacity: 0.5 }} />
              </div>
              <span style={{
                fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600,
                padding: '0.25rem 0.625rem', background: 'rgba(16,185,129,0.08)',
                borderRadius: '0.375rem', border: '1px solid rgba(16,185,129,0.2)',
              }}>
                {rec.substitute_canonical_name}
              </span>
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, opacity: 0.8 }} />
                {rec.functional_role.replace(/_/g, ' ')}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                background: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}25`,
              }}>
                {typeLabel}
              </span>
              {rec.available_suppliers && rec.available_suppliers.length > 0 && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ opacity: 0.6 }}>📦</span>
                  {rec.available_suppliers.length} supplier{rec.available_suppliers.length > 1 ? 's' : ''}
                </span>
              )}
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-dim)', marginLeft: 'auto', opacity: 0.5 }}>
                {expanded ? '▲ less' : '▼ more'}
              </span>
            </div>
          </div>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            {/* Score breakdown */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem', marginBottom: '1.25rem',
              padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem',
            }}>
              <MiniBar value={displayScore} label="Weighted Score" color={scoreColor} />
              {rec.quality_score != null && (
                <MiniBar value={rec.quality_score} label="Quality" color={rec.quality_score >= 0.8 ? '#10b981' : rec.quality_score >= 0.6 ? '#f59e0b' : '#ef4444'} />
              )}
              {rec.compliance_score != null && (
                <MiniBar value={rec.compliance_score} label="Compliance" color={rec.compliance_score >= 0.8 ? '#10b981' : rec.compliance_score >= 0.6 ? '#f59e0b' : '#ef4444'} />
              )}
              {rec.priority_rank != null && (
                <MiniBar value={rec.priority_rank} label="Priority" color="#6366f1" />
              )}
            </div>

            {/* Reasoning */}
            {(rec.quality_reasoning || rec.compliance_reasoning) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {rec.quality_reasoning && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0 }}>Quality</span>
                    <span>{rec.quality_reasoning}</span>
                  </div>
                )}
                {rec.compliance_reasoning && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0 }}>Compliance</span>
                    <span>{rec.compliance_reasoning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Suppliers */}
            {rec.available_suppliers && rec.available_suppliers.length > 0 && (
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem', display: 'block' }}>Available Suppliers</span>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {rec.available_suppliers.map((s, i) => (
                    <span key={i} style={{
                      fontSize: '0.6875rem', padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                      background: 'rgba(99,102,241,0.08)', color: 'var(--primary-light)',
                      border: '1px solid rgba(99,102,241,0.15)', fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WeightSliders({ weights, onChange }) {
  const handleSliderChange = (key, rawValue) => {
    const value = Number(rawValue)
    const others = Object.keys(weights).filter(k => k !== key)
    const remaining = 100 - value
    const othersSum = others.reduce((s, k) => s + weights[k], 0)
    const newWeights = { ...weights, [key]: value }
    if (othersSum > 0) {
      others.forEach(k => { newWeights[k] = Math.round((weights[k] / othersSum) * remaining) })
    } else {
      others.forEach((k, i) => { newWeights[k] = Math.round(remaining / others.length) })
    }
    // Fix rounding so total = 100
    const diff = 100 - Object.values(newWeights).reduce((a, b) => a + b, 0)
    if (diff !== 0) {
      const adjustKey = others.find(k => newWeights[k] > 0) || others[0]
      newWeights[adjustKey] += diff
    }
    onChange(newWeights)
  }

  const sliderMeta = {
    quality: { label: 'Quality', color: '#10b981', desc: 'Ingredient quality & similarity' },
    compliance: { label: 'Compliance', color: '#6366f1', desc: 'Dietary & allergen compatibility' },
    priority: { label: 'Priority', color: '#f59e0b', desc: 'Formulation ingredient position' },
  }

  return (
    <div style={{
      padding: '1.25rem', background: 'rgba(255,255,255,0.02)',
      borderRadius: '0.75rem', border: '1px solid var(--border)',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 700, margin: 0 }}>
          ⚖️ Scoring Weights
        </h3>
        <button
          onClick={() => onChange({ quality: 40, compliance: 30, priority: 30 })}
          style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.375rem',
            color: 'var(--text-dim)', fontSize: '0.625rem', fontWeight: 600, padding: '0.25rem 0.625rem',
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
        >Reset</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {Object.entries(sliderMeta).map(([key, meta]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: meta.color }}>{meta.label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: meta.color }}>{weights[key]}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={weights[key]}
              onChange={e => handleSliderChange(key, e.target.value)}
              style={{
                width: '100%', height: 6, borderRadius: 3,
                appearance: 'none', background: `linear-gradient(90deg, ${meta.color} ${weights[key]}%, rgba(255,255,255,0.06) ${weights[key]}%)`,
                cursor: 'pointer', outline: 'none',
              }}
            />
            <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{meta.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RecommendationsView() {
  const [topRecs, setTopRecs] = useState([])
  const [consolidation, setConsolidation] = useState([])
  const [urlMap, setUrlMap] = useState({})
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(15)
  const [sortBy, setSortBy] = useState('score')
  const [weights, setWeights] = useState({ quality: 40, compliance: 30, priority: 30 })

  useEffect(() => {
    fetch(`${API_BASE}/recommendations/top?limit=50`)
      .then(res => res.json())
      .then(data => setTopRecs(data))
      .catch(err => console.error('Failed to load recommendations:', err))

    fetch(`${API_BASE}/recommendations/consolidation`)
      .then(res => res.json())
      .then(data => setConsolidation(data))
      .catch(err => console.error('Failed to load consolidation:', err))

    fetch(`${API_BASE}/enrichment-url-map`)
      .then(res => res.json())
      .then(data => setUrlMap(data || {}))
      .catch(err => {
        console.error('Failed to load enrichment URL map:', err)
        setUrlMap({})
      })
  }, [])

  const roles = Array.from(new Set(topRecs.map(r => r.functional_role))).sort()

  const recalcScore = (rec) => {
    const q = rec.quality_score ?? 0.8
    const c = rec.compliance_score ?? 0.9
    const p = rec.priority_rank ?? 0.5
    const total = weights.quality + weights.compliance + weights.priority
    if (total === 0) return 0
    return (weights.quality * q + weights.compliance * c + weights.priority * p) / total
  }

  const filteredRecs = topRecs
    .map(r => ({ ...r, weighted_score: recalcScore(r) }))
    .filter(r => typeFilter === 'all' || r.family_type === typeFilter)
    .filter(r => roleFilter === 'all' || r.functional_role === roleFilter)
    .sort((a, b) => {
      if (sortBy === 'score') return b.weighted_score - a.weighted_score
      if (sortBy === 'company') return a.company_name.localeCompare(b.company_name)
      if (sortBy === 'role') return a.functional_role.localeCompare(b.functional_role)
      return 0
    })

  const visible = filteredRecs.slice(0, visibleCount)
  const avgScore = filteredRecs.length > 0 ? filteredRecs.reduce((a, b) => a + b.weighted_score, 0) / filteredRecs.length : 0
  const formCount = filteredRecs.filter(r => r.family_type === 'form_variant').length
  const funcCount = filteredRecs.filter(r => r.family_type === 'functional_substitute').length

  useEffect(() => {
    setVisibleCount(15)
  }, [typeFilter, roleFilter])

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Recommendation Engine</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
        AI-powered ingredient substitution analysis across your supply chain
      </p>

      {/* Summary stats bar */}
      {topRecs.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem', marginBottom: '2rem',
        }}>
          {[
            { value: filteredRecs.length, label: 'Total Matches', icon: '🎯' },
            { value: `${(avgScore * 100).toFixed(0)}%`, label: 'Avg Score', icon: '📊' },
            { value: formCount, label: 'Form Variants', icon: '🔄' },
            { value: funcCount, label: 'Functional Subs', icon: '⚡' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {/* Weight Sliders */}
        <WeightSliders weights={weights} onChange={setWeights} />

        {/* Header with controls */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: 0 }}>🎯 Top Recommendations</h2>
            {/* Sort control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sort</span>
              {[
                { key: 'score', label: 'Score' },
                { key: 'company', label: 'Company' },
                { key: 'role', label: 'Role' },
              ].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)} style={{
                  padding: '0.3rem 0.625rem', borderRadius: '0.375rem', border: '1px solid',
                  borderColor: sortBy === s.key ? 'var(--primary)' : 'var(--border)',
                  background: sortBy === s.key ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: sortBy === s.key ? 'var(--primary-light)' : 'var(--text-dim)',
                  fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All Types' },
              { key: 'form_variant', label: 'Form Variants' },
              { key: 'functional_substitute', label: 'Functional Substitutes' },
            ].map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)} style={{
                padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid',
                borderColor: typeFilter === f.key ? 'var(--primary)' : 'var(--border)',
                background: typeFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: typeFilter === f.key ? 'var(--primary-light)' : 'var(--text-dim)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
              }}>{f.label}</button>
            ))}
          </div>

          {/* Role filter */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button onClick={() => setRoleFilter('all')} style={{
              padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid',
              borderColor: roleFilter === 'all' ? 'var(--text-muted)' : 'var(--border)',
              background: roleFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: roleFilter === 'all' ? 'var(--text-secondary)' : 'var(--text-dim)',
              fontSize: '0.625rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
              textTransform: 'uppercase', letterSpacing: '0.03em',
            }}>All Roles</button>
            {roles.map(role => {
              const c = ROLE_COLORS[role] || '#6366f1'
              return (
                <button key={role} onClick={() => setRoleFilter(role)} style={{
                  padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid',
                  borderColor: roleFilter === role ? `${c}60` : 'var(--border)',
                  background: roleFilter === role ? `${c}18` : 'transparent',
                  color: roleFilter === role ? c : 'var(--text-dim)',
                  fontSize: '0.625rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                  textTransform: 'uppercase', letterSpacing: '0.03em',
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, opacity: roleFilter === role ? 1 : 0.4 }} />
                  {role.replace(/_/g, ' ')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results count */}
        {filteredRecs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>
              Showing <strong style={{ color: 'var(--text-secondary)' }}>{Math.min(visibleCount, filteredRecs.length)}</strong> of <strong style={{ color: 'var(--text-secondary)' }}>{filteredRecs.length}</strong>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-hover)' }} />
            <span>Avg score <strong style={{ color: avgScore >= 0.8 ? 'var(--success)' : avgScore >= 0.6 ? 'var(--warning)' : 'var(--danger)' }}>{(avgScore * 100).toFixed(0)}%</strong></span>
          </div>
        )}

        {/* Recommendation cards */}
        {visible.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {visible.map((rec, idx) => (
                <RecCard
                  key={rec.id || idx}
                  rec={rec}
                  rank={idx + 1}
                  productUrl={urlMap[rec.product_sku]}
                />
              ))}
            </div>

            {/* Load more / less */}
            {filteredRecs.length > visibleCount && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button onClick={() => setVisibleCount(prev => prev + 15)} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                  Show More ({filteredRecs.length - visibleCount} remaining)
                </button>
              </div>
            )}
            {visibleCount > 15 && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button onClick={() => setVisibleCount(15)} style={{
                  background: 'transparent', border: 'none', color: 'var(--text-dim)',
                  fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem 0.75rem',
                }}>Collapse</button>
              </div>
            )}

            {/* Methodology */}
            <div style={{
              marginTop: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.015)',
              borderRadius: '0.75rem', border: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                📊 How Scores Are Calculated
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: '#10b981' }}>Quality ({weights.quality}%)</strong>
                  <p>Evaluates ingredient quality — form variants score higher as they're chemically similar.</p>
                </div>
                <div>
                  <strong style={{ color: '#6366f1' }}>Compliance ({weights.compliance}%)</strong>
                  <p>LLM-verified dietary and allergen compatibility. Ensures substitutes meet requirements.</p>
                </div>
                <div>
                  <strong style={{ color: '#f59e0b' }}>Priority ({weights.priority}%)</strong>
                  <p>Based on ingredient position in formulation — higher weight for primary ingredients.</p>
                </div>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                Weighted Score = ({weights.quality}% × Quality) + ({weights.compliance}% × Compliance) + ({weights.priority}% × Priority) — adjust sliders above to tune.
              </p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No Recommendations Found</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
              {topRecs.length > 0 ? 'Try adjusting the filters above.' : 'Run the recommendation pipeline to generate substitution candidates.'}
            </p>
          </div>
        )}
      </div>

      {/* Consolidation section */}
      {consolidation.length > 0 && (
        <div className="card">
          <h2>🔗 Supplier Consolidation Opportunities</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            Reduce supplier complexity by switching to substitutes available from fewer suppliers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {consolidation.slice(0, 15).map((opp, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                borderRadius: '0.75rem', padding: '1rem 1.25rem',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.125rem' }}>{opp.company_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 500 }}>→ {opp.supplier_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)' }}>{opp.substitution_count}</div>
                    <div style={{ fontSize: '0.5625rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>swaps</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${opp.avg_score * 100}%`, borderRadius: 2, background: 'var(--success)', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>{(opp.avg_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
