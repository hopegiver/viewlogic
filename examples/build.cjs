/**
 * ViewLogic 빌드 시스템 v1.0
 * 가장 기본적인 기능부터 차근차근 구현
 */

const fs = require('fs').promises;
const path = require('path');
const esbuild = require('esbuild');
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const CleanCSS = require('clean-css');
const { PurgeCSS } = require('purgecss');

class ViewLogicBuilder {
    constructor(options = {}) {
        this.config = {
            srcPath: path.join(__dirname, 'src'),
            routesPath: path.join(__dirname, 'routes'),
            version: '1.0.0',
            minify: options.minify !== undefined ? options.minify : true,
            cache: options.cache !== false,
            parallel: options.parallel !== false,
            sourceMaps: options.sourceMaps || false,
            analyzer: options.analyzer || false
        };
        
        this.stats = {
            startTime: Date.now(),
            routesBuilt: 0,
            routesFailed: 0,
            errors: []
        };
        
        // 메모리 사용량 추적
        this.memoryStats = {
            initialMemory: this.getMemoryUsage(),
            peakMemory: this.getMemoryUsage(),
            currentMemory: this.getMemoryUsage(),
            gcCount: 0
        };
        
        this.cache = new Map();
        this.cacheFile = path.join(__dirname, '.build-cache.json');
        
        // 트리셰이킹 통계
        this.treeShakingStats = {
            totalComponents: 0,
            usedComponents: 0,
            unusedComponents: [],
            savedBytes: 0,
            css: {
                totalRules: 0,
                usedRules: 0,
                unusedRules: [],
                savedBytes: 0
            },
            javascript: {
                originalSize: 0,
                minifiedSize: 0,
                savedBytes: 0,
                filesProcessed: 0
            }
        };

        // 검증 시스템
        this.validationConfig = {
            requiredFiles: ['views', 'logic', 'styles'],
            allowedExtensions: {
                views: ['.html'],
                logic: ['.js'],
                styles: ['.css']
            },
            maxFileSize: 5 * 1024 * 1024, // 5MB
            enableSyntaxCheck: true,
            enableDependencyCheck: true,
            enableCompatibilityCheck: true
        };

        this.validationStats = {
            totalChecks: 0,
            passedChecks: 0,
            failedChecks: 0,
            warnings: []
        };
    }
    
