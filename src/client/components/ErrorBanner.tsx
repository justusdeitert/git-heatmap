import { networkError } from '@/client/state'
import ERROR_SVG from '@/client/icons/error-circle.svg'

export function ErrorBanner() {
  const error = networkError.value
  if (!error) return null

  return (
    <div class="error-banner">
      <span class="error-icon" dangerouslySetInnerHTML={{ __html: ERROR_SVG }} />
      <span class="error-text">{error}</span>
      <button class="error-dismiss" type="button" onClick={() => { networkError.value = null }}>✕</button>
    </div>
  )
}
