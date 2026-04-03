#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

// ── Path Resolution ──────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const VIEWLOGIC_ROOT = resolve(__dirname, '../../');
const DOCS_DIR = join(VIEWLOGIC_ROOT, 'docs');

// ── Document Registry ────────────────────────────────────────────
const DOCS_REGISTRY = {
  // Practical guides (concise)
  'routing':            join(DOCS_DIR, 'routing.md'),
  'configuration':      join(DOCS_DIR, 'configuration.md'),
  'api':                join(DOCS_DIR, 'api-usage.md'),
  'auth':               join(DOCS_DIR, 'auth.md'),
  'layout':             join(DOCS_DIR, 'layout.md'),
  'components':         join(DOCS_DIR, 'components.md'),
  'components-builtin': join(DOCS_DIR, 'components-builtin.md'),
  'advanced':           join(DOCS_DIR, 'advanced.md'),
  'data-fetching':      join(DOCS_DIR, 'data-fetching.md'),
  'forms':              join(DOCS_DIR, 'forms.md'),
  'i18n':               join(DOCS_DIR, 'i18n.md'),
  'internals':          join(DOCS_DIR, 'internals.md'),

  // Detailed reference
  'guide':              join(VIEWLOGIC_ROOT, 'GUIDE.md'),
  'claude':             join(VIEWLOGIC_ROOT, 'CLAUDE.md'),
  'readme':             join(DOCS_DIR, 'README.md'),
  'api-reference':      join(DOCS_DIR, 'api.md'),
  'router-reference':   join(DOCS_DIR, 'router.md'),
  'basic-usage':        join(DOCS_DIR, 'basic-usage.md'),
  'installation':       join(DOCS_DIR, 'installation.md'),
};

// ── Source Module Registry ───────────────────────────────────────
const SOURCE_REGISTRY = {
  'ViewLogicRouter': join(VIEWLOGIC_ROOT, 'src', 'viewlogic-router.js'),
  'RouteLoader':     join(VIEWLOGIC_ROOT, 'src', 'core', 'RouteLoader.js'),
  'ApiHandler':      join(VIEWLOGIC_ROOT, 'src', 'core', 'ApiHandler.js'),
  'FormHandler':     join(VIEWLOGIC_ROOT, 'src', 'core', 'FormHandler.js'),
  'ComponentLoader': join(VIEWLOGIC_ROOT, 'src', 'core', 'ComponentLoader.js'),
  'StateHandler':    join(VIEWLOGIC_ROOT, 'src', 'core', 'StateHandler.js'),
  'ErrorHandler':    join(VIEWLOGIC_ROOT, 'src', 'core', 'ErrorHandler.js'),
  'AuthManager':     join(VIEWLOGIC_ROOT, 'src', 'plugins', 'AuthManager.js'),
  'CacheManager':    join(VIEWLOGIC_ROOT, 'src', 'plugins', 'CacheManager.js'),
  'I18nManager':     join(VIEWLOGIC_ROOT, 'src', 'plugins', 'I18nManager.js'),
  'QueryManager':    join(VIEWLOGIC_ROOT, 'src', 'plugins', 'QueryManager.js'),
};

// ── Helpers ──────────────────────────────────────────────────────
function safeReadFile(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}

// ── Server ───────────────────────────────────────────────────────
const server = new McpServer({
  name: "viewlogic",
  version: "1.0.0",
});

// ── Resources: Documents ─────────────────────────────────────────
for (const [topic, filePath] of Object.entries(DOCS_REGISTRY)) {
  server.resource(
    `doc-${topic}`,
    `viewlogic://docs/${topic}`,
    { description: `ViewLogic documentation: ${topic}`, mimeType: "text/markdown" },
    async (uri) => {
      const content = safeReadFile(filePath);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: content || `Document '${topic}' not found at ${filePath}`,
        }],
      };
    }
  );
}

// ── Resources: Source Code ───────────────────────────────────────
for (const [moduleName, filePath] of Object.entries(SOURCE_REGISTRY)) {
  server.resource(
    `source-${moduleName}`,
    `viewlogic://source/${moduleName}`,
    { description: `ViewLogic source: ${moduleName}`, mimeType: "application/javascript" },
    async (uri) => {
      const content = safeReadFile(filePath);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/javascript",
          text: content || `Source '${moduleName}' not found`,
        }],
      };
    }
  );
}