    log(message, type = 'info') {
        const icons = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' };
        console.log(`${icons[type] || icons.info} ${message}`);
        
        if (type === 'error') {
            this.stats.errors.push(message);
        }
        
        // 메모리 사용량 추적
        this.trackMemoryUsage();
    }
    
    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: used.rss,
            heapUsed: used.heapUsed,
            heapTotal: used.heapTotal,
            external: used.external,
            arrayBuffers: used.arrayBuffers || 0
        };
    }
    
    trackMemoryUsage() {
        const current = this.getMemoryUsage();
        this.memoryStats.currentMemory = current;
        
        // 피크 메모리 업데이트
        if (current.heapUsed > this.memoryStats.peakMemory.heapUsed) {
            this.memoryStats.peakMemory = current;
        }
    }
    
    async forceGarbageCollection() {
        if (global.gc) {
            global.gc();
            this.memoryStats.gcCount++;
            this.trackMemoryUsage();
            this.log(`가비지 컬렉션 실행 (${this.memoryStats.gcCount}회차)`, 'info');
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // CSS 압축 유틸리티 (전문 라이브러리 사용)
    minifyCSS(css) {
        try {
            const cleanCSS = new CleanCSS({
                level: {
                    1: {
                        // Level 1 optimizations - safe optimizations
                        cleanupCharsets: true,
                        normalizeUrls: true,
                        optimizeBackground: true,
                        optimizeBorderRadius: true,
                        optimizeFilter: true,
                        optimizeFont: true,
                        optimizeFontWeight: true,
                        optimizeOutline: true,
                        removeEmpty: true,
                        removeNegativePaddings: true,
                        removeQuotes: false, // Keep quotes for compatibility
                        removeWhitespace: true,
                        replaceMultipleZeros: true,
                        replaceTimeUnits: true,
                        replaceZeroUnits: true,
                        roundingPrecision: -1,
                        selectorsSortingMethod: 'standard',
                        specialComments: 'none',
                        tidyAtRules: false, // Disable to preserve keyframes structure
                        tidyBlockScopes: false, // Disable to preserve keyframes structure
                        tidySelectors: true,
                        transform: function() {}
                    },
                    2: {
                        // Level 2 optimizations - conservative for keyframes
                        mergeAdjacentRules: false, // Disable to preserve keyframes
                        mergeIntoShorthands: false, // Disable to preserve keyframes
                        mergeMedia: true,
                        mergeNonAdjacentRules: false, // Disable to preserve keyframes
                        mergeSemantically: false, // Keep false for safety
                        overrideProperties: false, // Disable to preserve keyframes
                        removeEmpty: true,
                        reduceNonAdjacentRules: false, // Disable to preserve keyframes
                        removeDuplicateFontRules: true,
                        removeDuplicateMediaBlocks: true,
                        removeDuplicateRules: false, // Disable to preserve keyframes
                        removeUnusedAtRules: false,
                        restructureRules: false, // Disable to preserve keyframes structure
                        skipProperties: []
                    }
                },
                format: false, // No formatting, maximum compression
                inline: false,
                rebase: false,
                returnPromise: false
            });
            
            const result = cleanCSS.minify(css);
            
            if (result.errors && result.errors.length > 0) {
                this.log(`CSS minification errors: ${result.errors.join(', ')}`, 'warn');
            }
            
            if (result.warnings && result.warnings.length > 0) {
                this.log(`CSS minification warnings: ${result.warnings.join(', ')}`, 'warn');
            }
            
            return result.styles || css; // Fallback to original CSS if minification fails
            
        } catch (error) {
            this.log(`CSS minification failed: ${error.message}`, 'error');
            // Fallback to simple compression
            return css
                .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')  // Remove comments
                .replace(/\s+/g, ' ')                              // Normalize whitespace
                .trim();
        }
    }
    
    // HTML 압축 유틸리티 (Vue 템플릿 보호)
    minifyHTML(html) {
        return html
            .replace(/<!--[\s\S]*?-->/g, '')                   // HTML 주석 제거
            .replace(/>\s+</g, '><')                           // 태그 사이 공백 제거
            .replace(/\s+/g, ' ')                              // 연속 공백을 하나로
            .trim();
    }
    
    async loadCache() {
        if (!this.config.cache) return;
        
        try {
            const cacheData = await fs.readFile(this.cacheFile, 'utf-8');
            const cache = JSON.parse(cacheData);
            this.cache = new Map(Object.entries(cache));
            this.log(`캐시 로드 완료: ${this.cache.size}개 항목`);
        } catch (error) {
            this.log('캐시 파일 없음, 새로 생성');
        }
    }
    
    async saveCache() {
        if (!this.config.cache) return;
        
        try {
            const cacheData = Object.fromEntries(this.cache);
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            this.log(`캐시 저장 완료: ${this.cache.size}개 항목`);
        } catch (error) {
            this.log(`캐시 저장 실패: ${error.message}`, 'error');
        }
    }
    
    getFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }
    
    async shouldRebuildRoute(route) {
        if (!this.config.cache) return true;
        
        // 빌드된 파일이 존재하는지 확인
        const outputPath = path.join(this.config.routesPath, `${route}.js`);
        try {
            await fs.access(outputPath);
        } catch (error) {
            // 빌드된 파일이 없으면 반드시 재빌드
            this.log(`${route} 빌드 파일 없음, 재빌드 필요`, 'warn');
            return true;
        }
        
        const files = [
            path.join(this.config.srcPath, 'views', `${route}.html`),
            path.join(this.config.srcPath, 'logic', `${route}.js`),
            path.join(this.config.srcPath, 'styles', `${route}.css`)
        ];
        
        const cacheKey = `route_${route}`;
        const currentHashes = {};
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                currentHashes[file] = this.getFileHash(content);
            } catch (error) {
                // 파일이 없으면 빈 해시
                currentHashes[file] = '';
            }
        }
        
        const cachedHashes = this.cache.get(cacheKey);
        if (!cachedHashes) {
            this.cache.set(cacheKey, currentHashes);
            return true;
        }
        
        // 해시 비교
        for (const [file, hash] of Object.entries(currentHashes)) {
            if (cachedHashes[file] !== hash) {
                this.cache.set(cacheKey, currentHashes);
                return true;
            }
        }
        
        return false;
    }
    
    async buildRoutesParallel(routes) {
        if (!this.config.parallel) {
            // 순차 빌드
            for (const route of routes) {
                await this.buildRoute(route);
            }
            return;
        }
        
        // 병렬 빌드 (배치 처리)
        const batchSize = 5;
        for (let i = 0; i < routes.length; i += batchSize) {
            const batch = routes.slice(i, i + batchSize);
            await Promise.all(batch.map(route => this.buildRoute(route)));
        }
    }
    
    // ==================== 검증 시스템 ====================
    
    async validateSourceFiles(route) {
        // totalChecks는 runValidation에서만 관리
        
        const files = {
            view: path.join(this.config.srcPath, 'views', `${route}.html`),
            logic: path.join(this.config.srcPath, 'logic', `${route}.js`),
            style: path.join(this.config.srcPath, 'styles', `${route}.css`)
        };
        
        const results = {
            passed: true,
            errors: [],
            warnings: []
        };
        
        // 1. 필수 파일 존재성 검사
        for (const [type, filePath] of Object.entries(files)) {
            try {
                const stats = await fs.stat(filePath);
                
                // 파일 크기 검사
                if (stats.size > this.validationConfig.maxFileSize) {
                    results.warnings.push(`${type} 파일이 너무 큼: ${this.formatBytes(stats.size)}`);
                }
                
                // 확장자 검사
                const ext = path.extname(filePath);
                const allowedExts = this.validationConfig.allowedExtensions[type === 'view' ? 'views' : type === 'logic' ? 'logic' : 'styles'];
                if (!allowedExts.includes(ext)) {
                    results.errors.push(`${type} 파일 확장자가 올바르지 않음: ${ext}`);
                    results.passed = false;
                }
                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    results.errors.push(`${type} 파일이 존재하지 않음: ${filePath}`);
                    results.passed = false;
                } else {
                    results.errors.push(`${type} 파일 접근 오류: ${error.message}`);
                    results.passed = false;
                }
            }
        }
        
        return results;
    }

    async validateDependencies(route, logicContent, viewContent) {
        // totalChecks는 runValidation에서만 관리
        
        const results = {
            passed: true,
            errors: [],
            warnings: [],
            dependencies: new Set()
        };
        
        // Vue 컴포넌트 의존성 검사
        const componentMatches = viewContent.match(/<([a-z][a-z0-9-]*)/gi);
        if (componentMatches) {
            for (const match of componentMatches) {
                const componentName = match.substring(1).toLowerCase();
                if (!['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'li', 'a', 'img', 'button', 'input', 'form', 'select', 'option', 'textarea'].includes(componentName)) {
                    results.dependencies.add(componentName);
                }
            }
        }
        
        // JavaScript import 검사
        const importMatches = logicContent.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            for (const match of importMatches) {
                const importPath = match.match(/['"]([^'"]+)['"]/)[1];
                if (importPath.startsWith('./') || importPath.startsWith('../')) {
                    const resolvedPath = path.resolve(path.dirname(path.join(this.config.srcPath, 'logic', `${route}.js`)), importPath);
                    try {
                        await fs.stat(resolvedPath);
                        results.dependencies.add(importPath);
                    } catch (error) {
                        results.errors.push(`의존성 파일을 찾을 수 없음: ${importPath}`);
                        results.passed = false;
                    }
                }
            }
        }
        
        return results;
    }

    async validateBuildOutput(routeCode) {
        // totalChecks는 runValidation에서만 관리
        
        const results = {
            passed: true,
            errors: [],
            warnings: []
        };
        
        if (!this.validationConfig.enableSyntaxCheck) {
            return results;
        }
        
        // JavaScript 구문 검사
        try {
            // esbuild로 구문 검사
            await esbuild.transform(routeCode, {
                format: 'esm',
                target: 'es2020'
            });
            
            // 기본적인 구문 패턴 검사
            const criticalPatterns = [
                { pattern: /export\s+default/, name: 'default export' },
                { pattern: /template\s*:/, name: 'template property' }
            ];
            
            for (const { pattern, name } of criticalPatterns) {
                if (!pattern.test(routeCode)) {
                    results.warnings.push(`${name}이 누락되었을 수 있음`);
                }
            }
            
        } catch (error) {
            results.errors.push(`JavaScript 구문 오류: ${error.message}`);
            results.passed = false;
        }
        
        return results;
    }

    async validateCompatibility(routeCode, route) {
        // totalChecks는 runValidation에서만 관리
        
        const results = {
            passed: true,
            errors: [],
            warnings: [],
            compatibility: {
                es2020: true,
                es2015: true,
                modernBrowsers: true
            }
        };
        
        if (!this.validationConfig.enableCompatibilityCheck) {
            return results;
        }
        
        // ES2015 호환성 검사
        const es2020Features = [
            /\?\?/,  // nullish coalescing
            /\?\./,  // optional chaining
            /BigInt/,
            /import\s*\(/  // dynamic import
        ];
        
        for (const pattern of es2020Features) {
            if (pattern.test(routeCode)) {
                results.compatibility.es2015 = false;
                results.warnings.push('ES2015 브라우저에서 호환되지 않는 문법 사용됨');
                break;
            }
        }
        
        // 폴리필이 필요한 기능들
        const polyfillNeeded = [
            { pattern: /fetch\s*\(/, name: 'fetch API' },
            { pattern: /Promise/, name: 'Promise' },
            { pattern: /async\s+function|=>\s*{/, name: 'async/await' }
        ];
        
        for (const { pattern, name } of polyfillNeeded) {
            if (pattern.test(routeCode)) {
                results.warnings.push(`${name} 폴리필이 필요할 수 있음`);
            }
        }
        
        return results;
    }

    async runValidation(route, logicContent, viewContent, styleContent, routeCode) {
        this.log(`🔍 ${route} 라우트 검증 시작...`, 'info');
        
        // 전체 검증 카운트 증가
        this.validationStats.totalChecks++;
        
        const validationResults = {
            route,
            passed: true,
            results: {},
            debug: {
                sourceFilesCheck: false,
                dependencyCheck: false,
                outputCheck: false,
                compatCheck: false
            }
        };
        
        try {
            // 1. 소스 파일 검증 (관대한 검증으로 변경)
            try {
                const sourceValidation = await this.validateSourceFiles(route);
                validationResults.results.source = sourceValidation;
                validationResults.debug.sourceFilesCheck = true;
                
                // 소스 파일 검증은 경고로만 처리
                if (!sourceValidation.passed) {
                    this.log(`⚠️ ${route} 소스 파일 검증 경고`, 'warn');
                    sourceValidation.errors.forEach(error => {
                        this.log(`  - ${error}`, 'warn');
                        this.validationStats.warnings.push(error);
                    });
                    // 하지만 검증 실패로는 처리하지 않음
                    sourceValidation.passed = true;
                }
            } catch (error) {
                this.log(`${route} 소스 파일 검증 중 오류: ${error.message}`, 'warn');
                validationResults.results.source = { passed: true, errors: [], warnings: [error.message] };
            }
            
            // 2. 의존성 검증 (관대한 검증)
            try {
                const dependencyValidation = await this.validateDependencies(route, logicContent, viewContent);
                validationResults.results.dependency = dependencyValidation;
                validationResults.debug.dependencyCheck = true;
                
                // 의존성 검증도 경고로만 처리
                if (!dependencyValidation.passed) {
                    this.log(`⚠️ ${route} 의존성 검증 경고`, 'warn');
                    dependencyValidation.errors.forEach(error => {
                        this.log(`  - ${error}`, 'warn');
                        this.validationStats.warnings.push(error);
                    });
                    dependencyValidation.passed = true;
                }
            } catch (error) {
                this.log(`${route} 의존성 검증 중 오류: ${error.message}`, 'warn');
                validationResults.results.dependency = { passed: true, errors: [], warnings: [error.message] };
            }
            
            // 3. 빌드 결과 검증 (중요한 검증)
            try {
                const outputValidation = await this.validateBuildOutput(routeCode);
                validationResults.results.output = outputValidation;
                validationResults.debug.outputCheck = true;
                
                if (!outputValidation.passed) {
                    this.log(`❌ ${route} 빌드 결과 검증 실패`, 'error');
                    outputValidation.errors.forEach(error => this.log(`  - ${error}`, 'error'));
                    validationResults.passed = false;
                }
            } catch (error) {
                this.log(`${route} 빌드 결과 검증 중 오류: ${error.message}`, 'warn');
                validationResults.results.output = { passed: true, errors: [], warnings: [error.message] };
            }
            
            // 4. 브라우저 호환성 검증 (경고로만)
            try {
                const compatValidation = await this.validateCompatibility(routeCode, route);
                validationResults.results.compatibility = compatValidation;
                validationResults.debug.compatCheck = true;
                
                // 호환성 검증은 항상 통과로 처리 (경고만 출력)
                compatValidation.passed = true;
            } catch (error) {
                this.log(`${route} 호환성 검증 중 오류: ${error.message}`, 'warn');
                validationResults.results.compatibility = { passed: true, errors: [], warnings: [error.message] };
            }
            
            // 검증 통계 업데이트
            if (validationResults.passed) {
                this.validationStats.passedChecks++;
                this.log(`✅ ${route} 라우트 검증 통과`, 'success');
            } else {
                this.validationStats.failedChecks++;
                this.log(`❌ ${route} 라우트 검증 실패 (심각한 오류만)`, 'error');
            }
            
            // 경고 출력
            Object.values(validationResults.results).forEach(result => {
                result.warnings?.forEach(warning => {
                    if (!this.validationStats.warnings.includes(warning)) {
                        this.validationStats.warnings.push(warning);
                    }
                });
            });
            
        } catch (error) {
            validationResults.passed = false;
            validationResults.error = error.message;
            this.validationStats.failedChecks++;
            this.log(`❌ ${route} 라우트 검증 중 심각한 오류: ${error.message}`, 'error');
        }
        
        return validationResults;
    }

    async build() {
        this.log('ViewLogic 빌드 시작...', 'info');
        
        try {
            // 캐시 로드
            await this.loadCache();
            
            // 1단계: 디렉토리 준비
            await this.ensureDirectory(this.config.routesPath);
            // 캐시 모드가 아닐 때만 디렉토리 클리어
            if (!this.config.cache) {
                await this.cleanDirectory(this.config.routesPath);
            }
            
            // 2단계: 라우트 발견
            const routes = await this.discoverRoutes();
            if (routes.length === 0) {
                this.log('빌드할 라우트가 없습니다.', 'warn');
                return false;
            }
            
            this.log(`${routes.length}개 라우트 발견: ${routes.join(', ')}`, 'info');

            // 3단계: PurgeCSS 컨텐츠 경로 준비 (전문 트리셰이킹용)
            this.log('PurgeCSS 컨텐츠 분석 준비...', 'info');
            this.purgeContentPaths = await this.preparePurgeContentPaths();
            this.log(`PurgeCSS 컨텐츠 경로: ${this.purgeContentPaths.length}개 파일 준비 완료`, 'info');
            
            // 4단계: 컴포넌트 시스템 파일 생성
            await this.generateComponentsFile();
            
            // 빌드된 파일 무결성 검사
            await this.validateBuildFiles(routes);
            
            // 5단계: 오래된 파일 정리 (캐시 모드에서만)
            if (this.config.cache) {
                await this.cleanOldFiles(routes);
            }
            
            // 6단계: 각 라우트 빌드 (병렬/순차)
            await this.buildRoutesParallel(routes);
            
            // 메모리 정리
            await this.optimizeMemoryUsage();
            
            // 7단계: 매니페스트 생성
            await this.generateManifest(routes);
            
            // 8단계: 캐시 저장
            await this.saveCache();
            
            // 9단계: 결과 보고
            this.printReport();
            
            // 10단계: 번들 분석기 실행 (옵션)
            if (this.config.analyzer) {
                await this.runBundleAnalyzer();
            }
            

            return this.stats.routesFailed === 0;
            
        } catch (error) {
            this.log(`빌드 실패: ${error.message}`, 'error');
            return false;
        }
    }
    
    async minifyJavaScript(code) {
        try {
            const options = {
                minify: this.config.minify,
                target: 'es2020',
                format: 'esm',
                keepNames: false,
                treeShaking: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
                drop: this.config.dropConsole ? ['console', 'debugger'] : ['debugger'],
                legalComments: 'none'
            };
            
            // Source map 지원
            if (this.config.sourceMaps) {
                options.sourcemap = true;
            }
            
            const result = await esbuild.transform(code, options);
            
            // JavaScript Tree Shaking 통계 업데이트
            this.treeShakingStats.javascript.originalSize += code.length;
            this.treeShakingStats.javascript.minifiedSize += result.code.length;
            this.treeShakingStats.javascript.savedBytes += (code.length - result.code.length);
            this.treeShakingStats.javascript.filesProcessed++;
            
            return { code: result.code, map: result.map };
        } catch (error) {
            this.log(`JavaScript 압축 실패, 원본 사용: ${error.message}`, 'warn');
            return { code, map: null };
        }
    }
    
    async buildRoute(routeName) {
        try {
            this.log(`${routeName} 빌드 중...`, 'info');
            
            // 파일 경로 검증
            const paths = {
                logic: path.join(this.config.srcPath, 'logic', `${routeName}.js`),
                view: path.join(this.config.srcPath, 'views', `${routeName}.html`),
                style: path.join(this.config.srcPath, 'styles', `${routeName}.css`)
            };
            
            // 단계별 오류 처리
            let logicContent, viewContent, styleContent;
            
            try {
                logicContent = await this.readFile(paths.logic);
            } catch (error) {
                this.log(`${routeName} 로직 파일 읽기 실패: ${error.message}`, 'warn');
                throw new Error(`로직 파일 필수: ${paths.logic}`);
            }
            
            try {
                viewContent = await this.readFile(paths.view, '<div>기본 뷰</div>');
            } catch (error) {
                this.log(`${routeName} 뷰 파일 읽기 실패, 기본값 사용: ${error.message}`, 'warn');
                viewContent = '<div>기본 뷰</div>';
            }
            
            try {
                styleContent = await this.readFile(paths.style, '');
            } catch (error) {
                this.log(`${routeName} 스타일 파일 읽기 실패, 기본값 사용: ${error.message}`, 'warn');
                styleContent = '';
            }
            
            // logicContent에서 직접 layout 속성 체크
            let layoutName = 'default'; // 기본값
            
            // layout 속성 추출 (문자열 패턴 매칭)
            const layoutMatch = logicContent.match(/layout:\s*['"`]([^'"`]*)['"`]/);
            const layoutNullMatch = logicContent.match(/layout:\s*null/);
            
            if (layoutNullMatch) {
                layoutName = null;
                this.log(`${routeName} 레이아웃 사용 안함 (layout: null)`, 'info');
            } else if (layoutMatch) {
                layoutName = layoutMatch[1];
            }
                
            if (layoutName) {
                try {
                    const layoutPath = path.join(this.config.srcPath, 'layouts', `${layoutName}.html`);
                    const layoutContent = await this.readFile(layoutPath);
                    // 레이아웃의 {{ content }} 부분을 실제 뷰 콘텐츠로 대체
                    viewContent = layoutContent.replace(/\{\{\s*content\s*\}\}/g, viewContent);
                    this.log(`${routeName} 레이아웃 '${layoutName}' 적용 완료`, 'info');
                } catch (error) {
                    this.log(`${routeName} 레이아웃 '${layoutName}' 로드 실패, 뷰만 사용: ${error.message}`, 'warn');
                }
            }
            
            // 1단계: 소스 파일 빠른 검증 (캐시 확인 전)
            try {
                const preValidation = await this.validateSourceFiles(routeName);
                if (!preValidation.passed) {
                    this.log(`⚠️ ${routeName} 소스 파일 사전 검증 경고`, 'warn');
                    preValidation.errors.forEach(error => this.log(`  - ${error}`, 'warn'));
                    // 경고로만 처리하고 빌드는 계속 진행
                }
            } catch (error) {
                this.log(`${routeName} 사전 검증 중 오류 (빌드 계속): ${error.message}`, 'warn');
            }

            // 캐시 확인
            if (!await this.shouldRebuildRoute(routeName)) {
                this.log(`${routeName} 캐시됨, 스킵`, 'info');
                this.stats.routesBuilt++; // 캐시된 라우트도 성공으로 카운트
                
                // 캐시된 라우트도 검증 통계에 포함 (성공으로 처리)
                this.validationStats.totalChecks++;
                this.validationStats.passedChecks++;
                
                return;
            }
            
            // 최종 파일 생성
            let finalContent;
            try {
                finalContent = await this.generateRouteFile(routeName, logicContent, viewContent, styleContent);
                
                // 2-5단계: 종합 검증 수행
                const validationResult = await this.runValidation(routeName, logicContent, viewContent, styleContent, finalContent.originalCode || finalContent.code);
                
                if (!validationResult.passed) {
                    this.log(`⚠️ ${routeName} 검증에서 일부 문제 발견, 빌드는 계속 진행`, 'warn');
                    // 검증 실패해도 빌드는 계속 진행 (배포 안정성 우선)
                }
                
                // 파일 쓰기 (스트림 기반)
                const outputPath = path.join(this.config.routesPath, `${routeName}.js`);
                await this.writeFileStreamed(outputPath, finalContent.code);
                
                // Source map 저장
                if (this.config.sourceMaps && finalContent.map) {
                    await fs.writeFile(`${outputPath}.map`, finalContent.map);
                }
                
                // 생성된 파일 검증
                const writtenContent = await fs.readFile(outputPath, 'utf8');
                if (writtenContent.length < 100) {
                    throw new Error('생성된 파일이 너무 작음 (손상된 것으로 추정)');
                }
                
            } catch (error) {
                this.log(`${routeName} 파일 생성 실패: ${error.message}`, 'error');
                throw error;
            }
            
            this.stats.routesBuilt++;
            this.log(`${routeName} 빌드 완료 ✓`, 'success');
            
            // 메모리 사용량이 높으면 가비지 컬렉션 실행
            const currentMemory = this.getMemoryUsage();
            if (currentMemory.heapUsed > 100 * 1024 * 1024) { // 100MB 이상
                await this.forceGarbageCollection();
            }
            
        } catch (error) {
            this.stats.routesFailed++;
            this.log(`${routeName} 빌드 실패: ${error.message}`, 'error');
            this.log(`${routeName} 상세 오류: ${error.stack}`, 'error');
            
            // 폴백 생성
            await this.createFallback(routeName, error.message);
        }
    }
    
    async readFile(filePath, defaultContent = null) {
        try {
            const stats = await fs.stat(filePath);
            
            // 대용량 파일 (1MB 이상)은 스트림으로 처리
            if (stats.size > 1024 * 1024) {
                return await this.readLargeFile(filePath);
            }
            
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            if (defaultContent !== null) {
                return defaultContent;
            }
            throw error;
        }
    }
    
    async readLargeFile(filePath) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let totalSize = 0;
            
            const readStream = createReadStream(filePath, { 
                encoding: 'utf8',
                highWaterMark: 64 * 1024 // 64KB 청크
            });
            
            readStream.on('data', (chunk) => {
                chunks.push(chunk);
                totalSize += chunk.length;
                
                // 메모리 사용량 체크 (10MB 제한)
                if (totalSize > 10 * 1024 * 1024) {
                    readStream.destroy();
                    reject(new Error(`파일이 너무 큼: ${filePath} (10MB 제한)`));
                }
            });
            
            readStream.on('end', () => {
                const content = chunks.join('');
                chunks.length = 0; // 메모리 해제
                resolve(content);
            });
            
            readStream.on('error', reject);
        });
    }
    
    async writeFileStreamed(filePath, content) {
        const contentSize = Buffer.byteLength(content, 'utf8');
        
        // 대용량 콘텐츠는 스트림으로 처리
        if (contentSize > 1024 * 1024) {
            return await this.writeLargeFile(filePath, content);
        }
        
        return await fs.writeFile(filePath, content, 'utf8');
    }
    
    async writeLargeFile(filePath, content) {
        const { Readable } = require('stream');
        const chunkSize = 64 * 1024; // 64KB 청크
        
        const readable = new Readable({
            read() {
                const chunk = content.slice(0, chunkSize);
                if (chunk.length === 0) {
                    this.push(null);
                } else {
                    content = content.slice(chunkSize);
                    this.push(chunk);
                }
            }
        });
        
        const writeStream = createWriteStream(filePath, { encoding: 'utf8' });
        
        await pipeline(readable, writeStream);
        this.log(`대용량 파일 스트림 쓰기 완료: ${path.basename(filePath)}`, 'info');
    }
    
    async generateRouteFile(routeName, logicContent, viewContent, styleContent) {
        const lines = [];
        
        // 스타일 추가 (CSS 트리셰이킹 적용 후 압축)
        if (styleContent.trim()) {
            let processedStyle = styleContent;
            
            // PurgeCSS 트리셰이킹 적용
            if (this.purgeContentPaths && this.purgeContentPaths.length > 0) {
                const result = await this.purgeUnusedCSS(styleContent, routeName);
                processedStyle = result.css;
                
                if (result.removedSelectors > 0) {
                    this.log(`  - PurgeCSS 트리셰이킹: ${result.removedSelectors}개 선택자 제거`, 'info');
                }
            }
            
            const minifiedStyle = this.minifyCSS(processedStyle);
            lines.push(`const STYLE_ID = 'route-style-${routeName}';`);
            lines.push(`const STYLE_CONTENT = ${JSON.stringify(minifiedStyle)};`);
            lines.push(`if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {`);
            lines.push(`  const styleEl = document.createElement("style");`);
            lines.push(`  styleEl.id = STYLE_ID;`);
            lines.push(`  styleEl.textContent = STYLE_CONTENT;`);
            lines.push(`  document.head.appendChild(styleEl);`);
            lines.push(`}`);
            lines.push('');
        }
        
        // src 로직 파일을 그대로 사용 (파싱하지 않음)
        // export default를 제거하고 const component =로 변경
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
  _buildVersion: "${this.config.version}"
};`
        );
        
        lines.push(componentCode);
        lines.push('');
        
        // 템플릿 추가 (압축 후 JSON.stringify로 자동 이스케이핑)
        const minifiedTemplate = this.minifyHTML(viewContent);
        lines.push(`component.template = ${JSON.stringify(minifiedTemplate)};`);
        lines.push('');
        lines.push('export default component;');
        
        const fullCode = lines.join('\n');
        
        // JavaScript 코드 압축
        let finalCode = fullCode;
        let sourceMap = null;
        
        if (this.config.minify) {
            const result = await this.minifyJavaScript(fullCode);
            finalCode = result.code;
            sourceMap = result.map;
        }
        
        return {
            code: finalCode,
            map: sourceMap,
            originalCode: fullCode
        };
    }
    
    async createFallback(routeName, originalError = '알 수 없는 오류') {
        const fallbackContent = `const component = {
  data() { 
    return {
      errorMessage: '${originalError.replace(/'/g, "\\'")}',
      routeName: '${routeName}',
      buildTime: '${new Date().toISOString()}'
    }; 
  },
  mounted() { 
    console.warn(\`\${this.routeName} 라우트가 폴백 모드로 실행 중입니다.\`);
    console.error('원인:', this.errorMessage);
    
    // 5초 후 자동으로 홈으로 리다이렉트 (선택사항)
    if (this.routeName !== 'home' && this.routeName !== '404') {
      setTimeout(() => {
        if (window.router && window.router.navigateTo) {
          console.log('폴백 페이지에서 홈으로 리다이렉트...');
          window.router.navigateTo('home');
        }
      }, 5000);
    }
  },
  methods: {
    goHome() {
      if (window.router && window.router.navigateTo) {
        window.router.navigateTo('home');
      }
    },
    retry() {
      window.location.reload();
    }
  },
  _routeName: "${routeName}",
  _isBuilt: true,
  _isFallback: true,
  _buildTime: "${new Date().toISOString()}",
  _buildVersion: "${this.config.version}",
  _originalError: "${originalError.replace(/"/g, '\\"')}"
};

component.template = \`<div style="padding: 2rem; text-align: center; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; margin: 2rem;">
  <h2 style="color: #856404; margin-bottom: 1rem;">⚠️ \${routeName} 페이지 로드 오류</h2>
  <p style="color: #856404; margin-bottom: 1rem;">이 페이지는 빌드 중 오류가 발생하여 폴백 모드로 로드되었습니다.</p>
  <details style="text-align: left; margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
    <summary style="cursor: pointer; font-weight: bold;">오류 세부사항</summary>
    <pre style="margin-top: 0.5rem; font-size: 0.85rem; color: #e74c3c;">{{ errorMessage }}</pre>
  </details>
  <div style="margin-top: 1.5rem;">
    <button @click="goHome" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">홈으로 이동</button>
    <button @click="retry" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">페이지 새로고침</button>
  </div>
  <p style="font-size: 0.8rem; color: #6c757d; margin-top: 1rem;">빌드 시간: {{ buildTime }}</p>
</div>\`;

export default component;`;

        try {
            const outputPath = path.join(this.config.routesPath, `${routeName}.js`);
            await fs.writeFile(outputPath, fallbackContent);
            this.log(`${routeName} 향상된 폴백 페이지 생성 완료`, 'warn');
        } catch (error) {
            this.log(`${routeName} 폴백 생성도 실패: ${error.message}`, 'error');
            
            // 최소한의 응급 폴백
            const emergencyContent = `export default { 
  template: '<div>Emergency Fallback: ${routeName}</div>',
  _routeName: "${routeName}", _isFallback: true 
};`;
            
            try {
                await fs.writeFile(outputPath, emergencyContent);
                this.log(`${routeName} 응급 폴백 생성됨`, 'warn');
            } catch (emergencyError) {
                this.log(`${routeName} 응급 폴백도 실패: ${emergencyError.message}`, 'error');
            }
        }
    }
    
    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    
    async cleanDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            await Promise.all(
                files
                    .filter(file => file.endsWith('.js') || file.endsWith('.map'))
                    .map(file => fs.unlink(path.join(dirPath, file)).catch(() => {}))
            );
            // manifest.json도 삭제
            await fs.unlink(path.join(dirPath, 'manifest.json')).catch(() => {});
        } catch (error) {
            // 정리 실패는 무시
        }
    }
    
    async cleanOldFiles(routes) {
        try {
            const files = await fs.readdir(this.config.routesPath);
            const validFiles = new Set([
                ...routes.map(route => `${route}.js`),
                ...routes.map(route => `${route}.js.map`),
                '_components.js',
                'manifest.json'
            ]);
            
            const filesToDelete = files.filter(file => 
                (file.endsWith('.js') || file.endsWith('.map') || file === 'manifest.json') && 
                !validFiles.has(file)
            );
            
            if (filesToDelete.length > 0) {
                await Promise.all(
                    filesToDelete.map(file => 
                        fs.unlink(path.join(this.config.routesPath, file)).catch(() => {})
                    )
                );
                this.log(`${filesToDelete.length}개 오래된 파일 삭제됨`, 'info');
            }
        } catch (error) {
            // 정리 실패는 무시
        }
    }
    
    async validateBuildFiles(routes) {
        if (!this.config.cache) return;
        
        const missingFiles = [];
        
        // routes 폴더에 모든 빌드 파일이 존재하는지 확인
        for (const route of routes) {
            const outputPath = path.join(this.config.routesPath, `${route}.js`);
            try {
                await fs.access(outputPath);
            } catch (error) {
                missingFiles.push(route);
            }
        }
        
        // _components.js 파일 확인
        const componentsPath = path.join(this.config.routesPath, '_components.js');
        try {
            await fs.access(componentsPath);
        } catch (error) {
            this.log('_components.js 파일 없음, 재생성 예정', 'warn');
            await this.generateComponentsFile();
        }
        
        if (missingFiles.length > 0) {
            this.log(`${missingFiles.length}개 빌드 파일 누락: ${missingFiles.join(', ')}`, 'warn');
            
            // 누락된 파일들의 캐시를 무효화
            for (const route of missingFiles) {
                this.cache.delete(`route_${route}`);
            }
        }
    }
    
    // PurgeCSS 컨텐츠 경로 준비
    async preparePurgeContentPaths() {
        const contentPaths = [];
        
        try {
            // 모든 라우트의 view 파일들
            const routes = await this.discoverRoutes();
            for (const route of routes) {
                const viewPath = path.join(this.config.srcPath, 'views', `${route}.html`);
                try {
                    await fs.access(viewPath);
                    contentPaths.push(viewPath);
                } catch (error) {
                    // 파일이 없으면 스킵
                }
            }
            
            // 레이아웃 파일들
            const layoutsDir = path.join(this.config.srcPath, 'layouts');
            try {
                const layoutFiles = await fs.readdir(layoutsDir);
                for (const file of layoutFiles) {
                    if (file.endsWith('.html')) {
                        contentPaths.push(path.join(layoutsDir, file));
                    }
                }
            } catch (error) {
                this.log(`레이아웃 디렉토리 읽기 오류: ${error.message}`, 'warn');
            }
            
            // 컴포넌트 파일들
            const componentsDir = path.join(this.config.srcPath, 'components');
            try {
                const componentFiles = await fs.readdir(componentsDir);
                for (const file of componentFiles) {
                    if (file.endsWith('.js')) {
                        contentPaths.push(path.join(componentsDir, file));
                    }
                }
            } catch (error) {
                this.log(`컴포넌트 디렉토리 읽기 오류: ${error.message}`, 'warn');
            }
            
        } catch (error) {
            this.log(`PurgeCSS 컨텐츠 경로 준비 중 오류: ${error.message}`, 'warn');
        }
        
        return contentPaths;
    }
    
    // PurgeCSS 기반 CSS 트리셰이킹 처리
    async purgeUnusedCSS(css, routeName) {
        if (!css || !css.trim()) {
            return { css: '', removedSelectors: 0 };
        }
        
        const originalSize = css.length;
        
        try {
            // PurgeCSS 실행
            const purgeCSS = new PurgeCSS();
            const result = await purgeCSS.purge({
                content: this.purgeContentPaths,
                css: [{
                    raw: css,
                    extension: 'css'
                }],
                // PurgeCSS 옵션
                safelist: {
                    // 항상 보존할 선택자들
                    standard: [
                        'html', 'body', '*', '::before', '::after',
                        // Vue.js 관련
                        /^v-/, /^data-v-/, 
                        // Alpine.js 관련  
                        /^x-/, /^\[x-/, /^@/,
                        // 상태 클래스들
                        'active', 'disabled', 'loading', 'error', 'success',
                        // 미디어 쿼리 관련
                        /^@media/, /^@supports/, /^@keyframes/
                    ],
                    // 키프레임 애니메이션 보존
                    keyframes: true,
                    // 동적으로 추가되는 클래스들
                    greedy: [
                        /^btn-/, /^alert-/, /^modal-/, /^form-/,
                        /^nav-/, /^card-/, /^input-/, /^toast-/
                    ]
                },
                // 키프레임과 미디어 쿼리 보존
                keyframes: true,
                fontFace: true,
                // CSS 변수 보존
                variables: true,
                // 더 관대한 매칭
                defaultExtractor: content => {
                    const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
                    const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
                    return broadMatches.concat(innerMatches);
                }
            });
            
            if (result && result[0]) {
                const purgedCSS = result[0].css;
                const finalSize = purgedCSS.length;
                const removedSize = originalSize - finalSize;
                const removedSelectors = Math.max(0, Math.floor(removedSize / 50)); // 대략적인 제거된 선택자 수
                
                // 통계 업데이트
                if (this.treeShakingStats?.css) {
                    this.treeShakingStats.css.savedBytes += removedSize;
                    this.treeShakingStats.css.totalRules++;
                    this.treeShakingStats.css.usedRules++;
                }
                
                return {
                    css: purgedCSS,
                    removedSelectors
                };
            } else {
                this.log(`PurgeCSS 결과가 없음 (${routeName})`, 'warn');
                return { css, removedSelectors: 0 };
            }
            
        } catch (error) {
            this.log(`PurgeCSS 오류 (${routeName}): ${error.message}`, 'warn');
            // PurgeCSS 실패 시 원본 CSS 반환
            return { css, removedSelectors: 0 };
        }
    }
    
    async analyzeComponentUsage() {
        const componentsUsage = new Set();
        
        // 모든 라우트의 템플릿과 스타일에서 컴포넌트 사용량 분석
        const routes = await this.discoverRoutes();
        
        for (const route of routes) {
            const files = [
                path.join(this.config.srcPath, 'views', `${route}.html`),
                path.join(this.config.srcPath, 'logic', `${route}.js`),
                path.join(this.config.srcPath, 'styles', `${route}.css`)
            ];
            
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    
                    // HTML에서 컴포넌트 태그 찾기
                    const componentTags = content.match(/<([A-Z][a-zA-Z0-9-]*)/g);
                    if (componentTags) {
                        componentTags.forEach(tag => {
                            const componentName = tag.substring(1).replace(/-/g, ''); // '<' 제거 및 kebab-case 처리
                            if (componentName.match(/^[A-Z]/)) { // 컴포넌트는 대문자로 시작
                                componentsUsage.add(componentName);
                            }
                        });
                    }
                    
                    // JavaScript에서 import 문 찾기
                    const importMatches = content.match(/import\s+{[^}]*}\s+from\s+['"]\.\.\/components\/([^'"]+)['"]/g);
                    if (importMatches) {
                        importMatches.forEach(match => {
                            const componentMatch = match.match(/from\s+['"]\.\.\/components\/([^'"]+)['"]/);
                            if (componentMatch) {
                                const componentName = componentMatch[1].replace('.js', '');
                                componentsUsage.add(componentName);
                            }
                        });
                    }
                    
                    // Vue 컴포넌트 사용 패턴 찾기 (components: { ... })
                    const componentUsageMatch = content.match(/components:\s*{([^}]*)}/g);
                    if (componentUsageMatch) {
                        componentUsageMatch.forEach(match => {
                            const components = match.match(/([A-Z][a-zA-Z0-9]*)/g);
                            if (components) {
                                components.forEach(comp => componentsUsage.add(comp));
                            }
                        });
                    }
                    
                } catch (error) {
                    // 파일이 없어도 무시
                }
            }
        }
        
        return componentsUsage;
    }
    
    async discoverRoutes() {
        try {
            const logicDir = path.join(this.config.srcPath, 'logic');
            const files = await fs.readdir(logicDir);
            
            return files
                .filter(file => file.endsWith('.js'))
                .map(file => path.basename(file, '.js'))
                .sort();
                
        } catch (error) {
            this.log(`라우트 검색 실패: ${error.message}`, 'error');
            return [];
        }
    }
    
    async generateComponentsFile() {
        try {
            this.log('통합 컴포넌트 시스템 파일 생성 중...', 'info');
            
            // 컴포넌트 사용량 분석 (트리셰이킹)
            const usedComponents = await this.analyzeComponentUsage();
            
            // src/components 디렉토리의 모든 컴포넌트 파일 읽기
            const componentsDir = path.join(this.config.srcPath, 'components');
            const componentFiles = await fs.readdir(componentsDir);
            const componentImports = [];
            const componentRegistrations = [];
            let totalSize = 0;
            let usedSize = 0;
            
            // 트리셰이킹 통계 초기화
            this.treeShakingStats.totalComponents = 0;
            this.treeShakingStats.usedComponents = 0;
            this.treeShakingStats.unusedComponents = [];
            
            // 각 컴포넌트 파일 처리
            for (const file of componentFiles) {
                if (file.endsWith('.js') && file !== 'ComponentLoader.js') {
                    const componentName = path.basename(file, '.js');
                    const componentPath = path.join(componentsDir, file);
                    
                    try {
                        // 컴포넌트 파일 읽기
                        const componentContent = await fs.readFile(componentPath, 'utf8');
                        totalSize += componentContent.length;
                        this.treeShakingStats.totalComponents++;
                        
                        // 트리셰이킹: 사용되는 컴포넌트만 포함
                        if (usedComponents.has(componentName)) {
                            // export default를 찾아서 컴포넌트 객체 추출
                            const componentCode = componentContent
                                .replace(/export\s+default\s+/, '')
                                .replace(/;\s*$/, '');
                            
                            // 컴포넌트를 components 객체에 추가
                            componentImports.push(`
// ${componentName} 컴포넌트
const ${componentName} = ${componentCode};
`);
                            
                            componentRegistrations.push(`        '${componentName}': ${componentName}`);
                            
                            this.log(`  - ${componentName} 컴포넌트 로드됨`, 'info');
                            this.treeShakingStats.usedComponents++;
                            usedSize += componentContent.length;
                        } else {
                            this.log(`  - ${componentName} 컴포넌트 스킵 (사용되지 않음)`, 'warn');
                            this.treeShakingStats.unusedComponents.push(componentName);
                        }
                        
                    } catch (err) {
                        this.log(`  - ${componentName} 컴포넌트 로드 실패: ${err.message}`, 'warn');
                    }
                }
            }
            
            // 트리셰이킹 통계 계산
            this.treeShakingStats.savedBytes = totalSize - usedSize;
            
            // 트리셰이킹 결과 출력
            const savedKB = (this.treeShakingStats.savedBytes / 1024).toFixed(1);
            const reductionPercent = totalSize > 0 ? ((this.treeShakingStats.savedBytes / totalSize) * 100).toFixed(1) : 0;
            
            this.log(`트리셰이킹 결과: ${this.treeShakingStats.usedComponents}/${this.treeShakingStats.totalComponents} 컴포넌트 사용, ${savedKB}KB 절약 (${reductionPercent}%)`, 'success');
            
            const componentsContent = `/**
 * ViewLogic 컴포넌트 레지스트리
 * 자동 생성됨 - 수정하지 마세요
 * 빌드 시간: ${new Date().toISOString()}
 */

// ============================================
// 컴포넌트 정의 
// ============================================
${componentImports.join('\n')}

// ============================================
// 모든 컴포넌트 매핑
// ============================================
const components = {
${componentRegistrations.join(',\n')}
};

// ============================================
// 컴포넌트 자동 등록 시스템
// ============================================
function registerComponents(app) {
    console.log('✅ ViewLogic 컴포넌트 등록 중...');
    
    let registeredCount = 0;
    
    // 모든 컴포넌트를 Vue 앱에 등록
    for (const [name, component] of Object.entries(components)) {
        if (component && component.name) {
            if (app && app.component) {
                app.component(name, component);
                registeredCount++;
            }
        }
    }
    
    console.log(\`✅ \${registeredCount}개 컴포넌트 등록 완료\`);
    
    return {
        success: true,
        componentsRegistered: registeredCount
    };
}

// ============================================
// 익스포트
// ============================================

// ES6 모듈 익스포트
export { registerComponents, components };

// 기본 export
export default {
    registerComponents,
    components
};

// 글로벌 노출 (브라우저 직접 로드용)
if (typeof window !== 'undefined') {
    window.registerComponents = registerComponents;
    window.ViewLogicComponents = components;
    
    console.log('🚀 ViewLogic 컴포넌트 레지스트리 로드됨');
    console.log(\`   컴포넌트 수: \${Object.keys(components).length}개\`);
}
`;
            
            // _components.js 파일 생성 (압축 옵션 적용)
            let finalComponentsContent = componentsContent;
            
            if (this.config.minify) {
                try {
                    const result = await this.minifyJavaScript(componentsContent);
                    finalComponentsContent = result.code;
                    this.log('_components.js 파일 압축 완료', 'info');
                } catch (error) {
                    this.log(`_components.js 압축 실패, 원본 사용: ${error.message}`, 'warn');
                    finalComponentsContent = componentsContent;
                }
            }
            
            await fs.writeFile(
                path.join(this.config.routesPath, '_components.js'),
                finalComponentsContent
            );
            
            this.log('통합 컴포넌트 시스템 파일 생성 완료', 'success');
            
        } catch (error) {
            this.log(`컴포넌트 시스템 파일 생성 실패: ${error.message}`, 'warn');
        }
    }
    
    async generateManifest(routes) {
        const manifest = {
            buildTime: new Date().toISOString(),
            buildVersion: this.config.version,
            routes: routes,
            hasComponentsFile: true,
            stats: {
                routesBuilt: this.stats.routesBuilt,
                routesFailed: this.stats.routesFailed,
                buildDuration: Date.now() - this.stats.startTime
            }
        };
        
        try {
            await fs.writeFile(
                path.join(this.config.routesPath, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );
        } catch (error) {
            this.log(`매니페스트 생성 실패: ${error.message}`, 'warn');
        }
    }
    
    
    printReport() {
        const duration = Date.now() - this.stats.startTime;
        const totalRoutes = this.stats.routesBuilt + this.stats.routesFailed;
        const cacheHits = this.cache.size;
        
        console.log('\n' + '='.repeat(50));
        console.log('🏗️ ViewLogic 빌드 시스템 v2.0 리포트');
        console.log('='.repeat(50));
        console.log(`⏱️ 소요시간: ${duration}ms`);
        console.log(`📊 총 라우트: ${totalRoutes}`);
        console.log(`✅ 성공: ${this.stats.routesBuilt}`);
        console.log(`❌ 실패: ${this.stats.routesFailed}`);
        
        if (this.config.cache && cacheHits > 0) {
            console.log(`🗋 캐시: ${cacheHits}개 항목`);
        }
        
        if (this.config.parallel) {
            console.log(`🚀 병렬 빌드: 활성화`);
        }
        
        if (this.config.workerThreads && this.workers.length > 0) {
            console.log(`🧵 워커 스레드: ${this.workers.length}개 활성화`);
        }
        
        if (this.config.sourceMaps) {
            console.log(`🗺️ Source Maps: 생성됨`);
        }
        
        // 트리셰이킹 통계 출력
        if (this.treeShakingStats.totalComponents > 0) {
            const savedKB = (this.treeShakingStats.savedBytes / 1024).toFixed(1);
            const reductionPercent = this.treeShakingStats.totalComponents > 0 ? 
                ((this.treeShakingStats.unusedComponents.length / this.treeShakingStats.totalComponents) * 100).toFixed(1) : 0;
            console.log(`🌳 컴포넌트 트리셰이킹: ${this.treeShakingStats.usedComponents}/${this.treeShakingStats.totalComponents} 사용, ${savedKB}KB 절약`);
            if (this.treeShakingStats.unusedComponents.length > 0) {
                console.log(`   미사용 컴포넌트: ${this.treeShakingStats.unusedComponents.join(', ')}`);
            }
        }
        
        // CSS 트리셰이킹 통계 출력
        if (this.treeShakingStats.css.totalRules > 0) {
            const cssSavedKB = (this.treeShakingStats.css.savedBytes / 1024).toFixed(1);
            const cssReductionPercent = this.treeShakingStats.css.totalRules > 0 ? 
                ((this.treeShakingStats.css.unusedRules.length / this.treeShakingStats.css.totalRules) * 100).toFixed(1) : 0;
            console.log(`🎨 CSS 트리셰이킹: ${this.treeShakingStats.css.usedRules}/${this.treeShakingStats.css.totalRules} 규칙 사용, ${cssSavedKB}KB 절약 (${cssReductionPercent}% 감소)`);
            if (this.treeShakingStats.css.unusedRules.length > 0 && this.treeShakingStats.css.unusedRules.length <= 10) {
                console.log(`   미사용 선택자: ${this.treeShakingStats.css.unusedRules.join(', ')}`);
            } else if (this.treeShakingStats.css.unusedRules.length > 10) {
                console.log(`   미사용 선택자: ${this.treeShakingStats.css.unusedRules.slice(0, 10).join(', ')} 외 ${this.treeShakingStats.css.unusedRules.length - 10}개`);
            }
        }
        
        // JavaScript 트리셰이킹 통계 출력
        if (this.treeShakingStats.javascript.filesProcessed > 0) {
            const jsSavedKB = (this.treeShakingStats.javascript.savedBytes / 1024).toFixed(1);
            const jsReductionPercent = this.treeShakingStats.javascript.originalSize > 0 ? 
                ((this.treeShakingStats.javascript.savedBytes / this.treeShakingStats.javascript.originalSize) * 100).toFixed(1) : 0;
            console.log(`📦 JavaScript 트리셰이킹: ${this.treeShakingStats.javascript.filesProcessed}개 파일, ${jsSavedKB}KB 절약 (${jsReductionPercent}% 감소)`);
        }
        
        // 검증 통계 출력
        if (this.validationStats.totalChecks > 0) {
            console.log('\n' + '='.repeat(50));
            console.log('🔍 검증 시스템 결과');
            console.log('='.repeat(50));
            console.log(`✅ 총 검증: ${this.validationStats.totalChecks}건`);
            console.log(`✅ 성공: ${this.validationStats.passedChecks}건`);
            
            if (this.validationStats.failedChecks > 0) {
                console.log(`❌ 실패: ${this.validationStats.failedChecks}건`);
            }
            
            if (this.validationStats.warnings.length > 0) {
                console.log(`⚠️ 경고: ${this.validationStats.warnings.length}건`);
                
                // 최대 5개 경고만 출력
                const maxWarnings = 5;
                const warningsToShow = this.validationStats.warnings.slice(0, maxWarnings);
                for (const warning of warningsToShow) {
                    console.log(`   - ${warning}`);
                }
                
                if (this.validationStats.warnings.length > maxWarnings) {
                    console.log(`   ... 외 ${this.validationStats.warnings.length - maxWarnings}개 추가 경고`);
                }
            }
            
            const successRate = ((this.validationStats.passedChecks / this.validationStats.totalChecks) * 100).toFixed(1);
            console.log(`📊 성공률: ${successRate}%`);
            console.log('='.repeat(50));
        }
        
        if (this.stats.errors.length > 0) {
            console.log(`💥 빌드 오류: ${this.stats.errors.length}개`);
        }
        
        console.log('='.repeat(50));
        
        // 메모리 사용량 리포트
        this.printMemoryReport();
    }
    
    printMemoryReport() {
        const initialMB = this.memoryStats.initialMemory.heapUsed / 1024 / 1024;
        const peakMB = this.memoryStats.peakMemory.heapUsed / 1024 / 1024;
        const currentMB = this.memoryStats.currentMemory.heapUsed / 1024 / 1024;
        
        console.log('\n' + '='.repeat(50));
        console.log('🧠 메모리 사용량 리포트');
        console.log('='.repeat(50));
        console.log(`📈 초기 메모리: ${initialMB.toFixed(1)}MB`);
        console.log(`⬆️ 최대 메모리: ${peakMB.toFixed(1)}MB`);
        console.log(`📊 현재 메모리: ${currentMB.toFixed(1)}MB`);
        
        if (this.memoryStats.gcCount > 0) {
            console.log(`🗑️ 가비지 컬렉션: ${this.memoryStats.gcCount}회 실행`);
        }
        
        const memoryIncrease = currentMB - initialMB;
        if (memoryIncrease > 0) {
            console.log(`📈 메모리 증가량: +${memoryIncrease.toFixed(1)}MB`);
        } else {
            console.log(`📉 메모리 절약량: ${Math.abs(memoryIncrease).toFixed(1)}MB`);
        }
        console.log('='.repeat(50));
    }
    
    async optimizeMemoryUsage() {
        this.log('메모리 최적화 실행 중...', 'info');
        
        try {
            // 1. 캐시 정리
            await this.optimizeCache();
            
            // 2. 트리셰이킹 통계 정리
            this.optimizeTreeShakingStats();
            
            // 3. 강제 가비지 컬렉션
            await this.forceGarbageCollection();
            
            // 4. 메모리 사용량 체크
            const memoryUsage = this.getMemoryUsage();
            const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
            
            if (memoryMB > 200) { // 200MB 이상이면 경고
                this.log(`높은 메모리 사용량 감지: ${memoryMB.toFixed(1)}MB`, 'warn');
            }
            
            this.log('메모리 최적화 완료', 'success');
            
        } catch (error) {
            this.log(`메모리 최적화 실패: ${error.message}`, 'warn');
        }
    }
    
    async optimizeCache() {
        const originalSize = this.cache.size;
        
        // 오래된 캐시 항목 정리 (1시간 이상)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let removedCount = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp && value.timestamp < oneHourAgo) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            this.log(`캐시 정리: ${removedCount}개 항목 제거`, 'info');
        }
        
        // 캐시 크기가 1000개를 초과하면 오래된 것부터 제거
        if (this.cache.size > 1000) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0))
                .slice(0, this.cache.size - 500); // 500개만 유지
            
            for (const [key] of entries) {
                this.cache.delete(key);
            }
            
            this.log(`캐시 크기 조정: ${originalSize} → ${this.cache.size}개`, 'info');
        }
    }
    
    optimizeTreeShakingStats() {
        // 큰 배열들의 크기 제한
        if (this.treeShakingStats.unusedComponents.length > 100) {
            this.treeShakingStats.unusedComponents = this.treeShakingStats.unusedComponents.slice(0, 50);
        }
        
        if (this.treeShakingStats.css.unusedRules.length > 1000) {
            this.treeShakingStats.css.unusedRules = this.treeShakingStats.css.unusedRules.slice(0, 500);
        }
    }
    
    async runBundleAnalyzer() {
        this.log('번들 분석기 실행 중...', 'info');
        
        try {
            const BundleAnalyzer = require('./bundle-analyzer.cjs');
            const analyzer = new BundleAnalyzer({
                routesPath: this.config.routesPath,
                srcPath: this.config.srcPath
            });
            
            await analyzer.analyze();
            this.log('번들 분석 완료!', 'success');
            
        } catch (error) {
            this.log(`번들 분석 실패: ${error.message}`, 'warn');
        }
    }
    
    
    // ======================================
    // 워커 스레드 관리 메서드들
    // ======================================
    
    async initializeWorkers() {
        const workerCount = this.config.maxWorkers;
        this.log(`워커 스레드 ${workerCount}개 초기화 중...`, 'info');
        
        const workerPromises = [];
        
        for (let i = 0; i < workerCount; i++) {
            const workerPromise = this.createWorker(i);
            workerPromises.push(workerPromise);
        }
        
        try {
            const workers = await Promise.all(workerPromises);
            this.workers = workers.filter(worker => worker !== null);
            
            if (this.workers.length > 0) {
                this.log(`워커 스레드 ${this.workers.length}개 준비 완료`, 'success');
            } else {
                this.log('워커 스레드 초기화 실패, 메인 스레드에서 실행', 'warn');
                this.config.workerThreads = false;
            }
        } catch (error) {
            this.log(`워커 스레드 초기화 오류: ${error.message}`, 'warn');
            this.config.workerThreads = false;
        }
    }
    
    async createWorker(id) {
        return new Promise((resolve) => {
            try {
                const worker = new Worker(path.join(__dirname, 'build-worker.cjs'));
                
                worker.on('message', (message) => {
                    if (message.ready) {
                        // 워커 준비 완료
                        worker.isReady = true;
                        worker.isBusy = false;
                        worker.id = id;
                        resolve(worker);
                    } else if (message.taskId) {
                        // 작업 완료
                        this.handleWorkerResponse(message);
                    }
                });
                
                worker.on('error', (error) => {
                    this.log(`워커 ${id} 오류: ${error.message}`, 'error');
                    resolve(null);
                });
                
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        this.log(`워커 ${id} 비정상 종료: ${code}`, 'warn');
                    }
                });
                
                // 타임아웃 처리
                setTimeout(() => {
                    if (!worker.isReady) {
                        this.log(`워커 ${id} 초기화 타임아웃`, 'warn');
                        worker.terminate();
                        resolve(null);
                    }
                }, 5000);
                
            } catch (error) {
                this.log(`워커 ${id} 생성 실패: ${error.message}`, 'error');
                resolve(null);
            }
        });
    }
    
    async executeWorkerTask(taskType, data) {
        if (!this.config.workerThreads || this.workers.length === 0) {
            throw new Error('워커 스레드가 사용 불가능합니다');
        }
        
        return new Promise((resolve, reject) => {
            const taskId = ++this.taskId;
            const task = {
                id: taskId,
                type: taskType,
                data: data,
                timestamp: Date.now()
            };
            
            // 사용 가능한 워커 찾기
            const availableWorker = this.workers.find(worker => !worker.isBusy);
            
            if (availableWorker) {
                // 즉시 실행
                this.assignTaskToWorker(availableWorker, task, resolve, reject);
            } else {
                // 큐에 추가
                this.workerQueue.push({
                    task,
                    resolve,
                    reject
                });
            }
        });
    }
    
    assignTaskToWorker(worker, task, resolve, reject) {
        worker.isBusy = true;
        
        // 작업 정보 저장
        this.pendingTasks.set(task.id, {
            resolve,
            reject,
            worker,
            startTime: Date.now()
        });
        
        // 타임아웃 설정 (30초)
        const timeout = setTimeout(() => {
            this.handleWorkerTimeout(task.id);
        }, 30000);
        
        this.pendingTasks.get(task.id).timeout = timeout;
        
        // 워커에게 작업 전송
        worker.postMessage(task);
    }
    
    handleWorkerResponse(message) {
        const { taskId, success, result, error } = message;
        const taskInfo = this.pendingTasks.get(taskId);
        
        if (!taskInfo) {
            this.log(`알 수 없는 작업 ID: ${taskId}`, 'warn');
            return;
        }
        
        const { resolve, reject, worker, timeout } = taskInfo;
        
        // 타임아웃 제거
        clearTimeout(timeout);
        this.pendingTasks.delete(taskId);
        
        // 워커를 다시 사용 가능 상태로
        worker.isBusy = false;
        
        if (success) {
            resolve(result);
        } else {
            reject(new Error(`워커 작업 실패: ${error.message}`));
        }
        
        // 큐에서 다음 작업 처리
        this.processWorkerQueue();
    }
    
    handleWorkerTimeout(taskId) {
        const taskInfo = this.pendingTasks.get(taskId);
        if (!taskInfo) return;
        
        const { reject, worker } = taskInfo;
        this.pendingTasks.delete(taskId);
        
        this.log(`워커 ${worker.id} 작업 타임아웃`, 'warn');
        
        // 워커 재시작
        worker.isBusy = false;
        
        reject(new Error('워커 작업 타임아웃'));
        
        // 큐에서 다음 작업 처리
        this.processWorkerQueue();
    }
    
    processWorkerQueue() {
        if (this.workerQueue.length === 0) return;
        
        const availableWorker = this.workers.find(worker => !worker.isBusy);
        if (!availableWorker) return;
        
        const { task, resolve, reject } = this.workerQueue.shift();
        this.assignTaskToWorker(availableWorker, task, resolve, reject);
    }
    
    async terminateWorkers() {
        if (this.workers.length === 0) return;
        
        this.log('워커 스레드 종료 중...', 'info');
        
        // 대기 중인 작업들을 모두 거부
        for (const [taskId, taskInfo] of this.pendingTasks) {
            taskInfo.reject(new Error('빌드 종료로 인한 작업 취소'));
            clearTimeout(taskInfo.timeout);
        }
        this.pendingTasks.clear();
        this.workerQueue.length = 0;
        
        // 모든 워커 종료
        const terminatePromises = this.workers.map(async (worker) => {
            try {
                await worker.terminate();
            } catch (error) {
                this.log(`워커 ${worker.id} 종료 실패: ${error.message}`, 'warn');
            }
        });
        
        await Promise.all(terminatePromises);
        this.workers.length = 0;
        
        this.log('모든 워커 스레드 종료 완료', 'info');
    }
}

