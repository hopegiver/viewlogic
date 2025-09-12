/**
 * ViewLogic 빌드 워커 스레드
 * CPU 집약적인 압축/변환 작업을 처리
 */

const { parentPort, workerData } = require('worker_threads');
const esbuild = require('esbuild');
const crypto = require('crypto');

// 워커 스레드 메인 함수
async function processTask(task) {
    try {
        switch (task.type) {
            case 'minify_javascript':
                return await minifyJavaScript(task.data);
            
            case 'minify_css':
                return minifyCSS(task.data);
                
            case 'minify_html':
                return minifyHTML(task.data);
                
            case 'generate_route_file':
                return await generateRouteFile(task.data);
                
            case 'tree_shake_css':
                return treeShakeCss(task.data);
                
            case 'compute_hash':
                return computeFileHash(task.data);
                
            default:
                throw new Error(`Unknown task type: ${task.type}`);
        }
    } catch (error) {
        throw {
            message: error.message,
            stack: error.stack,
            taskType: task.type
        };
    }
}

// JavaScript 압축
async function minifyJavaScript(data) {
    const { code, options = {} } = data;
    
    const esbuildOptions = {
        minify: options.minify !== false,
        target: options.target || 'es2020',
        format: options.format || 'esm',
        keepNames: options.keepNames || false,
        treeShaking: options.treeShaking !== false,
        minifyWhitespace: options.minifyWhitespace !== false,
        minifyIdentifiers: options.minifyIdentifiers !== false,
        minifySyntax: options.minifySyntax !== false,
        drop: options.dropConsole ? ['console', 'debugger'] : ['debugger'],
        legalComments: 'none'
    };
    
    if (options.sourceMaps) {
        esbuildOptions.sourcemap = true;
    }
    
    const result = await esbuild.transform(code, esbuildOptions);
    return { 
        code: result.code, 
        map: result.map,
        originalSize: code.length,
        minifiedSize: result.code.length
    };
}

// CSS 압축
function minifyCSS(data) {
    const { css } = data;
    const originalSize = css.length;
    
    const minified = css
        .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')  // 주석 제거
        .replace(/\s+/g, ' ')                              // 연속 공백을 하나로
        .replace(/\s*([{}:;,])\s*/g, '$1')                 // 구분자 주변 공백 제거
        .trim();
    
    return {
        css: minified,
        originalSize,
        minifiedSize: minified.length,
        saved: originalSize - minified.length
    };
}

// HTML 압축 (Vue 템플릿 보호)
function minifyHTML(data) {
    const { html } = data;
    const originalSize = html.length;
    
    const minified = html
        .replace(/<!--[\s\S]*?-->/g, '')                   // HTML 주석 제거
        .replace(/>\s+</g, '><')                           // 태그 사이 공백 제거
        .replace(/\s+/g, ' ')                              // 연속 공백을 하나로
        .trim();
    
    return {
        html: minified,
        originalSize,
        minifiedSize: minified.length,
        saved: originalSize - minified.length
    };
}

// 라우트 파일 생성
async function generateRouteFile(data) {
    const { routeName, logicContent, viewContent, styleContent, config } = data;
    const lines = [];
    
    // 스타일 추가
    if (styleContent && styleContent.trim()) {
        const styleResult = minifyCSS({ css: styleContent });
        
        lines.push(`const STYLE_ID = 'route-style-${routeName}';`);
        lines.push(`const STYLE_CONTENT = ${JSON.stringify(styleResult.css)};`);
        lines.push(`if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {`);
        lines.push(`  const styleEl = document.createElement("style");`);
        lines.push(`  styleEl.id = STYLE_ID;`);
        lines.push(`  styleEl.textContent = STYLE_CONTENT;`);
        lines.push(`  document.head.appendChild(styleEl);`);
        lines.push(`}`);
        lines.push('');
    }
    
    // 로직 코드 처리
    let componentCode = logicContent
        .replace(/export\s+default\s+/, 'const component = ')
        .trim();
        
    // 빌드 메타데이터 추가
    componentCode = componentCode.replace(
        /};?\s*$/, 
        `,
  _routeName: "${routeName}",
  _isBuilt: true,
  _buildTime: "${new Date().toISOString()}",
  _buildVersion: "${config.version}"
};`
    );
    
    lines.push(componentCode);
    lines.push('');
    
    // 템플릿 추가
    const templateResult = minifyHTML({ html: viewContent });
    lines.push(`component.template = ${JSON.stringify(templateResult.html)};`);
    lines.push('');
    lines.push('export default component;');
    
    const fullCode = lines.join('\n');
    
    // JavaScript 압축
    if (config.minify) {
        const result = await minifyJavaScript({ 
            code: fullCode, 
            options: {
                minify: true,
                sourceMaps: config.sourceMaps
            }
        });
        
        return {
            code: result.code,
            map: result.map,
            stats: {
                originalSize: fullCode.length,
                minifiedSize: result.code.length,
                saved: fullCode.length - result.code.length
            }
        };
    }
    
    return {
        code: fullCode,
        map: null,
        stats: {
            originalSize: fullCode.length,
            minifiedSize: fullCode.length,
            saved: 0
        }
    };
}

