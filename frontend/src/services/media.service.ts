import api from '@/lib/api'

export type MediaType = 'image' | 'gif' | 'video'

export interface Media {
  id: string
  media_type: MediaType
  source: 'cloudinary' | 'giphy'
  url: string
  thumbnail_url?: string | null
  mime_type?: string | null
  width?: number | null
  height?: number | null
  size_bytes?: number | null
  created_at?: string | null
}

export interface GiphyResult {
  id: string
  title?: string | null
  url: string
  thumbnail_url?: string | null
  width?: number | null
  height?: number | null
}

// Keep in sync with backend settings. Surfacing limits client-side gives a faster UX
// (reject before upload) while the server still enforces them authoritatively.
export const MEDIA_LIMITS = {
  imageBytes: 2 * 1024 * 1024,
  videoBytes: 20 * 1024 * 1024,
  perPost: 2,
  perComment: 1,
  perMessage: 1,
  allowedImage: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideo: ['video/mp4', 'video/webm', 'video/quicktime'],
}

export function classifyFile(file: File): { kind: MediaType; error?: string } {
  const isImage = MEDIA_LIMITS.allowedImage.includes(file.type)
  const isVideo = MEDIA_LIMITS.allowedVideo.includes(file.type)
  if (!isImage && !isVideo) {
    return { kind: 'image', error: 'Unsupported file type' }
  }
  const kind: MediaType = file.type === 'image/gif' ? 'gif' : isVideo ? 'video' : 'image'
  const limit = kind === 'video' ? MEDIA_LIMITS.videoBytes : MEDIA_LIMITS.imageBytes
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return { kind, error: `${kind === 'video' ? 'Video' : 'Image'} exceeds ${mb}MB limit` }
  }
  return { kind }
}

export const mediaService = {
  upload: async (file: File): Promise<Media> => {
    const form = new FormData()
    form.append('file', file)
    const response = await api.post<Media>('/api/v1/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  attachGiphy: async (gif: GiphyResult): Promise<Media> => {
    const response = await api.post<Media>('/api/v1/media/giphy/attach', {
      giphy_id: gif.id,
      url: gif.url,
      thumbnail_url: gif.thumbnail_url,
      width: gif.width,
      height: gif.height,
    })
    return response.data
  },

  giphyTrending: async (limit = 12): Promise<GiphyResult[]> => {
    const response = await api.get<{ results: GiphyResult[] }>(
      `/api/v1/media/giphy/trending?limit=${limit}`,
    )
    return response.data.results
  },

  giphySearch: async (query: string, limit = 12): Promise<GiphyResult[]> => {
    const response = await api.get<{ results: GiphyResult[] }>(
      `/api/v1/media/giphy/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    )
    return response.data.results
  },
}

// Resolve a media URL that may be a relative path served by the backend's
// /uploads mount (Cloudinary stub mode). Cloudinary/GIPHY URLs are absolute
// and pass through unchanged.
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = (api.defaults.baseURL || '').replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}
