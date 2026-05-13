import { useEffect, useState, useCallback } from 'react'
import { marked } from 'marked'
import { supabase } from '../lib/supabase'
import SectionNode from '../components/SectionNode'
import FeedbackItem from '../components/FeedbackItem'

marked.setOptions({ breaks: true })

const SECTIONS = [
  { key: 'progress_check',     label: 'Progress Check',     icon: '◎', itemSection: null },
  { key: 'writing_quality',    label: 'Writing Quality',    icon: '✦', itemSection: null },
  { key: 'quick_wins',         label: 'Quick Wins',         icon: '↑', itemSection: 'quick_wins' },
  { key: 'friendly_critique',  label: 'Friendly Critique',  icon: '→', itemSection: 'friendly_critique' },
  { key: 'questions_answered', label: 'Questions Answered', icon: '?', itemSection: null },
  { key: 'questions_to_ponder',label: 'Questions to Ponder',icon: '∿', itemSection: 'questions_ponder' },
  { key: 'sources',            label: 'Sources',            icon: '≡', itemSection: null },
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

export default function DraftView({ draftTitle, onBack, onAllFeedback }) {
  const [versions,         setVersions]         = useState([])
  const [selectedVersion,  setSelectedVersion]  = useState(null)
  const [items,            setItems]            = useState([])
  const [loadingVersions,  setLoadingVersions]  = useState(true)
  const [loadingItems,     setLoadingItems]     = useState(false)
  const [expandedSection,  setExpandedSection]  = useState(null)

  // Load versions for this draft
  useEffect(() => { loadVersions() }, [draftTitle])

  // Load items when selected version changes
  useEffect(() => { if (selectedVersion) loadItems(selectedVersion.id) }, [selectedVersion])

  // Close overlay on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') setExpandedSection(null) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  async function loadVersions() {
    setLoadingVersions(true)
    const { data } = await supabase
      .from('writing_feedback')
      .select('id, version_number, run_at, sections')
      .eq('draft_title', draftTitle)
      .order('run_at', { ascending: false })

    setVersions(data || [])
    if (data && data.length > 0) setSelectedVersion(data[0])
    setLoadingVersions(false)
  }

  async function loadItems(runId) {
    setLoadingItems(true)

    // Items for the current run
    const { data: runItems } = await supabase
      .from('feedback_items')
      .select('*')
      .eq('run_id', runId)
      .order('created_at')

    // v3: ALL outstanding questions_ponder for this draft across every version
    // (they persist until resolved or discarded)
    const { data: persistentQuestions } = await supabase
      .from('feedback_items')
      .select('*')
      .eq('draft_title', draftTitle)
      .eq('section', 'questions_ponder')
      .eq('status', 'outstanding')
      .order('created_at')

    // Merge: deduplicate by id so current-run questions aren't doubled
    const runItemIds = new Set((runItems || []).map(i => i.id))
    const extraQuestions = (persistentQuestions || []).filter(q => !runItemIds.has(q.id))

    setItems([...(runItems || []), ...extraQuestions])
    setLoadingItems(false)
  }

  function handleItemUpdate(id, newStatus) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
  }

  // Count outstanding items for a section
  // For questions_ponder this naturally covers cross-version questions since items[] already includes them
  function outstandingFor(sectionKey) {
    return items.filter(i => i.section === sectionKey && i.status === 'outstanding').length
  }

  function itemsFor(sectionKey) {
    return items.filter(i => i.section === sectionKey)
  }

  const sections   = selectedVersion?.sections || {}
  const latestRun  = versions[0]?.run_at

  return (
    <div className="draft-view">

      {/* Header */}
      <div className="draft-view-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1 className="draft-view-title">{draftTitle}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {latestRun && (
            <span className="draft-view-meta">Last run: {formatDate(latestRun)}</span>
          )}
          {onAllFeedback && (
            <button className="all-feedback-btn" onClick={onAllFeedback}>
              All Feedback ↗
            </button>
          )}
        </div>
      </div>

      {/* Version timeline */}
      {!loadingVersions && versions.length > 0 && (
        <div className="version-bar">
          <span className="version-bar-label">Versions</span>
          {versions.map((v, i) => (
            <button
              key={v.id}
              className={`version-pill${selectedVersion?.id === v.id ? ' active' : ''}`}
              onClick={() => setSelectedVersion(v)}
            >
              <span className="version-num">V{versions.length - i}</span>
              <span className="version-date">{formatShortDate(v.run_at)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Section grid */}
      <div className="section-grid-container">
        {loadingVersions ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : versions.length === 0 ? (
          <div className="section-grid">
            <div className="empty-state">
              <div className="empty-state-icon">✦</div>
              <div className="empty-state-text">No feedback yet</div>
              <div className="empty-state-sub">The assistant will generate its first report on the next cycle.</div>
            </div>
          </div>
        ) : (
          <div className="section-grid">
            {SECTIONS.map(sec => (
              <SectionNode
                key={sec.key}
                section={sections[sec.key] ?? null}
                title={sec.label}
                icon={sec.icon}
                outstandingCount={sec.itemSection ? outstandingFor(sec.itemSection) : 0}
                onClick={() => setExpandedSection(sec)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expanded section overlay */}
      {expandedSection && (
        <div
          className="section-overlay"
          onClick={e => { if (e.target === e.currentTarget) setExpandedSection(null) }}
        >
          <div className="section-panel">
            <div className="section-panel-header">
              <div className="section-panel-title-group">
                <span className="section-panel-icon">{expandedSection.icon}</span>
                <h2 className="section-panel-title">{expandedSection.label}</h2>
                {/* v3 indicator: persistent questions note */}
                {expandedSection.itemSection === 'questions_ponder' && (
                  <span className="persistent-badge">∞ persistent</span>
                )}
              </div>
              <button className="close-btn" onClick={() => setExpandedSection(null)}>×</button>
            </div>

            <div className="section-panel-content">
              {/* Markdown content from this version */}
              {sections[expandedSection.key] ? (
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: marked.parse(sections[expandedSection.key]) }}
                />
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No content for this section yet.
                </p>
              )}

              {/* Feedback items (Quick Wins / Critique / Questions) */}
              {expandedSection.itemSection && (
                <>
                  <hr className="items-divider" />
                  <div className="items-label">
                    Feedback Items
                    {expandedSection.itemSection === 'questions_ponder' && (
                      <span style={{ color: 'var(--gold)', marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        — outstanding questions persist across all versions
                      </span>
                    )}
                  </div>
                  {loadingItems ? (
                    <div className="loading-state"><div className="spinner" /></div>
                  ) : itemsFor(expandedSection.itemSection).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>
                      No individual items tracked for this section.
                    </p>
                  ) : (
                    <div className="feedback-items-list">
                      {itemsFor(expandedSection.itemSection).map(item => (
                        <FeedbackItem
                          key={item.id}
                          item={item}
                          onUpdate={handleItemUpdate}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
