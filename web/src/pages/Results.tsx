import { PageHeader } from '../components/PageHeader'
import { Page, type NavItem } from '../components/Shell'
import { Bias } from '../sections/Bias'
import { Calibration } from '../sections/Calibration'
import { Failures } from '../sections/Failures'
import { Routing } from '../sections/Routing'
import { Scoreboard } from '../sections/Scoreboard'

const SECTIONS: NavItem[] = [
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'calibration', label: 'Calibration' },
  { id: 'routing', label: 'Routing simulator' },
  { id: 'bias', label: 'Robustness and bias' },
  { id: 'fails', label: 'Where it fails' },
]

export default function Results() {
  return (
    <Page sections={SECTIONS}>
      <PageHeader title="Results">
        Everything here was measured on the official Jigsaw test set of 63,978 comments that the model never saw during
        training, plus the HateCheck test suite for bias.
      </PageHeader>
      <Scoreboard />
      <Calibration />
      <Routing />
      <Bias />
      <Failures />
    </Page>
  )
}
