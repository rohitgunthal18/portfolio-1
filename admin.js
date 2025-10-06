// Admin Dashboard JavaScript
console.log('Admin dashboard script loaded');

// Check if Supabase is loaded
if (!window.supabase) {
    console.error('Supabase library not loaded');
}

// Admin credentials (for client-side validation)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '4482@AdmiN'
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const logoutBtn = document.getElementById('logoutBtn');

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    checkAuth();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }
}

// Show login screen
function showLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
}

// Show dashboard
function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
        });
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
    }
    
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchPage(page);
            
            // Close mobile menu on navigation
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                mobileOverlay.classList.remove('active');
            }
        });
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const status = this.getAttribute('data-status');
            filterMessages(status);
        });
    });
    
    // Search functionality
    document.getElementById('contactSearch')?.addEventListener('input', (e) => {
        searchMessages(e.target.value, 'contact');
    });
    
    document.getElementById('projectSearch')?.addEventListener('input', (e) => {
        searchMessages(e.target.value, 'project');
    });
    
    // Modal close
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('messageModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'messageModal') closeModal();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            mobileOverlay.classList.remove('active');
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const submitBtn = loginForm.querySelector('.btn-login');
    const btnText = submitBtn.querySelector('.btn-text');
    const originalText = btnText.textContent;
    
    // Show loading
    btnText.textContent = 'Logging in...';
    submitBtn.disabled = true;
    loginError.style.display = 'none';
    
    try {
        // Validate credentials
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // Set session
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminUsername', username);
            
            // Update last login in database
            if (window.supabaseClient) {
                await window.supabaseClient
                    .from('admin_users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('username', username);
            }
            
            // Show dashboard
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 500);
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Invalid username or password. Please try again.';
        loginError.style.display = 'block';
        btnText.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        showLogin();
        loginForm.reset();
    }
}

