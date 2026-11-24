import { Link, Route, Routes } from 'react-router'
import ProjectsPage from './pages/ProjectsPage'
import ProjectPage from './pages/ProjectPage'
import AnalysisPage from './pages/AnalysisPage'
import { Empty } from './components/ui'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="size-7 rounded-lg" />
            <span>
              cotcha<span className="text-orange-500">.</span>
            </span>
          </Link>
          <span className="hidden text-sm text-zinc-500 sm:inline">잡았다, 보안 버그! AI 코드 보안 분석</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/analyses/:jobId" element={<AnalysisPage />} />
          <Route path="*" element={<Empty>없는 페이지예요. <Link className="underline" to="/">처음으로</Link></Empty>} />
        </Routes>
      </main>
    </div>
  )
}
