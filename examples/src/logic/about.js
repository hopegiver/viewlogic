// Simulate slow loading by adding delay before export
await new Promise(resolve => setTimeout(resolve, 1000));

export default {
    name: 'About',
    layout: 'default',
    data() {
        return {
            features: [
                {
                    icon: '🔗',
                    title: '해시 라우팅',
                    description: 'URL 해시를 기반으로 한 SPA 라우팅'
                },
                {
                    icon: '🚀',
                    title: '동적 생성',
                    description: '라우트 파일들의 자동 생성'
                },
                {
                    icon: '🔧',
                    title: '뷰/로직 분리',
                    description: 'HTML, CSS, JS 완전 분리'
                },
                {
                    icon: '⚡',
                    title: '프레임워크 호환',
                    description: 'React, Vue 모두 사용 가능'
                }
            ]
        }
    }
}