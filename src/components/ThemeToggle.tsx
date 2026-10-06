import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, Laptop } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  showSystemOption?: boolean
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  showLabels = false,
  showSystemOption = false,
}) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme()

  if (showSystemOption) {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-muted border border-border ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            theme === 'light'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Light theme"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          {showLabels && <span>Light</span>}
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Dark theme"
        >
          <Moon className="w-3.5 h-3.5 text-sky-400" />
          {showLabels && <span>Dark</span>}
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            theme === 'system'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="System theme"
        >
          <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
          {showLabels && <span>System</span>}
        </button>
      </div>
    )
  }

  const dimensions = {
    sm: {
      container: 'h-8 w-14 p-0.5',
      knob: 'h-7 w-7',
      icon: 'w-3.5 h-3.5',
      translate: 'translate-x-6',
    },
    md: {
      container: 'h-9 w-16 p-0.5',
      knob: 'h-8 w-8',
      icon: 'w-4 h-4',
      translate: 'translate-x-7',
    },
    lg: {
      container: 'h-10 w-20 p-1',
      knob: 'h-8 w-8',
      icon: 'w-4 h-4',
      translate: 'translate-x-9',
    },
  }[size]

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-xs font-medium text-muted-foreground select-none">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleTheme}
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring select-none border border-border shadow-inner ${
          dimensions.container
        } ${isDark ? 'bg-muted text-amber-300' : 'bg-muted text-amber-500'}`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      >
        {/* Background Icons */}
        <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          <Sun className={`${dimensions.icon} text-amber-500 transition-opacity duration-200 ${isDark ? 'opacity-25' : 'opacity-90'}`} />
          <Moon className={`${dimensions.icon} text-sky-400 transition-opacity duration-200 ${isDark ? 'opacity-90' : 'opacity-25'}`} />
        </span>

        {/* Sliding Knob */}
        <span
          className={`pointer-events-none inline-flex items-center justify-center rounded-full bg-card shadow-sm transform ring-0 transition-transform duration-200 ease-out border border-border z-10 ${
            dimensions.knob
          } ${isDark ? dimensions.translate : 'translate-x-0'}`}
        >
          {isDark ? (
            <Moon className={`${dimensions.icon} text-sky-400`} />
          ) : (
            <Sun className={`${dimensions.icon} text-amber-500`} />
          )}
        </span>
      </button>
    </div>
  )
}

export default ThemeToggle