// ── Tool: lookup_docs ────────────────────────────────────────────
server.tool(
  "lookup_docs",
  "Search ViewLogic documentation by keyword. Returns matching sections from all docs.",
  { keyword: z.string().describe("Search keyword (e.g., 'navigateTo', '$api', 'layout', 'mounted')") },
  async ({ keyword }) => {
    const results = [];
    const lower = keyword.toLowerCase();

    for (const [topic, filePath] of Object.entries(DOCS_REGISTRY)) {
      const content = safeReadFile(filePath);
      if (!content) continue;

      const lines = content.split('\n');
      const matches = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lower)) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length - 1, i + 2);
          matches.push({ line: i + 1, context: lines.slice(start, end + 1).join('\n') });
        }
      }

      if (matches.length > 0) {
        results.push({ topic, matchCount: matches.length, matches: matches.slice(0, 3) });
      }
    }

    if (results.length === 0) {
      return { content: [{ type: "text", text: `No results for '${keyword}' in ViewLogic docs.` }] };
    }

    const text = results.map(r => {
      const snippets = r.matches.map(m => `  Line ${m.line}:\n${m.context}`).join('\n\n');
      return `## ${r.topic} (${r.matchCount} matches)\n${snippets}`;
    }).join('\n\n---\n\n');

    return { content: [{ type: "text", text: `Found '${keyword}' in ${results.length} documents:\n\n${text}` }] };
  }
);

// ── Tool: get_source ─────────────────────────────────────────────
const moduleNames = Object.keys(SOURCE_REGISTRY).join(', ');

server.tool(
  "get_source",
  `Get source code of a ViewLogic module. Available: ${moduleNames}`,
  { module: z.string().describe("Module name (e.g., 'ApiHandler', 'RouteLoader')") },
  async ({ module: mod }) => {
    const filePath = SOURCE_REGISTRY[mod];
    if (!filePath) {
      return { content: [{ type: "text", text: `Module '${mod}' not found. Available: ${moduleNames}` }] };
    }
    const content = safeReadFile(filePath);
    if (!content) {
      return { content: [{ type: "text", text: `Source file not found: ${filePath}` }] };
    }
    return { content: [{ type: "text", text: `// Source: ${basename(filePath)}\n// Path: ${filePath}\n\n${content}` }] };
  }
);

// ── Tool: get_config_options ─────────────────────────────────────
server.tool(
  "get_config_options",
  "Get ViewLogic Router configuration options reference (all initialization options with types, defaults, descriptions).",
  {},
  async () => {
    const parts = [];

    const configDoc = safeReadFile(DOCS_REGISTRY['configuration']);
    if (configDoc) parts.push(configDoc);

    const claudeMd = safeReadFile(join(VIEWLOGIC_ROOT, 'CLAUDE.md'));
    if (claudeMd) {
      const match = claudeMd.match(/## Configuration Options[\s\S]*?(?=\n## [^#]|$)/);
      if (match) parts.push('---\n\n## From CLAUDE.md\n\n' + match[0]);
    }

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'Configuration docs not found.' }],
    };
  }
);

// ── Tool: get_auth_reference ─────────────────────────────────────
server.tool(
  "get_auth_reference",
  "Get ViewLogic authentication reference: login/logout, token management, refresh token setup, protected routes, auth events.",
  {},
  async () => {
    const parts = [];

    const authDoc = safeReadFile(DOCS_REGISTRY['auth']);
    if (authDoc) parts.push(authDoc);

    const internals = safeReadFile(DOCS_REGISTRY['internals']);
    if (internals) {
      // 토큰 갱신 내부 동작 섹션 추출
      const s4 = internals.match(/## 4\. [\s\S]*?(?=\n## \d|$)/);
      if (s4) parts.push('---\n\n## Internals: Token Refresh\n\n' + s4[0]);
    }

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'Auth reference not found.' }],
    };
  }
);

