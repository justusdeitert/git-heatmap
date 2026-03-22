import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import type { InitialData } from '@/client/state';
import { closeAuthorModal, closeModal, initFromServerData, initSSE } from '@/client/state';

import '@/client/styles/variables.scss';
import '@/client/styles/base.scss';
import '@/client/styles/components.scss';
import '@/client/styles/heatmap.scss';
import '@/client/styles/commits.scss';
import '@/client/styles/modal.scss';
import '@/client/styles/trace.scss';

import { AuthorModal } from '@/client/components/AuthorModal';
import { BulkShiftBar } from '@/client/components/BulkShiftBar';
import { CommitList } from '@/client/components/CommitList';
import { CommitModal } from '@/client/components/CommitModal';
import { DirtyBanner } from '@/client/components/DirtyBanner';
import { ErrorBanner } from '@/client/components/ErrorBanner';
import { Footer, Header } from '@/client/components/Header';
import { Heatmap } from '@/client/components/Heatmap';
import { ConfirmDialog, ReflogPanel } from '@/client/components/ReflogPanel';
import { StatsCards } from '@/client/components/StatsCards';
import { Tooltip } from '@/client/components/Tooltip';

declare global {
  interface Window {
    __DATA__: InitialData;
  }
}

function App() {
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); closeAuthorModal(); }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

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
      <BulkShiftBar />
      <Footer />
      <Tooltip />
      <CommitModal />
      <AuthorModal />
      <ConfirmDialog />
    </>
  );
}

// Boot: read server-injected data and mount
const data = window.__DATA__;
initFromServerData(data);
initSSE();
render(<App />, document.getElementById('app')!);
