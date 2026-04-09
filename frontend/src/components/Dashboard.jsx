import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

function ScoreBar({ score, label }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${color}, ${color}dd)`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  )
}

function RecCard({ rec, rank }) {
  const [expanded, setExpanded] = useState(false)
  const roleColors = {
    protein_source: '#6366f1', vitamin_mineral: '#10b981', capsule_shell: '#f59e0b',
    sweetener: '#ec4899', flavoring: '#8b5cf6', filler_binder: '#64748b',
    carrier_oil: '#f97316', electrolyte_salt: '#06b6d4', emulsifier: '#14b8a6',
    lubricant: '#a78bfa', coloring: '#fb7185', thickener_stabilizer: '#22d3ee',
    coating: '#c084fc', anti_caking: '#94a3b8', prebiotic_fiber: '#34d399',
    preservative: '#fbbf24', disintegrant: '#f87171', acid_buffer: '#38bdf8',
    active_ingredient: '#818cf8'
  }
  const roleColor = roleColors[rec.functional_role] || 'var(--primary)'
  const typeLabel = rec.family_type === 'form_variant' ? 'Form Variant' : 'Functional Sub'
  const typeColor = rec.family_type === 'form_variant' ? 'var(--primary)' : 'var(--accent)'

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: '0.875rem',
        padding: '1.25rem 1.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: roleColor, borderRadius: '3px 0 0 3px' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Rank */}
        <div style={{
          width: 36, height: 36, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${roleColor}22, ${roleColor}11)`, border: `1px solid ${roleColor}33`,
          fontSize: '0.8125rem', fontWeight: 800, color: roleColor, flexShrink: 0
        }}>
          #{rank}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>{rec.company_name}</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '0.125rem 0.5rem', borderRadius: '0.375rem' }}>
              {rec.product_sku}
            </span>
          </div>

          {/* Substitution flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {rec.current_canonical_name}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--primary-light)' }}>→</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
              {rec.substitute_canonical_name}
            </span>
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
              fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30`
            }}>
              {rec.functional_role.replace(/_/g, ' ')}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
              fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30`
            }}>
              {typeLabel}
            </span>
            {rec.available_suppliers && rec.available_suppliers.length > 0 && (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                {rec.available_suppliers.length} supplier{rec.available_suppliers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <ScoreBar score={rec.final_score} label="Final" />
                {rec.quality_score != null && <ScoreBar score={rec.quality_score} label="Quality" />}
                {rec.compliance_score != null && <ScoreBar score={rec.compliance_score} label="Compliance" />}
              </div>
              {rec.quality_reasoning && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Quality:</strong> {rec.quality_reasoning}
                </p>
              )}
              {rec.compliance_reasoning && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Compliance:</strong> {rec.compliance_reasoning}
                </p>
              )}
              {rec.available_suppliers && rec.available_suppliers.length > 0 && (
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600, marginRight: '0.25rem' }}>Suppliers:</span>
                  {rec.available_suppliers.map((s, i) => (
                    <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Score pill */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{
            fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em',
            background: `linear-gradient(135deg, ${rec.final_score >= 0.8 ? 'var(--success)' : rec.final_score >= 0.6 ? 'var(--warning)' : 'var(--danger)'}, ${rec.final_score >= 0.8 ? '#34d399' : rec.final_score >= 0.6 ? '#fbbf24' : '#f87171'})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            {(rec.final_score * 100).toFixed(0)}
          </div>
          <span style={{ fontSize: '0.5625rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>score</span>
        </div>
      </div>

      {/* Expand hint */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', opacity: 0.5 }}>
          {expanded ? '▲ collapse' : '▼ click for details'}
        </span>
      </div>
    </div>
  )
}

export default function Dashboard({ onSelectCompany }) {
  const [stats, setStats] = useState(null)
  const [companies, setCompanies] = useState([])
  const [risks, setRisks] = useState(null)
  const [topRecs, setTopRecs] = useState([])
  const [recFilter, setRecFilter] = useState('all')
  const [recLimit, setRecLimit] = useState(10)
  const [recsOpen, setRecsOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/graph/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err))

    fetch(`${API_BASE}/companies`)
      .then(res => res.json())
      .then(data => setCompanies(data))
      .catch(err => console.error('Failed to load companies:', err))

    fetch(`${API_BASE}/risks`)
      .then(res => res.json())
      .then(data => setRisks(data))
      .catch(err => console.error('Failed to load risks:', err))

    fetch(`${API_BASE}/recommendations/top?limit=50`)
      .then(res => res.json())
      .then(data => setTopRecs(data))
      .catch(err => console.error('Failed to load recommendations:', err))
  }, [])

  if (!stats) {
    return <div className="card">Loading dashboard data...</div>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Supply Chain Intelligence Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_nodes}</div>
          <div className="stat-label">Total Nodes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_edges}</div>
          <div className="stat-label">Relationships</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.node_types.company}</div>
          <div className="stat-label">Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.node_types.ingredient}</div>
          <div className="stat-label">Ingredient Families</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.node_types.supplier}</div>
          <div className="stat-label">Suppliers</div>
        </div>
      </div>

      <div className="card">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: recsOpen ? '1.5rem' : 0, cursor: 'pointer' }}
          onClick={() => setRecsOpen(o => !o)}
        >
          <h2 style={{ marginBottom: 0 }}>🎯 Top Substitution Recommendations <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{recsOpen ? '▲' : '▼'}</span></h2>
          {recsOpen && topRecs.length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
              {['all', ...Array.from(new Set(topRecs.map(r => r.functional_role))).sort()].map(role => (
                <button
                  key={role}
                  onClick={() => { setRecFilter(role); setRecLimit(10) }}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid',
                    borderColor: recFilter === role ? 'var(--primary)' : 'var(--border)',
                    background: recFilter === role ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: recFilter === role ? 'var(--primary-light)' : 'var(--text-dim)',
                    fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {role === 'all' ? 'All' : role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {recsOpen && topRecs.length > 0 ? (() => {
          const filtered = recFilter === 'all' ? topRecs : topRecs.filter(r => r.functional_role === recFilter)
          const visible = filtered.slice(0, recLimit)
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-secondary)' }}>{visible.length}</strong> of <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> recommendations
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', background: 'rgba(16,185,129,0.1)', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                  Avg score: {(filtered.reduce((a, b) => a + b.final_score, 0) / filtered.length * 100).toFixed(0)}%
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {visible.map((rec, idx) => (
                  <RecCard key={rec.id || idx} rec={rec} rank={idx + 1} />
                ))}
              </div>

              {filtered.length > recLimit && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setRecLimit(prev => prev + 10)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    Show More ({filtered.length - recLimit} remaining)
                  </button>
                </div>
              )}
              {recLimit > 10 && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => setRecLimit(10)}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--text-dim)',
                      fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem 0.75rem',
                    }}
                  >
                    Show Less
                  </button>
                </div>
              )}
            </>
          )
        })() : recsOpen ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No recommendations available yet</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Run the recommendation pipeline to generate substitution candidates.</p>
          </div>
        ) : null}
      </div>

      {risks && (
        <div className="card">
          <h2>⚠️ Supply Chain Risks</h2>
          <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            Single-Source Ingredients ({risks.single_source_ingredients.length})
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Companies Using</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {risks.single_source_ingredients.slice(0, 5).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.canonical_name}</td>
                  <td>
                    <span className="badge badge-warning">{item.companies_using}</span>
                  </td>
                  <td>{item.supplier_names}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            High-Concentration Suppliers ({risks.supplier_concentration.length})
          </h3>
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Companies Served</th>
                <th>Materials Supplied</th>
              </tr>
            </thead>
            <tbody>
              {risks.supplier_concentration.slice(0, 5).map((sup, idx) => (
                <tr key={idx}>
                  <td>{sup.Name}</td>
                  <td>
                    <span className="badge badge-danger">{sup.companies_served}</span>
                  </td>
                  <td>{sup.materials_supplied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>🏢 Companies</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Products</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.slice(0, 20).map((company) => (
              <tr key={company.Id}>
                <td>{company.Name}</td>
                <td>{company.product_count}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => onSelectCompany(company.Id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
