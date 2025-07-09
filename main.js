// DOM Elements
const skillCards = document.querySelectorAll('.skill-card');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const designCards = document.querySelectorAll('.design-card');
const testimonialDots = document.querySelectorAll('.dot');
const testimonials = document.querySelectorAll('.testimonial');
const floatingCta = document.querySelector('.floating-cta');
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const nav = document.querySelector('nav ul');
const header = document.querySelector('header');

// Initialize ScrollReveal
const sr = ScrollReveal({
    origin: 'bottom',
    distance: '50px',
    duration: 1000,
    delay: 200,
    easing: 'cubic-bezier(0.5, 0, 0, 1)',
    reset: false
});

// Initialize GSAP
const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

// Handle iframe loading
function initIframeLoading() {
    const iframes = document.querySelectorAll('.project-iframe');
    
    iframes.forEach(iframe => {
        // Add load event listener
        iframe.addEventListener('load', function() {
            const loadingSpinner = this.parentElement.querySelector('.project-preview-loading');
            if (loadingSpinner) {
                loadingSpinner.style.opacity = '0';
                setTimeout(() => {
                    loadingSpinner.style.display = 'none';
                }, 500);
            }
        });
        
        // Add error event listener
        iframe.addEventListener('error', function() {
            const loadingSpinner = this.parentElement.querySelector('.project-preview-loading');
            if (loadingSpinner) {
                // Change loading spinner to error message
                loadingSpinner.innerHTML = `
                    <div class="preview-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Preview unavailable</p>
                    </div>
                `;
                loadingSpinner.classList.add('preview-error-container');
            }
        });
        
        // Set a timeout in case iframe takes too long to load
        setTimeout(() => {
            // If still loading (spinner is visible), show a message
            const loadingSpinner = iframe.parentElement.querySelector('.project-preview-loading');
            if (loadingSpinner && loadingSpinner.style.display !== 'none') {
                // Check if iframe has loaded content
                try {
                    // If we can't access iframe content, it might be due to cross-origin restrictions
                    // In that case, we'll just leave the spinner running
                    if (iframe.contentDocument === null) {
                        return;
                    }
                } catch (e) {
                    // Cross-origin error, leave the spinner running
                    return;
                }
                
                // If we get here, iframe is still loading but accessible
                // We could add additional handling here if needed
            }
        }, 8000); // 8 second timeout
    });
}

// Particle Animation for Hero Section
function createParticles() {
    const particlesContainer = document.querySelector('.particles-container');
    const colors = ['#00FFC6', '#FF00D4', '#0070FF'];
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random properties
        const size = Math.random() * 5 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        // Apply styles
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
        particle.style.left = `${x}%`;
        particle.style.top = `${y}%`;
        particle.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
        
        particlesContainer.appendChild(particle);
    }
}

// Initialize Skill Bars
function initSkillBars() {
    skillCards.forEach(card => {
        const level = card.getAttribute('data-level');
        const skillBar = card.querySelector('.skill-level');
        
        // Set width based on skill level
        skillBar.style.width = `${level}%`;
    });
}

// Tab Functionality
function initTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Testimonial Slider
function initTestimonialSlider() {
    let currentSlide = 0;
    
    function showSlide(index) {
        // Hide all testimonials and remove active class from dots
        testimonials.forEach(testimonial => {
            testimonial.style.display = 'none';
        });
        testimonialDots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // Show current testimonial and add active class to current dot
        testimonials[index].style.display = 'block';
        testimonialDots[index].classList.add('active');
    }
    
    // Initialize with first slide
    showSlide(currentSlide);
    
    // Add click event to dots
    testimonialDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            currentSlide = index;
        });
    });
    
    // Auto slide
    setInterval(() => {
        currentSlide = (currentSlide + 1) % testimonials.length;
        showSlide(currentSlide);
    }, 5000);
}

// Floating CTA Interaction
function initFloatingCta() {
    floatingCta.addEventListener('click', () => {
        document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Remove hover functionality for cta-text
    // The text will now be controlled by CSS only
}

// Mobile Navigation Toggle
function initMobileNav() {
    mobileNavToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileNavToggle.classList.toggle('active');
    });
    
    // Close mobile nav when clicking on a link
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (nav.classList.contains('active')) {
                nav.classList.remove('active');
                mobileNavToggle.classList.remove('active');
            }
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    // Reveal elements on scroll
    sr.reveal('.section-title', { origin: 'top' });
    sr.reveal('.skill-card', { interval: 100 });
    sr.reveal('.project-card', { interval: 200 });
    sr.reveal('.design-card', { interval: 150 });
    sr.reveal('.testimonial', {});
    sr.reveal('.about-image', { origin: 'left' });
    sr.reveal('.about-content', { origin: 'right', delay: 300 });
    sr.reveal('.contact-form', { origin: 'left' });
    sr.reveal('.contact-info', { origin: 'right', delay: 300 });
    
    // Add class to design cards on scroll
    const designObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
            }
        });
    }, { threshold: 0.2 });
    
    designCards.forEach(card => {
        designObserver.observe(card);
    });
    
    // Header scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// GSAP Animations
