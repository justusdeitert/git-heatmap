import { useState } from 'preact/hooks'
import { dirtyFiles } from '../state'
import type { DirtyFile } from '../state'
import { CHEVRON_SVG } from '../icons'

export function DirtyBanner() {
  const files = dirtyFiles.value
  if (files.length === 0) return null

  const [expanded, setExpanded] = useState(false)

  return (
    <div class={`dirty-banner${expanded ? ' expanded' : ''}`}>
      <button class="dirty-toggle" type="button" onClick={() => setExpanded(!expanded)}>
        <span class="dirty-icon">&#9888;</span>
        <span class="dirty-text">
          You have {files.length} uncommitted change{files.length === 1 ? '' : 's'} in your working directory.
        </span>
        <span dangerouslySetInnerHTML={{ __html: CHEVRON_SVG }} />
      </button>
      <ul class="dirty-files" style={expanded ? { display: 'block' } : undefined}>
        {files.map((f, i) => (
          <li key={i}><code class="dirty-status">{f.status}</code>{f.file}</li>
        ))}
      </ul>
    </div>
  )
}
