import { tooltipText, tooltipVisible, tooltipX, tooltipY } from '@/client/state';

export function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOff = Math.abs(offset);
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    sign +
    pad(Math.floor(absOff / 60)) +
    ':' +
    pad(absOff % 60)
  );
}

export function toLocalDateTimeValue(iso: string): string {
  return toLocalISOString(new Date(iso)).slice(0, 19);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function esc(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function tooltipProps(text: string) {
  const position = (e: MouseEvent) => {
    const el = document.getElementById('tooltip');
    if (el) {
      tooltipX.value = Math.max(8, e.clientX - el.offsetWidth - 12);
      tooltipY.value = e.clientY - 36;
    }
  };
  return {
    onMouseEnter: (e: MouseEvent) => {
      tooltipText.value = text;
      tooltipVisible.value = true;
      position(e);
    },
    onMouseMove: (e: MouseEvent) => {
      position(e);
    },
    onMouseLeave: () => {
      tooltipVisible.value = false;
    },
  };
}
