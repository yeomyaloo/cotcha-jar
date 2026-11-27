// cotcha-net REST API 응답 타입. 백엔드의 record 와 이름을 맞춘다

export interface Project {
  id: number
  name: string
  repoPath: string
  language: string
  gitUrl: string | null
  gitBranch: string | null
  commitSha: string | null
  syncedAt: string | null
  createdAt: string
}

export interface CreateProjectRequest {
  name?: string
  gitUrl?: string
  branch?: string
  repoPath?: string
}

export interface IndexResult {
  projectId: number
  files: number
  classes: number
  methods: number
  entryPoints: number
  sinks: number
  callEdges: number
  overrideEdges: number
  unresolvedCalls: number
  removedNodes: number
  retainedNodes: number
  parseErrors: string[]
  elapsedMs: number
  /** 저장소에서 찾은 언어 (java, python, kotlin, node, javascript) */
  languages?: string[]
}

export interface CodeNodeView {
  id: number
  kind: string
  qualifiedName: string
  filePath: string | null
  line: number | null
}

export interface EntryPointView {
  id: number
  httpMethod: string
  path: string
  handler: string
  filePath: string | null
  line: number | null
  /** FastAPI 진입점의 Depends(...) 의존 함수. 그 밖의 진입점은 null (정보 없음) */
  dependencies?: string[] | null
  /** fastapi, flask, django (Java·Kotlin 은 null) */
  framework?: string | null
  /** Flask·Django 진입점의 인증 단서 (login_required, permission_classes, LoginRequiredMixin, before_request …). 그 밖은 null */
  guards?: string[] | null
}

export interface SinkView {
  id: number
  category: string
  cwe: string
  api: string
  method: string
  snippet: string
  filePath: string | null
  line: number | null
  /** 프론트엔드(JS/TS/Vue/HTML) 코드의 위험 지점. 진입점에서 이어지는 경로가 없다 */
  frontend?: boolean
  /** 코드 언어 (java, python, kotlin, node, javascript) */
  language?: string | null
}

export interface SinkPathView {
  entryPoint: EntryPointView
  sink: SinkView
  path: CodeNodeView[]
}

/** WAITING_APPROVAL: 계획이 나와서 사람 승인을 기다림 (Worker 를 돌리기 전) */
export type JobStatus = 'PENDING' | 'RUNNING' | 'WAITING_APPROVAL' | 'DONE' | 'STOPPED' | 'FAILED'

export interface JobView {
  id: number
  projectId: number
  status: JobStatus
  budgetTokens: number | null
  usedTokens: number
  inputTokens: number
  outputTokens: number
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  /** 분석한 커밋 (모르면 null) */
  commitSha: string | null
}

/** 프로젝트별 분석 목록의 한 줄 */
export interface JobSummaryView {
  job: JobView
  intentions: number
  /** 끝난(DONE / FAILED) 할 일 수 */
  intentionsFinished: number
  /** 발견 상태별 개수 */
  findings: Record<'OPEN' | 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN', number>
}

export type NodeKind = 'GOAL' | 'INTENTION' | 'FACT' | 'FINDING' | 'HINT'
/** SKIPPED: 사람이 승인 단계에서 뺀 할 일 */
export type NodeStatus = 'OPEN' | 'CLAIMED' | 'DONE' | 'FAILED' | 'SKIPPED' | 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN'

export interface Evidence {
  file: string
  line: number
  note: string
}

export interface Verification {
  verdict: 'confirmed' | 'rejected' | 'uncertain'
  reasoning: string
  blockingControls?: string | null
  severity?: string | null
  confidence?: string
  verifier?: string
  outcome?: string
  error?: string | null
}

export type ReviewDecision = 'ACCEPTED' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX'

export interface Review {
  decision: ReviewDecision
  comment: string | null
  reviewedAt: string
}

/** FINDING 노드의 props */
export interface FindingProps {
  cwe?: string
  severity?: string
  confidence?: string
  exploitScenario?: string | null
  evidence?: Evidence[]
  sourceNodeId?: number | null
  sinkNodeId?: number | null
  workerId?: string
  verification?: Verification
  review?: Review
}

