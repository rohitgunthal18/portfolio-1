// Manage Projects - Admin Dashboard
console.log('Projects Manager loaded');

// State
let currentTags = [];
let currentImageFile = null;
let currentImageUrl = '';
let editingProjectId = null;

// Make sure window object is ready
window.projectsManagerReady = false;

// DOM Elements (will be initialized when page loads)
let btnAddProject;
let btnCloseForm;
let btnCancelForm;
let projectFormContainer;
let projectForm;
let dynamicProjectsList;
let projectsTableBody;
let noProjects;
let dynamicProjectsBadge;

// Form fields
let projectIdField;
let projectTitle;
let projectDescription;
let descCharCount;
let projectCategory;
let customCategory;
let projectImage;
let imageUploadArea;
let uploadPlaceholder;
let imagePreview;
let previewImg;
let btnRemoveImage;
let existingImageUrl;
let githubUrl;
let demoUrl;
let techTagInput;
let tagsDisplay;
let techTagsHidden;
let projectActive;
let formTitle;
let btnSaveText;

// Flag to track if already initialized
let isInitialized = false;

// Initialize when DOM is ready
function initManageProjects() {
    console.log('Initializing Manage Projects...');
    
    // Get all DOM elements
    btnAddProject = document.getElementById('btnAddProject');
    btnCloseForm = document.getElementById('btnCloseForm');
    btnCancelForm = document.getElementById('btnCancelForm');
    projectFormContainer = document.getElementById('projectFormContainer');
    projectForm = document.getElementById('projectForm');
    dynamicProjectsList = document.getElementById('dynamicProjectsList');
    projectsTableBody = document.getElementById('projectsTableBody');
    noProjects = document.getElementById('noProjects');
    dynamicProjectsBadge = document.getElementById('dynamicProjectsBadge');
    
    projectIdField = document.getElementById('projectId');
    projectTitle = document.getElementById('projectTitle');
    projectDescription = document.getElementById('projectDescription');
    descCharCount = document.getElementById('descCharCount');
    projectCategory = document.getElementById('projectCategory');
    customCategory = document.getElementById('customCategory');
    projectImage = document.getElementById('projectImage');
    imageUploadArea = document.getElementById('imageUploadArea');
    uploadPlaceholder = document.getElementById('uploadPlaceholder');
    imagePreview = document.getElementById('imagePreview');
    previewImg = document.getElementById('previewImg');
    btnRemoveImage = document.getElementById('btnRemoveImage');
    existingImageUrl = document.getElementById('existingImageUrl');
    githubUrl = document.getElementById('githubUrl');
    demoUrl = document.getElementById('demoUrl');
    techTagInput = document.getElementById('techTagInput');
    tagsDisplay = document.getElementById('tagsDisplay');
    techTagsHidden = document.getElementById('techTagsHidden');
    projectActive = document.getElementById('projectActive');
    formTitle = document.getElementById('formTitle');
    btnSaveText = document.getElementById('btnSaveText');
    
    console.log('Button found:', btnAddProject ? 'Yes' : 'No');
    
    // Only setup event listeners once
    if (!isInitialized) {
        setupProjectsEventListeners();
        isInitialized = true;
        window.projectsManagerReady = true;
        console.log('Projects Manager initialized successfully');
    }
    
    // Always load projects when page is shown
    loadDynamicProjects();
}

