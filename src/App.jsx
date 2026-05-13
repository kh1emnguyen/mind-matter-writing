import { useState } from 'react'
import Home from './pages/Home'
import DraftView from './pages/DraftView'
import AllFeedback from './pages/AllFeedback'

export default function App() {
  const [view,          setView]          = useState('home')
  const [selectedDraft, setSelectedDraft] = useState(null)

  function selectDraft(title) {
    setSelectedDraft(title)
    setView('draft')
  }

  function openAllFeedback(title) {
    setSelectedDraft(title)
    setView('allFeedback')
  }

  function goHome() {
    setSelectedDraft(null)
    setView('home')
  }

  function backToDraft() {
    setView('draft')
  }

  return (
    <div className="app">
      {view === 'home' && (
        <Home
          onSelectDraft={selectDraft}
          onAllFeedback={openAllFeedback}
        />
      )}
      {view === 'draft' && selectedDraft && (
        <DraftView
          draftTitle={selectedDraft}
          onBack={goHome}
          onAllFeedback={() => openAllFeedback(selectedDraft)}
        />
      )}
      {view === 'allFeedback' && selectedDraft && (
        <AllFeedback
          draftTitle={selectedDraft}
          onBack={backToDraft}
        />
      )}
    </div>
  )
}
