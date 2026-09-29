import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { ScrollManager, Shell } from './components/Shell'
import Overview from './pages/Overview'

// The landing page ships in the main bundle; the others load when first visited.
const Results = lazy(() => import('./pages/Results'))
const Try = lazy(() => import('./pages/Try'))
const How = lazy(() => import('./pages/How'))

export default function App() {
  return (
    <Shell>
      <ScrollManager />
      <Suspense fallback={<div className="min-h-screen" />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/results" element={<Results />} />
          <Route path="/try" element={<Try />} />
          <Route path="/how" element={<How />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
