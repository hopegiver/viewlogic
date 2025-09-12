/**
 * Table 컴포넌트
 * 데이터 테이블 (정렬, 페이지네이션, 필터링)
 */
export default {
    name: 'Table',
    template: `
        <div class="table-wrapper">
            <!-- 검색 및 필터 -->
            <div v-if="searchable || filterable" class="table-header">
                <div v-if="searchable" class="table-search">
                    <input
                        v-model="searchTerm"
                        type="text"
                        :placeholder="searchPlaceholder"
                        class="table-search-input"
                    />
                </div>
                <div v-if="filterable && filters.length > 0" class="table-filters">
                    <select
                        v-for="filter in filters"
                        :key="filter.key"
                        v-model="activeFilters[filter.key]"
                        class="table-filter-select"
                    >
                        <option value="">{{ filter.label }}</option>
                        <option
                            v-for="option in filter.options"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- 테이블 -->
            <div class="table-container" :class="tableClasses">
                <table class="table" :class="{ 'table-loading': loading }">
                    <thead>
                        <tr>
                            <th
                                v-for="column in columns"
                                :key="column.key"
                                :class="getColumnClasses(column)"
                                @click="handleSort(column)"
                            >
                                <div class="table-header-content">
                                    <span>{{ column.label }}</span>
                                    <span
                                        v-if="column.sortable"
                                        class="table-sort-icon"
                                        :class="getSortIconClass(column.key)"
                                    >
                                        ↕
                                    </span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(row, index) in paginatedData"
                            :key="getRowKey(row, index)"
                            :class="getRowClasses(row, index)"
                            @click="handleRowClick(row, index)"
                        >
                            <td
                                v-for="column in columns"
                                :key="column.key"
                                :class="getCellClasses(column, row)"
                            >
                                <slot
                                    :name="column.key"
                                    :row="row"
                                    :value="getNestedValue(row, column.key)"
                                    :index="index"
                                >
                                    {{ formatValue(getNestedValue(row, column.key), column) }}
                                </slot>
                            </td>
                        </tr>
                        <tr v-if="paginatedData.length === 0" class="table-empty">
                            <td :colspan="columns.length" class="table-empty-cell">
                                {{ emptyText }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 로딩 상태 -->
            <div v-if="loading" class="table-loading-overlay">
                <div class="table-spinner"></div>
            </div>

            <!-- 페이지네이션 -->
            <div v-if="pagination && totalPages > 1" class="table-pagination">
                <div class="pagination-info">
                    {{ paginationInfo }}
                </div>
                <div class="pagination-controls">
                    <button
                        @click="goToPage(1)"
                        :disabled="currentPage === 1"
                        class="pagination-btn"
                    >
                        ««
                    </button>
                    <button
                        @click="goToPage(currentPage - 1)"
                        :disabled="currentPage === 1"
                        class="pagination-btn"
                    >
                        ‹
                    </button>
                    <span class="pagination-pages">
                        <button
                            v-for="page in visiblePages"
                            :key="page"
                            @click="goToPage(page)"
                            :class="['pagination-btn', { active: page === currentPage }]"
                        >
                            {{ page }}
                        </button>
                    </span>
                    <button
                        @click="goToPage(currentPage + 1)"
                        :disabled="currentPage === totalPages"
                        class="pagination-btn"
                    >
                        ›
                    </button>
                    <button
                        @click="goToPage(totalPages)"
                        :disabled="currentPage === totalPages"
                        class="pagination-btn"
                    >
                        »»
                    </button>
                </div>
            </div>
        </div>
    `,
    emits: ['sort', 'select', 'row-click', 'cell-click'],
    props: {
        data: {
            type: Array,
            default: () => []
        },
        columns: {
            type: Array,
            required: true,
            validator: (columns) => {
                return columns.every(col => col.key && col.label);
            }
        },
        loading: {
            type: Boolean,
            default: false
        },
        striped: {
            type: Boolean,
            default: false
        },
        bordered: {
            type: Boolean,
            default: false
        },
        hoverable: {
            type: Boolean,
            default: false
        },
        compact: {
            type: Boolean,
            default: false
        },
        selectable: {
            type: Boolean,
            default: false
        },
        searchable: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: '검색...'
        },
        filterable: {
            type: Boolean,
            default: false
        },
        filters: {
            type: Array,
            default: () => []
        },
        pagination: {
            type: Boolean,
            default: false
        },
        pageSize: {
            type: Number,
            default: 10
        },
        emptyText: {
            type: String,
            default: '데이터가 없습니다'
        },
        rowKey: {
            type: String,
            default: 'id'
        }
    },
    data() {
        return {
            searchTerm: '',
            sortBy: '',
            sortDirection: 'asc',
            currentPage: 1,
            activeFilters: {}
        };
    },
    computed: {
        tableClasses() {
            return {
                'table-striped': this.striped,
                'table-bordered': this.bordered,
                'table-hoverable': this.hoverable,
                'table-compact': this.compact,
                'table-selectable': this.selectable
            };
        },
        filteredData() {
            let result = [...this.data];

            // 검색 필터링
            if (this.searchable && this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                result = result.filter(row => {
                    return this.columns.some(column => {
                        const value = this.getNestedValue(row, column.key);
                        return String(value).toLowerCase().includes(term);
                    });
                });
            }

            // 필터 적용
            if (this.filterable) {
                Object.keys(this.activeFilters).forEach(key => {
                    const filterValue = this.activeFilters[key];
                    if (filterValue) {
                        result = result.filter(row => {
                            const value = this.getNestedValue(row, key);
                            return String(value) === String(filterValue);
                        });
                    }
                });
            }

            return result;
        },
        sortedData() {
            if (!this.sortBy) return this.filteredData;

            return [...this.filteredData].sort((a, b) => {
                const aVal = this.getNestedValue(a, this.sortBy);
                const bVal = this.getNestedValue(b, this.sortBy);

                let result = 0;
                if (aVal < bVal) result = -1;
                else if (aVal > bVal) result = 1;

                return this.sortDirection === 'desc' ? -result : result;
            });
        },
        paginatedData() {
            if (!this.pagination) return this.sortedData;

            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.sortedData.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.sortedData.length / this.pageSize);
        },
        visiblePages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2;

            let start = Math.max(1, current - delta);
            let end = Math.min(total, current + delta);

            const pages = [];
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            return pages;
        },
        paginationInfo() {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.sortedData.length);
            const total = this.sortedData.length;
            return `${start}-${end} / ${total}`;
        }
    },
    methods: {
        handleSort(column) {
            if (!column.sortable) return;

            if (this.sortBy === column.key) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = column.key;
                this.sortDirection = 'asc';
            }

            this.$emit('sort', { column: column.key, direction: this.sortDirection });
        },
        handleRowClick(row, index) {
            if (this.selectable) {
                this.$emit('row-click', { row, index });
            }
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this.$emit('page-change', page);
            }
        },
        getNestedValue(obj, path) {
            return path.split('.').reduce((o, p) => o && o[p], obj);
        },
        formatValue(value, column) {
            if (column.formatter && typeof column.formatter === 'function') {
                return column.formatter(value);
            }
            return value;
        },
        getRowKey(row, index) {
            return this.getNestedValue(row, this.rowKey) || index;
        },
        getColumnClasses(column) {
            return {
                'table-sortable': column.sortable,
                'table-sorted': this.sortBy === column.key,
                [`table-align-${column.align || 'left'}`]: true,
                [`table-width-${column.width}`]: column.width
            };
        },
        getRowClasses(row, index) {
            return {
                'table-row-selected': this.selectable && row.selected,
                'table-row-even': index % 2 === 0,
                'table-row-odd': index % 2 === 1
            };
        },
        getCellClasses(column, row) {
            return {
                [`table-align-${column.align || 'left'}`]: true,
                'table-cell-number': column.type === 'number',
                'table-cell-date': column.type === 'date'
            };
        },
        getSortIconClass(columnKey) {
            if (this.sortBy !== columnKey) return '';
            return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
        }
    },
    watch: {
        searchTerm() {
            this.currentPage = 1;
        },
        activeFilters: {
            handler() {
                this.currentPage = 1;
            },
            deep: true
        }
    }
}