import { resolveMediaUrl } from '@/services/media.service'
import { getAvatarColor, getUsernameInitials } from '@/utils/avatar'

interface AvatarProps {
  username: string
  avatarUrl?: string | null
  size?: number   // px; renders a square circle
  className?: string
  online?: boolean
  ringClassName?: string
}

/**
 * Profile picture if avatar_url is set, otherwise the same coloured-initial
 * placeholder the rest of the app already uses. Keeps callers terse and the
 * fallback consistent across surfaces.
 */
export function Avatar({ username, avatarUrl, size = 40, online, className = '', ringClassName }: AvatarProps) {
  const colors = getAvatarColor(username)
  const initials = getUsernameInitials(username)
  const dimension = { width: size, height: size }
  const fontSize = Math.max(10, Math.round(size * 0.36))

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={dimension}>
      {avatarUrl ? (
        <img
          src={resolveMediaUrl(avatarUrl)}
          alt={`${username} avatar`}
          loading="lazy"
          className={`rounded-full object-cover w-full h-full ${ringClassName ?? ''}`}
        />
      ) : (
        <div
          className={`rounded-full w-full h-full bg-gradient-to-br ${colors.light} ${colors.dark} flex items-center justify-center ${colors.text} font-semibold ${ringClassName ?? ''}`}
          style={{ fontSize }}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          style={{
            width: Math.max(8, Math.round(size * 0.22)),
            height: Math.max(8, Math.round(size * 0.22)),
          }}
        />
      )}
    </div>
  )
}
