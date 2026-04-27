import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { KidNav } from '@/shared/ui/KidNav'
import { Home } from '@/app/Home'
import { LettersModule } from '@/modules/letters'
import { SettingsScreen } from '@/shared/settings/components'
import { ReportScreen } from '@/shared/stats/components/ReportScreen'
import { useLetters } from '@/modules/letters/store/lettersStore'

function SettingsPage() {
  const navigate = useNavigate()
  const resetAllProgress = useLetters((s) => s.resetAllProgress)
  return (
    <SettingsScreen
      onResetConfirmed={() => {
        resetAllProgress()
        navigate('/')
      }}
    />
  )
}

function ReportPage() {
  const navigate = useNavigate()
  return <ReportScreen onExit={() => navigate('/')} />
}

export function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isLetters = location.pathname.startsWith('/letters')
  const showKidNav = !isHome && !isLetters
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {showKidNav && <KidNav />}
      <main
        className={`flex-1 min-h-0 ${isHome ? '' : 'p-4'} ${isLetters ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/letters/*" element={<LettersModule />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  )
}
