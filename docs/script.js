// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Install tabs
const tabs = document.querySelectorAll('.install-tab');
const codeBlocks = document.querySelectorAll('.install-code');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active code block
        codeBlocks.forEach(block => {
            if (block.dataset.content === targetTab) {
                block.classList.add('active');
            } else {
                block.classList.remove('active');
            }
        });
    });
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(section);
});

// Add header shadow on scroll
let lastScroll = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Parallax effect for hero
const hero = document.querySelector('.hero');
if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.5;
        hero.style.transform = `translate3d(0, ${rate}px, 0)`;
    });
}

// Copy code to clipboard functionality
const codeBlocks2 = document.querySelectorAll('.install-code pre code');
codeBlocks2.forEach(block => {
    const pre = block.parentElement;
    const wrapper = pre.parentElement;

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = 'Copy';
    copyButton.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        padding: 6px 12px;
        background-color: rgba(230, 232, 235, 0.1);
        border: 1px solid rgba(230, 232, 235, 0.2);
        border-radius: 4px;
        color: var(--color-text-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;

    wrapper.style.position = 'relative';
    wrapper.appendChild(copyButton);

    copyButton.addEventListener('click', async () => {
        const text = block.textContent;
        try {
            await navigator.clipboard.writeText(text);
            copyButton.innerHTML = 'Copied!';
            copyButton.style.backgroundColor = 'rgba(0, 217, 255, 0.2)';
            copyButton.style.borderColor = 'var(--color-primary)';
            copyButton.style.color = 'var(--color-primary)';

            setTimeout(() => {
                copyButton.innerHTML = 'Copy';
                copyButton.style.backgroundColor = 'rgba(230, 232, 235, 0.1)';
                copyButton.style.borderColor = 'rgba(230, 232, 235, 0.2)';
                copyButton.style.color = 'var(--color-text-muted)';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });

    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.backgroundColor = 'rgba(230, 232, 235, 0.15)';
        copyButton.style.borderColor = 'rgba(230, 232, 235, 0.3)';
    });

    copyButton.addEventListener('mouseleave', () => {
        if (copyButton.innerHTML === 'Copy') {
            copyButton.style.backgroundColor = 'rgba(230, 232, 235, 0.1)';
            copyButton.style.borderColor = 'rgba(230, 232, 235, 0.2)';
        }
    });
});

// Add loading state
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease-in';
});

// Initial state
document.body.style.opacity = '0';

// Statistics counter animation with proper suffix handling
const animateValue = (element, start, end, duration, suffix = '') => {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end + suffix;
        }
    };
    window.requestAnimationFrame(step);
};

// Observe stats and trigger animation when visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            entry.target.classList.add('animated');
            const originalValue = entry.target.textContent.trim();

            // Extract number and suffix
            const numMatch = originalValue.match(/^([\d.]+)/);
            if (numMatch) {
                const numericValue = parseInt(numMatch[1]);
                const suffix = originalValue.substring(numMatch[0].length);

                if (!isNaN(numericValue)) {
                    animateValue(entry.target, 0, numericValue, 1500, suffix);
                }
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-value').forEach(stat => {
    statsObserver.observe(stat);
});
