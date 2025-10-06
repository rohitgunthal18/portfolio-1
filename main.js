// ====================================
// FIGMA DESIGN REPLICA JAVASCRIPT
// Dark Theme with Orange Accents
// ====================================

/* ============ EMAILJS THANK YOU EMAIL ============ */
const sendThankYouEmail = async (name, email, formType) => {
    try {
        // Check if EmailJS is loaded
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS not loaded');
            return;
        }

        console.log('EmailJS object:', emailjs);
        console.log('EmailJS methods:', Object.keys(emailjs));

        // EmailJS configuration
        const serviceId = 'service_2iizwfc';
        const templateId = 'template_z547owk';
        
        // Prepare template parameters
        const templateParams = {
            user_name: name,
            email: email,
            form_type: formType,
            reply_to: 'xrohia@gmail.com'
        };

        console.log('Sending thank you email via EmailJS:', { name, email, formType });
        console.log('Template params:', templateParams);

        // Send email using EmailJS v4 client-side method
        const response = await emailjs.send(serviceId, templateId, templateParams);
        
        console.log('EmailJS response:', response);
        return response;
        
    } catch (error) {
        console.error('EmailJS error:', error);
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            text: error.text
        });
        // Don't throw error, just log it
        console.log('Email sending failed, but form submission was successful');
    }
};

/* ============ MOBILE NAVIGATION ============ */
const initMobileNav = () => {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
};

/* ============ SMOOTH SCROLL ============ */
const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
};

/* ============ ACTIVE NAV LINK ============ */
const initActiveNav = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
};