// CSS 트리셰이킹
function treeShakeCss(data) {
    const { css, usedClasses, usedIds, usedTags } = data;
    
    if (!css || !css.trim()) {
        return { css: '', removedRules: [], stats: { saved: 0, totalRules: 0, usedRules: 0 } };
    }
    
    const originalSize = css.length;
    const removedRules = [];
    let processedCss = '';
    
    const cssRules = css.split('}').filter(rule => rule.trim());
    let totalRules = 0;
    let usedRules = 0;
    
    for (let rule of cssRules) {
        rule = rule.trim();
        if (!rule) continue;
        
        const ruleWithBrace = rule + '}';
        const selectorPart = rule.split('{')[0];
        if (!selectorPart) {
            processedCss += ruleWithBrace + '\n';
            continue;
        }
        
        const selectors = selectorPart.split(',')
            .map(s => s.trim())
            .filter(s => s);
        
        let keepRule = false;
        totalRules++;
        
        for (const selector of selectors) {
            const cleanSelector = selector.replace(/:hover|:focus|:active|:visited|::before|::after|:first-child|:last-child|:nth-child\([^)]*\)|@media[^{]*|@keyframes[^{]*/g, '').trim();
            
            // 클래스 선택자 확인
            if (cleanSelector.includes('.')) {
                const classes = cleanSelector.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g);
                if (classes) {
                    for (const cls of classes) {
                        const className = cls.substring(1);
                        if (usedClasses.has(className)) {
                            keepRule = true;
                            break;
                        }
                    }
                }
            }
            
            // ID 선택자 확인
            if (!keepRule && cleanSelector.includes('#')) {
                const ids = cleanSelector.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g);
                if (ids) {
                    for (const id of ids) {
                        const idName = id.substring(1);
                        if (usedIds.has(idName)) {
                            keepRule = true;
                            break;
                        }
                    }
                }
            }
            
            // 태그 선택자 확인
            if (!keepRule) {
                const tagMatch = cleanSelector.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
                if (tagMatch) {
                    const tagName = tagMatch[0].toLowerCase();
                    if (usedTags.has(tagName)) {
                        keepRule = true;
                    }
                }
            }
            
            // 미디어 쿼리나 키프레임은 보존
            if (!keepRule && (selector.includes('@media') || selector.includes('@keyframes') || selector.includes('@-') || selector.includes('*') || selector === 'html' || selector === 'body')) {
                keepRule = true;
            }
            
            if (keepRule) break;
        }
        
        if (keepRule) {
            processedCss += ruleWithBrace + '\n';
            usedRules++;
        } else {
            removedRules.push(selectorPart.trim());
        }
    }
    
    const finalSize = processedCss.length;
    
    return {
        css: processedCss.trim(),
        removedRules,
        stats: {
            originalSize,
            finalSize,
            saved: originalSize - finalSize,
            totalRules,
            usedRules,
            removedRules: removedRules.length
        }
    };
}

// 파일 해시 계산
function computeFileHash(data) {
    const { content } = data;
    return {
        hash: crypto.createHash('md5').update(content).digest('hex'),
        size: content.length
    };
}

// 워커 스레드 메시지 핸들러
if (parentPort) {
    parentPort.on('message', async (task) => {
        try {
            const result = await processTask(task);
            parentPort.postMessage({
                success: true,
                result,
                taskId: task.id
            });
        } catch (error) {
            parentPort.postMessage({
                success: false,
                error: {
                    message: error.message,
                    stack: error.stack,
                    taskType: error.taskType || task.type
                },
                taskId: task.id
            });
        }
    });
    
    // 워커 준비 완료 신호
    parentPort.postMessage({ ready: true });
}

module.exports = {
    processTask,
    minifyJavaScript,
    minifyCSS,
    minifyHTML,
    generateRouteFile,
    treeShakeCss,
    computeFileHash
};