import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function FeedbackItem({ item, onUpdate }) {
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus) {
    setLoading(true)
    const { error } = await supabase
      .from('feedback_items')
      .update({ status: newStatus, actioned_at: new Date().toISOString() })
      .eq('id', item.id)

    if (!error) onUpdate(item.id, newStatus)
    setLoading(false)
  }

  const { status, content, verification_notes } = item
  const isOutstanding = status === 'outstanding'
  const isDiscarded   = status === 'discarded'
  const isPending     = status === 'pending_implementation'
  const isVerified    = status === 'verified_success' || status === 'verified_partial'

  return (
    <div className={`feedback-item ${status}`}>
      <div className="feedback-item-text">
        {content}
        {verification_notes && (
          <div className="verification-notes">↳ {verification_notes}</div>
        )}
      </div>

      <div className="feedback-item-actions">
        {loading ? (
          <div className="spinner" style={{ width: 16, height: 16 }} />
        ) : isOutstanding ? (
          <>
            <button className="item-btn discard" onClick={() => updateStatus('discarded')}>
              Discard
            </button>
            <button className="item-btn implement" onClick={() => updateStatus('pending_implementation')}>
              Implement
            </button>
          </>
        ) : isDiscarded ? (
          <button className="item-btn undiscard" onClick={() => updateStatus('outstanding')}>
            Restore
          </button>
        ) : isPending ? (
          <span className="item-status-badge pending">⟳ Pending your edit</span>
        ) : isVerified ? (
          <span className={`item-status-badge ${status}`}>
            {status === 'verified_success' ? '✓ Verified' : '◑ Partial'}
          </span>
        ) : null}
      </div>
    </div>
  )
}
