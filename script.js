document.addEventListener('DOMContentLoaded', () => {
    const glassCard = document.querySelector('.glass-card');
    const bgText = document.querySelectorAll('.bg-text');
    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const header = document.querySelector('header');

    // ===== Header Glass on Scroll =====
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        });
    }

    // ===== Hamburger Menu Toggle =====
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });

        // Close menu when a link is clicked
        const mobileLinks = mobileNav.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
    }

    // ===== Parallax (Desktop Only) =====
    const isMobile = () => window.innerWidth <= 768;

    document.addEventListener('mousemove', (e) => {
        if (isMobile()) return; // Skip parallax on mobile

        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const deltaX = (clientX - centerX) / centerX;
        const deltaY = (clientY - centerY) / centerY;

        // Move background text slightly
        bgText.forEach((text, index) => {
            const speed = (index + 1) * 10;
            text.style.transform = `translate(${deltaX * speed}px, ${deltaY * speed}px)`;
        });

        // Slight tilt for the glass card
        if (glassCard) {
            const tiltX = deltaY * 3;
            const tiltY = -deltaX * 3;
            glassCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }
    });

    // Reset transitions when mouse leaves
    document.addEventListener('mouseleave', () => {
        if (isMobile()) return;
        bgText.forEach(text => {
            text.style.transform = 'translate(0, 0)';
        });
        if (glassCard) {
            glassCard.style.transform = 'rotateX(0) rotateY(0)';
        }
    });

    // ===== Social Icon Reveal Animation =====
    const socials = document.querySelectorAll('.social-icons a');
    socials.forEach((social, index) => {
        social.style.opacity = '0';
        social.style.transform = 'translateY(20px)';
        social.style.transition = 'all 0.5s ease-out';

        setTimeout(() => {
            social.style.opacity = '1';
            social.style.transform = 'translateY(0)';
        }, 1500 + (index * 100));
    });

    // ===== About Section Tab Switching =====
    const tabButtons = document.querySelectorAll('.about-tab-btn');
    const panels = document.querySelectorAll('.about-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Remove active from all buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            btn.classList.add('active');

            // Remove active from all panels
            panels.forEach(p => p.classList.remove('active'));
            // Show target panel
            const targetPanel = document.getElementById(`panel-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // ===== Education Timeline Scroll Reveal =====
    const eduNodes = document.querySelectorAll('.edu-node');
    if (eduNodes.length > 0) {
        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        };

        const eduObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateX(0)';
                    eduObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        eduNodes.forEach((node, index) => {
            node.style.opacity = '0';
            node.style.transform = 'translateX(-30px)';
            node.style.transition = `all 0.6s ease-out ${index * 0.2}s`;
            eduObserver.observe(node);
        });
    }

    // ===== About Section Scroll Reveal =====
    const aboutSection = document.querySelector('.about');
    if (aboutSection) {
        const aboutObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    aboutObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        aboutObserver.observe(aboutSection);
    }

    // ===== PROJECTS SECTION =====

    // --- Image Lightbox ---
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    let currentLightboxImages = [];
    let currentLightboxIndex = 0;

    function openLightbox(card, startIndex) {
        const images = card.querySelectorAll('.img-main img');
        currentLightboxImages = Array.from(images).map(img => img.src);
        currentLightboxIndex = startIndex;
        updateLightbox();
        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        if (currentLightboxImages.length > 0) {
            lightboxImg.src = currentLightboxImages[currentLightboxIndex];
            lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
        }
    }

    function closeLightbox() {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function lightboxNavigate(direction) {
        currentLightboxIndex += direction;
        if (currentLightboxIndex < 0) currentLightboxIndex = currentLightboxImages.length - 1;
        if (currentLightboxIndex >= currentLightboxImages.length) currentLightboxIndex = 0;
        updateLightbox();
    }

    // Lightbox event listeners
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => lightboxNavigate(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => lightboxNavigate(1));

    // Click on backdrop to close
    const lightboxBackdrop = document.querySelector('.lightbox-backdrop');
    if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxNavigate(-1);
        if (e.key === 'ArrowRight') lightboxNavigate(1);
    });

    // --- Project Image Carousel ---
    function switchSlide(card, index) {
        const slides = card.querySelectorAll('.img-main');
        const thumbs = card.querySelectorAll('.img-thumb');
        slides.forEach(s => s.classList.remove('active-slide'));
        thumbs.forEach(t => t.classList.remove('active-thumb'));
        const targetSlide = card.querySelector(`.img-main[data-index="${index}"]`);
        const targetThumb = card.querySelector(`.img-thumb[data-index="${index}"]`);
        if (targetSlide) targetSlide.classList.add('active-slide');
        if (targetThumb) targetThumb.classList.add('active-thumb');
    }

    // Thumbnail click to switch slides
    document.querySelectorAll('.project-card').forEach(card => {
        card.querySelectorAll('.img-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(thumb.dataset.index);
                switchSlide(card, index);
            });
        });

        // Auto-rotate slides every 4 seconds
        let autoRotate = setInterval(() => {
            const activeSlide = card.querySelector('.img-main.active-slide');
            const slides = card.querySelectorAll('.img-main');
            let currentIdx = activeSlide ? parseInt(activeSlide.dataset.index) : 0;
            let nextIdx = (currentIdx + 1) % slides.length;
            switchSlide(card, nextIdx);
        }, 4000);

        // Pause auto-rotate on hover
        const imagesContainer = card.querySelector('.project-images');
        if (imagesContainer) {
            imagesContainer.addEventListener('mouseenter', () => clearInterval(autoRotate));
            imagesContainer.addEventListener('mouseleave', () => {
                autoRotate = setInterval(() => {
                    const activeSlide = card.querySelector('.img-main.active-slide');
                    const slides = card.querySelectorAll('.img-main');
                    let currentIdx = activeSlide ? parseInt(activeSlide.dataset.index) : 0;
                    let nextIdx = (currentIdx + 1) % slides.length;
                    switchSlide(card, nextIdx);
                }, 4000);
            });
        }
    });

    // Attach image click handlers for lightbox (click on slide opens lightbox)
    document.querySelectorAll('.project-card').forEach(card => {
        card.querySelectorAll('.img-main').forEach(imgContainer => {
            imgContainer.addEventListener('click', () => {
                const index = parseInt(imgContainer.dataset.index) || 0;
                openLightbox(card, index);
            });
        });
    });

    // --- Project Details Modal ---
    const detailsModal = document.getElementById('details-modal');
    const detailsTitle = document.getElementById('details-title');
    const detailsStack = document.getElementById('details-stack');
    const detailsBody = document.getElementById('details-body');
    const detailsClose = document.getElementById('details-close');
    const detailsBackdrop = document.querySelector('.details-backdrop');

    function openDetailsModal(projectId) {
        const card = document.querySelector(`[data-project="${projectId}"]`);
        if (!card) return;

        const nameEl = card.querySelector('.project-name') || card.querySelector('.cert-info h3');
        const name = nameEl ? nameEl.textContent : 'Details';
        const stackTags = card.querySelectorAll('.stack-tag');
        const detailData = card.querySelector('.project-detail-data');

        // Set title
        detailsTitle.textContent = name;

        // Set stack tags
        detailsStack.innerHTML = '';
        stackTags.forEach(tag => {
            const clone = tag.cloneNode(true);
            detailsStack.appendChild(clone);
        });

        // Set body content
        if (detailData) {
            detailsBody.innerHTML = detailData.innerHTML;
        }

        detailsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDetailsModal() {
        detailsModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Details button click handlers
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openDetailsModal(btn.dataset.project);
        });
    });

    if (detailsClose) detailsClose.addEventListener('click', closeDetailsModal);
    if (detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetailsModal);

    // Escape key for details modal
    document.addEventListener('keydown', (e) => {
        if (detailsModal && detailsModal.classList.contains('active') && e.key === 'Escape') {
            closeDetailsModal();
        }
    });

    // --- View More Button ---
    const viewMoreBtn = document.getElementById('view-more-btn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', () => {
            // Find all hidden cards (those that aren't show-card and aren't visible by default)
            const hiddenCards = document.querySelectorAll('.project-card:nth-child(n+4), .project-card:nth-child(n+5)');

            hiddenCards.forEach(card => {
                card.classList.add('show-card');
                // Trigger scroll reveal for newly visible cards
                setTimeout(() => card.classList.add('visible'), 100);
            });

            // Hide the wrapper once all are shown
            viewMoreBtn.closest('.view-more-wrapper').style.display = 'none';
        });
    }

    // --- Project Cards Scroll Reveal ---
    const projectCards = document.querySelectorAll('.project-card');
    if (projectCards.length > 0) {
        const projectObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    projectObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        projectCards.forEach((card, index) => {
            card.style.transitionDelay = `${index * 0.15}s`;
            projectObserver.observe(card);
        });
    }

    // --- Contact Section Scroll Reveal ---
    const contactSection = document.querySelector('.contact');
    if (contactSection) {
        const contactObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    contactObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        contactObserver.observe(contactSection);
    }

    // --- Form Handling ---
    const contactForm = document.getElementById('portfolio-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Visual feedback
            const originalText = btnText.innerHTML;
            btnText.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.style.pointerEvents = 'none';
            submitBtn.style.opacity = '0.7';

            // Simulate slight delay then trigger mailto
            setTimeout(() => {
                btnText.innerHTML = 'Message Sent! <i class="fa-solid fa-check"></i>';
                submitBtn.style.borderColor = 'var(--accent-color)';

                // Construct mailto link
                const subject = encodeURIComponent(`Portfolio Message from ${name}`);
                const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
                const mailtoUrl = `mailto:rohitgunthal1819@gmail.com?subject=${subject}&body=${body}`;

                // Reset form
                contactForm.reset();

                // Open mailto link
                setTimeout(() => {
                    window.location.href = mailtoUrl;
                }, 500);

                setTimeout(() => {
                    btnText.innerHTML = originalText;
                    submitBtn.style.pointerEvents = 'all';
                    submitBtn.style.opacity = '1';
                }, 3000);
            }, 1000);
        });

    }

    // --- Contact Card Click Logic (Syncing Active State) ---
    const contactCards = document.querySelectorAll('.contact-card');
    contactCards.forEach(card => {
        card.addEventListener('click', () => {
            contactCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
});