function initGsapAnimations() {
    // Hero section animations
    tl.from('.animated-headline', { opacity: 0, y: 50, duration: 1 })
      .from('.subheadline', { opacity: 0, y: 30, duration: 0.8 }, '-=0.3')
      .from('.cta-button', { opacity: 0, y: 30, duration: 0.8 }, '-=0.5');
      
    // Animate neon text elements
    gsap.to('.neon-text', {
        textShadow: '0 0 15px rgba(0, 255, 198, 0.9), 0 0 30px rgba(0, 255, 198, 0.5)',
        repeat: -1,
        yoyo: true,
        duration: 2
    });
}

// Form Submission
function initContactForm() {
    const form = document.querySelector('.contact-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        // Simple validation
        if (!name || !email || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        // Animation for submit button
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.innerHTML = 'Message Sent!';
        submitBtn.style.backgroundColor = 'var(--neon-cyan)';
        submitBtn.style.color = 'var(--bg-dark)';
        submitBtn.style.borderColor = 'var(--neon-cyan)';
        
        // Reset form
        setTimeout(() => {
            form.reset();
            submitBtn.innerHTML = 'Shoot Me a Message';
            submitBtn.style.backgroundColor = 'transparent';
            submitBtn.style.color = 'var(--neon-magenta)';
            submitBtn.style.borderColor = 'var(--neon-magenta)';
        }, 3000);
        
        // Here you would normally send the form data to a server
        console.log('Form submitted:', { name, email, message });
    });
}

