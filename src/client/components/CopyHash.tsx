import { useRef, useState } from 'preact/hooks';
import CHECK_SVG from '@/client/icons/check.svg';
import COPY_SVG from '@/client/icons/copy.svg';
import { copyToClipboard } from '@/client/utils';

export function CopyHash({ hash, full, class: cls }: { hash: string; full: string; class?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  const handleCopy = async (e: Event) => {
    e.stopPropagation();
    await copyToClipboard(full);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <code
      class={`commit-hash${copied ? ' hash-copied' : ''}${cls ? ` ${cls}` : ''}`}
      title="Click to copy"
      onClick={handleCopy}
      dangerouslySetInnerHTML={{ __html: `${hash} ${copied ? CHECK_SVG : COPY_SVG}` }}
    />
  );
}
