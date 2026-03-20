import { render } from 'preact'
import { useEffect } from 'preact/hooks'
import { initFromServerData, initSSE, closeModal } from '@/client/state'
import type { InitialData } from '@/client/state'

import '@/client/styles/variables.scss'
import '@/client/styles/base.scss'
import '@/client/styles/components.scss'
import '@/client/styles/heatmap.scss'
import '@/client/styles/commits.scss'
import '@/client/styles/modal.scss'
import '@/client/styles/trace.scss'

import { Header, Footer } from '@/client/components/Header'
import { StatsCards } from '@/client/components/StatsCards'
import { Heatmap } from '@/client/components/Heatmap'
import { CommitList } from '@/client/components/CommitList'
import { CommitModal } from '@/client/components/CommitModal'
import { DirtyBanner } from '@/client/components/DirtyBanner'
import { ErrorBanner } from '@/client/components/ErrorBanner'
import { ReflogPanel, ConfirmDialog } from '@/client/components/ReflogPanel'
import { Tooltip } from '@/client/components/Tooltip'

function App() {
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [])

  return (
    <>
      <div class="container">
        <Header />
        <ErrorBanner />
        <DirtyBanner />
        <StatsCards />
        <Heatmap />
        <CommitList />
        <ReflogPanel />
      </div>
      <Footer />
      <Tooltip />
      <CommitModal />
      <ConfirmDialog />
    </>
  )
}

// Boot: read server-injected data and mount
const data: InitialData = (window as any).__DATA__
initFromServerData(data)
initSSE()
render(<App />, document.getElementById('app')!)