export interface NodeView {
  id: number
  kind: NodeKind
  status: NodeStatus
  title: string
  body: string | null
  /** 노드 종류마다 다름. FINDING 이면 FindingProps */
  props: Record<string, any>
  workerId: string | null
}

export interface AnalysisView {
  job: JobView
  nodes: NodeView[]
}

export interface TraceView {
  id: number
  intentionId: number | null
  workerId: string | null
  step: number
  role: string
  toolName: string | null
  content: string | null
  createdAt: string
}

/** llm: 계획 담당(Opus)이 할 일을 정함, paths: 진입점 → 위험 지점 경로마다 기계적으로 */
export type PlannerMode = 'llm' | 'paths'

export interface StartAnalysisRequest {
  planner: PlannerMode
  maxIntentions: number
  budgetTokens: number
  /** true 면 계획이 나올 때마다 Worker 를 돌리기 전에 사람 승인을 기다린다 */
  requireApproval: boolean
}

/** 목표(GOAL) 노드 props.approvals 의 한 항목 */
export interface ApprovalRecord {
  round: number
  decision: 'APPROVED' | 'REJECTED'
  skipped: number[]
  comment: string | null
  at: string
}

export interface ApproveRequest {
  skipIntentionIds: number[]
  comment: string | null
}

/** 공개 취약점 DB(OSV)의 알려진 취약점 */
export interface Vulnerability {
  id: string
  /** CVE-... 같은 다른 이름 */
  aliases: string[]
  summary: string | null
  severity: 'critical' | 'high' | 'medium' | 'low' | null
  /** 이 라이브러리에서 고쳐진 버전 */
  fixed: string[]
  cwes: string[]
  url: string
}

/** 빌드 파일에 적힌 라이브러리 하나 */
export interface DependencyView {
  group: string
  artifact: string
  version: string
  file: string
  line: number
  /** dependency / parent / plugin / lockfile / test */
  scope: string
  vulnerabilities: Vulnerability[]
}

/** 라이브러리 검사 결과 (검사 기록의 report) */
export interface DependencyReport {
  files: string[]
  /** 취약점이 있는 것, 심각한 것부터 */
  dependencies: DependencyView[]
  /** 버전을 알 수 없어 검사하지 못한 라이브러리 ("group:artifact (파일:줄)") */
  unversioned: string[]
  /** OSV 에 물어봤는지. false 면 error 에 이유 */
  checked: boolean
  error: string | null
}

export interface VersionChange {
  group: string
  artifact: string
  from: string
  to: string
}

export interface VulnerabilityChange {
  group: string
  artifact: string
  version: string
  id: string
  displayId: string
  severity: Vulnerability['severity']
  summary: string | null
  fixed: string[]
}

/** 지난 검사와의 비교 */
export interface DependencyDiff {
  previousScanId: number
  previousCommitSha: string | null
  previousScannedAt: string
  changed: VersionChange[]
  /** group:artifact:version */
  added: string[]
  removed: string[]
  newVulnerabilities: VulnerabilityChange[]
  resolvedVulnerabilities: VulnerabilityChange[]
  /** 두 검사 모두 OSV 에 물어봤을 때만 취약점을 비교한다 */
  vulnerabilitiesCompared: boolean
}

/** POST /api/projects/{id}/dependency-scans, GET .../dependency-scans/{scanId} */
export interface DependencyScanView {
  id: number
  projectId: number
  commitSha: string | null
  scannedAt: string
  report: DependencyReport
  /** 첫 검사면 null */
  diff: DependencyDiff | null
}

/** GET /api/projects/{id}/dependency-scans 의 한 줄 */
export interface DependencyScanSummary {
  id: number
  commitSha: string | null
  scannedAt: string
  checked: boolean
  error: string | null
  dependencies: number
  vulnerable: number
  vulnerabilities: number
}
