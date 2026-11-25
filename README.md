<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/cotcha-logo-dark.svg">
    <img src="docs/images/cotcha-logo.svg" alt="Cotcha" width="260">
  </picture>
</p>

# cotcha-jar

> **Cotcha** = *"Caught ya!"* Cotcha follows untrusted input from where it enters your code to where it can do damage, catches the security bugs on the way, and keeps them in a jar.
> *Every bug ends up in the jar.*

| Repository | The name means | Role |
|---|---|---|
| [cotcha-trail](https://github.com/yeomyaloo/cotcha-trail) | the trail a bug leaves behind | Shared engine: parses code into a graph of entry points, sinks and the calls between them |
| [cotcha-net](https://github.com/yeomyaloo/cotcha-net) | the bug-catching net | Server: Planner, Worker and Verifier agents sweep the code and double-check every catch (REST API, DB) |
| [cotcha-pocket](https://github.com/yeomyaloo/cotcha-pocket) | the bug box in your pocket | Claude Code plugin / MCP server: run the audit right from chat |
| [cotcha-jar (this repo)](https://github.com/yeomyaloo/cotcha-jar) | the jar where caught bugs go | Web UI: paths, findings and approvals at a glance |
| [cotcha-pinch](https://github.com/yeomyaloo/cotcha-pinch) | the touchscreen pinch, and catching a bug between two fingers | Mobile: Claude Code plugin / MCP server for Android (soon iOS) apps |

**Web UI for [cotcha-net](https://github.com/yeomyaloo/cotcha-net), an AI code security audit agent**

[English](#english) · [한국어](#한국어)

<a id="english"></a>

The agent itself runs in the backend. This frontend is where a person **gives the agent work (goals), watches it (observation), and judges the results (review)**.

- **Backend**: [cotcha-net](https://github.com/yeomyaloo/cotcha-net). This UI only calls its API.
- **Chat version**: you can also run the same audit from chat by installing [cotcha-pocket](https://github.com/yeomyaloo/cotcha-pocket) as a Claude Code plugin. It is not a fallback for people without an API key but a different way of working: it runs on whatever Claude Code is logged in with (a Claude subscription or an API key), and needs no web UI or database.

```bash
claude plugin marketplace add yeomyaloo/cotcha-pocket
claude plugin install cotcha@cotcha
```

## Screenshots

> Taken with the sample data used for UI tests (`e2e/mockApi.ts`, which assumes an analysis of cotcha-net's test fixture `vulnerable-app`). Regenerate them with `npm run screenshots`. The UI text in the screenshots is Korean.

**Project detail**: code graph stats, entry point → sink paths (including calls through interfaces), starting an analysis, the analysis list

![Project detail](docs/screenshots/project.png)

**Library vulnerabilities**: libraries from the build files (Maven, Gradle, npm) with known vulnerabilities (CVE, severity, fixed version) from the public OSV database. Every scan is kept with its commit and compared with the previous one (version changes, new and resolved vulnerabilities); pick an older scan from the history. A new scan runs only when you press the button

![Library vulnerabilities](docs/screenshots/dependencies.png)

**Plan approval**: with "approve the plan before running" on, the analysis stops before any Worker runs. Uncheck tasks to drop them, then approve, or reject the plan to stop the analysis

![Plan approval](docs/screenshots/analysis-approval.png)

**Analysis results**: token usage, and for each finding the Worker report, evidence code, attack example, Verifier verdict and human review

![Analysis results](docs/screenshots/analysis-findings.png)

**Planner and tasks**: the Planner's (LLM) plan summary per round, and for each task the round it was created in, its instructions, prerequisite tasks and the Worker's conclusion

![Planner and tasks](docs/screenshots/analysis-plan.png)

**Agent log**: what the Planner and Workers thought and which tools they called, in order

![Agent log](docs/screenshots/analysis-traces.png)

<details>
<summary>Project list</summary>

![Project list](docs/screenshots/projects.png)

</details>

## Pages

| Page | What it does | API used |
|---|---|---|
| **Projects** `/` | Register a repository by Git URL or server folder path, list registered repositories with language badges (Java, Kotlin, Python, JS/TS; detected when the code graph is built) | `POST /api/projects`, `GET /api/projects` |
| **Project detail** `/projects/:id` | Pull the latest commit, build the code graph (file, method, entry point and sink stats), browse entry point → sink paths, entry points and sinks (frontend JS/TS and Python sinks are marked; FastAPI entry points show their `Depends(...)` dependencies or a "no Depends" warning), library vulnerabilities (build files + OSV, on demand; scan history and comparison with the previous scan), analyzed commit per analysis, start an analysis (planning mode: LLM Planner / mechanically per path; optionally wait for human approval of each plan), analysis list (status, finished tasks, finding counts, tokens) | `/sync`, `/index`, `/code-graph/*`, `/dependency-scans`, `POST·GET /analyses` |
| **Analysis** `/analyses/:id` | Plan approval while `WAITING_APPROVAL` (drop tasks, approve or reject) and the approval history, real-time progress (server events, SSE; falls back to 2-second polling), token usage, findings (Verifier verdict, evidence code, attack example), human review, the Planner's per-round plans and per-task conclusions, agent log timeline, HTML and SARIF reports | `GET /analyses/:id`, `/approve`, `/reject`, `/traces`, `/findings/:id/review`, `/verify`, `/report.*` |

The **Agent log** tab shows what the agent did, in order: what Claude thought, which tools it called, and what results it got back. While an analysis is running, it follows new entries automatically.

## Running

### With Docker (backend + database included)

The easiest way to try the web UI is the backend's one-click setup: `docker compose up` in [cotcha-net](https://github.com/yeomyaloo/cotcha-net#quick-start-with-docker-recommended) builds this repository from GitHub (this `Dockerfile`) and starts it with PostgreSQL and the backend at http://localhost:3000. In the container, nginx serves the built files and forwards `/api` to `BACKEND_URL` (default `http://backend:8080`, see `nginx.conf.template`).

The steps below are for developing the UI itself.

### Requirements

- Node.js 20 or later
- A running [cotcha-net](https://github.com/yeomyaloo/cotcha-net) backend (default `http://localhost:8080`)

### Dev server

```bash
npm install
npm run dev
```

It opens at `http://localhost:5173`. The dev server forwards `/api` requests to the backend (Vite proxy), so the backend needs no CORS setup.

If the backend runs at a different address, set it in `.env.local`.

```
VITE_API_TARGET=http://localhost:8080
```

### Build

```bash
npm run build      # type check + static files in dist/
npm run preview    # preview the build
```

## UI tests

[Playwright](https://playwright.dev) opens a real browser (Chromium) and checks the pages. They run **without the backend**: every `/api` request is answered with the sample data in `e2e/mockApi.ts`.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # UI tests (starts the dev server for you)
npm run screenshots               # regenerate README screenshots
npx playwright show-report        # HTML report and traces on failure
```

What is checked: repository list ordering, Git registration and error messages, code graph stats and path display, library vulnerabilities (latest scan and its diff without calling OSV, older scans from the history, new scan on button press, OSV failure message), analyzed commit, analysis list, starting an analysis (planning mode choice), finding order (confirmed → pending verification → uncertain, rejected hidden), saving human reviews, the Planner's per-round conclusions and follow-up tasks, task conclusions, agent log timeline, auto-refresh of running work, report links, and the message shown when the backend is down.

### Playwright MCP (for Claude Code)

[Playwright MCP](https://github.com/microsoft/playwright-mcp) is registered in `.mcp.json`. When you open Claude Code in this folder, it first asks whether to approve the MCP server. Once approved, Claude can drive the browser itself (click, type, take screenshots) to check the pages.

## Tech stack

| Area | Technology |
|---|---|
| Framework | React 19 + TypeScript, Vite 6 |
| Routing | React Router 7 |
| Server state | TanStack Query 5 + EventSource (running analyses update from SSE events, or every 2 seconds without them) |
| Styling | Tailwind CSS 4 (automatic light and dark mode) |
| UI tests | Playwright 1.64 (+ Playwright MCP) |

## Directory structure

```
src/
├── main.tsx                  entry point (QueryClient, Router)
├── App.tsx                   layout, routes
├── api/
│   ├── types.ts              backend response types (names match the backend records)
│   ├── client.ts             fetch wrapper, ProblemDetail error handling
│   └── hooks.ts              React Query hooks per API
├── components/
│   ├── ui.tsx                shared UI: Card, Button, Badge, Tabs, etc.
│   └── status.tsx            status, verdict and severity badges
├── lib/
│   └── format.ts             number, time and name formatting
└── pages/
    ├── ProjectsPage.tsx      repository registration and list
    ├── ProjectPage.tsx       code graph, starting an analysis
    ├── project/
    │   └── DependencyCard.tsx library vulnerabilities (OSV), scan history and diff
    ├── AnalysisPage.tsx      analysis progress and results
    └── analysis/
        ├── ApprovalCard.tsx  plan approval (drop tasks, approve or reject) and its history
        ├── FindingList.tsx   findings, Verifier verdicts, human review
        ├── IntentionList.tsx tasks and conclusions
        └── TraceTimeline.tsx agent log timeline
e2e/
├── mockApi.ts                sample data and fake /api responses
├── app.spec.ts               UI tests
└── screenshots.spec.ts       README screenshots (npm run screenshots)
docs/screenshots/             README screenshots
Dockerfile, nginx.conf.template  container image: nginx serves the build, proxies /api
```

## Known limitations

- Live updates use server events (SSE) and fall back to 2-second polling when the connection drops. The page header shows which one is in use ("실시간" / "2초마다 갱신").
- There is no authentication. It is meant for local, single-user use.

## License

[Apache License 2.0](LICENSE)

---

<a id="한국어"></a>

# cotcha-jar (한국어)

> **Cotcha(코챠)** = *"Caught ya!"*(잡았다!)를 귀엽게 줄인 말. 외부 입력이 코드에 들어온 곳부터 위험한 곳까지 따라가며 보안 버그를 잡아 유리병에 담는다.
> *Every bug ends up in the jar.* (잡은 버그는 전부 병 속으로)

| 레포 | 이름 뜻 | 역할 |
|---|---|---|
| [cotcha-trail](https://github.com/yeomyaloo/cotcha-trail) | 벌레가 지나간 발자국 | 공용 엔진: 코드를 파싱해 진입점 → 위험 지점 경로(호출 그래프)를 그린다 |
| [cotcha-net](https://github.com/yeomyaloo/cotcha-net) | 벌레 잡는 잠자리채 | 서버: Planner·Worker·Verifier 에이전트 팀이 코드를 훑고, 잡은 것을 다시 확인한다 (REST API, DB) |
| [cotcha-pocket](https://github.com/yeomyaloo/cotcha-pocket) | 주머니 속 채집통 | Claude Code 플러그인 / MCP 서버: 채팅에서 바로 분석한다 |
| [cotcha-jar (이 레포)](https://github.com/yeomyaloo/cotcha-jar) | 잡은 벌레를 모아 두는 유리병 | 웹 화면: 경로·발견·승인을 한눈에 본다 |
| [cotcha-pinch](https://github.com/yeomyaloo/cotcha-pinch) | 화면을 집는 손가락 제스처, 손가락으로 벌레를 집어 잡기 | 모바일: 안드로이드(곧 iOS) 앱용 Claude Code 플러그인 / MCP 서버 |

**[cotcha-net](https://github.com/yeomyaloo/cotcha-net)(AI 코드 보안 분석 에이전트)의 웹 화면**

에이전트 자체는 백엔드에서 돈다. 이 프론트는 사람이 에이전트에게 **일을 시키고(목표), 지켜보고(관찰), 결과를 판단하는(검토)** 창구다.

- **백엔드**: [cotcha-net](https://github.com/yeomyaloo/cotcha-net). 이 화면은 백엔드 API만 부른다.
- **채팅 버전**: 같은 분석을 채팅에서 하려면 [cotcha-pocket](https://github.com/yeomyaloo/cotcha-pocket)를 Claude Code 플러그인으로 설치한다. API 키가 없을 때만 쓰는 대안이 아니라 쓰는 방식이 다른 선택지다. Claude Code에 로그인한 방식(Claude 구독이든 API 키든)으로 돌고, 웹 화면과 DB가 필요 없다.

```bash
claude plugin marketplace add yeomyaloo/cotcha-pocket
claude plugin install cotcha@cotcha
```

## 스크린샷

> 화면 테스트용 예시 데이터(`e2e/mockApi.ts`, cotcha-net의 테스트 픽스처 `vulnerable-app`을 분석했다고 가정)로 찍었다. `npm run screenshots`로 다시 만든다.

**프로젝트 상세**: 코드 그래프 통계, 진입점 → 위험 지점 경로(인터페이스를 거치는 호출 포함), 분석 시작, 분석 목록

![프로젝트 상세](docs/screenshots/project.png)

**라이브러리 취약점**: 빌드 파일(Maven, Gradle, npm)의 라이브러리 중 공개 취약점 DB(OSV)에 알려진 취약점이 있는 것(CVE, 심각도, 고친 버전). 검사마다 커밋과 함께 기록이 남고 지난 검사와 비교한다(버전 변경, 새 취약점, 해결된 취약점). 기록에서 예전 검사를 골라 볼 수 있다. 새 검사는 버튼을 눌렀을 때만 한다

![라이브러리 취약점](docs/screenshots/dependencies.png)

**계획 승인**: "실행 전에 계획 승인받기"를 켜면 Worker를 돌리기 전에 멈춘다. 뺄 할 일의 체크를 끄고 승인하거나, 계획을 거절해서 분석을 멈춘다

![계획 승인](docs/screenshots/analysis-approval.png)

**분석 결과**: 토큰 사용량, 발견마다 Worker 보고·근거 코드·공격 예시·Verifier 판정·사람 검토

![분석 결과](docs/screenshots/analysis-findings.png)

**Planner와 할 일**: Planner(LLM)의 회차별 계획 요약, 할 일마다 만든 회차·지시·선행 할 일·Worker 결론

![Planner와 할 일](docs/screenshots/analysis-plan.png)

**에이전트 기록**: Planner·Worker가 무슨 생각을 했고 어떤 도구를 불렀는지 순서대로

![에이전트 기록](docs/screenshots/analysis-traces.png)

<details>
<summary>프로젝트 목록</summary>

![프로젝트 목록](docs/screenshots/projects.png)

</details>

## 화면

| 화면 | 하는 일 | 쓰는 API |
|---|---|---|
| **프로젝트** `/` | Git 주소나 서버 폴더 경로로 저장소 등록, 등록된 저장소 목록(언어 배지: Java, Kotlin, Python, JS/TS. 코드 그래프를 만들 때 판별) | `POST /api/projects`, `GET /api/projects` |
| **프로젝트 상세** `/projects/:id` | 최신 커밋 받기, 코드 그래프 만들기(파일·메서드·진입점·위험 지점 통계), 진입점 → 위험 지점 경로·진입점·위험 지점 조회(프론트엔드 JS/TS·Python 위험 지점 표시, FastAPI 진입점은 `Depends(...)` 의존 함수나 'Depends 없음' 경고), 라이브러리 취약점(빌드 파일 + OSV, 버튼을 누를 때만. 검사 기록과 지난 검사와의 비교), 분석마다 분석한 커밋, 분석 시작(계획 방식: LLM Planner / 경로마다 기계적으로, 계획마다 사람 승인받기 선택), 분석 목록(상태·할 일·발견 개수·토큰) | `/sync`, `/index`, `/code-graph/*`, `/dependency-scans`, `POST·GET /analyses` |
| **분석** `/analyses/:id` | 승인 대기(`WAITING_APPROVAL`) 중이면 계획 승인(할 일 빼기·승인·거절)과 승인 기록, 실시간 진행 상황(서버 이벤트 SSE, 끊기면 2초 폴링), 토큰 사용량, 발견 목록(Verifier 판정·근거 코드·공격 예시), 사람 검토, Planner 회차별 계획과 할 일별 결론, 에이전트 기록 타임라인, HTML·SARIF 보고서 | `GET /analyses/:id`, `/approve`, `/reject`, `/traces`, `/findings/:id/review`, `/verify`, `/report.*` |

**에이전트 기록** 탭에서는 에이전트가 한 일을 순서대로 볼 수 있다. Claude가 무슨 생각을 했고, 어떤 도구를 불렀고, 무슨 결과를 받았는지가 나온다. 분석이 진행 중이면 새 기록을 자동으로 따라간다.

## 실행

### Docker로 실행 (백엔드·DB 포함)

웹 화면을 써 보는 가장 쉬운 방법은 백엔드의 원클릭 설치다. [cotcha-net](https://github.com/yeomyaloo/cotcha-net#docker로-한-번에-실행-추천)에서 `docker compose up`을 하면 이 저장소를 GitHub에서 받아 빌드(이 `Dockerfile`)하고, PostgreSQL·백엔드와 함께 http://localhost:3000 에 띄운다. 컨테이너 안에서는 nginx가 빌드한 파일을 서빙하고 `/api`를 `BACKEND_URL`(기본 `http://backend:8080`, `nginx.conf.template` 참고)로 넘긴다.

아래는 화면을 직접 개발할 때 쓰는 방법이다.

### 요구 사항

- Node.js 20 이상
- 실행 중인 [cotcha-net](https://github.com/yeomyaloo/cotcha-net) 백엔드 (기본 `http://localhost:8080`)

### 개발 서버

```bash
npm install
npm run dev
```

`http://localhost:5173`에서 열린다. 개발 서버가 `/api` 요청을 백엔드로 넘겨주므로(Vite 프록시) 백엔드에 CORS 설정이 필요 없다.

백엔드 주소가 다르면 `.env.local`에 적는다.

```
VITE_API_TARGET=http://localhost:8080
```

### 빌드

```bash
npm run build      # 타입 검사 + dist/ 에 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
```

## 화면 테스트

[Playwright](https://playwright.dev)로 실제 브라우저(Chromium)를 띄워 화면을 검사한다. **백엔드 없이** 돈다. 모든 `/api` 요청을 `e2e/mockApi.ts`의 예시 데이터로 대신 응답한다.

```bash
npx playwright install chromium   # 처음 한 번
npm run test:e2e                  # 화면 테스트 (개발 서버를 알아서 띄움)
npm run screenshots               # README 스크린샷 다시 만들기
npx playwright show-report        # 실패 시 HTML 리포트와 trace 보기
```

검사하는 것: 저장소 목록 정렬, Git 등록과 오류 메시지, 코드 그래프 통계와 경로 표시, 라이브러리 취약점(OSV에 묻지 않고 최근 검사와 비교 표시, 기록에서 예전 검사 보기, 버튼을 눌러야 새 검사, OSV 실패 안내), 분석한 커밋, 분석 목록, 분석 시작(계획 방식 선택), 발견 정렬(확정 → 검증 대기 → 판단 불가, 기각은 숨김), 사람 검토 저장, Planner 회차별 결론과 후속 할 일, 할 일 결론, 에이전트 기록 타임라인, 진행 중 작업 자동 갱신, 보고서 링크, 백엔드가 꺼졌을 때 안내 문구.

### Playwright MCP (Claude Code용)

`.mcp.json`에 [Playwright MCP](https://github.com/microsoft/playwright-mcp)가 등록되어 있다. 이 폴더에서 Claude Code를 열면 처음에 MCP 서버 사용을 승인할지 묻는다. 승인하면 Claude가 브라우저를 직접 조작해서(클릭, 입력, 스크린샷) 화면을 확인할 수 있다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | React 19 + TypeScript, Vite 6 |
| 라우팅 | React Router 7 |
| 서버 상태 | TanStack Query 5 + EventSource (진행 중인 분석은 SSE 이벤트로 갱신, 이벤트가 없으면 2초 폴링) |
| 스타일 | Tailwind CSS 4 (라이트·다크 모드 자동) |
| 화면 테스트 | Playwright 1.64 (+ Playwright MCP) |

## 디렉터리 구조

```
src/
├── main.tsx                  진입점 (QueryClient, Router)
├── App.tsx                   레이아웃, 라우트
├── api/
│   ├── types.ts              백엔드 응답 타입 (백엔드 record 와 이름을 맞춤)
│   ├── client.ts             fetch 래퍼, ProblemDetail 오류 처리
│   └── hooks.ts              API별 React Query 훅
├── components/
│   ├── ui.tsx                Card, Button, Badge, Tabs 등 공통 UI
│   └── status.tsx            상태·판정·심각도 배지
├── lib/
│   └── format.ts             숫자·시간·이름 표시
└── pages/
    ├── ProjectsPage.tsx      저장소 등록·목록
    ├── ProjectPage.tsx       코드 그래프, 분석 시작
    ├── project/
    │   └── DependencyCard.tsx 라이브러리 취약점 (OSV), 검사 기록과 비교
    ├── AnalysisPage.tsx      분석 진행·결과
    └── analysis/
        ├── ApprovalCard.tsx  계획 승인(할 일 빼기·승인·거절)과 승인 기록
        ├── FindingList.tsx   발견, Verifier 판정, 사람 검토
        ├── IntentionList.tsx 할 일과 결론
        └── TraceTimeline.tsx 에이전트 기록 타임라인
e2e/
├── mockApi.ts                예시 데이터와 /api 가짜 응답
├── app.spec.ts               화면 테스트
└── screenshots.spec.ts       README 스크린샷 (npm run screenshots)
docs/screenshots/             README 스크린샷
Dockerfile, nginx.conf.template  컨테이너 이미지: nginx 가 빌드 결과를 서빙하고 /api 를 넘김
```

## 알려진 한계

- 실시간 갱신은 서버 이벤트(SSE)로 하고, 연결이 끊기면 2초 폴링으로 돌아간다. 화면 위쪽에 어느 쪽인지("실시간" / "2초마다 갱신") 표시된다.
- 인증이 없다. 로컬에서 혼자 쓰는 용도다.

## 라이선스

[Apache License 2.0](LICENSE)
