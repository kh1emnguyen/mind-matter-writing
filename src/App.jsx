import { useState } from 'react'
import Home from './pages/Home'
import DraftView from './pages/DraftView'

export default function App() {
  const [view, setView]               = useState('home')
  const [selectedDraft, setSelectedDraft] = useState(null)

  function selectDraft(title) {
    setSelectedDraft(title)
    setView('draft')
  }

  function goHome() {
    setView('home')
    setSelectedDraft(null)
  }

  return (
    <div className="app">
      {view === 'home' && <Home onSelectDraft={selectDraft} />}
      {view === 'draft' && selectedDraft && (
        <DraftView draftTitle={selectedDraft} onBack={goHome} />
      )}
    </div>
  )
}
