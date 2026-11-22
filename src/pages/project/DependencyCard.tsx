import { useState } from 'react'
import { useDependencyScan, useDependencyScans, useScanDependencies } from '../../api/hooks'
import type { DependencyDiff, DependencyScanView, DependencyView, VulnerabilityChange } from '../../api/types'
import { Badge, Button, Card, Empty, ErrorBox, inputClass, Loading, Stat } from '../../components/ui'
import { SeverityBadge } from '../../components/status'
import { formatDateTime, formatNumber } from '../../lib/format'

const short = (sha: string | null) => (sha ? sha.slice(0, 12) : null)

/**
 * 빌드 파일(pom.xml, build.gradle 등)의 라이브러리와 알려진 취약점(OSV). OWASP A03 공급망.
 * 검사할 때마다 기록이 남고, 지난 검사와 비교해 버전 변화·새 취약점·해결된 취약점을 보여준다.
 * 백엔드가 OSV 에 라이브러리 좌표·버전을 물으므로, 새 검사는 버튼을 눌렀을 때만 한다. 기록은 DB 에서 읽는다.
 */
export default function DependencyCard({ projectId }: { projectId: number }) {
  const scans = useDependencyScans(projectId)
  const scanNow = useScanDependencies(projectId)
  const [selected, setSelected] = useState<number | null>(null)
  const scanId = selected ?? scans.data?.[0]?.id ?? null
  const scan = useDependencyScan(projectId, scanId)

  return (
    <Card
      title="② 라이브러리 취약점"
      actions={
        <>
          {scans.data && scans.data.length > 1 && (
            <select
              aria-label="검사 기록"
              className={`${inputClass.replace('w-full', '')} w-auto text-xs`}
              value={scanId ?? ''}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {scans.data.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i === 0 ? '최근 · ' : ''}
                  {formatDateTime(s.scannedAt)}
                  {s.commitSha ? ` @${s.commitSha.slice(0, 7)}` : ''} · 취약 {s.checked ? s.vulnerable : '?'}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => scanNow.mutate(undefined, { onSuccess: (s) => setSelected(s.id) })}
            loading={scanNow.isPending}
          >
            {scans.data?.length ? '지금 다시 검사' : '라이브러리 검사'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-zinc-500">
        빌드 파일(pom.xml, build.gradle, libs.versions.toml, gradle.lockfile, package-lock.json, yarn.lock, pnpm-lock.yaml)의 라이브러리 버전을 공개 취약점 DB(OSV)에 물어봐요.
        보내는 건 라이브러리 이름과 버전뿐이에요. 검사할 때마다 기록이 남아서 지난 검사와 비교해 보여줘요. LLM Planner도 분석할 때 이 검사를 해요.
      </p>
      <div className="mt-3 space-y-3">
        <ErrorBox error={scans.error ?? scanNow.error ?? scan.error} />
        {scanNow.isPending && <Loading label="OSV에 물어보는 중" />}
        {scans.data?.length === 0 && !scanNow.isPending && <Empty>아직 검사한 적이 없어요.</Empty>}
        {scanId != null && scan.isPending && !scanNow.isPending && <Loading />}
        {scan.data && <ScanResult scan={scan.data} />}
      </div>
    </Card>
  )
}

function ScanResult({ scan }: { scan: DependencyScanView }) {
  const data = scan.report
  const vulnerable = data.dependencies.filter((d) => d.vulnerabilities.length > 0)
  const clean = data.dependencies.filter((d) => d.vulnerabilities.length === 0)

  return (
    <>
      <p className="text-xs text-zinc-500">
        {formatDateTime(scan.scannedAt)}에 검사
        {scan.commitSha && (
          <>
            {' · '}커밋 <code className="font-mono" title={scan.commitSha}>{short(scan.commitSha)}</code>
          </>
        )}
      </p>
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
      {scan.diff ? <DiffSummary diff={scan.diff} /> : <p className="text-sm text-zinc-500">첫 검사라 비교할 기록이 없어요.</p>}
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
  )
}

/** 지난 검사와 달라진 점 */
function DiffSummary({ diff }: { diff: DependencyDiff }) {
  const nothing =
    diff.changed.length + diff.added.length + diff.removed.length + diff.newVulnerabilities.length + diff.resolvedVulnerabilities.length === 0
  return (
    <section aria-label="지난 검사와 비교" className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <h3 className="font-medium">
        지난 검사와 비교
        <span className="ml-2 text-xs font-normal text-zinc-500">
          {formatDateTime(diff.previousScannedAt)}
          {diff.previousCommitSha && ` @${diff.previousCommitSha.slice(0, 7)}`}
        </span>
      </h3>
      {nothing && <p className="mt-1 text-zinc-500">달라진 것이 없어요.</p>}
      <ul className="mt-2 space-y-1">
        {diff.newVulnerabilities.map((v) => <VulnChange key={`n-${v.group}:${v.artifact}#${v.id}`} change={v} kind="new" />)}
        {diff.resolvedVulnerabilities.map((v) => <VulnChange key={`r-${v.group}:${v.artifact}#${v.id}`} change={v} kind="resolved" />)}
        {diff.changed.map((c) => (
          <li key={`c-${c.group}:${c.artifact}`} className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">버전 변경</Badge>
            <span className="font-mono text-xs">
              {c.group}:{c.artifact} {c.from} → <span className="font-semibold">{c.to}</span>
            </span>
          </li>
        ))}
        {diff.added.map((a) => (
          <li key={`a-${a}`} className="flex items-center gap-2">
            <Badge>추가</Badge>
            <span className="font-mono text-xs">{a}</span>
          </li>
        ))}
        {diff.removed.map((r) => (
          <li key={`d-${r}`} className="flex items-center gap-2">
            <Badge>제거</Badge>
            <span className="font-mono text-xs text-zinc-500 line-through">{r}</span>
          </li>
        ))}
      </ul>
      {!diff.vulnerabilitiesCompared && (
        <p className="mt-2 text-xs text-zinc-500">둘 중 한 검사가 OSV에 묻지 못해서 취약점은 비교하지 않았어요.</p>
      )}
    </section>
  )
}

function VulnChange({ change: v, kind }: { change: VulnerabilityChange; kind: 'new' | 'resolved' }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <Badge tone={kind === 'new' ? 'red' : 'green'}>{kind === 'new' ? '새 취약점' : '해결됨'}</Badge>
      <span className="font-mono text-xs">{v.displayId}</span>
      {kind === 'new' && <SeverityBadge severity={v.severity} />}
      <span className="font-mono text-xs text-zinc-500">
        {v.group}:{v.artifact}:{v.version}
      </span>
    </li>
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
