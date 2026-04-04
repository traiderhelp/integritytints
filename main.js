/* ══════════════════════════════════════════════
   INTEGRITY WINDOW TINTING — Interactions
   ══════════════════════════════════════════════ */

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initMobileMenu();
    initScrollReveal();
    initFAQ();
    initContactForm();
    initMobileCTA();
    initSmoothScroll();
    initEstimator();
    initGallery();
});

// ══════════════════════════════════════════════
// STICKY NAV – background on scroll
// ══════════════════════════════════════════════
function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // fire immediately
}

// ══════════════════════════════════════════════
// MOBILE MENU – hamburger toggle
// ══════════════════════════════════════════════
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!hamburger || !mobileMenu) return;

    const toggle = () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggle);

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// ══════════════════════════════════════════════
// SCROLL REVEAL – Intersection Observer
// ══════════════════════════════════════════════
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    // Stagger the reveal for sibling elements
                    const siblingsInView = [...entry.target.parentElement.querySelectorAll('.reveal')]
                        .filter(el => el.getBoundingClientRect().top < window.innerHeight);
                    const index = siblingsInView.indexOf(entry.target);
                    const delay = Math.max(0, index) * 100;

                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay);

                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        }
    );

    elements.forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════
// FAQ ACCORDION
// ══════════════════════════════════════════════
function initFAQ() {
    const items = document.querySelectorAll('.faq__item');
    if (!items.length) return;

    items.forEach(item => {
        const btn = item.querySelector('.faq__question');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            items.forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq__question')?.setAttribute('aria-expanded', 'false');
            });

            // Open clicked (if wasn't already open)
            if (!isActive) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// ══════════════════════════════════════════════
// CONTACT FORM
// ══════════════════════════════════════════════
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = document.getElementById('submitBtn');
        const originalHTML = btn.innerHTML;

        // Show loading state
        btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Sending...
    `;
        btn.disabled = true;

        // Submit to Netlify
        const formData = new FormData(form);

        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
        })
        .then(response => {
            if (response.ok) {
                btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Quote Requested!
          `;
                btn.style.background = '#10b981';
                form.reset();
            } else {
                throw new Error('Form submission failed');
            }
        })
        .catch(error => {
            btn.innerHTML = `❌ Error — Please call us instead`;
            btn.style.background = '#ef4444';
        })
        .finally(() => {
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.style.background = '';
            }, 3000);
        });
    });
}

// ══════════════════════════════════════════════
// MOBILE STICKY CTA – show after scrolling past hero
// ══════════════════════════════════════════════
function initMobileCTA() {
    const cta = document.getElementById('mobileCta');
    const hero = document.getElementById('hero');
    if (!cta || !hero) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            cta.classList.toggle('visible', !entry.isIntersecting);
        },
        { threshold: 0.1 }
    );

    observer.observe(hero);
}

// ══════════════════════════════════════════════
// SMOOTH SCROLL – for anchor links
// ══════════════════════════════════════════════
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ══════════════════════════════════════════════
// INSTANT ESTIMATOR
// ══════════════════════════════════════════════
function initEstimator() {
    const RATES = {
        'Solar Film': 10.50,
        'Solar+With Removal': 13,
        'Safety/Security': 14.50,
        'Safety+With Removal': 18,
        'Decorative/Custom Work': 0,
        'Remove Old Tint Only': 3
    };

    const ROOMS = [
        '', 'Other', 'Dining', 'Living', 'Kitchen',
        'Great', 'Office', 'Den', 'Bed Room', 'Bath',
        'Master Bed', 'Master Bath', 'Florida', 'Garage'
    ];

    const PRODUCTS = Object.keys(RATES);

    const body = document.getElementById('estimatorBody');
    const totalEl = document.getElementById('estimatorTotal');

    const addBtn = document.getElementById('addRowBtn');

    if (!body || !totalEl || !addBtn) return;

    function createRow() {
        const tr = document.createElement('tr');

        // Room select
        const roomTd = document.createElement('td');
        roomTd.setAttribute('data-label', 'Room');
        const roomSelect = document.createElement('select');
        roomSelect.setAttribute('aria-label', 'Room');
        ROOMS.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r || 'Select Room';
            roomSelect.appendChild(opt);
        });
        roomTd.appendChild(roomSelect);
        tr.appendChild(roomTd);

        // Width
        const widthTd = document.createElement('td');
        widthTd.setAttribute('data-label', 'Width (in)');
        const widthInput = document.createElement('input');
        widthInput.type = 'number'; widthInput.min = '0'; widthInput.step = '0.1';
        widthInput.placeholder = 'Width';
        widthInput.addEventListener('input', recalculate);
        widthTd.appendChild(widthInput);
        tr.appendChild(widthTd);

        // Height
        const heightTd = document.createElement('td');
        heightTd.setAttribute('data-label', 'Height (in)');
        const heightInput = document.createElement('input');
        heightInput.type = 'number'; heightInput.min = '0'; heightInput.step = '0.1';
        heightInput.placeholder = 'Height';
        heightInput.addEventListener('input', recalculate);
        heightTd.appendChild(heightInput);
        tr.appendChild(heightTd);

        // Quantity
        const qtyTd = document.createElement('td');
        qtyTd.setAttribute('data-label', 'Qty');
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number'; qtyInput.min = '1'; qtyInput.value = '1';
        qtyInput.placeholder = 'Qty';
        qtyInput.addEventListener('input', recalculate);
        qtyTd.appendChild(qtyInput);
        tr.appendChild(qtyTd);

        // Product select
        const productTd = document.createElement('td');
        productTd.setAttribute('data-label', 'Product');
        const productSelect = document.createElement('select');
        productSelect.setAttribute('aria-label', 'Product');
        const defaultOpt = document.createElement('option');
        defaultOpt.value = ''; defaultOpt.textContent = 'Select Product';
        productSelect.appendChild(defaultOpt);
        PRODUCTS.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            productSelect.appendChild(opt);
        });
        productSelect.addEventListener('change', recalculate);
        productTd.appendChild(productSelect);
        tr.appendChild(productTd);

        // Price
        const priceTd = document.createElement('td');
        priceTd.setAttribute('data-label', 'Price');
        priceTd.className = 'estimator__price-cell';
        priceTd.textContent = '$0.00';
        tr.appendChild(priceTd);

        body.appendChild(tr);
        return tr;
    }

    function recalculate() {
        let total = 0;
        const rows = body.querySelectorAll('tr');

        rows.forEach(row => {
            const inputs = row.querySelectorAll('input[type="number"]');
            const selects = row.querySelectorAll('select');
            const priceCell = row.querySelector('.estimator__price-cell');

            if (!priceCell || inputs.length < 3 || selects.length < 2) return;

            const width = parseFloat(inputs[0].value) || 0;
            const height = parseFloat(inputs[1].value) || 0;
            const qty = parseInt(inputs[2].value) || 1;
            const product = selects[1].value;

            if (product === 'Decorative/Custom Work') {
                priceCell.textContent = 'Submit for pricing';
                priceCell.className = 'estimator__price-cell estimator__price-cell--custom';
                return;
            }

            priceCell.className = 'estimator__price-cell';

            const rate = RATES[product] || 0;
            const sqft = (width * height) / 144;
            const price = sqft * qty * rate;

            priceCell.textContent = '$' + price.toFixed(2);
            total += price;
        });

        totalEl.textContent = '$' + total.toFixed(2);
    }

    // Start with 3 rows
    for (let i = 0; i < 3; i++) createRow();

    addBtn.addEventListener('click', () => {
        createRow();
    });
}