// ── Tool: get_api_reference ──────────────────────────────────────
// 통합 도구: $api 메서드 + errorHandlers + apiInterceptors + dataURL
server.tool(
  "get_api_reference",
  "Get ViewLogic API reference: $api methods (GET/POST/PUT/DELETE), errorHandlers (HTTP status code-based error handling), apiInterceptors (response/error interceptors), dataURL patterns, query parameter auto-injection.",
  {
    section: z.enum(['all', 'methods', 'error-handlers', 'interceptors']).optional()
      .describe("Section to retrieve: 'methods' ($api usage), 'error-handlers' (errorHandlers), 'interceptors' (apiInterceptors), 'all' (default)")
  },
  async ({ section = 'all' }) => {
    const parts = [];

    // ── $api 메서드 + 사용법 ──
    if (section === 'all' || section === 'methods') {
      const apiDoc = safeReadFile(DOCS_REGISTRY['api']);
      if (apiDoc) parts.push(apiDoc);

      const dataFetching = safeReadFile(DOCS_REGISTRY['data-fetching']);
      if (dataFetching) parts.push('---\n\n' + dataFetching);

      const internals = safeReadFile(DOCS_REGISTRY['internals']);
      if (internals) {
        const s3 = internals.match(/## 3\. [\s\S]*?(?=\n## \d|$)/);
        if (s3) parts.push('---\n\n## Internals: Query Parameter Auto-Injection\n\n' + s3[0]);
        const s4 = internals.match(/## 4\. [\s\S]*?(?=\n## \d|$)/);
        if (s4) parts.push('---\n\n' + s4[0]);
      }
    }

    // ── errorHandlers (HTTP 상태 코드별 에러 처리) ──
    if (section === 'all' || section === 'error-handlers') {
      const apiRef = safeReadFile(DOCS_REGISTRY['api-reference']);
      if (apiRef) {
        const s = apiRef.match(/### errorHandlers[\s\S]*?(?=\n## [^#]|$)/);
        if (s) parts.push('---\n\n## errorHandlers Reference\n\n' + s[0]);
      }

      const apiUsage = safeReadFile(DOCS_REGISTRY['api']);
      if (apiUsage) {
        const s = apiUsage.match(/## 에러 처리[\s\S]*?(?=\n## [^#]|$)/);
        if (s) parts.push('---\n\n' + s[0]);
      }

      const internals = safeReadFile(DOCS_REGISTRY['internals']);
      if (internals) {
        const s = internals.match(/## 5\. errorHandlers[\s\S]*?(?=\n---\n\n## \d|$)/);
        if (s) parts.push('---\n\n## Internals: errorHandlers\n\n' + s[0]);
      }
    }

    // ── apiInterceptors (응답/에러 인터셉터) ──
    if (section === 'all' || section === 'interceptors') {
      const apiRef = safeReadFile(DOCS_REGISTRY['api-reference']);
      if (apiRef) {
        const s = apiRef.match(/### apiInterceptors[\s\S]*?(?=\n### [^#]|$)/);
        if (s) parts.push('---\n\n## apiInterceptors Reference\n\n' + s[0]);
      }

      const routerDoc = safeReadFile(DOCS_REGISTRY['router-reference']);
      if (routerDoc) {
        const s = routerDoc.match(/## API Interceptors[\s\S]*?(?=\n## [^#]|$)/);
        if (s) parts.push('---\n\n' + s[0]);
      }

      const apiUsage = safeReadFile(DOCS_REGISTRY['api']);
      if (apiUsage) {
        const s = apiUsage.match(/### 전역 인터셉터[\s\S]*?(?=\n## [^#]|$)/);
        if (s) parts.push('---\n\n' + s[0]);
      }
    }

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'API reference not found.' }],
    };
  }
);

// ── Tool: get_routing_reference ─────────────────────────────────
server.tool(
  "get_routing_reference",
  "Get ViewLogic routing reference: navigateTo(), getParam(), getParams(), query parameter patterns, file-based routing, page remount on param change.",
  {},
  async () => {
    const parts = [];

    // 라우팅 기본 (navigateTo, getParam, getParams)
    const routingDoc = safeReadFile(DOCS_REGISTRY['routing']);
    if (routingDoc) parts.push(routingDoc);

    // internals: 쿼리 파라미터 자동 추가 + 변경 감지
    const internals = safeReadFile(DOCS_REGISTRY['internals']);
    if (internals) {
      const s3 = internals.match(/## 3\. [\s\S]*?(?=\n---\n\n## \d|$)/);
      if (s3) parts.push('---\n\n## Internals: Query Parameter Auto-Injection\n\n' + s3[0]);

      const s10 = internals.match(/## 10\. [\s\S]*?(?=\n---\n\n## \d|---\n\n## 부록|$)/);
      if (s10) parts.push('---\n\n## Internals: Query Param Change Detection\n\n' + s10[0]);
    }

    // 서버 필터링 패턴 요약
    parts.push(`---

## Server Filtering Pattern (Summary)

\`\`\`javascript
// 1. 필터 적용 → URL 변경 → 리마운트
applyFilters() {
    this.navigateTo('/current-route', {
        status: this.filterStatus,
        keyword: this.searchKeyword
    });
}

// 2. mounted()에서 데이터 로딩 — $api가 URL 파라미터 자동 추가
async loadData() {
    const response = await this.$api.get('/api/endpoint');
    // $api가 URL의 ?status=active&keyword=test 를 자동 추가
    this.items = response.data;
}

// 3. 필터 초기화
clearFilters() {
    this.navigateTo('/current-route', {});
}

// 4. mounted()에서 필터값 복원
mounted() {
    this.filterStatus = this.getParam('status', '');
    this.searchKeyword = this.getParam('keyword', '');
    await this.loadData();
}
\`\`\`

**주의**: \`$api.get('/endpoint?param=value')\` 처럼 수동 쿼리 스트링 금지 → 중복 파라미터 버그 발생
`);

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'Routing reference not found.' }],
    };
  }
);

// ── Tool: get_lifecycle_reference ───────────────────────────────
server.tool(
  "get_lifecycle_reference",
  "Get ViewLogic lifecycle reference: mounted() execution order, _resolveMounted signal, beforeUnmount cleanup patterns, layout+page hook merge rules.",
  {},
  async () => {
    const parts = [];

    // 라이프사이클 훅 개요
    const advancedDoc = safeReadFile(DOCS_REGISTRY['advanced']);
    if (advancedDoc) {
      const s1 = advancedDoc.match(/## 1\. 라이프사이클 훅[\s\S]*?(?=\n## \d|$)/);
      if (s1) parts.push('# Lifecycle Hooks\n\n' + s1[0]);
    }

    // internals: mounted() 실행 순서
    const internals = safeReadFile(DOCS_REGISTRY['internals']);
    if (internals) {
      const s1 = internals.match(/## 1\. 페이지 전환[\s\S]*?(?=\n---\n\n## \d|$)/);
      if (s1) parts.push('---\n\n## Internals: Page Transition & _resolveMounted\n\n' + s1[0]);

      const s2 = internals.match(/## 2\. mounted\(\) 실행 순서[\s\S]*?(?=\n---\n\n## \d|$)/);
      if (s2) parts.push('---\n\n## Internals: mounted() Execution Order\n\n' + s2[0]);

      const s6 = internals.match(/## 6\. 레이아웃 \+ 페이지[\s\S]*?(?=\n---\n\n## \d|$)/);
      if (s6) parts.push('---\n\n## Internals: Layout + Page Script Merge\n\n' + s6[0]);
    }

    // beforeUnmount 정리 패턴 요약
    parts.push(`---

## beforeUnmount Cleanup Patterns

\`\`\`javascript
export default {
    data() {
        return {
            chart: null,
            refreshInterval: null
        }
    },
    async mounted() {
        // Chart.js 초기화는 $nextTick 내에서
        await this.$nextTick();
        this.chart = new Chart(this.$el.querySelector('#myChart'), { ... });

        // 인터벌 등록
        this.refreshInterval = setInterval(() => this.loadData(), 60000);
    },
    beforeUnmount() {
        // Chart.js 정리 (필수)
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // 인터벌 정리 (필수)
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // addEventListener → removeEventListener (필수)
        // window.removeEventListener('resize', this.handleResize);
    }
}
\`\`\`

### Cleanup Rules
| 리소스 | 생성 | 정리 (beforeUnmount) |
|--------|------|---------------------|
| Chart.js | \`new Chart()\` | \`.destroy()\` |
| setInterval | \`setInterval()\` | \`clearInterval()\` |
| setTimeout | \`setTimeout()\` | \`clearTimeout()\` |
| addEventListener | \`addEventListener()\` | \`removeEventListener()\` |
| Bootstrap Modal | \`new bootstrap.Modal()\` | \`.dispose()\` |

### Key Points
- \`mounted()\`는 \`opacity:0\` 상태에서 실행 → 완료 후 페이지 표시 → **loading 스피너 불필요**
- \`_resolveMounted()\`는 ViewLogic이 자동 호출 → 개발자가 직접 호출하지 않음
- 레이아웃 mounted() → 페이지 mounted() 순서로 실행 (await)
- \`beforeUnmount()\`도 레이아웃 → 페이지 순서
`);

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'Lifecycle reference not found.' }],
    };
  }
);

// ── Tool: get_quickstart ────────────────────────────────────────
server.tool(
  "get_quickstart",
  "Get ViewLogic Router quickstart guide: installation, initialization examples (minimal, auth, full setup), directory structure, page creation checklist.",
  {},
  async () => {
    const parts = [];

    // 설치 가이드
    const installation = safeReadFile(DOCS_REGISTRY['installation']);
    if (installation) parts.push(installation);

    // 초기화 설정 (최소/인증/풀 예제)
    const configDoc = safeReadFile(DOCS_REGISTRY['configuration']);
    if (configDoc) parts.push('---\n\n' + configDoc);

    // 기본 사용법 (디렉토리 구조, 페이지 작성법)
    const basicUsage = safeReadFile(DOCS_REGISTRY['basic-usage']);
    if (basicUsage) parts.push('---\n\n' + basicUsage);

    return {
      content: [{ type: "text", text: parts.length > 0 ? parts.join('\n\n') : 'Quickstart guide not found.' }],
    };
  }
);

// ── Tool: get_page_patterns ─────────────────────────────────────
// Real-world page patterns extracted from production ViewLogic projects
const PAGE_PATTERNS = {
  list: `# List Page Pattern

## Client-Filtered List (전체 데이터 로드 + computed 필터링)

\`\`\`javascript
export default {
    layout: 'default',
    data() {
        return {
            items: [],
            searchKeyword: '',
            filterStatus: '',
            sortKey: 'name',
            sortAsc: true
        };
    },
    computed: {
        filteredItems() {
            let result = this.items;
            if (this.filterStatus) {
                result = result.filter(i => i.status === this.filterStatus);
            }
            if (this.searchKeyword) {
                const q = this.searchKeyword.toLowerCase();
                result = result.filter(i =>
                    i.name.toLowerCase().includes(q) ||
                    (i.description || '').toLowerCase().includes(q)
                );
            }
            return result.sort((a, b) => {
                const va = a[this.sortKey] || '', vb = b[this.sortKey] || '';
                const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
                return this.sortAsc ? cmp : -cmp;
            });
        }
    },
    async mounted() {
        this.searchKeyword = this.getParam('search', '');
        this.filterStatus = this.getParam('status', '');
        await this.loadData();
    },
    methods: {
        async loadData() {
            try {
                const response = await this.$api.get('/api/items');
                this.items = response.data || [];
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
                this.items = [];
            }
        },
        applyFilters() {
            const params = {};
            if (this.searchKeyword) params.search = this.searchKeyword;
            if (this.filterStatus) params.status = this.filterStatus;
            this.navigateTo('/current-route', params);
        },
        clearFilters() {
            this.navigateTo('/current-route', {});
        },
        toggleSort(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else { this.sortKey = key; this.sortAsc = true; }
        },
        getSortIcon(key) {
            if (this.sortKey !== key) return 'bi-chevron-expand';
            return this.sortAsc ? 'bi-chevron-up' : 'bi-chevron-down';
        },
        viewDetail(id) {
            this.navigateTo('/section/detail', { id });
        },
        statusLabel: window.statusLabel
    }
};
\`\`\`

## Server-Filtered List (커서 기반 페이징)

\`\`\`javascript
export default {
    layout: 'default',
    data() {
        return {
            items: [],
            hasNext: false, hasPrev: false,
            nextCursor: null, prevCursor: null,
            searchKeyword: '',
            filterStatus: ''
        };
    },
    async mounted() {
        // URL 파라미터에서 필터값 복원
        this.searchKeyword = this.getParam('search', '');
        this.filterStatus = this.getParam('status', '');
        await this.loadData();
    },
    methods: {
        async loadData() {
            try {
                // $api가 URL 쿼리 파라미터를 자동 추가 — 수동 빌드 금지!
                const response = await this.$api.get('/api/items');
                this.items = response.data || [];
                this.hasNext = response.hasNext;
                this.hasPrev = response.hasPrev;
                this.nextCursor = response.nextCursor;
                this.prevCursor = response.prevCursor;
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
                this.items = [];
            }
        },
        applyFilters() {
            const params = {};
            if (this.searchKeyword) params.search = this.searchKeyword;
            if (this.filterStatus) params.status = this.filterStatus;
            this.navigateTo('/current-route', params);
        },
        clearFilters() {
            this.navigateTo('/current-route', {});
        },
        loadNext() {
            const params = { ...this.getParams(), cursor: this.nextCursor, direction: 'next' };
            this.navigateTo('/current-route', params);
        },
        loadPrev() {
            const params = { ...this.getParams(), cursor: this.prevCursor, direction: 'prev' };
            this.navigateTo('/current-route', params);
        }
    }
};
\`\`\`

## HTML Template (공통)

\`\`\`html
<!-- 필터 -->
<form @submit.prevent="applyFilters" class="row g-2 mb-3">
    <div class="col-auto">
        <select class="form-select" v-model="filterStatus" @change="applyFilters">
            <option value="">전체 상태</option>
            <option value="active">활성</option>
        </select>
    </div>
    <div class="col-auto">
        <input type="text" class="form-control" v-model="searchKeyword"
               placeholder="검색..." @keyup.enter="applyFilters">
    </div>
    <div class="col-auto">
        <button type="submit" class="btn btn-primary">검색</button>
        <button type="button" class="btn btn-outline-secondary" @click="clearFilters">초기화</button>
    </div>
</form>

<!-- 테이블 -->
<div class="table-responsive">
    <table class="table table-hover">
        <thead>
            <tr>
                <th @click="toggleSort('name')" style="cursor:pointer">
                    이름 <i :class="'bi ' + getSortIcon('name')"></i>
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
                <td>{{ item.name }}</td>
            </tr>
        </tbody>
    </table>
</div>

<!-- 커서 페이징 (서버 필터링 시) -->
<div class="d-flex justify-content-center gap-2">
    <button class="btn btn-outline-primary" :disabled="!hasPrev" @click="loadPrev">이전</button>
    <button class="btn btn-outline-primary" :disabled="!hasNext" @click="loadNext">다음</button>
</div>
\`\`\``,

  detail: `# Detail Page Pattern

\`\`\`javascript
export default {
    layout: 'default',
    data() {
        return {
            itemId: null,
            item: null,
            relatedData: []
        };
    },
    async mounted() {
        // 1. 역할 가드 (필요 시)
        if (!window.isExecutive()) {
            alert('접근 권한이 없습니다.');
            this.navigateTo('/dashboard/employee');
            return;
        }

        // 2. getParam + 널 가드 (필수)
        this.itemId = Number(this.getParam('id'));
        if (!this.itemId) {
            this.navigateTo('/section/list');
            return;
        }

        // 3. 데이터 로딩
        await this.loadData();
    },
    methods: {
        async loadData() {
            try {
                const response = await this.$api.get(\`/api/items/\${this.itemId}\`);
                this.item = response.data;
            } catch (error) {
                console.error('상세 로딩 실패:', error);
                alert('데이터를 불러올 수 없습니다.');
                this.navigateTo('/section/list');
            }
        },
        goBack() {
            this.navigateTo('/section/list');
        },
        goEdit() {
            this.navigateTo('/section/edit', { id: this.itemId });
        }
    }
};
\`\`\`

### Key Rules
- \`getParam('id')\` 직후 반드시 null 체크 → 없으면 목록으로 리다이렉트
- 역할 가드는 데이터 로딩 **이전**에 배치
- API 에러 시 목록 페이지로 이동 (빈 상세 페이지 방치 금지)`,

  form: `# Form / CRUD Page Pattern

## Create+Edit 통합 (Upsert)

\`\`\`javascript
export default {
    layout: 'default',
    data() {
        return {
            isEdit: false,
            form: {
                id: null,
                name: '',
                description: '',
                status: 'active'
            },
            options: []  // 셀렉트 옵션 등
        };
    },
    computed: {
        isFormValid() {
            return this.form.name.trim() !== '' && this.form.status !== '';
        }
    },
    async mounted() {
        // 셀렉트 옵션 등 참조 데이터 로드
        await this.loadOptions();

        // 수정 모드: id 파라미터 존재 시
        const id = this.getParam('id');
        if (id) {
            this.isEdit = true;
            await this.loadItem(Number(id));
        }
    },
    methods: {
        async loadOptions() {
            try {
                const response = await this.$api.get('/api/options');
                this.options = response.data || [];
            } catch (error) {
                console.error('옵션 로딩 실패:', error);
            }
        },
        async loadItem(id) {
            try {
                const response = await this.$api.get(\`/api/items/\${id}\`);
                this.form = { ...response.data };
            } catch (error) {
                alert('데이터를 불러올 수 없습니다.');
                this.navigateTo('/section/list');
            }
        },
        async save() {
            if (!this.isFormValid) return;
            try {
                const payload = { ...this.form };
                delete payload.id;

                if (this.isEdit) {
                    await this.$api.put(\`/api/items/\${this.form.id}\`, payload);
                    alert('수정되었습니다.');
                } else {
                    await this.$api.post('/api/items', payload);
                    alert('등록되었습니다.');
                }
                this.navigateTo('/section/list');
            } catch (error) {
                alert(error.body?.message || '저장에 실패했습니다.');
            }
        },
        cancel() {
            this.navigateTo('/section/list');
        }
    }
};
\`\`\`

## 삭제 패턴 (confirm 필수)

\`\`\`javascript
async deleteItem(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    if (!confirm(\`"\${item.name}"을(를) 삭제하시겠습니까?\`)) return;
    try {
        await this.$api.delete(\`/api/items/\${id}\`);
        await this.loadData();
    } catch (error) {
        alert(error.body?.message || '삭제에 실패했습니다.');
    }
}
\`\`\``,

  modal: `# Modal Pattern

## Bootstrap Modal (권장 — 애니메이션, 백드롭, ESC 닫기 지원)

\`\`\`javascript
export default {
    data() {
        return {
            modalInstance: null,
            form: { id: null, name: '' },
            items: []
        };
    },
    async mounted() {
        await this.loadData();
        // 모달 초기화는 반드시 $nextTick 내에서 (DOM 준비 후)
        this.$nextTick(() => {
            const el = document.getElementById('itemModal');
            if (el) {
                this.modalInstance = new bootstrap.Modal(el);
                el.addEventListener('hidden.bs.modal', () => this.resetForm());
            }
        });
    },
    beforeUnmount() {
        // 모달 정리 (메모리 누수 방지)
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
    },
    methods: {
        // 생성
        openAddModal() {
            this.resetForm();
            this.modalInstance?.show();
        },
        // 수정 (기존 데이터 복사)
        openEditModal(item) {
            this.form = { ...item };
            this.modalInstance?.show();
        },
        closeModal() {
            this.modalInstance?.hide();
        },
        resetForm() {
            this.form = { id: null, name: '' };
        },
        // Upsert: form.id 유무로 생성/수정 분기
        async saveItem() {
            try {
                const payload = { name: this.form.name };
                if (this.form.id) {
                    await this.$api.put(\`/api/items/\${this.form.id}\`, payload);
                } else {
                    await this.$api.post('/api/items', payload);
                }
                this.closeModal();
                await this.loadData();
            } catch (error) {
                alert(error.body?.message || '저장에 실패했습니다.');
            }
        }
    }
};
\`\`\`

## HTML Template

\`\`\`html
<div class="modal fade" id="itemModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{{ form.id ? '수정' : '등록' }}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">이름</label>
                    <input type="text" class="form-control" v-model="form.name">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                <button type="button" class="btn btn-primary" @click="saveItem"
                        :disabled="!form.name.trim()">
                    {{ form.id ? '수정' : '등록' }}
                </button>
            </div>
        </div>
    </div>
</div>
\`\`\`

### Key Rules
- \`new bootstrap.Modal()\` 은 반드시 \`this.$nextTick()\` 내에서 초기화
- \`beforeUnmount()\`에서 \`.dispose()\` 필수
- \`hidden.bs.modal\` 이벤트로 폼 리셋`,

  chart: `# Chart.js Integration Pattern

\`\`\`javascript
export default {
    data() {
        return {
            chartData: [],
            myChart: null
        };
    },
    async mounted() {
        await this.loadData();
        // Chart 초기화는 $nextTick 내에서 (DOM + 데이터 준비 후)
        this.$nextTick(() => this.initChart());
    },
    beforeUnmount() {
        // Chart 정리 (필수 — 메모리 누수 방지)
        if (this.myChart) {
            this.myChart.destroy();
            this.myChart = null;
        }
    },
    methods: {
        async loadData() {
            try {
                const response = await this.$api.get('/api/stats');
                this.chartData = response.data || [];
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
                this.chartData = [];
            }
        },
        initChart() {
            const ctx = this.$refs.myChart;
            if (!ctx) return;
            this.myChart = new Chart(ctx, {
                type: 'bar',  // 'doughnut', 'radar', 'line'
                data: {
                    labels: this.chartData.map(d => d.label),
                    datasets: [{
                        label: '실적',
                        data: this.chartData.map(d => d.value),
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.5)',
                            'rgba(16, 185, 129, 0.5)',
                            'rgba(245, 158, 11, 0.5)',
                            'rgba(239, 68, 68, 0.5)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 10, font: { size: 11 } }
                        }
                    }
                }
            });
        },
        // 데이터 변경 시: destroy → recreate
        updateChart() {
            if (this.myChart) {
                this.myChart.destroy();
                this.myChart = null;
            }
            this.$nextTick(() => this.initChart());
        }
    }
};
\`\`\`

### HTML
\`\`\`html
<div class="card">
    <div class="card-body">
        <canvas ref="myChart" style="max-height: 300px;"></canvas>
    </div>
</div>
\`\`\`

### Key Rules
- \`new Chart()\` 반드시 \`this.$nextTick()\` 내에서 (ViewLogic opacity:0 메커니즘)
- \`beforeUnmount()\`에서 \`.destroy()\` 필수
- 업데이트 시 destroy → $nextTick → recreate (데이터만 변경하면 안정적이지 않음)
- \`this.$refs.myChart\` 사용 (document.getElementById 대신)
- loading 스피너 불필요 (ViewLogic이 mounted 완료까지 페이지 숨김)`
};

server.tool(
  "get_page_patterns",
  "Get real-world ViewLogic page patterns: list (client/server filter, pagination), detail (getParam, null guard, role guard), form (upsert, validation), modal (Bootstrap Modal lifecycle), chart (Chart.js integration).",
  {
    section: z.enum(['list', 'detail', 'form', 'modal', 'chart', 'all']).optional()
      .describe("Pattern to retrieve: 'list', 'detail', 'form', 'modal', 'chart', 'all' (default)")
  },
  async ({ section = 'all' }) => {
    if (section === 'all') {
      const text = Object.values(PAGE_PATTERNS).join('\n\n---\n\n');
      return { content: [{ type: "text", text }] };
    }
    const pattern = PAGE_PATTERNS[section];
    if (!pattern) {
      return { content: [{ type: "text", text: `Unknown section '${section}'. Available: list, detail, form, modal, chart, all` }] };
    }
    return { content: [{ type: "text", text: pattern }] };
  }
);

// ── Start ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ViewLogic MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
