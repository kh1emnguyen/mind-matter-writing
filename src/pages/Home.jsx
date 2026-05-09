import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function Home({ onSelectDraft }) {
  const [drafts, setDrafts]           = useState([])
  const [enabled, setEnabled]         = useState(true)
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [toggling, setToggling]       = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoadingDrafts(true)

    // 1. Config (assistant toggle)
    const { data: cfg } = await supabase
      .from('writing_config')
      .select('assistant_enabled')
      .eq('id', 1)
      .single()
    if (cfg) setEnabled(cfg.assistant_enabled)

    // 2. All distinct drafts with latest run metadata
    const { data: runs } = await supabase
      .from('writing_feedback')
      .select('id, draft_title, draft_path, version_number, run_at')
      .order('run_at', { ascending: false })

    if (!runs || runs.length === 0) {
      // Still show known drafts with 0 runs
      setDrafts([
        {
          draft_title: 'Running Away from Reality',
          latest_run: null,
          version_count: 0,
          outstanding: 0,
          pending: 0,
          is_final: false,
        },
        {
          draft_title: 'Fish out of Water',
          latest_run: null,
          version_count: 0,
          outstanding: 0,
          pending: 0,
          is_final: true,
        },
      ])
      setLoadingDrafts(false)
      return
    }

    // Deduplicate: keep latest run per draft
    const byDraft = {}
    for (const r of runs) {
      if (!byDraft[r.draft_title]) byDraft[r.draft_title] = r
    }

    // Count versions per draft
    const versionCounts = {}
    for (const r of runs) {
      versionCounts[r.draft_title] = (versionCounts[r.draft_title] || 0) + 1
    }

    // 3. Outstanding + pending item counts per draft
    const { data: items } = await supabase
      .from('feedback_items')
      .select('draft_title, status')

    const outstandingMap = {}
    const pendingMap = {}
    if (items) {
      for (const item of items) {
        if (item.status === 'outstanding') {
          outstandingMap[item.draft_title] = (outstandingMap[item.draft_title] || 0) + 1
        }
        if (item.status === 'pending_implementation') {
          pendingMap[item.draft_title] = (pendingMap[item.draft_title] || 0) + 1
        }
      }
    }

    const knownDrafts = ['Running Away from Reality', 'Fish out of Water']
    const finalDrafts = new Set(['Fish out of Water'])

    // Merge known drafts with DB data
    const merged = knownDrafts.map(title => ({
      draft_title: title,
      latest_run: byDraft[title]?.run_at ?? null,
      version_count: versionCounts[title] ?? 0,
      outstanding: outstandingMap[title] ?? 0,
      pending: pendingMap[title] ?? 0,
      is_final: finalDrafts.has(title),
    }))

    setDrafts(merged)
    setLoadingDrafts(false)
  }

  async function toggleAssistant() {
    setToggling(true)
    const next = !enabled
    const { error } = await supabase
      .from('writing_config')
      .update({ assistant_enabled: next, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (!error) setEnabled(next)
    setToggling(false)
  }

  return (
    <div className="home">
      <div className="home-header">
        <div className="wordmark">
          <span className="wordmark-title">Mind Matter</span>
          <span className="wordmark-sub">Writing Dashboard</span>
        </div>

        <button
          className={`toggle-group${enabled ? ' enabled' : ''}`}
          onClick={toggleAssistant}
          disabled={toggling}
          title={enabled ? 'Pause writing assistant' : 'Resume writing assistant'}
        >
          <span className="toggle-label">Assistant</span>
          <div className="toggle-track">
            <div className="toggle-thumb" />
          </div>
        </button>
      </div>

      <div className="drafts-label">Your Drafts</div>

      {loadingDrafts ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : (
        <div className="drafts-grid">
          {drafts.map(draft => (
            <div
              key={draft.draft_title}
              className={`draft-card${draft.is_final ? ' final' : ''}`}
              onClick={() => !draft.is_final && onSelectDraft(draft.draft_title)}
            >
              <div className="draft-card-header">
                <div className={`draft-status-dot${draft.is_final ? ' final' : ''}`} />
                <div className="draft-badges">
                  {draft.version_count > 0 && (
                    <span className="badge version">V{draft.version_count}</span>
                  )}
                  {draft.outstanding > 0 && (
                    <span className="badge outstanding">{draft.outstanding} outstanding</span>
                  )}
                  {draft.pending > 0 && (
                    <span className="badge pending">{draft.pending} pending</span>
                  )}
                  {draft.is_final && (
                    <span className="badge final-badge">Final</span>
                  )}
                </div>
              </div>

              <div className="draft-card-title">{draft.draft_title}</div>

              <div className="draft-card-meta">
                {draft.latest_run
                  ? `Last feedback: ${formatDate(draft.latest_run)}`
                  : draft.is_final
                    ? 'Published piece'
                    : 'No feedback yet — assistant will run next cycle'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