// ─── CSS Keyframe for spinner ───
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

// ─── Dynamic Gallery (CMS-driven) ───
function initGallery() {
    const baGrid = document.getElementById('baGrid');
    const projectsGrid = document.getElementById('projectsGrid');
    if (!baGrid && !projectsGrid) return;

    fetch('/gallery-data.json')
        .then(res => res.json())
        .then(data => {
            // Render Before & After cards
            if (baGrid && data.beforeAfter) {
                baGrid.innerHTML = data.beforeAfter.map(item => `
                    <div class="ba-card reveal">
                        <div class="ba-card__images">
                            <div class="ba-card__side">
                                <span class="ba-card__label">Before</span>
                                <img src="${item.beforeImage}" alt="${item.beforeAlt}" loading="lazy" />
                            </div>
                            <div class="ba-card__side">
                                <span class="ba-card__label">After</span>
                                <img src="${item.afterImage}" alt="${item.afterAlt}" loading="lazy" />
                            </div>
                            <div class="ba-card__divider"></div>
                        </div>
                        <div class="ba-card__body">
                            <h3 class="ba-card__title">${item.title}</h3>
                            <p class="ba-card__desc">${item.description}</p>
                        </div>
                    </div>
                `).join('');
            }

            // Render Project cards
            if (projectsGrid && data.projects) {
                projectsGrid.innerHTML = data.projects.map(item => `
                    <div class="project-card">
                        <img src="${item.image}" alt="${item.alt}" loading="lazy" />
                        <div class="project-card__overlay"></div>
                        <span class="project-card__caption">${item.caption}</span>
                    </div>
                `).join('');

                // Init carousel after rendering
                initProjectCarousel(data.projects.length);
            }

            // Re-run scroll reveal for dynamically added elements
            initScrollReveal();
        })
        .catch(err => {
            console.error('Failed to load gallery data:', err);
        });
}

// ─── Project Photos Carousel ───
function initProjectCarousel(totalItems) {
    const grid = document.getElementById('projectsGrid');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    if (!grid || !prevBtn || !nextBtn) return;

    let currentIndex = 0;

    function getVisibleCount() {
        const width = window.innerWidth;
        if (width <= 540) return 1;
        if (width <= 900) return 2;
        return 3;
    }

    function getMaxIndex() {
        const visible = getVisibleCount();
        return Math.max(0, totalItems - visible);
    }

    function updateCarousel() {
        const cards = grid.children;
        if (!cards.length) return;
        // Measure actual card width + gap from the DOM
        const firstCard = cards[0];
        const cardStyle = getComputedStyle(grid);
        const gap = parseFloat(cardStyle.gap) || 24;
        const cardWidth = firstCard.offsetWidth + gap;
        const offset = currentIndex * cardWidth;
        grid.style.transform = `translateX(-${offset}px)`;

        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= getMaxIndex();
    }

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < getMaxIndex()) {
            currentIndex++;
            updateCarousel();
        }
    });

    // Reset on resize
    window.addEventListener('resize', () => {
        if (currentIndex > getMaxIndex()) {
            currentIndex = getMaxIndex();
        }
        updateCarousel();
    });

    // Initial state
    updateCarousel();
}
