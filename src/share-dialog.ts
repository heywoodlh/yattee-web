import { upstreamShareUrl } from './media';
import type { Video } from './store';

export function shareDialogUrl(video: Video): string | undefined {
  return upstreamShareUrl(video);
}

export function shareDialogCopyLabel(copied: boolean): string {
  return copied ? '✓ Copied' : 'Copy';
}
