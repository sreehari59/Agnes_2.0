import { useState, useRef, useEffect } from 'react'

export default function MultiSelectFilter({ label, options, selected, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [])

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onChange(next)
  }

  const removeItem = (id) => {
    const next = new Set(selected)
    next.delete(id)
    onChange(next)
  }

  const clearAll = () => onChange(new Set())

  const selectedOptions = options.filter((o) => selected.has(o.id))

  return (
    <div className="msf-container" ref={containerRef}>
      <label className="msf-label">{label}</label>

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="msf-chips">
          {selectedOptions.slice(0, 5).map((o) => (
            <span key={o.id} className="msf-chip">
              <span className="msf-chip-text">{o.label.length > 18 ? o.label.substring(0, 16) + '...' : o.label}</span>
              <span className="msf-chip-remove" onClick={() => removeItem(o.id)}>x</span>
            </span>
          ))}
          {selectedOptions.length > 5 && (
            <span className="msf-chip msf-chip-more">+{selectedOptions.length - 5} more</span>
          )}
          <span className="msf-clear" onClick={clearAll}>Clear</span>
        </div>
      )}

      {/* Toggle / search input */}
      <div className="msf-input-wrapper" onClick={() => setOpen(true)}>
        <input
          type="text"
          className="msf-search"
          placeholder={`Search ${label.toLowerCase()}... (${options.length})`}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        <span className="msf-arrow">{open ? '▴' : '▾'}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="msf-dropdown">
          {filtered.length === 0 && (
            <div className="msf-no-results">No results</div>
          )}
          {filtered.slice(0, 100).map((o) => (
            <div key={o.id} className={`msf-option${selected.has(o.id) ? ' selected' : ''}`} onClick={() => toggle(o.id)}>
              <span className={`msf-checkbox${selected.has(o.id) ? ' checked' : ''}`}>
                {selected.has(o.id) ? '✓' : ''}
              </span>
              <span className="msf-option-label">{o.label}</span>
            </div>
          ))}
          {filtered.length > 100 && (
            <div className="msf-no-results">Showing first 100 of {filtered.length} results</div>
          )}
        </div>
      )}
    </div>
  )
}