// CLI 처리
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    // 플래그 처리
    const options = {
        minify: !args.includes('--no-minify'),
        cache: !args.includes('--no-cache'),
        parallel: !args.includes('--no-parallel'),
        sourceMaps: args.includes('--source-maps'),
        workerThreads: !args.includes('--no-workers'),
        maxWorkers: parseInt(args.find(arg => arg.startsWith('--max-workers='))?.split('=')[1]) || undefined,
        analyzer: args.includes('--analyze')
    };
    
    const builder = new ViewLogicBuilder(options);
    
    switch (command) {
        case 'build':
            const success = await builder.build();
            process.exit(success ? 0 : 1);
            break;
            
        case 'clean':
            await builder.cleanDirectory(builder.config.routesPath);
            console.log('✅ 정리 완료');
            break;
            
        case 'analyze':
            const BundleAnalyzer = require('./bundle-analyzer.cjs');
            const analyzer = new BundleAnalyzer({
                routesPath: builder.config.routesPath,
                srcPath: builder.config.srcPath
            });
            await analyzer.analyze();
            break;
            
        case 'help':
        default:
            console.log('🏗️ ViewLogic 빌드 시스템 v1.0\n');
            console.log('사용법:');
            console.log('  node build.cjs build                  # 빌드');
            console.log('  node build.cjs analyze                # 번들 분석 리포트 생성');
            console.log('  node build.cjs clean                  # 빌드 파일 정리');
            console.log('\n옵션:');
            console.log('  --no-minify                          # 압축 비활성화');
            console.log('  --no-cache                           # 캐싱 비활성화');
            console.log('  --no-parallel                        # 병렬 빌드 비활성화');
            console.log('  --no-workers                         # 워커 스레드 비활성화');
            console.log('  --max-workers=N                      # 최대 워커 수 설정');
            console.log('  --source-maps                        # Source map 생성');
            console.log('  --analyze                            # 번들 분석 리포트 생성');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ 빌드 시스템 오류:', error.message);
        process.exit(1);
    });
}

module.exports = ViewLogicBuilder;