import { Shell, type NavItem } from './components/Shell'
import { Calibration } from './sections/Calibration'
import { Scoreboard } from './sections/Scoreboard'

const NAV: NavItem[] = [
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'calibration', label: 'Calibration' },
]

export default function App() {
  return (
    <Shell nav={NAV}>
      <div id="top" className="pt-10 pb-4 sm:pt-16">
        <h1 className="max-w-[20ch] text-4xl font-bold tracking-tight sm:text-5xl">Laya moderation engine</h1>
      </div>
      <Scoreboard />
      <Calibration />
    </Shell>
  )
}
