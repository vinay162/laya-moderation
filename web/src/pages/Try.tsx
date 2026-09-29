import { PageHeader } from '../components/PageHeader'
import { Page } from '../components/Shell'

export default function Try() {
  return (
    <Page>
      <PageHeader title="Try it live">
        Paste a comment and the model scores it on a free CPU server. You can also ask it your own yes or no question
        about the text.
      </PageHeader>
    </Page>
  )
}
