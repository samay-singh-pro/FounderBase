import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  icon?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm',
          'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700',
          'text-slate-900 dark:text-slate-100',
          'hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-400 dark:hover:border-slate-600',
          'hover:shadow-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !selectedOption && 'text-slate-500 dark:text-slate-400'
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2 mx-1 my-0.5 rounded-lg',
                  'hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left text-sm',
                  value === option.value
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-slate-900 dark:text-slate-200'
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  {option.label}
                </span>
                {value === option.value && (
                  <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
