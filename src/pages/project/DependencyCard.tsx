import { useState } from 'react'
import { useDependencies } from '../../api/hooks'
import type { DependencyView } from '../../api/types'
import { Badge, Button, Card, Empty, ErrorBox, Loading, Stat } from '../../components/ui'
import { SeverityBadge } from '../../components/status'
import { formatNumber } from '../../lib/format'

/**
 * 빌드 파일(pom.xml, build.gradle 등)의 라이브러리와 알려진 취약점(OSV). OWASP A03 공급망.
 * 백엔드가 OSV 에 라이브러리 좌표·버전을 물으므로, 버튼을 눌렀을 때만 검사한다.
 */
export default function DependencyCard({ projectId }: { projectId: number }) {
  const [requested, setRequested] = useState(false)
  const report = useDependencies(projectId, requested)
  const data = report.data
  const vulnerable = data?.dependencies.filter((d) => d.vulnerabilities.length > 0) ?? []
  const clean = data?.dependencies.filter((d) => d.vulnerabilities.length === 0) ?? []

  return (
    <Card
      title="② 라이브러리 취약점"
      actions={
        <Button
          onClick={() => (requested ? report.refetch() : setRequested(true))}
          loading={report.isFetching}
        >
          {data ? '다시 검사' : '라이브러리 검사'}
        </Button>
      }
    >
      <p className="text-sm text-zinc-500">
        빌드 파일(pom.xml, build.gradle, libs.versions.toml, gradle.lockfile)의 라이브러리 버전을 공개 취약점 DB(OSV)에 물어봐요.
        보내는 건 라이브러리 이름과 버전뿐이에요. LLM Planner는 분석할 때 이 결과를 보고, 취약한 기능을 실제로 쓰는지 확인하는 할 일을 만들어요.
      </p>
      <div className="mt-3 space-y-3">
        {requested && report.isPending && <Loading label="OSV에 물어보는 중" />}
        <ErrorBox error={report.error} />
        {data && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="라이브러리" value={formatNumber(data.dependencies.length)} hint={`빌드 파일 ${data.files.length}개`} />
              <Stat
                label="알려진 취약점이 있는 것"
                value={<span className={vulnerable.length > 0 ? 'text-red-600 dark:text-red-400' : ''}>{data.checked ? formatNumber(vulnerable.length) : '-'}</span>}
                hint={data.checked ? `취약점 ${formatNumber(vulnerable.reduce((n, d) => n + d.vulnerabilities.length, 0))}개` : '검사 못 함'}
              />
              <Stat label="버전 모름" value={formatNumber(data.unversioned.length)} hint="검사하지 못한 라이브러리" />
              <Stat label="빌드 파일" value={<span className="text-sm font-normal break-all">{data.files.join(', ') || '없음'}</span>} />
            </div>
            {data.error && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
                {data.checked ? '참고' : '알려진 취약점을 검사하지 못했어요'}: {data.error}
              </p>
            )}
            {data.files.length === 0 && <Empty>빌드 파일을 찾지 못했어요.</Empty>}
            {data.checked && data.files.length > 0 && vulnerable.length === 0 && (
              <p className="text-sm text-green-700 dark:text-green-400">알려진 취약점이 있는 라이브러리가 없어요.</p>
            )}
            {vulnerable.length > 0 && (
              <ul className="space-y-3" aria-label="취약한 라이브러리">
                {vulnerable.map((d) => <VulnerableDependency key={`${d.group}:${d.artifact}:${d.version}`} dependency={d} />)}
              </ul>
            )}
            {clean.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-zinc-500">
                  {data.checked ? '알려진 취약점이 없는' : '검사한'} 라이브러리 {clean.length}개
                </summary>
                <ul className="mt-2 grid gap-x-4 gap-y-0.5 font-mono text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-400">
                  {clean.map((d) => (
                    <li key={`${d.group}:${d.artifact}:${d.version}`} className="truncate" title={`${d.file}:${d.line}`}>
                      {d.group}:{d.artifact}:{d.version}
                      {d.scope === 'test' && <span className="ml-1 text-zinc-400">(test)</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {data.unversioned.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-zinc-500">버전을 알 수 없는 라이브러리 {data.unversioned.length}개</summary>
                <p className="mt-1 text-xs text-zinc-500">BOM이나 플러그인이 버전을 정하는 경우예요. gradle.lockfile을 두면 전이 의존성까지 검사돼요.</p>
                <ul className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {data.unversioned.map((u) => <li key={u}>{u}</li>)}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

function VulnerableDependency({ dependency: d }: { dependency: DependencyView }) {
  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium break-all">
          {d.group}:{d.artifact}:<span className="text-red-600 dark:text-red-400">{d.version}</span>
        </span>
        {d.scope !== 'dependency' && <Badge>{d.scope}</Badge>}
        <span className="text-xs text-zinc-500">
          {d.file}
          {d.line > 0 && `:${d.line}`}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {d.vulnerabilities.map((v) => {
          const cve = v.aliases.find((a) => a.startsWith('CVE-'))
          return (
            <li key={v.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <SeverityBadge severity={v.severity} />
              <a href={v.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 hover:underline dark:text-blue-400">
                {cve ?? v.id}
              </a>
              <span className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-300">{v.summary}</span>
              {v.fixed.length > 0 && <span className="text-xs text-green-700 dark:text-green-400">고친 버전 {v.fixed.join(', ')}</span>}
            </li>
          )
        })}
      </ul>
    </li>
  )
}