// Setup event listeners
function setupProjectsEventListeners() {
    console.log('Setting up event listeners...');
    
    // Add project button
    if (btnAddProject) {
        console.log('Add Project button found, attaching event listener');
        btnAddProject.addEventListener('click', () => {
            console.log('Add Project button clicked!');
            openProjectForm('add');
        });
    } else {
        console.error('Add Project button NOT found!');
    }

    // Close/Cancel form
    if (btnCloseForm) {
        btnCloseForm.addEventListener('click', closeProjectForm);
    }
    if (btnCancelForm) {
        btnCancelForm.addEventListener('click', closeProjectForm);
    }

    // Form submission
    if (projectForm) {
        projectForm.addEventListener('submit', handleProjectSubmit);
    }

    // Character count for description
    if (projectDescription) {
        projectDescription.addEventListener('input', (e) => {
            const count = e.target.value.length;
            descCharCount.textContent = count;
            if (count > 200) {
                descCharCount.style.color = 'var(--danger)';
            } else {
                descCharCount.style.color = 'var(--text-muted)';
            }
        });
    }

    // Category selection
    if (projectCategory) {
        projectCategory.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customCategory.style.display = 'block';
                customCategory.required = true;
            } else {
                customCategory.style.display = 'none';
                customCategory.required = false;
                customCategory.value = '';
            }
        });
    }

    // Image upload
    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            projectImage.click();
        });

        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--orange)';
        });

        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.style.borderColor = 'var(--border-color)';
        });

        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--border-color)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageSelect(file);
            }
        });
    }

    if (projectImage) {
        projectImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageSelect(file);
            }
        });
    }

    if (btnRemoveImage) {
        btnRemoveImage.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImagePreview();
        });
    }

    // Tech tags input
    if (techTagInput) {
        techTagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = techTagInput.value.trim();
                if (tag && currentTags.length < 6) {
                    addTag(tag);
                    techTagInput.value = '';
                } else if (currentTags.length >= 6) {
                    showNotification('Maximum 6 tags allowed', 'warning');
                }
            }
        });
    }
}

// Handle image selection
function handleImageSelect(file) {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please upload a valid image (JPEG, PNG, GIF, WebP)', 'error');
        return;
    }

    currentImageFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadPlaceholder.style.display = 'none';
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Clear image preview
function clearImagePreview() {
    currentImageFile = null;
    currentImageUrl = '';
    existingImageUrl.value = '';
    projectImage.value = '';
    previewImg.src = '';
    uploadPlaceholder.style.display = 'flex';
    imagePreview.style.display = 'none';
}

// Add tag
function addTag(tag) {
    if (currentTags.length >= 6) {
        showNotification('Maximum 6 tags allowed', 'warning');
        return;
    }
    
    if (currentTags.includes(tag)) {
        showNotification('Tag already added', 'warning');
        return;
    }

    currentTags.push(tag);
    renderTags();
}

// Remove tag
function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

