import { PageHeader } from '../components/PageHeader'
import { Page, type NavItem } from '../components/Shell'
import { Calibration } from '../sections/Calibration'
import { Routing } from '../sections/Routing'
import { Scoreboard } from '../sections/Scoreboard'

const SECTIONS: NavItem[] = [
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'calibration', label: 'Calibration' },
  { id: 'routing', label: 'Routing simulator' },
]

export default function Results() {
  return (
    <Page sections={SECTIONS}>
      <PageHeader title="Results">
        Everything here was measured on the official Jigsaw test set of 63,978 comments that the model never saw during
        training.
      </PageHeader>
      <Scoreboard />
      <Calibration />
      <Routing />
    </Page>
  )
}
