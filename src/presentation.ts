type ShareableChannel = { authorId: string; author?: string; originalUrl?: string; authorUrl?: string; channelUrl?: string };

export function channelShareUrl(channel: ShareableChannel): string | undefined {
  return channel.originalUrl || channel.authorUrl || channel.channelUrl || (channel.authorId.startsWith('UC') ? `https://www.youtube.com/channel/${encodeURIComponent(channel.authorId)}` : undefined);
}

type ThumbnailSource = { videoId?: string; videoThumbnails?: { url?: string }[]; playlistThumbnail?: string };

export function videoThumbnailFallback(video: ThumbnailSource): string {
  return typeof video.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(video.videoId) ? `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg` : '';
}

export function thumbnailLoading(eager: boolean): 'lazy' | undefined {
  return eager ? undefined : 'lazy';
}

export function thumbnailImageSource(image: string, fallback: string, failures: number): string {
  if (!failures) return image;
  return failures === 1 && fallback && fallback !== image ? fallback : '';
}

export function videoThumbnailUrl(video: ThumbnailSource): string {
  const thumbnails = Array.isArray(video.videoThumbnails) ? video.videoThumbnails : [];
  const supplied = thumbnails.at(-1)?.url || thumbnails[0]?.url || video.playlistThumbnail;
  if (typeof supplied === 'string' && supplied) return supplied;
  return videoThumbnailFallback(video);
}

export function thumbnailPresentation(image: string) {
  return image ? { image, label: '' } : { image: '', label: 'No thumbnail available' };
}
