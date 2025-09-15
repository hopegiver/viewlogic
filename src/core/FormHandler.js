/**
 * FormHandler
 * 자동 폼 처리 및 검증 시스템
 */
export class FormHandler {
    constructor(router, options = {}) {
        this.router = router;
        this.config = {
            debug: options.debug || false,
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
        const successHandler = form.getAttribute('data-success-handler');
        const errorHandler = form.getAttribute('data-error-handler');  
        const loadingHandler = form.getAttribute('data-loading-handler');
        const redirectTo = form.getAttribute('data-redirect');

        try {
            // 로딩 시작
            if (loadingHandler && component[loadingHandler]) {
                component[loadingHandler](true, form);
            }

            // 액션 URL에 가변 파라미터 처리
            action = this.processActionParams(action, component);

            // 클라이언트 사이드 검증
            if (!this.validateForm(form, component)) {
                return;
            }

            // FormData 생성
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            this.log('debug', `Form submitting to: ${action}`, data);

            // API 호출
            const response = await this.submitFormData(action, method, data, form, component);
            
            // 성공 핸들러 호출
            if (successHandler && component[successHandler]) {
                component[successHandler](response, form);
            }

            // 자동 리다이렉트
            if (redirectTo) {
                setTimeout(() => {
                    component.navigateTo(redirectTo);
                }, 1000); // 1초 후 리다이렉트
            }

        } catch (error) {
            this.log('warn', `Form submission error:`, error);
            
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
     * 액션 파라미터 처리 (간단한 템플릿 치환)
     */
    processActionParams(actionTemplate, component) {
        let processedAction = actionTemplate;
        
        // {paramName} 패턴 찾기
        const paramMatches = actionTemplate.match(/\{([^}]+)\}/g);
        
        if (paramMatches) {
            paramMatches.forEach(match => {
                const paramName = match.slice(1, -1); // {id} -> id
                
                try {
                    let paramValue = null;
                    
                    // 1. 먼저 getParam으로 라우트 파라미터에서 찾기
                    paramValue = component.getParam(paramName);
                    
                    // 2. 컴포넌트 data에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        paramValue = component[paramName];
                    }
                    
                    // 3. computed 속성에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        if (component.$options.computed && component.$options.computed[paramName]) {
                            paramValue = component[paramName];
                        }
                    }
                    
                    if (paramValue !== null && paramValue !== undefined) {
                        // 템플릿 대체: {id} -> 실제값
                        processedAction = processedAction.replace(
                            match, 
                            encodeURIComponent(paramValue)
                        );
                        
                        this.log('debug', `Parameter resolved: ${paramName} = ${paramValue}`);
                    } else {
                        this.log('warn', `Parameter '${paramName}' not found in component data, computed, or route params`);
                    }
                } catch (error) {
                    this.log('warn', `Error processing parameter '${paramName}':`, error);
                }
            });
        }
        
        return processedAction;
    }

    /**
     * 폼 데이터 서브밋
     */
    async submitFormData(action, method, data, form, component) {
        // 파일 업로드 체크
        const hasFile = Array.from(form.elements).some(el => el.type === 'file' && el.files.length > 0);
        
        const headers = {
            'Accept': 'application/json',
            // 인증 토큰 자동 추가
            ...(component.$getToken() && {
                'Authorization': `Bearer ${component.$getToken()}`
            })
        };

        let body;
        if (hasFile) {
            // 파일이 있으면 FormData 그대로 전송
            body = new FormData(form);
            // Content-Type을 설정하지 않음 (브라우저가 자동으로 multipart/form-data로 설정)
        } else {
            // JSON으로 전송
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(data);
        }

        const response = await fetch(action, {
            method: method.toUpperCase(),
            headers,
            body
        });

        if (!response.ok) {
            let error;
            try {
                error = await response.json();
            } catch (e) {
                error = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        try {
            return await response.json();
        } catch (e) {
            // 응답이 JSON이 아닌 경우 (예: 204 No Content)
            return { success: true };
        }
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
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        // 등록된 이벤트 리스너들 정리
        const forms = document.querySelectorAll('form.auto-form, form[action]');
        forms.forEach(form => {
            if (form._boundSubmitHandler) {
                form.removeEventListener('submit', form._boundSubmitHandler);
                delete form._boundSubmitHandler;
            }
        });
        
        this.log('debug', 'FormHandler destroyed');
        this.router = null;
    }
}