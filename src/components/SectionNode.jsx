const PREVIEW_LENGTH = 220

export default function SectionNode({ section, title, icon, outstandingCount, onClick }) {
  const preview = section
    ? section.replace(/#{1,6}\s+/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim().slice(0, PREVIEW_LENGTH)
    : null

  return (
    <div
      className={`section-node${outstandingCount > 0 ? ' has-outstanding' : ''}${!section ? ' section-node--empty' : ''}`}
      onClick={section ? onClick : undefined}
      style={!section ? { opacity: 0.35, cursor: 'default' } : {}}
    >
      <div className="section-node-header">
        <div className="section-icon-title">
          <span className="section-icon">{icon}</span>
          <span className="section-title">{title}</span>
        </div>
        {outstandingCount > 0 && (
          <span className="section-item-count">{outstandingCount}</span>
        )}
      </div>

      {preview ? (
        <p className="section-preview">{preview}{preview.length >= PREVIEW_LENGTH ? '…' : ''}</p>
      ) : (
        <p className="section-preview" style={{ fontStyle: 'italic' }}>No content yet</p>
      )}

      {section && (
        <div className="section-expand-hint">
          <span>↗</span> expand
        </div>
      )}
    </div>
  )
}
