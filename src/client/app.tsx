import { render } from 'preact'
import { useEffect } from 'preact/hooks'
import { initFromServerData, initSSE, closeModal } from './state'
import type { InitialData } from './state'

// Import all SCSS — esbuild bundles these into a single CSS output
import './styles/variables.scss'
import './styles/base.scss'
import './styles/components.scss'
import './styles/heatmap.scss'
import './styles/commits.scss'
import './styles/modal.scss'
import './styles/trace.scss'

// Components
import { Header, Footer } from './components/Header'
import { StatsCards } from './components/StatsCards'
import { Heatmap } from './components/Heatmap'
import { CommitList } from './components/CommitList'
import { CommitModal } from './components/CommitModal'
import { DirtyBanner } from './components/DirtyBanner'
import { ReflogPanel, ConfirmDialog } from './components/ReflogPanel'
import { Tooltip } from './components/Tooltip'

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