// Switch page
function switchPage(pageName) {
    // Update navigation
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    // Update page content
    pages.forEach(page => page.classList.remove('active-page'));
    document.getElementById(`${pageName}Page`).classList.add('active-page');
    
    // Update header
    const titles = {
        overview: 'Dashboard Overview',
        contacts: 'Contact Messages',
        projects: 'Project Requests',
        'manage-projects': 'Manage Projects'
    };
    document.getElementById('pageTitle').textContent = titles[pageName];
    
    // Load page data
    if (pageName === 'contacts') {
        loadContacts();
    } else if (pageName === 'projects') {
        loadProjects();
    } else if (pageName === 'manage-projects') {
        // Initialize projects manager if not already done
        if (window.initManageProjects) {
            window.initManageProjects();
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client not available');
            return;
        }
        
        // Load contacts count
        const { count: contactsCount } = await window.supabaseClient
            .from('contact_submissions')
            .select('*', { count: 'exact', head: true });
        
        // Load projects count
        const { count: projectsCount } = await window.supabaseClient
            .from('project_requests')
            .select('*', { count: 'exact', head: true });
        
        // Load unread count
        const { count: unreadCount } = await window.supabaseClient
            .from('contact_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'unread');
        
        // Load pending projects count
        const { count: pendingCount } = await window.supabaseClient
            .from('project_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        // Update stats
        document.getElementById('totalContacts').textContent = contactsCount || 0;
        document.getElementById('totalProjects').textContent = projectsCount || 0;
        document.getElementById('unreadCount').textContent = unreadCount || 0;
        document.getElementById('pendingCount').textContent = pendingCount || 0;
        
        // Update badges
        document.getElementById('contactsBadge').textContent = unreadCount || 0;
        document.getElementById('projectsBadge').textContent = pendingCount || 0;
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('recentActivity');
        
        // Get recent contacts and projects
        const { data: contacts } = await window.supabaseClient
            .from('contact_submissions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        
        const { data: projects } = await window.supabaseClient
            .from('project_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        
        // Combine and sort
        const allActivity = [
            ...(contacts || []).map(c => ({ ...c, type: 'contact' })),
            ...(projects || []).map(p => ({ ...p, type: 'project' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        
        if (allActivity.length === 0) {
            activityList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No recent activity</p>';
            return;
        }
        
        activityList.innerHTML = allActivity.map(item => `
            <div class="activity-item">
                <div class="activity-icon ${item.type === 'contact' ? 'contact-icon' : 'project-icon'}">
                    <i class="fas fa-${item.type === 'contact' ? 'envelope' : 'briefcase'}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">
                        ${item.type === 'contact' ? 'New Contact Message' : 'New Project Request'} from ${item.name}
                    </div>
                    <div class="activity-time">${formatDate(item.created_at)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Load contacts
async function loadContacts(statusFilter = 'all') {
    try {
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading...</div>';
        
        let query = window.supabaseClient
            .from('contact_submissions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }
        
        const { data: contacts, error } = await query;
        
        if (error) throw error;
        
        if (!contacts || contacts.length === 0) {
            contactsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No messages found</div>';
            return;
        }
        
        contactsList.innerHTML = contacts.map(contact => `
            <div class="message-card ${contact.status === 'unread' ? 'unread' : ''}" onclick="showMessageDetail('${contact.id}', 'contact')">
                <div class="message-header">
                    <div>
                        <div class="message-from">${escapeHtml(contact.name)}</div>
                        <div class="message-email">${escapeHtml(contact.email)}</div>
                    </div>
                    <div class="message-date">${formatDate(contact.created_at)}</div>
                </div>
                <div class="message-subject">${escapeHtml(contact.subject)}</div>
                <div class="message-preview">${escapeHtml(contact.message)}</div>
                <div class="message-footer">
                    <span class="status-badge ${contact.status}">${contact.status}</span>
                    ${contact.phone ? `<span style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-phone"></i> ${escapeHtml(contact.phone)}</span>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Load projects
async function loadProjects(statusFilter = 'all') {
    try {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading...</div>';
        
        let query = window.supabaseClient
            .from('project_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }
        
        const { data: projects, error } = await query;
        
        if (error) throw error;
        
        if (!projects || projects.length === 0) {
            projectsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No project requests found</div>';
            return;
        }
        
        projectsList.innerHTML = projects.map(project => `
            <div class="message-card" onclick="showMessageDetail('${project.id}', 'project')">
                <div class="message-header">
                    <div>
                        <div class="message-from">${escapeHtml(project.name)}</div>
                        <div class="message-email">${escapeHtml(project.email)}</div>
                    </div>
                    <div class="message-date">${formatDate(project.created_at)}</div>
                </div>
                <div class="message-subject">${escapeHtml(project.subject)}</div>
                <div class="message-preview">${escapeHtml(project.project_details)}</div>
                <div class="message-footer">
                    <span class="status-badge ${project.status}">${project.status}</span>
                    ${project.service ? `<span style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-cogs"></i> ${escapeHtml(project.service)}</span>` : ''}
                    ${project.budget ? `<span style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-dollar-sign"></i> ${escapeHtml(project.budget)}</span>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Show message detail
async function showMessageDetail(id, type) {
    try {
        const modal = document.getElementById('messageModal');
        const modalBody = document.getElementById('modalBody');
        
        modal.classList.add('active');
        modalBody.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading...</div>';
        
        const table = type === 'contact' ? 'contact_submissions' : 'project_requests';
        const { data, error } = await window.supabaseClient
            .from(table)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (type === 'contact') {
            modalBody.innerHTML = `
                <div class="detail-group">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${escapeHtml(data.name)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value"><a href="mailto:${escapeHtml(data.email)}" style="color: var(--orange);">${escapeHtml(data.email)}</a></div>
                </div>
                ${data.phone ? `
                <div class="detail-group">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value"><a href="tel:${escapeHtml(data.phone)}" style="color: var(--orange);">${escapeHtml(data.phone)}</a></div>
                </div>` : ''}
                <div class="detail-group">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value">${escapeHtml(data.subject)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Message</div>
                    <div class="detail-value" style="white-space: pre-wrap;">${escapeHtml(data.message)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge ${data.status}">${data.status}</span>
                    </div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Received</div>
                    <div class="detail-value">${formatDate(data.created_at)}</div>
                </div>
                <div class="modal-actions">
                    <button class="btn-action btn-primary" onclick="markAsRead('${data.id}', 'contact')">Mark as Read</button>
                    <button class="btn-action btn-secondary" onclick="window.location.href='mailto:${escapeHtml(data.email)}'">Reply via Email</button>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="detail-group">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${escapeHtml(data.name)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value"><a href="mailto:${escapeHtml(data.email)}" style="color: var(--orange);">${escapeHtml(data.email)}</a></div>
                </div>
                ${data.phone ? `
                <div class="detail-group">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value"><a href="tel:${escapeHtml(data.phone)}" style="color: var(--orange);">${escapeHtml(data.phone)}</a></div>
                </div>` : ''}
                <div class="detail-group">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value">${escapeHtml(data.subject)}</div>
                </div>
                ${data.service ? `
                <div class="detail-group">
                    <div class="detail-label">Service Required</div>
                    <div class="detail-value">${escapeHtml(data.service)}</div>
                </div>` : ''}
                ${data.budget ? `
                <div class="detail-group">
                    <div class="detail-label">Budget Range</div>
                    <div class="detail-value">${escapeHtml(data.budget)}</div>
                </div>` : ''}
                ${data.timeline ? `
                <div class="detail-group">
                    <div class="detail-label">Timeline</div>
                    <div class="detail-value">${escapeHtml(data.timeline)}</div>
                </div>` : ''}
                <div class="detail-group">
                    <div class="detail-label">Project Details</div>
                    <div class="detail-value" style="white-space: pre-wrap;">${escapeHtml(data.project_details)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge ${data.status}">${data.status}</span>
                    </div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Received</div>
                    <div class="detail-value">${formatDate(data.created_at)}</div>
                </div>
                <div class="modal-actions">
                    <button class="btn-action btn-primary" onclick="updateProjectStatus('${data.id}', 'reviewing')">Mark as Reviewing</button>
                    <button class="btn-action btn-secondary" onclick="window.location.href='mailto:${escapeHtml(data.email)}'">Reply via Email</button>
                </div>
            `;
        }
        
        // Mark as read
        if (type === 'contact' && data.status === 'unread') {
            await window.supabaseClient
                .from('contact_submissions')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .eq('id', id);
            
            loadDashboardData();
            loadContacts();
        }
        
    } catch (error) {
        console.error('Error showing message detail:', error);
    }
}

// Mark as read
async function markAsRead(id, type) {
    try {
        await window.supabaseClient
            .from('contact_submissions')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('id', id);
        
        closeModal();
        loadDashboardData();
        loadContacts();
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

// Update project status
async function updateProjectStatus(id, status) {
    try {
        await window.supabaseClient
            .from('project_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        
        closeModal();
        loadDashboardData();
        loadProjects();
    } catch (error) {
        console.error('Error updating project status:', error);
    }
}

// Close modal
function closeModal() {
    document.getElementById('messageModal').classList.remove('active');
}

// Filter messages
function filterMessages(status) {
    const activePage = document.querySelector('.page-content.active-page').id;
    if (activePage === 'contactsPage') {
        loadContacts(status);
    } else if (activePage === 'projectsPage') {
        loadProjects(status);
    }
}

// Search messages
function searchMessages(query, type) {
    // Simple client-side search (can be improved with server-side search)
    const cards = document.querySelectorAll('.message-card');
    const searchLower = query.toLowerCase();
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchLower)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

