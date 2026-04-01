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
