export interface AvatarColor {
  light: string
  dark: string
  text: string
}

/**
 * Get initials from a username
 * @param username - User's username
 * @returns First letter of username in uppercase
 */
export function getUsernameInitials(username?: string): string {
  if (!username) return 'U'
  return username.charAt(0).toUpperCase()
}

/**
 * Generate a consistent color scheme based on username
 * @param username - User's username
 * @returns Object with light, dark, and text color classes
 */
export function getAvatarColor(username?: string): AvatarColor {
  if (!username) {
    return {
      light: 'from-slate-100 to-slate-200',
      dark: 'dark:from-slate-700 dark:to-slate-600',
      text: 'text-slate-700 dark:text-slate-200'
    }
  }
  
  // Simple hash function to generate consistent color from username
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Subtle, light color palette
  const colors: AvatarColor[] = [
    { light: 'from-blue-50 to-blue-100', dark: 'dark:from-blue-900/30 dark:to-blue-800/30', text: 'text-blue-700 dark:text-blue-300' },
    { light: 'from-purple-50 to-purple-100', dark: 'dark:from-purple-900/30 dark:to-purple-800/30', text: 'text-purple-700 dark:text-purple-300' },
    { light: 'from-pink-50 to-pink-100', dark: 'dark:from-pink-900/30 dark:to-pink-800/30', text: 'text-pink-700 dark:text-pink-300' },
    { light: 'from-rose-50 to-rose-100', dark: 'dark:from-rose-900/30 dark:to-rose-800/30', text: 'text-rose-700 dark:text-rose-300' },
    { light: 'from-amber-50 to-amber-100', dark: 'dark:from-amber-900/30 dark:to-amber-800/30', text: 'text-amber-700 dark:text-amber-300' },
    { light: 'from-emerald-50 to-emerald-100', dark: 'dark:from-emerald-900/30 dark:to-emerald-800/30', text: 'text-emerald-700 dark:text-emerald-300' },
    { light: 'from-teal-50 to-teal-100', dark: 'dark:from-teal-900/30 dark:to-teal-800/30', text: 'text-teal-700 dark:text-teal-300' },
    { light: 'from-cyan-50 to-cyan-100', dark: 'dark:from-cyan-900/30 dark:to-cyan-800/30', text: 'text-cyan-700 dark:text-cyan-300' },
    { light: 'from-indigo-50 to-indigo-100', dark: 'dark:from-indigo-900/30 dark:to-indigo-800/30', text: 'text-indigo-700 dark:text-indigo-300' },
    { light: 'from-violet-50 to-violet-100', dark: 'dark:from-violet-900/30 dark:to-violet-800/30', text: 'text-violet-700 dark:text-violet-300' },
  ]
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
