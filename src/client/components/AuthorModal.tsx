import {
  authorModalData,
  authorModalLoading,
  authorModalVisible,
  closeAuthorModal,
} from '@/client/state';

function AuthorBar({ ratio }: { ratio: number }) {
  return (
    <div class="author-bar">
      <div class="author-bar-fill" style={{ width: `${Math.max(ratio * 100, 2)}%` }} />
    </div>
  );
}

export function AuthorModal() {
  const visible = authorModalVisible.value;
  const authors = authorModalData.value;
  const loading = authorModalLoading.value;

  const totalCommits = authors.reduce((sum, a) => sum + a.commits, 0);
  const maxCommits = authors.length > 0 ? authors[0].commits : 1;

  let mouseDownOnOverlay = false;

  return (
    <div
      class={`modal-overlay${visible ? ' visible' : ''}`}
      onMouseDown={(e: MouseEvent) => {
        mouseDownOnOverlay = e.target === e.currentTarget;
      }}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay) closeAuthorModal();
        mouseDownOnOverlay = false;
      }}
    >
      <div class="modal">
        <div class="modal-top-bar">
          <div class="modal-subject" style={{ marginBottom: 0 }}>Contributors</div>
          <button class="modal-close" onClick={() => closeAuthorModal()}>
            &times;
          </button>
        </div>
        <div>
          {loading && <div class="modal-loading">Loading...</div>}
          {!loading && authors.length === 0 && visible && (
            <div class="modal-loading">No authors found</div>
          )}
          {!loading && authors.length > 0 && (
            <div class="author-list">
              {authors.map((author, i) => (
                <div key={author.name} class="author-row">
                  <span class="author-rank">{i + 1}</span>
                  <span class="author-name">{author.name}</span>
                  <AuthorBar ratio={author.commits / maxCommits} />
                  <span class="author-commits">
                    {author.commits.toLocaleString()}
                    <span class="author-pct">
                      ({Math.round((author.commits / totalCommits) * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