// Smooth Scroll for Navigation Links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// CSS Particle Animation
function addParticleStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .particle {
            position: absolute;
            border-radius: 50%;
            opacity: 0.6;
            pointer-events: none;
        }
        
        @keyframes float {
            0%, 100% {
                transform: translateY(0) translateX(0) rotate(0);
            }
            25% {
                transform: translateY(-30px) translateX(15px) rotate(90deg);
            }
            50% {
                transform: translateY(-15px) translateX(30px) rotate(180deg);
            }
            75% {
                transform: translateY(30px) translateX(15px) rotate(270deg);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const navMenu = document.querySelector('nav ul');
    
    mobileNavToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Header Scroll Effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Initialize iframe loading
    initIframeLoading();
    
    // Particle Effect in Hero Section
    const particlesContainer = document.querySelector('.particles-container');
    
    function createParticles() {
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            let particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random position, size and animation duration
            const size = Math.random() * 5 + 1;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * 5;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            // Random color from our neon palette
            const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-blue)', 'var(--neon-purple)', 'var(--neon-yellow)'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = randomColor;
            particle.style.boxShadow = `0 0 10px ${randomColor}`;
            
            particlesContainer.appendChild(particle);
        }
    }
    
    // Initialize particles
    createParticles();
    
    // Scroll Indicator Click
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function() {
            const skillsSection = document.getElementById('skills');
            skillsSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Interactive headline words
    const highlightWords = document.querySelectorAll('.highlight-word');
    highlightWords.forEach(word => {
        word.addEventListener('mouseenter', function() {
            // Add a small pop effect
            gsap.to(this, {
                scale: 1.05,
                y: -5,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        word.addEventListener('mouseleave', function() {
            // Reset to normal
            gsap.to(this, {
                scale: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
    
    // Skill Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Animate skill bars in the active tab
            animateSkillBars(document.getElementById(tabId));
        });
    });
    
    // Animate skill bars
    function animateSkillBars(container) {
        const skillCards = container.querySelectorAll('.skill-card');
        
        skillCards.forEach(card => {
            const skillLevel = card.getAttribute('data-level');
            const skillBar = card.querySelector('.skill-level');
            
            // Reset first
            skillBar.style.width = '0%';
            
            // Then animate
            setTimeout(() => {
                skillBar.style.width = skillLevel + '%';
            }, 100);
        });
    }
    
    // Initialize first tab's skill bars
    animateSkillBars(document.querySelector('.tab-content.active'));
    
    // Scroll Reveal Animations
    const sr = ScrollReveal({
        origin: 'bottom',
        distance: '30px',
        duration: 1000,
        delay: 200,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        reset: false
    });
    
    sr.reveal('.design-card', { interval: 200 });
    sr.reveal('.project-card', { interval: 200 });
    sr.reveal('.about-image', { origin: 'left' });
    sr.reveal('.about-content', { origin: 'right', delay: 300 });
    sr.reveal('.education-item', { interval: 150 });
    sr.reveal('.soft-skill-tag', { interval: 50, distance: '10px' });
    
    // Badge hover effect with GSAP
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            gsap.to(this, {
                y: -5,
                scale: 1.05,
                boxShadow: '0 0 15px rgba(0, 255, 198, 0.5)',
                duration: 0.3
            });
        });
        
        badge.addEventListener('mouseleave', function() {
            gsap.to(this, {
                y: 0,
                scale: 1,
                boxShadow: 'none',
                duration: 0.3
            });
        });
    });
    
    // Soft skill tags animation
    const softSkillTags = document.querySelectorAll('.soft-skill-tag');
    softSkillTags.forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            gsap.to(this, {
                y: -5,
                scale: 1.05,
                boxShadow: '0 0 15px rgba(0, 255, 198, 0.5)',
                background: 'rgba(0, 255, 198, 0.2)',
                duration: 0.3
            });
        });
        
        tag.addEventListener('mouseleave', function() {
            gsap.to(this, {
                y: 0,
                scale: 1,
                boxShadow: 'none',
                background: 'rgba(0, 255, 198, 0.1)',
                duration: 0.3
            });
        });
    });
    
    // Education items animation
    const educationItems = document.querySelectorAll('.education-content');
    educationItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            gsap.to(this, {
                y: -5,
                boxShadow: '0 0 15px rgba(0, 255, 198, 0.5)',
                borderColor: 'var(--neon-cyan)',
                duration: 0.3
            });
        });
        
        item.addEventListener('mouseleave', function() {
            gsap.to(this, {
                y: 0,
                boxShadow: 'none',
                borderColor: 'var(--glass-border)',
                duration: 0.3
            });
        });
    });
    
    // Add CSS for particles
    const style = document.createElement('style');
    style.innerHTML = `
        .particle {
            position: absolute;
            border-radius: 50%;
            opacity: 0.6;
            pointer-events: none;
            animation: float-particle linear infinite;
        }
        
        @keyframes float-particle {
            0% {
                transform: translateY(0) translateX(0) scale(1);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.4;
            }
            100% {
                transform: translateY(-100vh) translateX(calc(var(--random-x) * 100px)) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add random movement to particles
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
        particle.style.setProperty('--random-x', (Math.random() * 2 - 1).toFixed(2));
    });
    
    // Dopamine-driven micro-interactions
    function setupMicroInteractions() {
        // CTA button interaction
        const ctaButtons = document.querySelectorAll('.cta-button');
        ctaButtons.forEach(button => {
            button.addEventListener('mouseenter', function() {
                gsap.to(this, {
                    scale: 1.05,
                    y: -5,
                    // Remove letter spacing change to avoid layout shifts
                    // letterSpacing: '3px',
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            button.addEventListener('mouseleave', function() {
                gsap.to(this, {
                    scale: 1,
                    y: 0,
                    // Remove letter spacing change to avoid layout shifts
                    // letterSpacing: '2px',
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            button.addEventListener('click', function() {
                // Add a click effect
                gsap.timeline()
                    .to(this, {
                        scale: 0.95,
                        duration: 0.1
                    })
                    .to(this, {
                        scale: 1,
                        duration: 0.2
                    });
            });
        });
    }
    
    setupMicroInteractions();
});

// Add a cursor trail effect for extra dopamine
document.addEventListener('mousemove', function(e) {
    createCursorTrail(e);
});

function createCursorTrail(e) {
    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    document.body.appendChild(trail);
    
    // Position the trail at the cursor
    trail.style.left = `${e.pageX}px`;
    trail.style.top = `${e.pageY}px`;
    
    // Random color from our neon palette
    const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-blue)', 'var(--neon-purple)', 'var(--neon-yellow)'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Set trail properties
    trail.style.backgroundColor = randomColor;
    trail.style.boxShadow = `0 0 10px ${randomColor}`;
    
    // Animate and remove
    setTimeout(() => {
        trail.style.opacity = '0';
        trail.style.transform = 'scale(0)';
        
        setTimeout(() => {
            document.body.removeChild(trail);
        }, 500);
    }, 10);
}

// Add cursor trail styles
const cursorStyle = document.createElement('style');
cursorStyle.innerHTML = `
    .cursor-trail {
        position: absolute;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.7;
        transition: transform 0.5s ease, opacity 0.5s ease;
    }
`;
document.head.appendChild(cursorStyle); 
