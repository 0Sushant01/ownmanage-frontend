import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  isDark: boolean
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('om_theme') as Theme | null
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved
    }
    return 'light'
  })

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // Watch for system OS theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    localStorage.setItem('om_theme', theme)
    const root = document.documentElement
    const body = document.body
    const meta = document.querySelector('meta[name="theme-color"]')

    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      body.classList.add('dark')
      body.classList.remove('light')
      root.style.colorScheme = 'dark'
      meta?.setAttribute('content', '#070b14')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      body.classList.remove('dark')
      body.classList.add('light')
      root.style.colorScheme = 'light'
      meta?.setAttribute('content', '#f8fafc')
    }
  }, [theme, resolvedTheme])

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'light') return 'dark'
      return 'light'
    })
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

export default ThemeContext
