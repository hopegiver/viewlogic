/**
 * FileUpload 컴포넌트
 * 파일 업로드
 */
export default {
    name: 'FileUpload',
    template: `
        <div class="file-upload-wrapper" :class="wrapperClasses">
            <label v-if="label" class="file-upload-label">{{ label }}</label>
            
            <!-- 드래그 앤 드롭 영역 -->
            <div
                class="file-upload-area"
                :class="areaClasses"
                @click="openFileDialog"
                @drop="handleDrop"
                @dragover="handleDragOver"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
            >
                <input
                    ref="fileInput"
                    type="file"
                    class="file-upload-input"
                    :accept="accept"
                    :multiple="multiple"
                    :disabled="disabled"
                    @change="handleFileSelect"
                    style="display: none;"
                />
                
                <div class="file-upload-content">
                    <div v-if="!files.length" class="file-upload-placeholder">
                        <div class="file-upload-icon">
                            <span v-if="dragActive">📤</span>
                            <span v-else-if="uploadProgress > 0">🔄</span>
                            <span v-else>📁</span>
                        </div>
                        <div class="file-upload-text">
                            <p class="file-upload-primary-text">
                                {{ dragActive ? '파일을 여기에 드롭하세요' : '파일을 선택하거나 드래그하세요' }}
                            </p>
                            <p class="file-upload-secondary-text">
                                {{ acceptText }}
                            </p>
                        </div>
                        <button type="button" class="file-upload-button" :disabled="disabled">
                            파일 선택
                        </button>
                    </div>
                    
                    <!-- 업로드된 파일 목록 -->
                    <div v-else class="file-upload-files">
                        <div
                            v-for="(file, index) in files"
                            :key="file.id || index"
                            class="file-upload-file"
                            :class="getFileClasses(file)"
                        >
                            <div class="file-upload-file-info">
                                <div class="file-upload-file-icon">
                                    {{ getFileIcon(file) }}
                                </div>
                                <div class="file-upload-file-details">
                                    <div class="file-upload-file-name" :title="file.name">
                                        {{ file.name }}
                                    </div>
                                    <div class="file-upload-file-size">
                                        {{ formatFileSize(file.size) }}
                                    </div>
                                    <div v-if="file.progress !== undefined" class="file-upload-file-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
                                        </div>
                                        <span class="progress-text">{{ file.progress }}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="file-upload-file-actions">
                                <button
                                    v-if="file.status === 'error'"
                                    class="file-upload-retry"
                                    @click.stop="retryUpload(file, index)"
                                    title="다시 시도"
                                >
                                    🔄
                                </button>
                                <button
                                    class="file-upload-remove"
                                    @click.stop="removeFile(index)"
                                    title="제거"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        
                        <button
                            v-if="multiple"
                            type="button"
                            class="file-upload-add-more"
                            @click="openFileDialog"
                            :disabled="disabled"
                        >
                            + 파일 추가
                        </button>
                    </div>
                </div>
            </div>
            
            <div v-if="helpText || errorMessage" class="file-upload-help">
                <p v-if="errorMessage" class="file-upload-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="file-upload-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change', 'upload', 'error', 'progress'],
    props: {
        modelValue: {
            type: [File, Array],
            default: null
        },
        label: {
            type: String,
            default: ''
        },
        accept: {
            type: String,
            default: ''
        },
        multiple: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        maxSize: {
            type: Number,
            default: null // bytes
        },
        maxFiles: {
            type: Number,
            default: null
        },
        autoUpload: {
            type: Boolean,
            default: false
        },
        uploadUrl: {
            type: String,
            default: ''
        },
        uploadHeaders: {
            type: Object,
            default: () => ({})
        },
        uploadData: {
            type: Object,
            default: () => ({})
        },
        preview: {
            type: Boolean,
            default: true
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        helpText: {
            type: String,
            default: ''
        },
        errorMessage: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            files: [],
            dragActive: false,
            uploadProgress: 0,
            nextFileId: 1
        };
    },
    computed: {
        wrapperClasses() {
            return [
                'file-upload-wrapper',
                `file-upload-size-${this.size}`,
                {
                    'file-upload-disabled': this.disabled,
                    'file-upload-error': this.errorMessage,
                    'file-upload-multiple': this.multiple
                }
            ];
        },
        areaClasses() {
            return [
                'file-upload-area',
                {
                    'file-upload-area-drag-active': this.dragActive,
                    'file-upload-area-disabled': this.disabled,
                    'file-upload-area-has-files': this.files.length > 0
                }
            ];
        },
        acceptText() {
            if (!this.accept) return '모든 파일';
            
            const types = this.accept.split(',').map(type => type.trim());
            const extensions = types.filter(type => type.startsWith('.'));
            const mimeTypes = types.filter(type => !type.startsWith('.'));
            
            let text = '';
            if (extensions.length > 0) {
                text += extensions.join(', ');
            }
            if (mimeTypes.length > 0) {
                if (text) text += ', ';
                text += mimeTypes.map(type => {
                    if (type.startsWith('image/')) return '이미지';
                    if (type.startsWith('video/')) return '비디오';
                    if (type.startsWith('audio/')) return '오디오';
                    return type;
                }).join(', ');
            }
            
            return text || '모든 파일';
        }
    },
    methods: {
        openFileDialog() {
            if (this.disabled) return;
            this.$refs.fileInput.click();
        },
        handleFileSelect(event) {
            const files = Array.from(event.target.files);
            this.addFiles(files);
            // 입력 초기화
            event.target.value = '';
        },
        handleDrop(event) {
            event.preventDefault();
            this.dragActive = false;
            
            if (this.disabled) return;
            
            const files = Array.from(event.dataTransfer.files);
            this.addFiles(files);
        },
        handleDragOver(event) {
            event.preventDefault();
        },
        handleDragEnter(event) {
            event.preventDefault();
            this.dragActive = true;
        },
        handleDragLeave(event) {
            event.preventDefault();
            if (!this.$el.contains(event.relatedTarget)) {
                this.dragActive = false;
            }
        },
        addFiles(newFiles) {
            const validFiles = newFiles.filter(file => this.validateFile(file));
            
            if (this.multiple) {
                if (this.maxFiles && this.files.length + validFiles.length > this.maxFiles) {
                    const remaining = this.maxFiles - this.files.length;
                    validFiles.splice(remaining);
                }
                
                const filesWithId = validFiles.map(file => ({
                    ...file,
                    id: this.nextFileId++,
                    status: 'pending'
                }));
                
                this.files.push(...filesWithId);
            } else {
                if (validFiles.length > 0) {
                    this.files = [{
                        ...validFiles[0],
                        id: this.nextFileId++,
                        status: 'pending'
                    }];
                }
            }
            
            this.updateModelValue();
            
            if (this.autoUpload) {
                this.uploadFiles();
            }
        },
        removeFile(index) {
            this.files.splice(index, 1);
            this.updateModelValue();
        },
        validateFile(file) {
            // 크기 검증
            if (this.maxSize && file.size > this.maxSize) {
                this.$emit('error', {
                    type: 'size',
                    file,
                    message: `파일 크기가 너무 큽니다. 최대 ${this.formatFileSize(this.maxSize)}`
                });
                return false;
            }
            
            // 파일 형식 검증
            if (this.accept && !this.isAcceptedFileType(file)) {
                this.$emit('error', {
                    type: 'type',
                    file,
                    message: '지원되지 않는 파일 형식입니다.'
                });
                return false;
            }
            
            return true;
        },
        isAcceptedFileType(file) {
            const acceptTypes = this.accept.split(',').map(type => type.trim());
            
            return acceptTypes.some(type => {
                if (type.startsWith('.')) {
                    return file.name.toLowerCase().endsWith(type.toLowerCase());
                } else {
                    return file.type === type || file.type.startsWith(type.replace('*', ''));
                }
            });
        },
        updateModelValue() {
            const fileList = this.files.map(f => f.file || f);
            
            if (this.multiple) {
                this.$emit('update:modelValue', fileList);
            } else {
                this.$emit('update:modelValue', fileList[0] || null);
            }
            
            this.$emit('change', fileList);
        },
        uploadFiles() {
            if (!this.uploadUrl) return;
            
            this.files.forEach((file, index) => {
                if (file.status === 'pending') {
                    this.uploadFile(file, index);
                }
            });
        },
        async uploadFile(file, index) {
            const formData = new FormData();
            formData.append('file', file);
            
            // 추가 데이터 추가
            Object.keys(this.uploadData).forEach(key => {
                formData.append(key, this.uploadData[key]);
            });
            
            try {
                file.status = 'uploading';
                file.progress = 0;
                
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        file.progress = Math.round((event.loaded / event.total) * 100);
                    }
                });
                
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        file.status = 'success';
                        file.progress = 100;
                        this.$emit('upload-success', { file, response: xhr.response });
                    } else {
                        file.status = 'error';
                        this.$emit('upload-error', { file, error: xhr.statusText });
                    }
                };
                
                xhr.onerror = () => {
                    file.status = 'error';
                    this.$emit('upload-error', { file, error: '업로드 실패' });
                };
                
                // 헤더 설정
                Object.keys(this.uploadHeaders).forEach(key => {
                    xhr.setRequestHeader(key, this.uploadHeaders[key]);
                });
                
                xhr.open('POST', this.uploadUrl);
                xhr.send(formData);
                
            } catch (error) {
                file.status = 'error';
                this.$emit('upload-error', { file, error });
            }
        },
        retryUpload(file, index) {
            file.status = 'pending';
            delete file.progress;
            this.uploadFile(file, index);
        },
        getFileClasses(file) {
            return {
                'file-upload-file-pending': file.status === 'pending',
                'file-upload-file-uploading': file.status === 'uploading',
                'file-upload-file-success': file.status === 'success',
                'file-upload-file-error': file.status === 'error'
            };
        },
        getFileIcon(file) {
            const type = file.type || '';
            
            if (type.startsWith('image/')) return '🖼️';
            if (type.startsWith('video/')) return '🎥';
            if (type.startsWith('audio/')) return '🎧';
            if (type.includes('pdf')) return '📄';
            if (type.includes('word')) return '📄';
            if (type.includes('excel') || type.includes('spreadsheet')) return '📈';
            if (type.includes('powerpoint') || type.includes('presentation')) return '📉';
            if (type.includes('zip') || type.includes('rar')) return '🗜️';
            
            return '📁';
        },
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
    },
    watch: {
        modelValue(newValue) {
            if (!newValue) {
                this.files = [];
            }
        }
    }
}