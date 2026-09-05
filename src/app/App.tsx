import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { KidNav } from '@/shared/ui/KidNav'
import { Home } from '@/app/Home'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { UpdatePrompt } from '@/app/UpdatePrompt'
import { LettersModule } from '@/modules/letters'
import { ReadingModule } from '@/modules/reading'
import { NumbersModule } from '@/modules/numbers'
import { CzytankiModule } from '@/modules/czytanki'
import { SettingsScreen } from '@/shared/settings/components'
import { ReportScreen } from '@/shared/stats/components/ReportScreen'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'
import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { useCzytanki } from '@/modules/czytanki/store/czytankiStore'

function SettingsPage() {
  const navigate = useNavigate()
  const resetLetters = useLetters((s) => s.resetAllProgress)
  const resetReading = useReading((s) => s.resetAllProgress)
  const resetNumbers = useNumbers((s) => s.resetAllProgress)
  const resetCzytanki = useCzytanki((s) => s.resetAllProgress)
  return (
    <SettingsScreen
      onResetConfirmed={() => {
        resetLetters()
        resetReading()
        resetNumbers()
        resetCzytanki()
        navigate('/')
      }}
      onExit={() => navigate('/')}
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
  const isReading = location.pathname.startsWith('/reading')
  const isNumbers = location.pathname.startsWith('/numbers')
  const isCzytanki = location.pathname.startsWith('/czytanki')
  const showKidNav = !isHome && !isLetters && !isReading && !isNumbers && !isCzytanki
  return (
    // h-screen (100vh) to fallback; inline 100dvh wygrywa tam gdzie jest
    // wspierane i nie skacze pod paskiem URL Safari na iPadzie.
    <div className="h-screen flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Poza <main>, bo ma być widoczny na KAŻDYM ekranie — także tam, gdzie
          moduł rysuje własną nawigację i chowa KidNav. */}
      <UpdatePrompt />
      {showKidNav && <KidNav />}
      <main
        className={`flex-1 min-h-0 ${isHome ? '' : 'p-4'} ${isLetters || isReading || isNumbers || isCzytanki ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/letters/*" element={<LettersModule />} />
            <Route path="/reading/*" element={<ReadingModule />} />
            <Route path="/numbers/*" element={<NumbersModule />} />
            <Route path="/czytanki/*" element={<CzytankiModule />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