// Render tags
function renderTags() {
    tagsDisplay.innerHTML = currentTags.map(tag => `
        <span class="tag-item">
            ${escapeHtml(tag)}
            <button type="button" class="tag-remove" data-tag="${escapeHtml(tag)}">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).join('');
    
    // Update hidden field
    techTagsHidden.value = JSON.stringify(currentTags);
    
    // Attach event listeners to tag remove buttons
    document.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const tag = this.getAttribute('data-tag');
            removeTag(tag);
        });
    });
}

// Open project form
function openProjectForm(mode = 'add', projectData = null) {
    console.log('Opening project form, mode:', mode);
    console.log('Form container element:', projectFormContainer);
    
    editingProjectId = null;
    currentTags = [];
    clearImagePreview();

    if (mode === 'add') {
        if (formTitle) formTitle.textContent = 'Add New Project';
        if (btnSaveText) btnSaveText.textContent = 'Save Project';
        if (projectForm) projectForm.reset();
        if (descCharCount) descCharCount.textContent = '0';
    } else if (mode === 'edit' && projectData) {
        formTitle.textContent = 'Edit Project';
        btnSaveText.textContent = 'Update Project';
        editingProjectId = projectData.id;

        // Fill form fields
        projectIdField.value = projectData.id;
        projectTitle.value = projectData.title;
        projectDescription.value = projectData.description;
        descCharCount.textContent = projectData.description.length;
        
        // Handle category
        const predefinedCategories = ['Web Development', 'Data Analytics', 'Mobile Apps', 'Utility Tools'];
        if (predefinedCategories.includes(projectData.category)) {
            projectCategory.value = projectData.category;
        } else {
            projectCategory.value = 'custom';
            customCategory.style.display = 'block';
            customCategory.required = true;
            customCategory.value = projectData.category;
        }

        githubUrl.value = projectData.github_url || '';
        demoUrl.value = projectData.demo_url || '';
        projectActive.checked = projectData.is_active;

        // Handle image
        if (projectData.image_url) {
            currentImageUrl = projectData.image_url;
            existingImageUrl.value = projectData.image_url;
            previewImg.src = projectData.image_url;
            uploadPlaceholder.style.display = 'none';
            imagePreview.style.display = 'block';
        }

        // Handle tags
        currentTags = projectData.tech_tags || [];
        renderTags();
    }

    if (projectFormContainer) {
        console.log('Showing form container...');
        projectFormContainer.style.display = 'block';
        projectFormContainer.scrollIntoView({ behavior: 'smooth' });
        console.log('Form container display:', projectFormContainer.style.display);
    } else {
        console.error('Project form container not found!');
    }
}

// Close project form
function closeProjectForm() {
    projectFormContainer.style.display = 'none';
    projectForm.reset();
    editingProjectId = null;
    currentTags = [];
    clearImagePreview();
    customCategory.style.display = 'none';
    customCategory.required = false;
}

// Handle form submission
async function handleProjectSubmit(e) {
    e.preventDefault();

    // Validation
    if (currentTags.length < 2) {
        showNotification('Please add at least 2 technology tags', 'warning');
        return;
    }

    if (!currentImageFile && !currentImageUrl) {
        showNotification('Please upload a project image', 'warning');
        return;
    }

    // Show loading
    const btnSave = projectForm.querySelector('.btn-save');
    btnSave.disabled = true;
    btnSaveText.textContent = editingProjectId ? 'Updating...' : 'Saving...';

    try {
        // Get category value
        const categoryValue = projectCategory.value === 'custom' 
            ? customCategory.value.trim() 
            : projectCategory.value;

        let imageUrl = currentImageUrl;

        // Upload image if new file selected
        if (currentImageFile) {
            imageUrl = await uploadProjectImage(currentImageFile);
        }

        // Prepare project data
        const projectData = {
            title: projectTitle.value.trim(),
            description: projectDescription.value.trim(),
            category: categoryValue,
            image_url: imageUrl,
            github_url: githubUrl.value.trim() || null,
            demo_url: demoUrl.value.trim() || null,
            tech_tags: currentTags,
            is_active: projectActive.checked,
            updated_at: new Date().toISOString()
        };

        if (editingProjectId) {
            // Update existing project
            const { data, error } = await window.supabaseClient
                .from('dynamic_projects')
                .update(projectData)
                .eq('id', editingProjectId)
                .select();

            if (error) throw error;

            showNotification('Project updated successfully!', 'success');
        } else {
            // Add new project
            // Get the highest display_order and add 1, or use timestamp in seconds
            const { data: existingProjects } = await window.supabaseClient
                .from('dynamic_projects')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1);
            
            // Use either max display_order + 1, or current timestamp in seconds
            const maxOrder = existingProjects && existingProjects.length > 0 
                ? existingProjects[0].display_order 
                : 0;
            projectData.display_order = Math.max(maxOrder + 1, Math.floor(Date.now() / 1000));

            const { data, error } = await window.supabaseClient
                .from('dynamic_projects')
                .insert([projectData])
                .select();

            if (error) throw error;

            showNotification('Project added successfully!', 'success');
        }

        // Reload projects list
        await loadDynamicProjects();
        
        // Close form
        closeProjectForm();

    } catch (error) {
        console.error('Error saving project:', error);
        showNotification('Error saving project: ' + error.message, 'error');
    } finally {
        btnSave.disabled = false;
        btnSaveText.textContent = editingProjectId ? 'Update Project' : 'Save Project';
    }
}

// Upload project image to Supabase Storage
async function uploadProjectImage(file) {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file
        const { data, error } = await window.supabaseClient.storage
            .from('project-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('project-images')
            .getPublicUrl(filePath);

        return publicUrl;

    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image: ' + error.message);
    }
}

// Load dynamic projects
async function loadDynamicProjects() {
    try {
        const { data, error } = await window.supabaseClient
            .from('dynamic_projects')
            .select('*')
            .order('display_order', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Loaded dynamic projects:', data);

        // Update badge
        if (dynamicProjectsBadge) {
            dynamicProjectsBadge.textContent = data.length;
        }

        // Render projects table
        renderProjectsTable(data);

    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Error loading projects: ' + error.message, 'error');
    }
}

// Render projects table
function renderProjectsTable(projects) {
    if (!projectsTableBody) return;

    if (projects.length === 0) {
        projectsTableBody.innerHTML = '';
        if (noProjects) {
            noProjects.style.display = 'block';
        }
        return;
    }

    if (noProjects) {
        noProjects.style.display = 'none';
    }

    projectsTableBody.innerHTML = projects.map(project => `
        <tr data-project-id="${project.id}">
            <td>
                <img src="${escapeHtml(project.image_url)}" alt="${escapeHtml(project.title)}" class="project-thumbnail">
            </td>
            <td class="project-title-cell">${escapeHtml(project.title)}</td>
            <td>
                <span class="project-category-badge">${escapeHtml(project.category)}</span>
            </td>
            <td>
                <div class="project-tags">
                    ${project.tech_tags.slice(0, 3).map(tag => `
                        <span class="project-tag">${escapeHtml(tag)}</span>
                    `).join('')}
                    ${project.tech_tags.length > 3 ? `<span class="project-tag">+${project.tech_tags.length - 3}</span>` : ''}
                </div>
            </td>
            <td>
                <span class="status-badge ${project.is_active ? 'active' : 'inactive'}">
                    <i class="fas fa-circle"></i>
                    ${project.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${new Date(project.created_at).toLocaleDateString()}</td>
            <td>
                <div class="project-actions">
                    <button class="btn-action btn-edit" data-project-id="${project.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-project-id="${project.id}" data-project-title="${escapeHtml(project.title)}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners for edit/delete buttons
    attachProjectActionListeners();
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Attach event listeners to project action buttons
function attachProjectActionListeners() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project-id');
            editProject(projectId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project-id');
            const projectTitle = this.getAttribute('data-project-title');
            deleteProject(projectId, projectTitle);
        });
    });
}

