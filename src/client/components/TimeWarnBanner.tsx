import CLOCK_ALERT_SVG from '@/client/icons/clock-alert.svg';
import { hasTimeWarnings } from '@/client/state';

export function TimeWarnBanner() {
  if (!hasTimeWarnings.value) return null;

  return (
    <div class="time-warn-banner">
      <span class="time-warn-icon" dangerouslySetInnerHTML={{ __html: CLOCK_ALERT_SVG }} />
      <span class="time-warn-text">Some commit timestamps don't follow chronological order.</span>
    </div>
  );
}
