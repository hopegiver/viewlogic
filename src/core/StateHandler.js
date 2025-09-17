/**
 * ViewLogic State Management System
 * 전역 상태 관리 시스템
 */
export class StateHandler {
    constructor(router) {
        // 라우터 인스턴스 참조
        this.router = router;

        // 반응형 상태 저장소
        this.state = {};

        // 상태 변경 리스너들
        this.listeners = new Map();

        this.log('debug', 'StateHandler initialized');
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'StateHandler', ...args);
        }
    }

    /**
     * 상태 값 설정
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;

        // 변경 이벤트 발생
        this.emitChange(key, value, oldValue);

        this.log('debug', `State set: ${key}`, value);
        return value;
    }

    /**
     * 상태 값 가져오기
     */
    get(key, defaultValue = undefined) {
        const value = this.state.hasOwnProperty(key) ? this.state[key] : defaultValue;
        this.log('debug', `State get: ${key}`, value);
        return value;
    }

    /**
     * 상태 존재 확인
     */
    has(key) {
        return this.state.hasOwnProperty(key);
    }

    /**
     * 상태 삭제
     */
    delete(key) {
        if (this.has(key)) {
            const oldValue = this.state[key];
            delete this.state[key];

            // 삭제 이벤트 발생
            this.emitChange(key, undefined, oldValue);

            this.log('debug', `State deleted: ${key}`);
            return true;
        }
        return false;
    }

    /**
     * 모든 상태 초기화
     */
    clear() {
        const keys = Object.keys(this.state);
        this.state = {};

        // 각 키에 대해 삭제 이벤트 발생
        keys.forEach(key => {
            this.emitChange(key, undefined, this.state[key]);
        });

        this.log('debug', 'All state cleared');
        return keys.length;
    }

    /**
     * 여러 상태 한 번에 설정
     */
    update(updates) {
        if (!updates || typeof updates !== 'object') {
            this.log('warn', 'Invalid updates object provided');
            return;
        }

        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /**
     * 모든 상태 반환
     */
    getAll() {
        return { ...this.state };
    }

    /**
     * 상태 변경 리스너 등록
     */
    watch(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        this.log('debug', `Watcher added for: ${key}`);
    }

    /**
     * 상태 변경 리스너 제거
     */
    unwatch(key, callback) {
        if (this.listeners.has(key)) {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
                this.log('debug', `Watcher removed for: ${key}`);
            }
        }
    }

    /**
     * 상태 변경 이벤트 발생
     */
    emitChange(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    this.log('error', 'State watcher error:', error);
                }
            });
        }
    }

    /**
     * 상태 통계
     */
    getStats() {
        return {
            stateCount: Object.keys(this.state).length,
            watcherCount: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            keys: Object.keys(this.state)
        };
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.state = {};
        this.listeners.clear();
        this.log('debug', 'StateHandler destroyed');
    }
}