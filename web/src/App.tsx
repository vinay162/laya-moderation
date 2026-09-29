import { Shell, type NavItem } from './components/Shell'
import { Calibration } from './sections/Calibration'
import { Hero } from './sections/Hero'
import { Routing } from './sections/Routing'
import { Scoreboard } from './sections/Scoreboard'

const NAV: NavItem[] = [
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'calibration', label: 'Calibration' },
  { id: 'routing', label: 'Routing simulator' },
]

export default function App() {
  return (
    <Shell nav={NAV}>
      <Hero />
      <Scoreboard />
      <Calibration />
      <Routing />
    </Shell>
  )
}
