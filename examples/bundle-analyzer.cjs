/**
 * ViewLogic 번들 분석기
 * 빌드된 파일들을 분석하여 시각화된 리포트 생성
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ViewLogicBundleAnalyzer {
    constructor(options = {}) {
        this.config = {
            routesPath: options.routesPath || path.join(process.cwd(), 'routes'),
            srcPath: options.srcPath || path.join(process.cwd(), 'src'),
            outputPath: options.outputPath || path.join(process.cwd(), 'bundle-report.html'),
            openBrowser: options.openBrowser !== false
        };
        
        this.analysis = {
            routes: new Map(),
            components: {},
            totalSize: 0,
            gzipSize: 0,
            dependencies: new Map(),
            duplicateCode: [],
            recommendations: []
        };
    }
    
    log(message, type = 'info') {
        const icons = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' };
        console.log(`${icons[type] || icons.info} ${message}`);
    }
    
    async analyze() {
        this.log('번들 분석 시작...', 'info');
        
        try {
            // 1단계: 라우트 파일 분석
            await this.analyzeRoutes();
            
            // 2단계: 컴포넌트 파일 분석
            await this.analyzeComponents();
            
            // 3단계: 중복 코드 분석
            await this.analyzeDuplicateCode();
            
            // 4단계: 의존성 분석
            await this.analyzeDependencies();
            
            // 5단계: 최적화 권장사항 생성
            this.generateRecommendations();
            
            // 6단계: HTML 리포트 생성
            await this.generateHTMLReport();
            
            this.log(`번들 분석 완료! 리포트: ${this.config.outputPath}`, 'success');
            
            // 브라우저 열기
            if (this.config.openBrowser) {
                await this.openReport();
            }
            
            return this.analysis;
            
        } catch (error) {
            this.log(`번들 분석 실패: ${error.message}`, 'error');
            throw error;
        }
    }
    
    async analyzeRoutes() {
        this.log('라우트 파일 분석 중...', 'info');
        
        try {
            const files = await fs.readdir(this.config.routesPath);
            const routeFiles = files.filter(file => file.endsWith('.js') && !file.startsWith('_'));
            
            for (const file of routeFiles) {
                const filePath = path.join(this.config.routesPath, file);
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                
                const routeName = path.basename(file, '.js');
                const analysis = await this.analyzeFile(content, filePath);
                
                this.analysis.routes.set(routeName, {
                    name: routeName,
                    file: file,
                    size: stats.size,
                    gzipSize: await this.estimateGzipSize(content),
                    lines: content.split('\n').length,
                    ...analysis
                });
                
                this.analysis.totalSize += stats.size;
            }
            
            this.log(`${routeFiles.length}개 라우트 파일 분석 완료`, 'success');
            
        } catch (error) {
            this.log(`라우트 분석 실패: ${error.message}`, 'warn');
        }
    }
    
    async analyzeComponents() {
        this.log('컴포넌트 파일 분석 중...', 'info');
        
        try {
            const componentsFile = path.join(this.config.routesPath, '_components.js');
            const stats = await fs.stat(componentsFile);
            const content = await fs.readFile(componentsFile, 'utf-8');
            
            const analysis = await this.analyzeFile(content, componentsFile);
            
            this.analysis.components = {
                size: stats.size,
                gzipSize: await this.estimateGzipSize(content),
                lines: content.split('\n').length,
                ...analysis
            };
            
            this.analysis.totalSize += stats.size;
            
            this.log('컴포넌트 파일 분석 완료', 'success');
            
        } catch (error) {
            this.log(`컴포넌트 분석 실패: ${error.message}`, 'warn');
        }
    }
    
    async analyzeFile(content, filePath) {
        const analysis = {
            imports: [],
            exports: [],
            functions: [],
            variables: [],
            strings: [],
            comments: 0,
            complexity: 0
        };
        
        // Import 분석
        const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            analysis.imports = importMatches.map(match => {
                const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
                return fromMatch ? fromMatch[1] : '';
            }).filter(Boolean);
        }
        
        // Export 분석
        const exportMatches = content.match(/export\s+(default\s+)?(\w+|\{[^}]+\})/g);
        if (exportMatches) {
            analysis.exports = exportMatches;
        }
        
        // 함수 분석
        const functionMatches = content.match(/(function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*\{)/g);
        if (functionMatches) {
            analysis.functions = functionMatches.length;
        }
        
        // 문자열 리터럴 분석 (큰 문자열 찾기)
        const stringMatches = content.match(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g);
        if (stringMatches) {
            analysis.strings = stringMatches
                .filter(str => str.length > 100)
                .map(str => ({
                    content: str.substring(0, 50) + '...',
                    size: str.length
                }));
        }
        
        // 주석 비율
        const commentMatches = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm);
        if (commentMatches) {
            const commentSize = commentMatches.join('').length;
            analysis.comments = Math.round((commentSize / content.length) * 100);
        }
        
        // 순환 복잡도 (간단한 추정)
        const complexityMatches = content.match(/(if|for|while|switch|catch|\?|&&|\|\|)/g);
        analysis.complexity = complexityMatches ? complexityMatches.length : 0;
        
        return analysis;
    }
    
    async analyzeDuplicateCode() {
        this.log('중복 코드 분석 중...', 'info');
        
        const codeBlocks = new Map();
        
        // 모든 라우트에서 코드 블록 추출
        for (const [routeName, routeData] of this.analysis.routes) {
            const filePath = path.join(this.config.routesPath, routeData.file);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // 50자 이상의 코드 블록을 추출
            const blocks = this.extractCodeBlocks(content, 50);
            
            blocks.forEach(block => {
                const hash = crypto.createHash('md5').update(block.code).digest('hex');
                
                if (codeBlocks.has(hash)) {
                    const existing = codeBlocks.get(hash);
                    existing.locations.push({ route: routeName, line: block.line });
                    existing.count++;
                } else {
                    codeBlocks.set(hash, {
                        code: block.code,
                        size: block.code.length,
                        locations: [{ route: routeName, line: block.line }],
                        count: 1
                    });
                }
            });
        }
        
        // 중복된 코드만 필터링 (2번 이상 등장)
        this.analysis.duplicateCode = Array.from(codeBlocks.values())
            .filter(block => block.count > 1)
            .sort((a, b) => (b.size * b.count) - (a.size * a.count))
            .slice(0, 10); // 상위 10개만
        
        this.log(`${this.analysis.duplicateCode.length}개 중복 코드 블록 발견`, 'info');
    }
    
    extractCodeBlocks(content, minSize) {
        const lines = content.split('\n');
        const blocks = [];
        
        for (let i = 0; i < lines.length; i++) {
            let block = '';
            let j = i;
            
            while (j < lines.length) {
                block += lines[j] + '\n';
                
                if (block.length >= minSize) {
                    // 의미있는 코드인지 확인 (공백, 주석 제외)
                    const cleanBlock = block.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|^\s*$/gm, '').trim();
                    
                    if (cleanBlock.length >= minSize * 0.7) {
                        blocks.push({
                            code: cleanBlock,
                            line: i + 1
                        });
                    }
                    break;
                }
                j++;
            }
        }
        
        return blocks;
    }
    
    async analyzeDependencies() {
        this.log('의존성 분석 중...', 'info');
        
        // 라우트 간 공통 의존성 분석
        const allImports = new Map();
        
        for (const [routeName, routeData] of this.analysis.routes) {
            routeData.imports.forEach(importPath => {
                if (allImports.has(importPath)) {
                    allImports.get(importPath).routes.push(routeName);
                    allImports.get(importPath).count++;
                } else {
                    allImports.set(importPath, {
                        path: importPath,
                        routes: [routeName],
                        count: 1
                    });
                }
            });
        }
        
        // 공통 의존성 (2개 이상 라우트에서 사용)
        this.analysis.dependencies = new Map(
            Array.from(allImports.entries())
                .filter(([path, data]) => data.count > 1)
                .sort((a, b) => b[1].count - a[1].count)
        );
        
        this.log(`${this.analysis.dependencies.size}개 공통 의존성 발견`, 'info');
    }
    
    generateRecommendations() {
        this.log('최적화 권장사항 생성 중...', 'info');
        
        const recommendations = [];
        
        // 큰 파일 경고
        for (const [routeName, routeData] of this.analysis.routes) {
            if (routeData.size > 50000) { // 50KB 이상
                recommendations.push({
                    type: 'size',
                    priority: 'high',
                    title: `${routeName} 라우트 크기 최적화`,
                    description: `${routeName} 파일이 ${(routeData.size / 1024).toFixed(1)}KB로 큽니다. 코드 분할을 고려해보세요.`,
                    file: routeData.file,
                    impact: 'high'
                });
            }
        }
        
        // 중복 코드 경고
        if (this.analysis.duplicateCode.length > 0) {
            recommendations.push({
                type: 'duplication',
                priority: 'medium',
                title: '중복 코드 제거',
                description: `${this.analysis.duplicateCode.length}개의 중복 코드 블록이 발견되었습니다. 공통 유틸리티로 추출을 고려해보세요.`,
                impact: 'medium'
            });
        }
        
        // 공통 의존성 최적화
        const highUsageDeps = Array.from(this.analysis.dependencies.values())
            .filter(dep => dep.count > 3);
        
        if (highUsageDeps.length > 0) {
            recommendations.push({
                type: 'dependencies',
                priority: 'low',
                title: '공통 의존성 최적화',
                description: `${highUsageDeps.length}개의 공통 의존성이 있습니다. 별도 청크로 분리하면 캐싱 효율을 높일 수 있습니다.`,
                impact: 'low'
            });
        }
        
        this.analysis.recommendations = recommendations;
        this.log(`${recommendations.length}개 권장사항 생성`, 'success');
    }
    
    async estimateGzipSize(content) {
        // 실제 gzip 압축 대신 간단한 추정
        // 일반적으로 JavaScript는 70-80% 압축됨
        return Math.round(content.length * 0.25);
    }
    
    async generateHTMLReport() {
        this.log('HTML 리포트 생성 중...', 'info');
        
        const html = this.generateHTMLContent();
        await fs.writeFile(this.config.outputPath, html, 'utf-8');
        
        this.log(`리포트 생성 완료: ${this.config.outputPath}`, 'success');
    }
    
    generateHTMLContent() {
        const routes = Array.from(this.analysis.routes.entries());
        const totalSizeKB = (this.analysis.totalSize / 1024).toFixed(1);
        const totalGzipKB = (Array.from(this.analysis.routes.values()).reduce((sum, route) => sum + route.gzipSize, 0) + this.analysis.components.gzipSize) / 1024;
        
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ViewLogic 번들 분석 리포트</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #fff; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header h1 { color: #2c3e50; margin-bottom: 10px; font-size: 2.5em; }
        .header .subtitle { color: #7f8c8d; font-size: 1.2em; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #fff; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-card .number { font-size: 2.5em; font-weight: bold; color: #3498db; margin-bottom: 5px; }
        .stat-card .label { color: #7f8c8d; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        
        .section { background: #fff; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h2 { color: #2c3e50; margin-bottom: 20px; font-size: 1.8em; }
        
        .chart-container { position: relative; height: 400px; margin: 20px 0; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
        tr:hover { background: #f8f9fa; }
        
        .size-bar { height: 20px; background: #3498db; border-radius: 10px; display: inline-block; min-width: 2px; }
        .size-text { margin-left: 10px; font-weight: 500; }
        
        .recommendation { padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; background: #ecf0f1; border-radius: 0 8px 8px 0; }
        .recommendation.high { border-left-color: #e74c3c; background: #fdf2f2; }
        .recommendation.medium { border-left-color: #f39c12; background: #fef9e7; }
        .recommendation.low { border-left-color: #27ae60; background: #eafaf1; }
        
        .recommendation h3 { color: #2c3e50; margin-bottom: 5px; }
        .recommendation p { color: #7f8c8d; }
        
        .duplicate-code { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .duplicate-code .locations { color: #6c757d; font-size: 0.9em; margin-top: 5px; }
        
        .footer { text-align: center; margin-top: 50px; color: #7f8c8d; }
        
        @media (max-width: 768px) {
            .stats-grid { grid-template-columns: 1fr; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ViewLogic 번들 분석 리포트</h1>
            <p class="subtitle">생성 시간: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="number">${routes.length}</div>
                <div class="label">라우트</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalSizeKB}KB</div>
                <div class="label">전체 크기</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalGzipKB.toFixed(1)}KB</div>
                <div class="label">Gzip 압축 후</div>
            </div>
            <div class="stat-card">
                <div class="number">${this.analysis.duplicateCode.length}</div>
                <div class="label">중복 코드</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🗂️ 라우트별 크기 분석</h2>
            <div class="chart-container">
                <canvas id="routeSizeChart"></canvas>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>라우트</th>
                        <th>크기</th>
                        <th>Gzip</th>
                        <th>라인 수</th>
                        <th>복잡도</th>
                        <th>크기 비율</th>
                    </tr>
                </thead>
                <tbody>
                    ${routes.map(([name, data]) => `
                    <tr>
                        <td><strong>${name}</strong></td>
                        <td>${(data.size / 1024).toFixed(1)}KB</td>
                        <td>${(data.gzipSize / 1024).toFixed(1)}KB</td>
                        <td>${data.lines.toLocaleString()}</td>
                        <td>${data.complexity}</td>
                        <td>
                            <div class="size-bar" style="width: ${(data.size / this.analysis.totalSize) * 300}px;"></div>
                            <span class="size-text">${((data.size / this.analysis.totalSize) * 100).toFixed(1)}%</span>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${this.analysis.duplicateCode.length > 0 ? `
        <div class="section">
            <h2>🔄 중복 코드 분석</h2>
            ${this.analysis.duplicateCode.map(duplicate => `
            <div class="duplicate-code">
                <strong>크기: ${duplicate.size}B, 반복: ${duplicate.count}회</strong>
                <div class="locations">위치: ${duplicate.locations.map(loc => `${loc.route}:${loc.line}`).join(', ')}</div>
                <pre style="margin-top: 10px; font-size: 0.8em; background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto;">${duplicate.code.substring(0, 200)}${duplicate.code.length > 200 ? '...' : ''}</pre>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${this.analysis.dependencies.size > 0 ? `
        <div class="section">
            <h2>🔗 공통 의존성</h2>
            <table>
                <thead>
                    <tr>
                        <th>의존성</th>
                        <th>사용 횟수</th>
                        <th>사용 라우트</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from(this.analysis.dependencies.values()).map(dep => `
                    <tr>
                        <td><code>${dep.path}</code></td>
                        <td><strong>${dep.count}</strong></td>
                        <td>${dep.routes.join(', ')}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        ${this.analysis.recommendations.length > 0 ? `
        <div class="section">
            <h2>💡 최적화 권장사항</h2>
            ${this.analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>🤖 ViewLogic 번들 분석기로 생성됨</p>
        </div>
    </div>
    
    <script>
        // 라우트 크기 차트
        const ctx = document.getElementById('routeSizeChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [${routes.map(([name]) => `'${name}'`).join(', ')}, 'components'],
                datasets: [{
                    data: [${routes.map(([, data]) => data.size).join(', ')}, ${this.analysis.components.size}],
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                        '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f',
                        '#8e44ad', '#16a085', '#2c3e50', '#d35400', '#7f8c8d',
                        '#27ae60', '#c0392b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = (context.raw / 1024).toFixed(1);
                                const percentage = ((context.raw / ${this.analysis.totalSize}) * 100).toFixed(1);
                                return context.label + ': ' + value + 'KB (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
    }
    
    async openReport() {
        try {
            const { exec } = require('child_process');
            const opener = process.platform === 'darwin' ? 'open' : 
                         process.platform === 'win32' ? 'start' : 'xdg-open';
            
            exec(`${opener} "${this.config.outputPath}"`);
            this.log('브라우저에서 리포트를 여는 중...', 'info');
        } catch (error) {
            this.log('브라우저 열기 실패, 수동으로 파일을 여세요', 'warn');
        }
    }
}

// CLI 지원
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // 간단한 인수 파싱
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' && args[i + 1]) {
            options.outputPath = args[i + 1];
            i++;
        } else if (args[i] === '--no-browser') {
            options.openBrowser = false;
        }
    }
    
    const analyzer = new ViewLogicBundleAnalyzer(options);
    analyzer.analyze().catch(error => {
        console.error('분석 실패:', error.message);
        process.exit(1);
    });
}

module.exports = ViewLogicBundleAnalyzer;