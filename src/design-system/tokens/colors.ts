/**
 * Central OWNManage Design System - Semantic Color Tokens
 * Shared token values for both Light and Dark themes.
 * Web uses these via CSS variables; Mobile consumes the JS objects directly.
 */

export interface ColorTokens {
  background: string
  foreground: string
  surface: string
  surfaceMuted: string
  surfaceElevated: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  primaryHover: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  border: string
  borderStrong: string
  input: string
  ring: string
  success: string
  successForeground: string
  successMuted: string
  warning: string
  warningForeground: string
  warningMuted: string
  danger: string
  dangerForeground: string
  dangerMuted: string
  info: string
  infoForeground: string
  infoMuted: string
  sidebar: string
  sidebarForeground: string
  sidebarBorder: string
  sidebarActive: string
  sidebarActiveForeground: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

export const lightTokens: ColorTokens = {
  background: '#f8fafc', // slate-50
  foreground: '#0f172a', // slate-900
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9', // slate-100
  surfaceElevated: '#ffffff',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  primary: '#059669', // emerald-600
  primaryForeground: '#ffffff',
  primaryHover: '#047857', // emerald-700
  secondary: '#f1f5f9', // slate-100
  secondaryForeground: '#1e293b', // slate-800
  muted: '#f1f5f9', // slate-100
  mutedForeground: '#64748b', // slate-500
  accent: '#ecfdf5', // emerald-50
  accentForeground: '#047857', // emerald-700
  border: '#e2e8f0', // slate-200
  borderStrong: '#cbd5e1', // slate-300
  input: '#e2e8f0',
  ring: '#059669',
  success: '#10b981', // emerald-500
  successForeground: '#ffffff',
  successMuted: '#ecfdf5',
  warning: '#f59e0b', // amber-500
  warningForeground: '#ffffff',
  warningMuted: '#fffbeb',
  danger: '#ef4444', // red-500
  dangerForeground: '#ffffff',
  dangerMuted: '#fef2f2',
  info: '#0284c7', // sky-600
  infoForeground: '#ffffff',
  infoMuted: '#f0f9ff',
  sidebar: '#ffffff',
  sidebarForeground: '#334155', // slate-700
  sidebarBorder: '#e2e8f0',
  sidebarActive: '#ecfdf5',
  sidebarActiveForeground: '#047857',
  chart1: '#059669', // emerald
  chart2: '#0284c7', // sky
  chart3: '#6366f1', // indigo
  chart4: '#f59e0b', // amber
  chart5: '#ec4899', // pink
}

export const darkTokens: ColorTokens = {
  background: '#070b14', // deep dark neutral
  foreground: '#f8fafc', // slate-50
  surface: '#0f172a', // slate-900
  surfaceMuted: '#111827', // gray-900
  surfaceElevated: '#1e293b', // slate-800
  card: '#0d1322', // elevated dark surface
  cardForeground: '#f8fafc',
  popover: '#0f172a',
  popoverForeground: '#f8fafc',
  primary: '#10b981', // emerald-500
  primaryForeground: '#020617',
  primaryHover: '#059669', // emerald-600
  secondary: '#1e293b', // slate-800
  secondaryForeground: '#f8fafc',
  muted: '#172033',
  mutedForeground: '#94a3b8', // slate-400
  accent: '#064e3b', // emerald-900
  accentForeground: '#a7f3d0', // emerald-200
  border: '#1e293b', // slate-800
  borderStrong: '#334155', // slate-700
  input: '#1e293b',
  ring: '#10b981',
  success: '#10b981',
  successForeground: '#020617',
  successMuted: '#064e3b',
  warning: '#f59e0b',
  warningForeground: '#020617',
  warningMuted: '#78350f',
  danger: '#f43f5e', // rose-500
  dangerForeground: '#ffffff',
  dangerMuted: '#881337',
  info: '#38bdf8', // sky-400
  infoForeground: '#020617',
  infoMuted: '#0c4a6e',
  sidebar: '#0b101c',
  sidebarForeground: '#94a3b8',
  sidebarBorder: '#1e293b',
  sidebarActive: '#132822',
  sidebarActiveForeground: '#34d399',
  chart1: '#10b981', // emerald
  chart2: '#38bdf8', // sky
  chart3: '#818cf8', // indigo
  chart4: '#fbbf24', // amber
  chart5: '#f472b6', // pink
}
