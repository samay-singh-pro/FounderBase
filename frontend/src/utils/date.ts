/**
 * Format a date string into a human-readable relative time format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "2m ago", "3h ago", "Jan 15")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date string:', dateString)
    return 'Invalid date'
  }
  
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  // If difference is negative, the date is in the future
  if (diffInSeconds < 0) {
    return 'Just now'
  }
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
