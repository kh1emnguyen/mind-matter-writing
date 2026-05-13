import { useEffect, useState } from 'react'
import { marked } from 'marked'
import { supabase } from '../lib/supabase'

marked.setOptions({ breaks: true })

const SECTION_META = [
  { key: 'progress_check',     label: 'Progress Check',     icon: '◎' },
  { key: 'writing_quality',    label: 'Writing Quality',    icon: '✦' },
  { key: 'quick_wins',         label: 'Quick Wins',         icon: '↑' },
  { key: 'friendly_critique',  label: 'Friendly Critique',  icon: '→' },
  { key: 'questions_answered', label: 'Questions Answered', icon: '?' },
  { key: 'questions_to_ponder',label: 'Questions to Ponder',icon: '∿' },
  { key: 'sources',            label: 'Sources',            icon: '≡' },
]

const ITEM_SECTIONS = [
  { key: 'all',               label: 'All' },
  { key: 'quick_wins',        label: 'Quick Wins' },
  { key: 'friendly_critique', label: 'Critique' },
  { key: 'questions_ponder',  label: 'Questions' },
]

const ITEM_STATUSES = [
  { key: 'all',                    label: 'All' },
  { key: 'outstanding',            label: 'Outstanding' },
  { key: 'pending_implementation', label: 'Pending' },
  { key: 'verified_success',       label: 'Verified' },
  { key: 'discarded',              label: 'Discarded' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Collapsible section card used in Timeline tab ──────────────────────────
function SectionCard({ secMeta, content, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`af-section-card${open ? ' open' : ''}`}>
      <button className="af-section-header" onClick={() => setOpen(o => !o)}>
        <span className="af-section-icon">{secMeta.icon}</span>
        <span className="af-section-label">{secMeta.label}</span>
        <span className="af-section-chevron">{open ? '↑' : '↓'}</span>
      </button>
      {open && (
        <div className="af-section-body">
          {content ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>
              No content for this section.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Timeline Tab ───────────────────────────────────────────────────────────
function TimelineView({ versions }) {
  const [selectedId, setSelectedId] = useState(
    versions.length ? versions[versions.length - 1].id : null
  )
  const selected = versions.find(v => v.id === selectedId)

  return (
    <div className="af-timeline-layout">
      {/* Left: version list */}
      <div className="af-version-list">
        <div className="af-list-label">Iterations</div>
        {[...versions].reverse().map((v, i) => {
          const vNum = versions.length - i
          return (
            <button
              key={v.id}
              className={`af-version-item${v.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(v.id)}
            >
              <div className="af-vi-connector" />
              <div className="af-vi-dot" />
              <div className="af-vi-body">
                <div className="af-vi-label">V{vNum}</div>
                <div className="af-vi-date">{formatShortDate(v.run_at)}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: sections for selected version */}
      <div className="af-sections-pane">
        {selected ? (
          <>
            <div className="af-sections-header">
              V{versions.findIndex(v => v.id === selected.id) + 1} · {formatDate(selected.run_at)}
            </div>
            {SECTION_META.map((s, i) => (
              <SectionCard
                key={s.key}
                secMeta={s}
                content={selected.sections?.[s.key] ?? null}
                defaultOpen={i < 2}
              />
            ))}
          </>
        ) : (
          <div className="loading-state" style={{ minHeight: 160 }}>
            Select a version
          </div>
        )}
      </div>
    </div>
  )
}

// ── All Items Tab ──────────────────────────────────────────────────────────
function ItemsView({ items, versions, onItemUpdate }) {
  const [filterSection, setFilterSection] = useState('all')
  const [filterStatus, setFilterStatus]   = useState('all')

  const filtered = items.filter(item => {
    if (filterSection !== 'all' && item.section !== filterSection) return false
    if (filterStatus  !== 'all' && item.status  !== filterStatus)  return false
    return true
  })

  // Map run_id → version number (1-indexed, oldest first)
  const runToVersion = {}
  versions.forEach((v, i) => { runToVersion[v.id] = i + 1 })

  const outstandingQuestions = items.filter(
    i => i.section === 'questions_ponder' && i.status === 'outstanding'
  )

  async function handleAction(itemId, newStatus) {
    const { error } = await supabase
      .from('feedback_items')
      .update({ status: newStatus, actioned_at: new Date().toISOString() })
      .eq('id', itemId)
    if (!error) onItemUpdate(itemId, newStatus)
  }

  return (
    <div className="af-items-view">

      {/* Persistent questions banner */}
      {outstandingQuestions.length > 0 && (
        <div className="af-questions-banner">
          <div className="af-qb-label">∿ Outstanding Questions · {outstandingQuestions.length} active</div>
          <div className="af-qb-items">
            {outstandingQuestions.map(q => (
              <div key={q.id} className="af-qb-item">
                <span className="af-qb-text">{q.content}</span>
                <span className="af-qb-version">V{runToVersion[q.run_id] || '?'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="af-filter-bar">
        <div className="af-filter-group">
          {ITEM_SECTIONS.map(s => (
            <button
              key={s.key}
              className={`af-filter-pill${filterSection === s.key ? ' active' : ''}`}
              onClick={() => setFilterSection(s.key)}
            >{s.label}</button>
          ))}
        </div>
        <div className="af-filter-group">
          {ITEM_STATUSES.map(s => (
            <button
              key={s.key}
              className={`af-filter-pill${filterStatus === s.key ? ' active' : ''}`}
              onClick={() => setFilterStatus(s.key)}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div className="af-items-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 120 }}>
            <div className="empty-state-text">No items match this filter</div>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className={`af-item ${item.status}`}>
              <div className="af-item-meta">
                <span className="af-item-section">{item.section?.replace(/_/g, ' ')}</span>
                <span className="af-item-version">V{runToVersion[item.run_id] || '?'}</span>
                {item.section === 'questions_ponder' && item.status === 'outstanding' && (
                  <span className="af-item-persistent">∞ persistent</span>
                )}
              </div>
              <div className="af-item-content">{item.content}</div>
              {item.verification_notes && (
                <div className="verification-notes">↳ {item.verification_notes}</div>
              )}
              <div className="af-item-actions">
                {item.status === 'outstanding' && (
                  <>
                    <button className="item-btn discard"    onClick={() => handleAction(item.id, 'discarded')}>Discard</button>
                    <button className="item-btn implement"  onClick={() => handleAction(item.id, 'pending_implementation')}>Implement</button>
                  </>
                )}
                {item.status === 'discarded' && (
                  <button className="item-btn undiscard" onClick={() => handleAction(item.id, 'outstanding')}>Restore</button>
                )}
                {item.status === 'pending_implementation' && (
                  <span className="item-status-badge pending">⟳ Pending your edit</span>
                )}
                {(item.status === 'verified_success' || item.status === 'verified_partial') && (
                  <span className={`item-status-badge ${item.status}`}>
                    {item.status === 'verified_success' ? '✓ Verified' : '◑ Partial'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function AllFeedback({ draftTitle, onBack }) {
  const [activeTab, setActiveTab] = useState('timeline')
  const [versions,  setVersions]  = useState([])
  const [allItems,  setAllItems]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { loadAll() }, [draftTitle])

  async function loadAll() {
    setLoading(true)
    const [versionsRes, itemsRes] = await Promise.all([
      supabase
        .from('writing_feedback')
        .select('id, version_number, run_at, sections')
        .eq('draft_title', draftTitle)
        .order('run_at', { ascending: true }),
      supabase
        .from('feedback_items')
        .select('*')
        .eq('draft_title', draftTitle)
        .order('created_at', { ascending: true }),
    ])
    setVersions(versionsRes.data || [])
    setAllItems(itemsRes.data  || [])
    setLoading(false)
  }

  function handleItemUpdate(itemId, newStatus) {
    setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
  }

  return (
    <div className="draft-view">

      <div className="draft-view-header">
        <button className="back-btn" onClick={onBack}>← Back to Draft</button>
        <h1 className="draft-view-title">{draftTitle}</h1>
        <span className="draft-view-meta" style={{ color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11 }}>
          All Feedback
        </span>
      </div>

      {/* Tab bar */}
      <div className="af-tabs">
        <button
          className={`af-tab${activeTab === 'timeline' ? ' active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          className={`af-tab${activeTab === 'items' ? ' active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          All Items
        </button>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : versions.length === 0 ? (
        <div className="loading-state" style={{ flexDirection: 'column', gap: 12 }}>
          <div className="empty-state-icon">✦</div>
          <div className="empty-state-text">No feedback generated yet</div>
          <div className="empty-state-sub">The assistant will run on the next cycle.</div>
        </div>
      ) : activeTab === 'timeline' ? (
        <TimelineView versions={versions} />
      ) : (
        <ItemsView items={allItems} versions={versions} onItemUpdate={handleItemUpdate} />
      )}
    </div>
  )
}