// Edit project
async function editProject(projectId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('dynamic_projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) throw error;

        openProjectForm('edit', data);

    } catch (error) {
        console.error('Error loading project:', error);
        showNotification('Error loading project: ' + error.message, 'error');
    }
}

// Delete project
async function deleteProject(projectId, projectTitle) {
    if (!confirm(`Are you sure you want to delete "${projectTitle}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        // Get project to delete image
        const { data: project } = await window.supabaseClient
            .from('dynamic_projects')
            .select('image_url')
            .eq('id', projectId)
            .single();

        // Delete project from database
        const { error } = await window.supabaseClient
            .from('dynamic_projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;

        // Try to delete image from storage (optional, may fail if already deleted)
        if (project && project.image_url) {
            try {
                const imagePath = project.image_url.split('/').pop();
                await window.supabaseClient.storage
                    .from('project-images')
                    .remove([imagePath]);
            } catch (err) {
                console.log('Image already deleted or not found:', err);
            }
        }

        showNotification('Project deleted successfully!', 'success');
        await loadDynamicProjects();

    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Error deleting project: ' + error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--info)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Wrapper function for opening form (ensures initialization)
window.openProjectFormWrapper = function(mode, data) {
    console.log('openProjectFormWrapper called with mode:', mode);
    try {
        // Ensure initialization first
        if (!isInitialized || !window.projectsManagerReady) {
            console.log('Not initialized, calling initManageProjects first');
            initManageProjects();
            // Give a brief moment for DOM elements to be ready
            setTimeout(() => {
                openProjectForm(mode, data);
            }, 100);
        } else {
            // Already initialized, open immediately
            openProjectForm(mode, data);
        }
    } catch (error) {
        console.error('Error in openProjectFormWrapper:', error);
        showNotification('Error opening form: ' + error.message, 'error');
    }
};

// Make functions globally available (only those needed by admin.js)
window.initManageProjects = initManageProjects;

console.log('Projects Manager functions registered globally');

