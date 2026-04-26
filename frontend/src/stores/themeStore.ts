import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'slate' | 'forest'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.remove('light', 'dark', 'theme-slate', 'theme-forest')

  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'slate') {
    // Warm-grey gentle light theme
    root.classList.add('light', 'theme-slate')
  } else if (theme === 'forest') {
    // Deep green-black with single lime accent (Brave-style)
    root.classList.add('dark', 'theme-forest')
  } else {
    root.classList.add('light')
  }
}

export const themeConfig = {
  light: {
    name: 'Light',
    description: 'Clean and minimal',
    colors: {
      primary: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      foreground: '#0f172a',
      accent: '#dbeafe',
    },
  },
  dark: {
    name: 'Dark',
    description: 'Sleek and modern',
    colors: {
      primary: '#60a5fa',
      background: '#0a0a0a',
      surface: '#1e293b',
      foreground: '#f1f5f9',
      accent: '#1e293b',
    },
  },
  slate: {
    name: 'Slate',
    description: 'Warm grey, gentle on the eyes',
    colors: {
      primary: '#475569',
      background: '#f5f5f4',
      surface: '#ffffff',
      foreground: '#1c1917',
      accent: '#e7e5e4',
    },
  },
  forest: {
    name: 'Forest',
    description: 'Deep green with lime accent',
    colors: {
      primary: '#a3e635',
      background: '#0a0f0a',
      surface: '#131815',
      foreground: '#e7e5e4',
      accent: '#1a2018',
    },
  },
} as const