/* ============ CIRCULAR SKILL ANIMATION ============ */
const animateSkills = () => {
    const skillCircles = document.querySelectorAll('.skill-circle');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const circle = entry.target.querySelector('.skill-progress');
                const progress = circle.getAttribute('data-progress');
                
                // Calculate stroke-dashoffset based on progress
                const circumference = 2 * Math.PI * 90; // r=90
                const offset = circumference - (progress / 100 * circumference);
                
                setTimeout(() => {
                    circle.style.strokeDashoffset = offset;
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    skillCircles.forEach(circle => observer.observe(circle));
};

/* ============ PORTFOLIO LOAD MORE & FILTER ============ */
class PortfolioManager {
    constructor() {
        this.itemsPerPage = 6;
        this.currentFilter = 'all';
        this.allItems = [];
        this.staticItems = [];
        this.dynamicItems = [];
        this.loadMoreBtn = document.getElementById('loadMoreBtn');
        this.portfolioGrid = document.querySelector('.portfolio-grid');
        this.init();
    }

    async init() {
        console.log('Portfolio Manager Initializing...');
        
        // Get static portfolio items first
        this.staticItems = Array.from(document.querySelectorAll('.portfolio-item'));
        console.log('Static items found:', this.staticItems.length);
        
        // Fetch and inject dynamic projects
        await this.loadDynamicProjects();
        
        // Now get all items (dynamic + static)
        this.allItems = Array.from(document.querySelectorAll('.portfolio-item'));
        
        console.log('Portfolio Manager Initialized:', {
            staticItems: this.staticItems.length,
            dynamicItems: this.dynamicItems.length,
            totalItems: this.allItems.length,
            itemsPerPage: this.itemsPerPage
        });
        
        // Initialize: show first 6 items
        this.showInitialItems();
        
        // Setup load more button
        this.setupLoadMoreButton();
        
        // Setup filter buttons
        this.setupFilterButtons();
        
        // Update button visibility
        this.updateLoadMoreButton();
    }

    async loadDynamicProjects() {
        try {
            // Check if Supabase client is available
            if (!window.supabaseClient) {
                console.log('Supabase client not available, skipping dynamic projects');
                return;
            }

            const { data, error } = await window.supabaseClient
                .from('dynamic_projects')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading dynamic projects:', error);
                return;
            }

            console.log('Dynamic projects loaded:', data.length);

            // Inject dynamic projects at the top of the grid
            if (data && data.length > 0 && this.portfolioGrid) {
                data.forEach((project, index) => {
                    const projectCard = this.createProjectCard(project);
                    // Insert at the beginning of the grid
                    this.portfolioGrid.insertBefore(projectCard, this.portfolioGrid.firstChild);
                });

                this.dynamicItems = Array.from(document.querySelectorAll('.portfolio-item.dynamic-project'));
                console.log('Dynamic project cards created:', this.dynamicItems.length);
            }

        } catch (error) {
            console.error('Error in loadDynamicProjects:', error);
        }
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'portfolio-item dynamic-project';
        card.setAttribute('data-category', project.category);
        card.style.display = 'none'; // Hidden initially, will be shown by showInitialItems

        // Build tech tags HTML
        const techTagsHTML = project.tech_tags.map(tag => 
            `<span class="tech-tag">${tag}</span>`
        ).join('');

        // Build links HTML
        let linksHTML = '';
        if (project.github_url || project.demo_url) {
            linksHTML = `
                <div class="portfolio-overlay">
                    <div class="portfolio-links">
                        ${project.github_url ? `
                            <a href="${project.github_url}" class="portfolio-link" target="_blank" rel="noopener noreferrer" title="View on GitHub">
                                <i class="fab fa-github"></i>
                            </a>
                        ` : ''}
                        ${project.demo_url ? `
                            <a href="${project.demo_url}" class="portfolio-link" target="_blank" rel="noopener noreferrer" title="Live Demo">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="portfolio-image">
                <img src="${project.image_url}" alt="${project.title}" class="project-img" loading="lazy">
                ${linksHTML}
            </div>
            <div class="portfolio-info">
                <span class="portfolio-category">${project.category}</span>
                <h3 class="portfolio-title">${project.title}</h3>
                <p class="portfolio-description">${project.description}</p>
                <div class="portfolio-tech">
                    ${techTagsHTML}
                </div>
            </div>
        `;

        return card;
    }

    showInitialItems() {
        console.log('Showing initial items...');
        
        this.allItems.forEach((item, index) => {
            if (index < this.itemsPerPage) {
                item.style.display = 'block';
                item.classList.add('visible');
                item.style.animation = 'fadeInUp 0.6s ease forwards';
                console.log(`Item ${index} visible`);
            } else {
                item.style.display = 'none';
                item.classList.remove('visible');
                item.style.animation = 'none';
                console.log(`Item ${index} hidden`);
            }
        });
        
        console.log('Initial items shown:', this.itemsPerPage);
    }

    setupLoadMoreButton() {
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => this.loadMore());
            console.log('Load More button setup complete');
        } else {
            console.error('Load More button not found!');
        }
    }

    setupFilterButtons() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        console.log('Setting up filter buttons:', filterBtns.length);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                const filterValue = btn.getAttribute('data-filter');
                console.log('Filter clicked:', filterValue);
                
                this.applyFilter(filterValue);
            });
        });
    }

    loadMore() {
        console.log('Load More clicked');
        
        // Add loading state
        if (this.loadMoreBtn) {
            this.loadMoreBtn.classList.add('loading');
        }

        // Get filtered items
        const filteredItems = this.getFilteredItems();
        
        // Calculate which items to show next
        const visibleFilteredItems = filteredItems.filter(item => item.classList.contains('visible'));
        const currentCount = visibleFilteredItems.length;
        const itemsToShow = filteredItems.slice(currentCount, currentCount + this.itemsPerPage);

        console.log('Load More:', {
            currentVisible: currentCount,
            toShow: itemsToShow.length,
            totalFiltered: filteredItems.length
        });

        // Show items with animation delay
        setTimeout(() => {
            itemsToShow.forEach((item, index) => {
                setTimeout(() => {
                    item.style.display = 'block';
                    item.classList.add('visible');
                    // Trigger animation
                    item.style.animation = 'none';
                    setTimeout(() => {
                        item.style.animation = 'fadeInUp 0.6s ease forwards';
                    }, 10);
                    console.log(`Loaded item ${currentCount + index}`);
                }, index * 100);
            });

            // Remove loading state
            if (this.loadMoreBtn) {
                this.loadMoreBtn.classList.remove('loading');
            }

            // Update button visibility
            this.updateLoadMoreButton();
        }, 300);
    }

    getFilteredItems() {
        if (this.currentFilter === 'all') {
            return this.allItems;
        }
        return this.allItems.filter(item => item.getAttribute('data-category') === this.currentFilter);
    }

    updateLoadMoreButton() {
        if (!this.loadMoreBtn) return;

        const filteredItems = this.getFilteredItems();
        const visibleFilteredItems = filteredItems.filter(item => item.classList.contains('visible'));
        
        console.log('Button update:', {
            visible: visibleFilteredItems.length,
            total: filteredItems.length
        });
        
        // Hide button if all filtered items are visible
        if (visibleFilteredItems.length >= filteredItems.length) {
            this.loadMoreBtn.style.display = 'none';
        } else {
            this.loadMoreBtn.style.display = 'inline-flex';
        }
    }

    applyFilter(filterValue) {
        this.currentFilter = filterValue;
        
        console.log('Applying filter:', filterValue);
        
        // Reset all items
        this.allItems.forEach(item => {
            item.style.display = 'none';
            item.classList.remove('visible');
        });

        // Get filtered items
        const filteredItems = this.getFilteredItems();
        
        console.log('Filtered items:', filteredItems.length);
        
        // Show first 6 filtered items
        filteredItems.slice(0, this.itemsPerPage).forEach((item, index) => {
            setTimeout(() => {
                item.style.display = 'block';
                item.classList.add('visible');
                item.style.animation = 'fadeInUp 0.6s ease forwards';
            }, index * 100);
        });

        // Update button
        this.updateLoadMoreButton();
    }
}

const initPortfolioFilter = () => {
    window.portfolioManager = new PortfolioManager();
};

/* ============ CONTACT FORM ============ */
const initContactForm = () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // Form type switching
    const formTypeBtns = document.querySelectorAll('.form-type-btn');
    const projectFields = document.querySelector('.project-fields');
    const messageLabel = document.querySelector('.message-label');
    const serviceField = document.getElementById('service');
    const budgetField = document.getElementById('budget');
    const timelineField = document.getElementById('timeline');

    console.log('Contact form initialized');
    console.log('Project fields found:', projectFields);

    formTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const formType = btn.getAttribute('data-form');
            console.log('Form type clicked:', formType);

            // Remove active class from all buttons
            formTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');

            // Toggle project fields visibility
            if (formType === 'project') {
                projectFields.style.display = 'flex';
                messageLabel.textContent = 'Project Details';
                
                // Make project fields required
                if (serviceField) serviceField.required = true;
                if (budgetField) budgetField.required = true;
                if (timelineField) timelineField.required = true;
                
                console.log('Project fields shown');
            } else {
                projectFields.style.display = 'none';
                messageLabel.textContent = 'Your Message';
                
                // Make project fields optional
                if (serviceField) serviceField.required = false;
                if (budgetField) budgetField.required = false;
                if (timelineField) timelineField.required = false;
                
                console.log('Project fields hidden');
            }
        });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-submit');
        const btnText = submitBtn.querySelector('.btn-text');
        const originalText = btnText.textContent;

        // Show loading state
        btnText.textContent = 'Sending...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        console.log('Form submitted:', data);

        try {
            // Check if Supabase client is available
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Determine form type
            const activeFormType = document.querySelector('.form-type-btn.active');
            const formType = activeFormType ? activeFormType.getAttribute('data-form') : 'contact';

            if (formType === 'project') {
                // Submit to project_requests table
                const { data: result, error } = await window.supabaseClient
                    .from('project_requests')
                    .insert([{
                        name: data.name,
                        email: data.email,
                        phone: data.phone || null,
                        subject: data.subject,
                        service: data.service || null,
                        budget: data.budget || null,
                        timeline: data.timeline || null,
                        project_details: data.message,
                        status: 'pending',
                        priority: 'medium'
                    }]);

                if (error) throw error;
                console.log('Project request saved:', result);
            } else {
                // Submit to contact_submissions table
                const { data: result, error } = await window.supabaseClient
                    .from('contact_submissions')
                    .insert([{
                        name: data.name,
                        email: data.email,
                        phone: data.phone || null,
                        subject: data.subject,
                        message: data.message,
                        form_type: 'contact',
                        status: 'unread'
                    }]);

                if (error) throw error;
                console.log('Contact submission saved:', result);
            }

            // Send thank you email via EmailJS (with delay to ensure EmailJS is loaded)
            setTimeout(async () => {
                try {
                    await sendThankYouEmail(data.name, data.email, formType);
                    console.log('Thank you email sent successfully');
                } catch (emailError) {
                    console.error('Failed to send thank you email:', emailError);
                    // Don't fail the form submission if email fails
                }
            }, 1000);

            // Success state
            btnText.textContent = 'Sent Successfully!';
            submitBtn.style.background = '#34C759';

            showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');

            // Reset form
            form.reset();
            
            // Reset to contact form
            if (formTypeBtns[0]) formTypeBtns[0].click();

        } catch (error) {
            console.error('Error submitting form:', error);
            
            // Error state
            btnText.textContent = 'Error! Try Again';
            submitBtn.style.background = '#e74c3c';
            
            showNotification('Failed to send message. Please try again or contact directly.', 'error');
        }

        // Reset button
        setTimeout(() => {
            btnText.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.background = '';
        }, 3000);
    });
};

/* ============ NOTIFICATION ============ */
const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 2rem;
        background: ${type === 'success' ? '#34C759' : '#ff6b00'};
        color: white;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 400);
    }, 4000);
};

/* ============ SCROLL REVEAL ============ */
const initScrollReveal = () => {
    const reveals = document.querySelectorAll('.service-card, .portfolio-item, .stat-item');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal', 'active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    reveals.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
};

/* ============ NAVBAR SCROLL EFFECT ============ */
const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
};

/* ============ LAZY LOAD IFRAMES ============ */
const initLazyIframes = () => {
    const iframes = document.querySelectorAll('iframe');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '100px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                if (iframe.dataset.src) {
                    iframe.src = iframe.dataset.src;
                    iframe.removeAttribute('data-src');
                }
                observer.unobserve(iframe);
            }
        });
    }, observerOptions);
    
    iframes.forEach(iframe => {
        iframe.setAttribute('loading', 'lazy');
        observer.observe(iframe);
    });
};

/* ============ CURSOR EFFECT (Optional) ============ */
const initCursor = () => {
    // Only on desktop
    if (window.innerWidth > 768) {
        const cursor = document.createElement('div');
        cursor.style.cssText = `
            width: 20px;
            height: 20px;
            border: 2px solid #ff6b00;
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.1s ease;
            display: none;
        `;
        document.body.appendChild(cursor);

        document.addEventListener('mousemove', (e) => {
            cursor.style.display = 'block';
            cursor.style.left = e.clientX - 10 + 'px';
            cursor.style.top = e.clientY - 10 + 'px';
        });

        // Enlarge on hover
        document.querySelectorAll('a, button, .service-card, .portfolio-item').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'scale(1.5)';
                cursor.style.background = 'rgba(255, 107, 0, 0.2)';
            });
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'scale(1)';
                cursor.style.background = 'transparent';
            });
        });
    }
};

/* ============ PERFORMANCE OPTIMIZATION ============ */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/* ============ INITIALIZATION ============ */
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🎨 Figma Design Loaded', 'font-size: 16px; color: #ff6b00; font-weight: 600;');
    console.log('%cDark Theme • Orange Accents', 'font-size: 12px; color: #cccccc;');

    // Initialize all features
    initMobileNav();
    initSmoothScroll();
    initActiveNav();
    animateSkills();
    initPortfolioFilter();
    initContactForm();
    initScrollReveal();
    initNavbarScroll();
    initLazyIframes();
    initCursor();
});

// Page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Resize handler
window.addEventListener('resize', debounce(() => {
    // Handle any resize logic
}, 250));

console.log('%c✨ Portfolio Ready', 'font-size: 14px; color: #999999;');
