/**
 * FormHandler
 * 자동 폼 처리 및 검증 시스템
 */
export class FormHandler {
    constructor(router, options = {}) {
        this.router = router;
        this.config = {
            debug: options.debug || false,
            requestTimeout: options.requestTimeout || 30000,
            ...options
        };
        
        this.log('debug', 'FormHandler initialized');
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'FormHandler', ...args);
        }
    }


    /**
     * 중복 요청 체크
     */
    isDuplicateRequest(form) {
        if (form._isSubmitting) {
            this.log('debug', 'Duplicate request blocked');
            return true;
        }
        return false;
    }

    /**
     * 폼 제출 시작
     */
    startFormSubmission(form) {
        form._isSubmitting = true;
        form._abortController = new AbortController();
        
        // 타임아웃 설정
        form._timeoutId = setTimeout(() => {
            if (form._isSubmitting) {
                this.abortFormSubmission(form);
            }
        }, this.config.requestTimeout);
    }

    /**
     * 폼 제출 완료
     */
    finishFormSubmission(form) {
        form._isSubmitting = false;
        
        if (form._timeoutId) {
            clearTimeout(form._timeoutId);
            delete form._timeoutId;
        }
        
        delete form._abortController;
    }

    /**
     * 폼 제출 중단
     */
    abortFormSubmission(form) {
        if (form._abortController) {
            form._abortController.abort();
        }
        this.finishFormSubmission(form);
    }

    /**
     * 자동 폼 바인딩
     */
    bindAutoForms(component) {
        const forms = document.querySelectorAll('form.auto-form, form[action]');
        
        forms.forEach(form => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            form.removeEventListener('submit', form._boundSubmitHandler);
            
            // 새 이벤트 리스너 추가
            const boundHandler = (e) => this.handleFormSubmit(e, component);
            form._boundSubmitHandler = boundHandler;
            form.addEventListener('submit', boundHandler);
            
            this.log('debug', `Form auto-bound: ${form.getAttribute('action')}`);
        });
    }

    /**
     * 폼 서브밋 핸들러
     */
    async handleFormSubmit(event, component) {
        event.preventDefault();
        
        const form = event.target;
        let action = form.getAttribute('action');
        const method = form.getAttribute('method') || 'POST';
        
        // 핸들러 함수들 가져오기
        const successHandler = form.getAttribute('data-success');
        const errorHandler = form.getAttribute('data-error');
        const loadingHandler = form.getAttribute('data-loading');
        const redirectTo = form.getAttribute('data-redirect');

        // 액션 URL에 가변 파라미터 처리
        action = this.processActionParams(action, component);

        // 클라이언트 사이드 검증
        if (!this.validateForm(form, component)) {
            return;
        }

        // 중복 요청 체크
        if (this.isDuplicateRequest(form)) {
            return;
        }

        // 폼 제출 시작
        this.startFormSubmission(form);

        // FormData 생성
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // 로딩 시작
            if (loadingHandler && component[loadingHandler]) {
                component[loadingHandler](true, form);
            }

            this.log('debug', `Form submitting to: ${action}`, data);

            // API 호출 (AbortController 신호 포함)
            const response = await this.submitFormData(action, method, data, form, component, form._abortController.signal);
            
            // 성공 핸들러 호출
            if (successHandler && component[successHandler]) {
                component[successHandler](response, form);
            }

            // 폼 제출 완료 (성공)
            this.finishFormSubmission(form);

            // 자동 리다이렉트 (requestAnimationFrame 사용으로 부드러운 전환)
            if (redirectTo) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        component.navigateTo(redirectTo);
                    }, 1000);
                });
            }

        } catch (error) {
            // AbortError는 의도적인 취소이므로 특별 처리
            if (error.name === 'AbortError') {
                this.log('debug', 'Form submission aborted');
                return;
            }

            this.log('warn', 'Form submission error:', error);
            this.finishFormSubmission(form);
            
            // 에러 핸들러 호출
            if (errorHandler && component[errorHandler]) {
                component[errorHandler](error, form);
            } else {
                console.error('Form submission error:', error);
            }
            
        } finally {
            // 로딩 종료
            if (loadingHandler && component[loadingHandler]) {
                component[loadingHandler](false, form);
            }
        }
    }


    /**
     * 액션 파라미터 처리 (ApiHandler 재사용)
     */
    processActionParams(actionTemplate, component) {
        // ApiHandler의 processURLParameters 재사용하여 일관성 확보
        return this.router.routeLoader.apiHandler.processURLParameters(actionTemplate, component);
    }

    /**
     * 폼 데이터 서브밋 (ApiHandler 활용)
     */
    async submitFormData(action, method, data, form, component, signal = null) {
        // 파일 업로드 체크
        const hasFile = Array.from(form.elements).some(el => el.type === 'file' && el.files.length > 0);
        
        // ApiHandler를 사용하여 일관된 API 호출 및 에러 처리
        const options = {
            method: method.toUpperCase(),
            headers: {},
            signal: signal // AbortController 신호 추가
        };

        if (hasFile) {
            // 파일이 있으면 FormData 그대로 전송 (Content-Type 자동 설정)
            options.data = new FormData(form);
        } else {
            // JSON으로 전송
            options.data = data;
            options.headers['Content-Type'] = 'application/json';
        }

        // ApiHandler의 fetchData 사용하여 통합된 처리
        return await this.router.routeLoader.apiHandler.fetchData(action, component, options);
    }

    /**
     * 클라이언트 사이드 폼 검증
     */
    validateForm(form, component) {
        let isValid = true;
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            // 기본 HTML5 검증
            if (!input.checkValidity()) {
                isValid = false;
                input.classList.add('error');
                return;
            }

            // 커스텀 검증 함수 확인
            const validationFunction = input.getAttribute('data-validation');
            if (validationFunction) {
                const isInputValid = this.validateInput(input, validationFunction, component);
                if (!isInputValid) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    /**
     * 개별 입력 검증
     */
    validateInput(input, validationFunction, component) {
        const value = input.value;
        
        // 커스텀 검증 함수 호출
        if (typeof component[validationFunction] === 'function') {
            try {
                return component[validationFunction](value, input);
            } catch (error) {
                this.log('warn', `Validation function '${validationFunction}' error:`, error);
                return false;
            }
        }
        
        // 함수가 없으면 true 반환
        this.log('warn', `Validation function '${validationFunction}' not found`);
        return true;
    }

    /**
     * 모든 폼 요청 취소
     */
    cancelAllRequests() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (form._isSubmitting) {
                this.abortFormSubmission(form);
            }
        });
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        // 모든 진행 중인 요청 취소
        this.cancelAllRequests();
        
        // 등록된 이벤트 리스너들 정리
        const forms = document.querySelectorAll('form.auto-form, form[action]');
        forms.forEach(form => {
            if (form._boundSubmitHandler) {
                form.removeEventListener('submit', form._boundSubmitHandler);
                delete form._boundSubmitHandler;
            }
            
            // 폼 상태 정리
            this.cleanupFormState(form);
        });
        
        // WeakMap 정리 (자동 가비지 컬렉션됨)
        
        this.log('debug', 'FormHandler destroyed');
        this.router = null;
    }

    /**
     * 폼 상태 정리
     */
    cleanupFormState(form) {
        delete form._isSubmitting;
        delete form._abortController;
        
        if (form._timeoutId) {
            clearTimeout(form._timeoutId);
            delete form._timeoutId;
        }
    }
}