import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function FoundationStatus() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            Foundation Initialized
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          OwnManage Web Frontend
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Core technical stack initialized: React, Vite, TypeScript, Tailwind CSS, React Router, and Axios.
        </p>

        <div className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800 pt-4">
          <div className="flex justify-between py-1 border-b border-slate-800/50">
            <span className="text-slate-500">Router</span>
            <span className="font-mono text-emerald-400">React Router v7</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50">
            <span className="text-slate-500">Styling</span>
            <span className="font-mono text-emerald-400">Tailwind CSS</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/50">
            <span className="text-slate-500">HTTP Client</span>
            <span className="font-mono text-emerald-400">Axios Service Configured</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Environment</span>
            <span className="font-mono text-slate-300">VITE_API_BASE_URL</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FoundationStatus />} />
      </Routes>
    </Router>
  )
}
