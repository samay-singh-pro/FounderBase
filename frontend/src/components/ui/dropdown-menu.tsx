import * as React from 'react'
import { cn } from '@/lib/utils'

const DropdownMenuContext = React.createContext<{
  closeMenu: () => void
}>({
  closeMenu: () => {},
})

interface DropdownMenuProps {
  children: React.ReactNode
  trigger: React.ReactNode
  align?: 'start' | 'end'
}

export function DropdownMenu({ children, trigger, align = 'end' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const closeMenu = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <DropdownMenuContext.Provider value={{ closeMenu }}>
      <div className="relative" ref={dropdownRef}>
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-slate-950 dark:text-slate-50 shadow-md',
              'mt-2',
              align === 'end' ? 'right-0' : 'left-0'
            )}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({ children, onClick, destructive, disabled, className }: DropdownMenuItemProps) {
  const { closeMenu } = React.useContext(DropdownMenuContext)
  
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
      closeMenu()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-slate-100 dark:focus:bg-slate-800',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        'w-full text-left',
        destructive && 'text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/10',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}
