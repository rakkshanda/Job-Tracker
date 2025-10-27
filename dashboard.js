// Supabase Job Tracker Dashboard JavaScript
class SupabaseJobTracker {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentFilters = {
            search: '',
            status: ['saved', 'applied'], // Default: show only saved and applied
            company: 'all',
            location: 'all',
            source: 'all',
            dateRange: 'all'
        };
        this.editingJobId = null;
        this.currentCommentJobId = null;
        this.statusOptions = ['saved', 'applied', 'resume_screening', 'interview', 'offer', 'rejected', 'withdrawn', 'ended'];
        this.sourceOptions = ['LinkedIn', 'Handshake', 'Indeed', 'URL'];
        this.isRefreshing = false;
        
        // Pagination
        this.currentPage = 1;
        this.itemsPerPage = 50;
        
        // Initialize Supabase
        const SUPABASE_URL = 'https://dmzonyrwdqzugsshcxgb.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtem9ueXJ3ZHF6dWdzc2hjeGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzgzNTgsImV4cCI6MjA3Njc1NDM1OH0.0MYp26X7h1JR_r4KO-p_f3aX-dsiaO6Z9ZS8rjU9e7g';
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase client initialized:', this.supabase);
        
        this.init();
    }

    sanitize(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    sanitizeUrl(url) {
        if (!url) return '';
        const trimmed = String(url).trim();
        if (!trimmed) return '';
        try {
            return new URL(trimmed).toString();
        } catch (error) {
            try {
                return new URL(`https://${trimmed}`).toString();
            } catch {
                return '';
            }
        }
    }

    getHostname(url) {
        try {
            const { hostname } = new URL(url);
            return hostname.replace(/^www\./, '');
        } catch {
            return 'View job';
        }
    }

    formatDate(dateString) {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) {
                return this.sanitize(dateString);
            }
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return this.sanitize(dateString);
        }
    }

    formatStatus(status) {
        if (!status) return 'Saved';
        const normalized = String(status);
        // Handle resume_screening separately
        if (normalized === 'resume_screening') return 'Resume Screening';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    async init() {
        console.log('Initializing Supabase JobTracker...');
        this.setupEventListeners();
        await this.loadJobs();
        this.applyFilters(); // Apply default filters (saved & applied)
        this.renderJobs();
        this.updateStats();
        this.populateFilterOptions();
        console.log('Supabase JobTracker initialized successfully');
        console.log('✅ Default filter applied: showing only Saved & Applied jobs');
    }

    // Data Management
    async loadJobs({ silent = false } = {}) {
        try {
            if (!silent) {
                console.log('🔄 Loading jobs from Supabase...');
                console.log('Supabase client:', this.supabase);
            }
            
            const { data, error } = await this.supabase
                .from('jobs')
                .select('*')
                .order('applied_date', { ascending: false })
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
            console.log('📦 Raw data from Supabase:', data);
            
            this.jobs = data || [];
        this.filteredJobs = [...this.jobs];
            
            console.log('✅ Loaded', this.jobs.length, 'jobs from Supabase');
            console.log('First job:', this.jobs[0]);
            
        } catch (error) {
            console.error('❌ Error loading jobs from Supabase:', error);
            alert('Error loading jobs from Supabase: ' + error.message);
            this.jobs = [];
            this.filteredJobs = [];
        }
    }

    async saveJobs() {
        try {
            // Save to Chrome storage (backup)
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ savedJobs: this.jobs });
                console.log('Saved jobs to Chrome storage');
            }
            
            // Save to localStorage as backup
            localStorage.setItem('jobTrackerJobs', JSON.stringify(this.jobs));
            console.log('Saved jobs to localStorage:', this.jobs.length);
        } catch (error) {
            console.error('Error saving jobs:', error);
        }
    }

    // Update clear filters button visibility
    updateClearFiltersButton() {
        const clearBtn = document.getElementById('clear-filters-btn');
        if (!clearBtn) return;
        
        // Check if any filter is different from default
        const isDefaultStatus = Array.isArray(this.currentFilters.status) && 
            this.currentFilters.status.length === 2 &&
            this.currentFilters.status.includes('saved') &&
            this.currentFilters.status.includes('applied');
        
        const hasActiveFilters = 
            this.currentFilters.search !== '' ||
            !isDefaultStatus ||
            this.currentFilters.company !== 'all' ||
            this.currentFilters.location !== 'all' ||
            this.currentFilters.source !== 'all' ||
            this.currentFilters.dateRange !== 'all';
        
        // Show/hide button based on filter state
        clearBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }

    // Event Listeners
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
                this.updateClearFiltersButton();
            });
        }

        // Filter buttons and dropdowns
        document.addEventListener('click', (e) => {
            // Close all dropdowns when clicking filter button
            if (e.target.classList.contains('filter-btn') || e.target.closest('.filter-btn')) {
                const btn = e.target.classList.contains('filter-btn') ? e.target : e.target.closest('.filter-btn');
                const dropdown = btn?.nextElementSibling;
                
                // Close all other dropdowns first
                document.querySelectorAll('.filter-dropdown.show').forEach(dd => {
                    if (dd !== dropdown) {
                        dd.classList.remove('show');
                    }
                });
                
                // Toggle current dropdown
                dropdown?.classList.toggle('show');
                e.stopPropagation();
                return;
            }
            
            // Handle filter option selection
            if (e.target.classList.contains('filter-option')) {
                const filterBtn = e.target.parentElement.previousElementSibling;
                const filterType = filterBtn.dataset.filter;
                const value = e.target.dataset.value;
                const text = e.target.textContent;
                
                // Update the filter button display
                const filterValueSpan = filterBtn.querySelector('.filter-value');
                if (filterValueSpan) {
                    filterValueSpan.textContent = text;
                }
                
                // Map 'date' filter to 'dateRange' in currentFilters
                const filterKey = filterType === 'date' ? 'dateRange' : filterType;
                this.currentFilters[filterKey] = value;
                
                this.applyFilters();
                this.updateClearFiltersButton();
                
                // Close the dropdown
                e.target.parentElement.classList.remove('show');
                e.stopPropagation();
                return;
            }
            
            // Close all dropdowns when clicking outside
            if (!e.target.closest('.filter-group')) {
                document.querySelectorAll('.filter-dropdown.show').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });

        // Multi-select functionality
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                this.selectAllJobs(selectAllCheckbox.checked);
            });
        }

    }

    // Filtering
    applyFilters() {
        // Reset to page 1 when filters change
        this.currentPage = 1;
        
        this.filteredJobs = this.jobs.filter(job => {
            // Search filter
            const matchesSearch = !this.currentFilters.search || 
                (job.title || '').toLowerCase().includes(this.currentFilters.search) ||
                (job.company || '').toLowerCase().includes(this.currentFilters.search) ||
                (job.location || '').toLowerCase().includes(this.currentFilters.search);

            // Status filter
            const matchesStatus = this.currentFilters.status === 'all' || 
                (Array.isArray(this.currentFilters.status) 
                    ? this.currentFilters.status.includes(job.status || 'saved')
                    : (job.status || 'saved') === this.currentFilters.status);

            // Company filter
            const matchesCompany = this.currentFilters.company === 'all' || 
                (job.company || '') === this.currentFilters.company;

            // Location filter
            const matchesLocation = this.currentFilters.location === 'all' || 
                (job.location || '') === this.currentFilters.location;

            // Source filter
            const matchesSource = this.currentFilters.source === 'all' || 
                (job.source || '') === this.currentFilters.source;

            // Date range filter
            let matchesDateRange = true;
            if (this.currentFilters.dateRange !== 'all') {
                if (!job.applied_date) {
                    // Jobs without applied_date don't match specific date filters
                    matchesDateRange = false;
                } else {
                    const jobDate = new Date(job.applied_date);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0); // Reset to start of day
                    jobDate.setHours(0, 0, 0, 0); // Reset to start of day
                    const daysDiff = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));
                    
                    switch (this.currentFilters.dateRange) {
                        case 'today':
                            matchesDateRange = daysDiff === 0;
                            break;
                        case 'week':
                            matchesDateRange = daysDiff <= 7;
                            break;
                        case 'month':
                            matchesDateRange = daysDiff <= 30;
                            break;
                        case '3months':
                            matchesDateRange = daysDiff <= 90;
                            break;
                        default:
                            matchesDateRange = true;
                    }
                }
            }

            return matchesSearch && matchesStatus && matchesCompany && 
                   matchesLocation && matchesSource && matchesDateRange;
        });

        this.renderJobs();
        this.updateStats();
    }

    // Job Management
    async addJob(jobData) {
        try {
            const normalizedStatus = ((jobData.status || 'saved') + '').toLowerCase();
            const newJobData = {
                title: jobData.title || '',
                company: jobData.company || '',
                location: jobData.location || '',
                job_id: jobData.jobId || '',
                status: normalizedStatus,
                applied_date: jobData.appliedDate || new Date().toISOString().split('T')[0],
                url: jobData.url || '',
                description: jobData.description || '',
                notes: jobData.notes || '',
                comments: jobData.comments || '',
                source: jobData.source || 'Manual Entry'
            };

            console.log('Adding job to Supabase:', newJobData);

            const { data, error } = await this.supabase
                .from('jobs')
                .insert([newJobData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            this.jobs.unshift(data);
            await this.saveJobs();
            this.applyFilters();
            this.populateFilterOptions();
            console.log('✅ Job added successfully:', data);
            return data;
        } catch (error) {
            console.error('Error adding job:', error);
            alert('Could not add job. Please try again.');
            return null;
        }
    }

    async updateJobStatus(id, newStatus) {
        try {
            console.log(`=== UPDATING JOB STATUS ===`);
            console.log('Job ID:', id);
            console.log('New status:', newStatus);

            const { data, error } = await this.supabase
                .from('jobs')
                .update({ status: newStatus })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local data
            const jobIndex = this.jobs.findIndex(j => j.id === id);
            if (jobIndex !== -1) {
                this.jobs[jobIndex] = data;
            }

            await this.saveJobs();
            this.applyFilters();
            this.populateFilterOptions();
            
            console.log('✅ Status updated successfully in Supabase');
            return true;
        } catch (error) {
            console.error('Error updating job status:', error);
            alert('Could not update status. Please try again.');
            return false;
        }
    }

    async updateJobSource(id, newSource) {
        try {
            console.log(`=== UPDATING JOB SOURCE ===`);
            console.log('Job ID:', id);
            console.log('New source:', newSource);

            const { data, error } = await this.supabase
                .from('jobs')
                .update({ source: newSource })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Update local data
            const jobIndex = this.jobs.findIndex(j => j.id === id);
            if (jobIndex !== -1) {
                this.jobs[jobIndex] = data;
            }

            await this.saveJobs();
            this.applyFilters();
            this.populateFilterOptions();
            
            console.log('✅ Source updated successfully in Supabase');
            return true;
        } catch (error) {
            console.error('Error updating job source:', error);
            alert('Could not update source. Please try again.');
            return false;
        }
    }

    async deleteJob(id) {
        try {
            const job = this.jobs.find(j => j.id === id);
            if (!job) {
                console.error('Job not found with id:', id);
                return;
            }

            console.log('=== DELETING JOB ===');
            console.log('Job to delete:', job.title);
            console.log('Job ID:', job.id);

            if (!confirm('Are you sure you want to delete this job?')) {
                return;
            }

            const { error } = await this.supabase
                .from('jobs')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            // Remove from local data
            this.jobs = this.jobs.filter(j => j.id !== id);
            await this.saveJobs();
            this.applyFilters();
            this.populateFilterOptions();
            
            console.log('✅ Job deleted successfully from Supabase');
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Could not delete job. Please try again.');
        }
    }

    // Rendering (same as before)
    renderJobs() {
        const jobsContainer = document.getElementById('jobs-container');
        if (!jobsContainer) return;

        if (this.filteredJobs.length === 0) {
            jobsContainer.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>No jobs found</h3>
                            <p>Try adjusting your filters or add a new job application.</p>
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredJobs.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedJobs = this.filteredJobs.slice(startIndex, endIndex);

        const rows = paginatedJobs.map(job => {
            const title = this.sanitize(job.title || 'Untitled role');
            const company = this.sanitize(job.company || '—');
            const location = this.sanitize(job.location || '—');
            const status = job.status ? job.status.toLowerCase() : 'saved';
            const source = job.source || '';
            const appliedDate = this.formatDate(job.applied_date);
            const safeComments = this.sanitize(job.comments || '');
            const url = this.sanitizeUrl(job.url);
            const jobIdMarkup = job.job_id ? `<div class="job-meta">ID: ${this.sanitize(job.job_id)}</div>` : '';
            const commentTitle = job.comments ? safeComments.replace(/\r?\n/g, '&#10;') : 'Add comment';
            const linkMarkup = url
                ? `<a href="${url}" class="job-link" target="_blank" rel="noopener noreferrer" title="${this.sanitize(url)}"><i class="fas fa-external-link-alt"></i> View here</a>`
                : '<span class="job-link muted">No link</span>';
            
            const statusOptions = this.statusOptions.map(option => {
                const optionValue = option.toLowerCase();
                const isSelected = optionValue === status;
                return `<option value="${optionValue}"${isSelected ? ' selected' : ''}>${this.sanitize(this.formatStatus(optionValue))}</option>`;
            }).join('');
            
            const sourceOptions = this.sourceOptions.map(option => {
                const isSelected = option === source;
                return `<option value="${option}"${isSelected ? ' selected' : ''}>${this.sanitize(option)}</option>`;
            }).join('');

            return `
                <tr data-id="${job.id}">
                    <td class="select-cell">
                        <input type="checkbox" class="job-checkbox" data-id="${job.id}">
                    </td>
                    <td>${appliedDate}</td>
                    <td>${company}</td>
                    <td class="title-cell">
                        <div class="job-title">${title}</div>
                        ${jobIdMarkup}
                    </td>
                    <td>${location}</td>
                    <td class="status-cell">
                        <select class="status-dropdown" data-id="${job.id}">
                            ${statusOptions}
                        </select>
                    </td>
                    <td class="source-cell">
                        <select class="source-dropdown" data-id="${job.id}">
                            <option value="">Select Source</option>
                            ${sourceOptions}
                        </select>
                    </td>
                    <td class="url-cell">${linkMarkup}</td>
                    <td class="actions-cell">
                        <div class="actions-cell-content">
                        <i class="fas fa-edit action-icon edit" data-id="${job.id}" title="Edit job"></i>
                        <i class="fas fa-trash action-icon delete" data-id="${job.id}" title="Delete job"></i>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        jobsContainer.innerHTML = rows;
        this.addJobCardEventListeners();
        this.renderPagination();
    }

    addJobCardEventListeners() {
        // Checkbox change
        document.querySelectorAll('.job-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionUI();
            });
        });

        // Status change
        document.querySelectorAll('.status-dropdown').forEach(dropdown => {
            dropdown.addEventListener('change', async (e) => {
                const target = e.currentTarget;
                if (!target) return;
                const id = target.dataset.id;
                if (!id) return;
                
                const job = this.jobs.find(j => j.id === id);
                const previousStatus = job ? job.status : 'saved';
                const newStatus = target.value;
                
                // Close the dropdown immediately
                target.blur();
                
                const success = await this.updateJobStatus(id, newStatus);
                if (!success && job) {
                    target.value = previousStatus;
                }
            });
        });

        // Source change
        document.querySelectorAll('.source-dropdown').forEach(dropdown => {
            dropdown.addEventListener('change', async (e) => {
                const target = e.currentTarget;
                if (!target) return;
                const id = target.dataset.id;
                if (!id) return;
                
                const job = this.jobs.find(j => j.id === id);
                const previousSource = job ? job.source : '';
                const newSource = target.value;
                
                // Close the dropdown immediately
                target.blur();
                
                const success = await this.updateJobSource(id, newSource);
                if (!success && job) {
                    target.value = previousSource;
                }
            });
        });

        // Comment modal
        document.querySelectorAll('.comment-text').forEach(comment => {
            comment.addEventListener('click', (e) => {
                const target = e.currentTarget;
                if (!target) return;
                const id = target.dataset.id;
                if (id) {
                    this.openCommentModal(id);
                }
            });
        });

        // Edit job
        document.querySelectorAll('.edit').forEach(editBtn => {
            editBtn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                if (!target) return;
                const id = target.dataset.id;
                if (id) {
                    this.editJob(id);
                }
            });
        });

        // Delete job
        document.querySelectorAll('.delete').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                if (!target) return;
                const id = target.dataset.id;
                if (id) {
                    await this.deleteJob(id);
                }
            });
        });
    }

    // Multi-select functionality
    getSelectedJobIds() {
        const checkboxes = document.querySelectorAll('.job-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.id);
    }

    selectAllJobs(select) {
        const checkboxes = document.querySelectorAll('.job-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
        });
        
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = select;
        }
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedIds = this.getSelectedJobIds();
        
        // Update select-all checkbox state
        const checkboxes = document.querySelectorAll('.job-checkbox');
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox && checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const someChecked = Array.from(checkboxes).some(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        }
        
        // Show/hide delete selected button
        const deleteSelectedBtn = document.getElementById('delete-selected-btn');
        const selectedCountSpan = document.getElementById('selected-count');
        if (deleteSelectedBtn && selectedCountSpan) {
            if (selectedIds.length > 0) {
                deleteSelectedBtn.style.display = 'flex';
                selectedCountSpan.textContent = selectedIds.length;
            } else {
                deleteSelectedBtn.style.display = 'none';
            }
        }
        
        console.log(`${selectedIds.length} job(s) selected`);
    }

    // Pagination
    renderPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredJobs.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        // Calculate range
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredJobs.length);
        
        let paginationHTML = `
            <div class="pagination-info">
                Showing ${startIndex}-${endIndex} of ${this.filteredJobs.length} entries
            </div>
            <div class="pagination-buttons">
        `;

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page + ellipsis
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Last page + ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += `</div>`;
        
        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners
        paginationContainer.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page === 'prev') {
                    this.goToPage(this.currentPage - 1);
                } else if (page === 'next') {
                    this.goToPage(this.currentPage + 1);
                } else {
                    this.goToPage(parseInt(page));
                }
            });
        });
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredJobs.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderJobs();
        
        // Scroll to top of table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async exportSelectedJobs() {
        const selectedIds = this.getSelectedJobIds();
        if (selectedIds.length === 0) {
            alert('Please select jobs to export');
            return;
        }
        
        const selectedJobs = this.jobs.filter(job => selectedIds.includes(job.id));
        this.exportToCSV(selectedJobs, `selected-jobs-${new Date().toISOString().split('T')[0]}.csv`);
    }

    async deleteSelectedJobs() {
        const selectedIds = this.getSelectedJobIds();
        if (selectedIds.length === 0) {
            alert('Please select jobs to delete');
            return;
        }
        
        const confirmMsg = `Are you sure you want to delete ${selectedIds.length} job(s)? This cannot be undone.`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of selectedIds) {
            try {
                const { error } = await this.supabase
                    .from('jobs')
                    .delete()
                    .eq('id', id);
                
                if (error) {
                    console.error('Error deleting job:', id, error);
                    errorCount++;
                } else {
                    successCount++;
                }
        } catch (error) {
                console.error('Error deleting job:', id, error);
                errorCount++;
            }
        }
        
        // Reload jobs
        await this.loadJobs();
        this.renderJobs();
        this.updateStats();
        this.populateFilterOptions();
        
        if (errorCount > 0) {
            alert(`Deleted ${successCount} job(s). ${errorCount} failed.`);
        } else {
            alert(`Successfully deleted ${successCount} job(s)`);
        }
    }

    editJob(id) {
        const job = this.jobs.find(j => j.id === id);
        if (!job) return;
        this.openAddJobModal(job);
    }

    openCommentModal(id) {
        const job = this.jobs.find(j => j.id === id);
        if (!job) return;

        this.currentCommentJobId = id;
        document.getElementById('comment-text').value = job.comments || '';
        document.getElementById('comment-modal').style.display = 'flex';
    }

    openAddJobModal(jobData = null) {
        this.editingJobId = jobData ? jobData.id : null;
        
        if (jobData) {
            // Pre-fill form with job data
            document.getElementById('job-title').value = jobData.title || '';
            document.getElementById('job-company').value = jobData.company || '';
            document.getElementById('job-location').value = jobData.location || '';
            document.getElementById('job-url').value = jobData.url || '';
            document.getElementById('job-description').value = jobData.description || '';
            document.getElementById('job-notes').value = jobData.notes || '';
            document.getElementById('job-status').value = jobData.status || 'applied';
        } else {
            // Clear form
            document.getElementById('add-job-form').reset();
        }
        
        document.getElementById('add-job-modal').style.display = 'flex';
    }

    // Statistics
    updateStats() {
        // Stats should show ALL jobs, not filtered jobs
        const totalApplications = this.jobs.length;
        const companies = new Set(this.jobs.map(job => job.company).filter(Boolean)).size;
        const locations = new Set(this.jobs.map(job => job.location).filter(Boolean)).size;
        
        // Calculate streak
        const streak = this.calculateStreak();
        
        document.getElementById('total-applications').textContent = totalApplications;
        document.getElementById('total-companies').textContent = companies;
        document.getElementById('total-locations').textContent = locations;
        document.getElementById('current-streak').textContent = streak;
    }
    
    calculateStreak() {
        const sortedJobs = [...this.jobs]
            .filter(job => job.applied_date)
            .sort((a, b) => new Date(b.applied_date) - new Date(a.applied_date));
        
        if (sortedJobs.length === 0) return 0;
        
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        for (const job of sortedJobs) {
            const jobDate = new Date(job.applied_date);
            jobDate.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((currentDate - jobDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === streak || (streak === 0 && daysDiff === 0)) {
                streak = daysDiff + 1;
                currentDate = jobDate;
            } else if (daysDiff === streak + 1) {
                streak++;
                currentDate = jobDate;
            } else {
                break;
            }
        }
        
        return streak;
    }

    // Filter Options
    populateFilterOptions() {
        const companies = [...new Set(this.jobs.map(job => job.company))].filter(Boolean);
        const locations = [...new Set(this.jobs.map(job => job.location))].filter(Boolean);
        const sources = [...new Set(this.jobs.map(job => job.source))].filter(Boolean);

        // Update company filter
        const companyFilter = document.querySelector('[data-filter="company"] + .filter-dropdown');
        if (companyFilter) {
            companyFilter.innerHTML = `
                <div class="filter-option" data-value="all">All Companies</div>
                ${companies.map(company => 
                    `<div class="filter-option" data-value="${company}">${company}</div>`
                ).join('')}
            `;
        }

        // Update location filter
        const locationFilter = document.querySelector('[data-filter="location"] + .filter-dropdown');
        if (locationFilter) {
            locationFilter.innerHTML = `
                <div class="filter-option" data-value="all">All Locations</div>
                ${locations.map(location => 
                    `<div class="filter-option" data-value="${location}">${location}</div>`
                ).join('')}
            `;
        }

        // Update source filter
        const sourceFilter = document.querySelector('[data-filter="source"] + .filter-dropdown');
        if (sourceFilter) {
            sourceFilter.innerHTML = `
                <div class="filter-option" data-value="all">All Sources</div>
                ${sources.map(source => 
                    `<div class="filter-option" data-value="${source}">${source}</div>`
                ).join('')}
            `;
        }
    }
}

// Global functions
let jobTracker;

function showTracker() {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tracker-tab').classList.add('active');
}

function openStreakSettings() {
    alert('Streak settings coming soon!');
}

function importCSV() {
    document.getElementById('import-modal').style.display = 'flex';
    
    // Setup file upload handlers
    const fileInput = document.getElementById('csv-file');
    const uploadArea = document.getElementById('file-upload-area');
    const importBtn = document.getElementById('import-btn');
    
    // Click to upload
    uploadArea.onclick = () => fileInput.click();
    
    // File selected
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadArea.querySelector('p').textContent = `Selected: ${file.name}`;
            importBtn.disabled = false;
        }
    };
    
    // Import button
    importBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a CSV file');
            return;
        }
        
        try {
            const text = await file.text();
            const parseResult = parseCSV(text);
            const jobs = parseResult.jobs;
            const skippedRows = parseResult.skipped;
            
            console.log(`📊 CSV Parse Results:`);
            console.log(`- Total rows in CSV: ${text.split('\n').length - 1}`);
            console.log(`- Valid jobs found: ${jobs.length}`);
            console.log(`- Skipped rows: ${skippedRows.length}`);
            
            if (jobs.length === 0) {
                let message = 'No valid jobs found in CSV.\n\n';
                if (skippedRows.length > 0) {
                    message += `${skippedRows.length} rows were skipped (completely empty):\n`;
                    skippedRows.forEach(row => {
                        message += `Row ${row}\n`;
                    });
                }
                alert(message);
                return;
            }
            
            // Import to Supabase
            importBtn.textContent = 'Importing...';
            importBtn.disabled = true;
            
            let successCount = 0;
            let errorCount = 0;
            const successfulJobs = [];
            const failedJobs = [];
            
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const rowNumber = job._originalRow || (i + 2); // Use tracked row number or fallback
                
                try {
                    const { error } = await jobTracker.supabase
                        .from('jobs')
                        .insert({
                            title: job.title || '',
                            company: job.company || '',
                            location: job.location || '',
                            url: job.url || '',
                            status: job.status || 'saved',
                            applied_date: job.applied_date || new Date().toISOString().split('T')[0],
                            description: job.description || '',
                            notes: job.notes || '',
                            job_id: '',
                            source: job.source || ''
                        });
                    
                    if (error) {
                        console.error('Error importing job:', error);
                        errorCount++;
                        failedJobs.push({
                            row: rowNumber,
                            title: job.title || 'N/A',
                            company: job.company || 'N/A',
                            reason: error.message || 'Database error'
                        });
                    } else {
                        successCount++;
                        successfulJobs.push({
                            row: rowNumber,
                            title: job.title || 'N/A',
                            company: job.company || 'N/A'
                        });
                    }
                } catch (err) {
                    console.error('Exception importing job:', err);
                    errorCount++;
                    failedJobs.push({
                        row: rowNumber,
                        title: job.title || 'N/A',
                        company: job.company || 'N/A',
                        reason: err.message || 'Unknown error'
                    });
                }
            }
            
            // Refresh the dashboard
            await jobTracker.loadJobs();
            jobTracker.applyFilters();
            jobTracker.renderJobs();
            jobTracker.updateStats();
            jobTracker.populateFilterOptions();
            
            // Close modal and show detailed result
            document.getElementById('import-modal').style.display = 'none';
            
            // Reset UI safely
            try {
                if (fileInput) fileInput.value = '';
                const uploadText = uploadArea?.querySelector('p');
                if (uploadText) uploadText.textContent = 'Click to upload CSV file';
                if (importBtn) {
                    importBtn.textContent = 'Import Jobs';
                    importBtn.disabled = true;
                }
            } catch (resetError) {
                console.error('Error resetting UI:', resetError);
            }
            
            // Show results last (after UI is reset)
            showImportResults(successfulJobs, failedJobs, skippedRows);
            
        } catch (error) {
            console.error('Error during import:', error);
            console.error('Error stack:', error.stack);
            
            // Show error with more context
            alert(`Error during CSV import:\n\n${error.message}\n\nCheck console for details.`);
            
            // Try to reset button
            try {
                if (importBtn) {
                    importBtn.textContent = 'Import Jobs';
                    importBtn.disabled = false;
                }
            } catch (resetError) {
                console.error('Error resetting button:', resetError);
            }
        }
    };
}

function showImportResults(successfulJobs, failedJobs, skippedRows = []) {
    const totalProcessed = successfulJobs.length + failedJobs.length;
    let message = `📊 IMPORT RESULTS\n`;
    message += `═══════════════════════════════\n\n`;
    message += `Total Rows in CSV: ${totalProcessed + skippedRows.length}\n`;
    message += `✅ Successfully Imported: ${successfulJobs.length}\n`;
    message += `❌ Failed: ${failedJobs.length}\n`;
    message += `⏭️  Skipped (empty): ${skippedRows.length}\n\n`;
    
    if (successfulJobs.length > 0) {
        message += `✅ SUCCESSFUL IMPORTS:\n`;
        message += `───────────────────────────────\n`;
        // Show first 10, then summary
        const showCount = Math.min(10, successfulJobs.length);
        successfulJobs.slice(0, showCount).forEach(job => {
            const title = job.title.length > 40 ? job.title.substring(0, 37) + '...' : job.title;
            const company = job.company || '(no company)';
            message += `Row ${job.row}: ${title} @ ${company}\n`;
        });
        if (successfulJobs.length > 10) {
            message += `... and ${successfulJobs.length - 10} more\n`;
        }
        message += `\n`;
    }
    
    if (failedJobs.length > 0) {
        message += `❌ FAILED IMPORTS:\n`;
        message += `───────────────────────────────\n`;
        failedJobs.forEach(job => {
            message += `Row ${job.row}: ${job.title} @ ${job.company}\n`;
            message += `   ⚠️ Reason: ${job.reason}\n\n`;
        });
    }
    
    if (skippedRows.length > 0 && skippedRows.length <= 20) {
        message += `⏭️  SKIPPED ROWS (empty):\n`;
        message += `───────────────────────────────\n`;
        message += `Rows: ${skippedRows.join(', ')}\n\n`;
    } else if (skippedRows.length > 20) {
        message += `⏭️  SKIPPED ROWS: ${skippedRows.length} empty rows\n\n`;
    }
    
    if (failedJobs.length === 0 && successfulJobs.length > 0) {
        message += `🎉 All valid jobs imported successfully!`;
    }
    
    // Show in console for easy copying
    console.log('\n' + message);
    console.log('\n📋 Full successful imports list:');
    successfulJobs.forEach(job => {
        console.log(`  Row ${job.row}: ${job.title} @ ${job.company}`);
    });
    
    // Show in alert
    alert(message);
}

function parseCSV(text) {
    const allLines = text.trim().split('\n');
    const lines = allLines.filter(line => line.trim());
    
    if (lines.length < 2) return { jobs: [], skipped: [] };
    
    // Get headers (normalize to lowercase and trim)
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
    const jobs = [];
    const skippedRows = [];
    
    // Map common header variations
    const headerMap = {
        'position title': 'title',
        'job title': 'title',
        'title': 'title',
        'position': 'title',
        'role': 'title',
        'company': 'company',
        'location': 'location',
        'url': 'url',
        'link': 'url',
        'job url': 'url',
        'status': 'status',
        'source': 'source',
        'applied date': 'applied_date',
        'date applied': 'applied_date',
        'date': 'applied_date',
        'description': 'description',
        'notes': 'notes',
        'note': 'notes'
    };
    
    // Parse each row
    let lineIndex = 0;
    for (let i = 0; i < allLines.length; i++) {
        if (i === 0) continue; // Skip header
        
        const line = allLines[i].trim();
        const rowNumber = i + 1; // Row number in original CSV
        
        if (!line) {
            skippedRows.push(rowNumber);
            continue;
        }
        
        const values = parseCSVLine(line);
        const job = {};
        
        headers.forEach((header, index) => {
            const mappedKey = headerMap[header];
            if (mappedKey && values[index] && values[index].trim()) {
                job[mappedKey] = values[index].trim();
            }
        });
        
        // Skip completely empty rows
        if (!job.title && !job.company && !job.location && !job.url) {
            skippedRows.push(rowNumber);
            continue;
        }
        
        // If we have at least a title (even if it's just "sde" or "frontend")
        // OR a company, consider it valid
        if (job.title || job.company) {
            // Normalize status
            if (job.status) {
                job.status = job.status.toLowerCase();
                if (!['saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn', 'ended'].includes(job.status)) {
                    job.status = 'saved';
                }
            } else {
                job.status = 'saved'; // Default status
            }
            
            // Ensure we have at least some identifier
            if (!job.company) {
                job.company = ''; // Empty company is okay if we have a title
            }
            if (!job.title) {
                job.title = ''; // Empty title is okay if we have a company
            }
            
            job._originalRow = rowNumber; // Track original row number
            jobs.push(job);
        } else {
            skippedRows.push(rowNumber);
        }
    }
    
    return { jobs, skipped: skippedRows };
}

// Helper function to properly parse CSV lines (handles quoted values with commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current); // Push the last value
    return result.map(v => v.trim().replace(/^"|"$/g, ''));
}

function exportAll() {
    if (jobTracker && jobTracker.jobs.length > 0) {
        const csv = convertToCSV(jobTracker.jobs);
        downloadCSV(csv, 'job-applications.csv');
    } else {
        alert('No jobs to export');
    }
}

async function refreshData() {
    console.log('🔄 Refresh Data button clicked!');
    console.log('jobTracker exists?', !!jobTracker);
    
    const refreshBtn = document.getElementById('refresh-btn');
    const icon = refreshBtn?.querySelector('i');
    
    if (jobTracker) {
        console.log('Calling jobTracker.loadJobs()...');
        
        // Add spinning animation
        if (icon) {
            icon.classList.add('fa-spin');
        }
        
        try {
            // Fetch fresh data from Supabase
            await jobTracker.loadJobs();
            console.log('✅ Data loaded from Supabase');
            
            // Apply filters (resets filteredJobs based on current filters)
            jobTracker.applyFilters();
            console.log('✅ Filters applied');
            
            // Re-render the table with fresh data
            jobTracker.renderJobs();
            console.log('✅ Jobs rendered');
            
            // Update stats (counts, etc.)
            jobTracker.updateStats();
            console.log('✅ Stats updated');
            
            // Update filter dropdowns with new data
            jobTracker.populateFilterOptions();
            console.log('✅ Filter options populated');
            
            console.log('🎉 Data refreshed successfully!');
            
            // Show success feedback
            if (refreshBtn) {
                const originalText = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            alert('Failed to refresh data. Please try again.');
        } finally {
            if (icon) {
                icon.classList.remove('fa-spin');
            }
        }
    } else {
        console.error('❌ jobTracker not initialized!');
        alert('Job tracker not initialized. Please reload the page.');
    }
}

function debugDashboard() {
    console.log('=== SUPABASE DASHBOARD DEBUG ===');
    console.log('Supabase client:', jobTracker ? jobTracker.supabase : 'No jobTracker');
    console.log('Current jobs:', jobTracker ? jobTracker.jobs : 'No jobTracker');
    console.log('Filtered jobs:', jobTracker ? jobTracker.filteredJobs : 'No jobTracker');
    
    if (jobTracker && jobTracker.jobs.length > 0) {
        console.log('Job details:');
        jobTracker.jobs.forEach((job, index) => {
            console.log(`Job ${index + 1}:`, {
                id: job.id,
                title: job.title,
                company: job.company,
                status: job.status,
                created_at: job.created_at
            });
        });
    }
    
    alert('Debug info logged to console. Press F12 to see the details.');
}

function openAddJobModal() {
    if (jobTracker) {
        jobTracker.openAddJobModal();
    }
}

function closeModal() {
    document.getElementById('add-job-modal').style.display = 'none';
    document.getElementById('import-modal').style.display = 'none';
}

function closeCommentModal() {
    document.getElementById('comment-modal').style.display = 'none';
}

async function saveJob() {
    console.log('=== SAVE JOB FUNCTION CALLED ===');
    
    if (!jobTracker) {
        console.error('No jobTracker instance!');
        return;
    }
    
    const formData = {
        title: document.getElementById('job-title').value,
        company: document.getElementById('job-company').value,
        location: document.getElementById('job-location').value,
        url: document.getElementById('job-url').value,
        description: document.getElementById('job-description').value,
        notes: document.getElementById('job-notes')?.value || '',
        status: document.getElementById('job-status').value
    };
    
    console.log('Form data:', formData);
    
    if (jobTracker.editingJobId) {
        // UPDATE EXISTING JOB
        console.log('Updating existing job with ID:', jobTracker.editingJobId);
        
        try {
            const { data, error } = await jobTracker.supabase
                .from('jobs')
                .update(formData)
                .eq('id', jobTracker.editingJobId)
                .select()
                .single();
            
            if (error) {
                console.error('Update error:', error);
                alert('Could not update job: ' + error.message);
                return;
            }
            
            console.log('✅ Job updated in Supabase:', data);
            
            // Update local data
            const jobIndex = jobTracker.jobs.findIndex(j => j.id === jobTracker.editingJobId);
            if (jobIndex !== -1) {
                jobTracker.jobs[jobIndex] = data;
            }
            
            jobTracker.applyFilters();
            alert('✅ Job updated successfully!');
        } catch (err) {
            console.error('Exception updating job:', err);
            alert('Error: ' + err.message);
            return;
        }
    } else {
        // ADD NEW JOB
        console.log('Adding new job...');
        
        try {
            const jobData = {
                title: formData.title || '',
                company: formData.company || '',
                location: formData.location || '',
                job_id: '',
                status: formData.status || 'saved',
                applied_date: new Date().toISOString().split('T')[0],
                url: formData.url || '',
                description: formData.description || '',
                notes: formData.notes || '',
                comments: '',
                source: 'Manual Entry'
            };
            
            console.log('Inserting into Supabase:', jobData);
            
            const { data, error } = await jobTracker.supabase
                .from('jobs')
                .insert([jobData])
                .select()
                .single();
            
            if (error) {
                console.error('Insert error:', error);
                alert('Could not add job: ' + error.message);
                return;
            }
            
            console.log('✅ Job added to Supabase:', data);
            
            // Add to local jobs array
            jobTracker.jobs.unshift(data);
            jobTracker.applyFilters();
            
            alert('✅ Job added successfully!');
        } catch (err) {
            console.error('Exception adding job:', err);
            alert('Error: ' + err.message);
            return;
        }
    }
    
    closeModal();
    console.log('=== SAVE JOB COMPLETED ===');
}

function saveComment() {
    if (!jobTracker || !jobTracker.currentCommentJobId) return;
    
    const comment = document.getElementById('comment-text').value;
    const job = jobTracker.jobs.find(j => j.id === jobTracker.currentCommentJobId);
    
    if (job) {
        job.comments = comment;
        jobTracker.saveJobs();
        jobTracker.renderJobs();
    }
    
    closeCommentModal();
}

// Utility functions
function convertToCSV(jobs) {
    const headers = ['Title', 'Company', 'Location', 'Applied Date', 'Status', 'URL', 'Description', 'Notes'];
    const csvContent = [
        headers.join(','),
        ...jobs.map(job => [
            `"${job.title}"`,
            `"${job.company}"`,
            `"${job.location}"`,
            `"${job.applied_date}"`,
            `"${job.status}"`,
            `"${job.url}"`,
            `"${job.description}"`,
            `"${job.notes || ''}"`
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Dark Mode Toggle
function initDarkMode() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
    
    // Toggle theme on button click
    themeToggle?.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        
        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Update icon
        updateThemeIcon(isDark);
    });
}

function updateThemeIcon(isDark) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Supabase JobTracker...');
    try {
        // Initialize dark mode first
        initDarkMode();
        
        jobTracker = new SupabaseJobTracker();
        console.log('Supabase JobTracker initialized successfully');
        
        // Add event listeners to fix CSP issues
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing Supabase JobTracker:', error);
    }
});

// Setup event listeners to replace inline onclick handlers
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Navigation tabs
    const trackerTab = document.getElementById('tracker-tab');
    console.log('tracker-tab exists?', !!trackerTab);
    if (trackerTab) {
        trackerTab.addEventListener('click', showTracker);
    }
    
    // Action buttons
    const refreshBtn = document.getElementById('refresh-btn');
    console.log('refresh-btn exists?', !!refreshBtn);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
        console.log('✅ Refresh button event listener attached');
    } else {
        console.error('❌ Refresh button not found in DOM!');
    }
    document.getElementById('debug-btn')?.addEventListener('click', debugDashboard);
    document.getElementById('streak-btn')?.addEventListener('click', openStreakSettings);
    document.getElementById('import-csv-btn')?.addEventListener('click', importCSV);
    
    // Delete selected button
    document.getElementById('delete-selected-btn')?.addEventListener('click', async () => {
        if (jobTracker) {
            const selectedIds = jobTracker.getSelectedJobIds();
            if (selectedIds.length === 0) {
                alert('Please select jobs to delete');
                return;
            }
            
            const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} selected job(s)?`);
            if (confirmed) {
                await jobTracker.deleteSelectedJobs();
            }
        }
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (jobTracker) {
                // Reset all filters to default (saved & applied)
                jobTracker.currentFilters = {
                    search: '',
                    status: ['saved', 'applied'],
                    company: 'all',
                    location: 'all',
                    source: 'all',
                    dateRange: 'all'
                };
                
                // Clear search input
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
                
                // Reset all filter button displays
                const filterBtns = document.querySelectorAll('.filter-btn');
                filterBtns.forEach(btn => {
                    const filterType = btn.dataset.filter;
                    const filterValueSpan = btn.querySelector('.filter-value');
                    if (filterValueSpan) {
                        switch(filterType) {
                            case 'date':
                                filterValueSpan.textContent = 'All Time';
                                break;
                            case 'status':
                                filterValueSpan.textContent = 'Status';
                                break;
                            case 'company':
                                filterValueSpan.textContent = 'All Companies';
                                break;
                            case 'location':
                                filterValueSpan.textContent = 'All Locations';
                                break;
                            case 'source':
                                filterValueSpan.textContent = 'All Sources';
                                break;
                        }
                    }
                });
                
                // Apply filters (shows all jobs)
                jobTracker.applyFilters();
                
                // Hide the clear button
                jobTracker.updateClearFiltersButton();
                
                console.log('✅ All filters cleared');
            }
        });
        console.log('✅ Clear filters button event listener attached');
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Cancel buttons
    document.getElementById('cancel-add-job')?.addEventListener('click', () => {
        document.getElementById('add-job-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-comment')?.addEventListener('click', () => {
        document.getElementById('comment-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-import')?.addEventListener('click', () => {
        document.getElementById('import-modal').style.display = 'none';
    });
    
    // Form submissions
    document.getElementById('add-job-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveJob();
    });
    
    document.getElementById('comment-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveComment();
    });
}
