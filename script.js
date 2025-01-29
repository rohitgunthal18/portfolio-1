// Mobile menu functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Smooth scrolling with enhanced easing
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });

        // Close mobile menu if open
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// Active nav link highlighting
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
        }
    });
});

// 3D Parallax effect for hero section
const hero = document.querySelector('.hero');
const heroContent = document.querySelector('.hero-content');
const heroShape = document.querySelector('.hero-shape');

hero.addEventListener('mousemove', (e) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    
    heroContent.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateZ(50px)`;
    heroShape.style.transform = `translateX(${-xAxis * 2}px) translateY(${-yAxis * 2}px)`;
});

// Reset transforms on mouse leave
hero.addEventListener('mouseleave', () => {
    heroContent.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0)';
    heroShape.style.transform = 'translateX(0) translateY(0)';
});

// Particle effect
function createParticles() {
    const particles = document.querySelector('.hero-particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particles.appendChild(particle);
    }
}

createParticles();

// Skill cards 3D effect
const skillCards = document.querySelectorAll('.skill-card');

skillCards.forEach(card => {
    card.addEventListener('mousemove', handleSkillCardTilt);
    card.addEventListener('mouseleave', resetSkillCardTilt);
});

function handleSkillCardTilt(e) {
    const card = this;
    const cardRect = card.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    const angleX = (e.clientY - cardCenterY) / 10;
    const angleY = -(e.clientX - cardCenterX) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.05, 1.05, 1.05)`;
}

function resetSkillCardTilt(e) {
    this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
}

// Project cards hover effect
const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach(card => {
    card.addEventListener('mouseenter', handleProjectCardEnter);
    card.addEventListener('mouseleave', handleProjectCardLeave);
    card.addEventListener('mousemove', handleProjectCardMove);
});

function handleProjectCardEnter(e) {
    this.style.transform = 'translateY(-10px) scale(1.02)';
    const overlay = this.querySelector('.project-overlay');
    overlay.style.opacity = '1';
}

function handleProjectCardLeave(e) {
    this.style.transform = 'translateY(0) scale(1)';
    const overlay = this.querySelector('.project-overlay');
    overlay.style.opacity = '0';
}

function handleProjectCardMove(e) {
    const card = this;
    const cardRect = card.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    const angleX = (e.clientY - cardCenterY) / 25;
    const angleY = -(e.clientX - cardCenterX) / 25;
    
    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-10px)`;
}

// Project Filtering
const filterButtons = document.querySelectorAll('.filter-btn');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        const filterValue = button.getAttribute('data-filter');
        
        projectCards.forEach(card => {
            if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    });
});

// Initialize Intersection Observer for project cards
const projectObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            projectObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2
});

projectCards.forEach(card => {
    projectObserver.observe(card);
});

// Enhanced form submission with animation
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Animate submit button
        const submitButton = this.querySelector('.submit-button');
        submitButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            submitButton.style.transform = 'scale(1)';
        }, 200);

        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // Here you would typically send this data to a server
        console.log('Form submitted:', data);
        
        // Show success message with animation
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Thank you for your message! I will get back to you soon.';
        successMessage.style.opacity = '0';
        successMessage.style.transform = 'translateY(20px)';
        
        this.appendChild(successMessage);
        
        // Animate success message
        requestAnimationFrame(() => {
            successMessage.style.opacity = '1';
            successMessage.style.transform = 'translateY(0)';
        });

        // Reset form
        this.reset();
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            successMessage.style.opacity = '0';
            successMessage.style.transform = 'translateY(-20px)';
            setTimeout(() => successMessage.remove(), 300);
        }, 3000);
    });
}

// Scroll animations
const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.querySelectorAll('.section-title, .about-content > *, .project-card, .skill-card, .contact-form').forEach((el) => {
    el.classList.add('animate-hidden');
    observer.observe(el);
});

// Broken Glass Effect
const canvas = document.getElementById('broken-glass-canvas');
const container = document.querySelector('.broken-glass-container');
const image = document.getElementById('profile-image');

if (canvas && container && image) {
    const ctx = canvas.getContext('2d');
    let isBreaking = false;
    let shards = [];

    function initCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    function createShards(x, y) {
        const numShards = 20;
        const shardSize = 30;
        shards = [];

        for (let i = 0; i < numShards; i++) {
            const angle = (Math.PI * 2 * i) / numShards;
            const distance = Math.random() * 100 + 50;
            
            shards.push({
                x: x,
                y: y,
                targetX: x + Math.cos(angle) * distance,
                targetY: y + Math.sin(angle) * distance,
                rotation: Math.random() * 360,
                opacity: 1,
                size: Math.random() * shardSize + 10
            });
        }
    }

    function drawShards() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        shards.forEach(shard => {
            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate((shard.rotation * Math.PI) / 180);
            ctx.beginPath();
            ctx.moveTo(-shard.size / 2, -shard.size / 2);
            ctx.lineTo(shard.size / 2, 0);
            ctx.lineTo(-shard.size / 2, shard.size / 2);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 255, 255, ${shard.opacity})`;
            ctx.fill();
            ctx.restore();
        });
    }

    function animateShards() {
        if (!isBreaking) return;

        let allDone = true;
        shards.forEach(shard => {
            shard.x += (shard.targetX - shard.x) * 0.1;
            shard.y += (shard.targetY - shard.y) * 0.1;
            shard.opacity *= 0.95;
            
            if (shard.opacity > 0.01) allDone = false;
        });

        drawShards();

        if (!allDone) {
            requestAnimationFrame(animateShards);
        } else {
            isBreaking = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            container.classList.remove('breaking');
        }
    }

    function breakGlass(e) {
        if (isBreaking) return;
        
        isBreaking = true;
        container.classList.add('breaking');
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        createShards(x, y);
        animateShards();

        // Add sound effect
        const glassBreak = new Audio('glass-break.mp3');
        glassBreak.volume = 0.3;
        glassBreak.play().catch(() => {});

        // Fade out the image
        setTimeout(() => {
            image.style.opacity = '0';
            setTimeout(() => {
                image.style.opacity = '1';
            }, 1000);
        }, 100);
    }

    // Initialize
    initCanvas();
    window.addEventListener('resize', initCanvas);
    container.addEventListener('click', breakGlass);
}

//test
