/**
 * SoftSafe Core - Arquiteto Front-End
 * Sistema Modular de Injeção de Navbar e Footer
 */
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { CONFIG, safeNavigate } from "./config.js";
import "./vv-image.js";

/**
 * Centraliza o carregamento de bibliotecas externas (CDNs)
 * para evitar repetição em todos os ficheiros HTML.
 */
function loadGlobalDependencies() {
    const dependencies = [
        {
            id: 'font-awesome-cdn',
            type: 'link',
            href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
        },
        {
            id: 'phosphor-icons-cdn',
            type: 'script',
            src: 'https://unpkg.com/@phosphor-icons/web'
        }
    ];

    dependencies.forEach(lib => {
        if (document.getElementById(lib.id)) return; // Evita duplicados

        const element = document.createElement(lib.type);
        element.id = lib.id;
        if (lib.type === 'link') {
            element.rel = 'stylesheet';
            element.href = lib.href;
            element.crossOrigin = 'anonymous';
        } else {
            element.src = lib.src;
        }
        document.head.appendChild(element);
    });
}

async function injectComponents() {
    try {
        // Carrega bibliotecas antes de injetar o HTML para evitar ícones "quebrados"
        loadGlobalDependencies();

        const isSubPage = window.location.pathname.includes('/pages/');
        const componentsPath = isSubPage ? 'nav-footer.html' : 'frontend/pages/nav-footer.html';

        const response = await fetch(componentsPath);
        if (!response.ok) throw new Error("Nav-Footer HTML não encontrado");

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // 2. Injeção de Templates no DOM
        const navTpl = doc.getElementById('navbar-template');
        const footTpl = doc.getElementById('footer-template');

        // 2. Substituição do Skeleton pela Navbar Real
        const skeleton = document.getElementById('nav-skeleton');
        if (navTpl) {
            const navContent = document.importNode(navTpl.content, true);
            if (skeleton) {
                skeleton.classList.add('fade-out');
                setTimeout(() => skeleton.remove(), 400);
            }
            document.body.prepend(navContent);
        }

        if (footTpl) document.body.appendChild(document.importNode(footTpl.content, true));

        // 3. Normalização usando CONFIG Global
        document.querySelectorAll('.dynamic-asset').forEach(img => {
            const relativeSrc = img.getAttribute('data-src');
            img.src = CONFIG.root + relativeSrc;
        });

        document.querySelectorAll('.dynamic-link').forEach(link => {
            const relativeHref = link.getAttribute('data-href');
            link.href = CONFIG.root + relativeHref;
        });

        // 4. Revelar o corpo da página (Gatilho anti-FOUC)
        document.body.classList.add('is-ready');

        // 5. Notificar outros scripts
        document.dispatchEvent(new CustomEvent('nav-footer-loaded'));

        // Inicializar lógica de interação
        initNavInteraction();

    } catch (error) {
        console.error("Viva Leve Critical: Erro ao injetar componentes:", error);
    }
}

/**
 * Gestão do Modal de Favoritos Premium
 */
function initFavoritesModal() {
    const trigger = document.getElementById('fav-trigger');
    const modal = document.getElementById('favorites-premium-modal');
    const overlay = document.getElementById('fav-modal-overlay');
    const closeBtn = document.getElementById('fav-modal-close');
    const listContainer = document.getElementById('fav-modal-list');
    const searchInput = document.getElementById('fav-modal-search');
    const emptyState = document.getElementById('fav-empty-state');
    const exploreBtn = document.getElementById('btn-explore-fav');

    if (!modal) return;

    const getFavs = () => JSON.parse(localStorage.getItem('softsafeFavorites')) || [];

    const openModal = () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderFavs();
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        if (searchInput) searchInput.value = '';
    };

    const renderFavs = (filterTerm = '') => {
        const favs = getFavs();
        const filtered = favs.filter(b =>
            b.titulo.toLowerCase().includes(filterTerm.toLowerCase()) ||
            b.autor.toLowerCase().includes(filterTerm.toLowerCase()) ||
            (b.categoria_tag && b.categoria_tag.toLowerCase().includes(filterTerm.toLowerCase()))
        );

        document.getElementById('modal-fav-badge').textContent = `(${favs.length})`;

        if (favs.length === 0) {
            listContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        listContainer.style.display = 'grid';

        listContainer.innerHTML = filtered.map(book => `
            <div class="fav-card" id="fav-item-${book.id}">
                <vv-image src="${book.imagem}" alt="${book.titulo}"></vv-image>
                <div class="fav-card-info">
                    <span class="fav-card-title">${book.titulo}</span>
                    <span class="fav-card-author">${book.autor}</span>
                    <div class="fav-card-actions">
                        <a href="https://payhip.com/b/${book.payhip_key}" class="payhip-buy-button btn-buy-fav-minimal" data-theme="none">
                            Comprar
                        </a>
                        <button class="btn-remove-fav-premium" data-id="${book.id}">Remover</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind remove buttons
        listContainer.querySelectorAll('.btn-remove-fav-premium').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                removeFav(id);
            });
        });
    };

    const removeFav = (id) => {
        let favs = getFavs();
        favs = favs.filter(b => b.id.toString() !== id.toString());
        localStorage.setItem('softsafeFavorites', JSON.stringify(favs));

        // Efeito slide-out
        const el = document.getElementById(`fav-item-${id}`);
        if (el) {
            el.style.transform = 'translateX(-20px)';
            el.style.opacity = '0';
            setTimeout(() => {
                renderFavs(searchInput.value);
                // Sincronizar contador global da navbar
                const globalBadge = document.getElementById('favorites-count');
                if (globalBadge) globalBadge.textContent = favs.length;
                document.dispatchEvent(new CustomEvent('favorites-updated'));
            }, 300);
        }
    };

    trigger?.addEventListener('click', openModal);
    overlay?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);
    exploreBtn?.addEventListener('click', () => {
        closeModal();
        safeNavigate('index.html');
    });

    searchInput?.addEventListener('input', (e) => renderFavs(e.target.value));

    // ESC Key Support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
}

/**
 * Gestão do Modal de Privacidade
 */
function initPrivacyModal() {
    const openBtn = document.getElementById('open-privacy');
    const modal = document.getElementById('privacy-modal');
    const closeBtn = modal?.querySelector('.close-modal');
    const overlay = modal?.querySelector('.modal-overlay');

    if (!modal || !openBtn) return;

    const toggleModal = (show) => {
        modal.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';
        modal.setAttribute('aria-hidden', !show);
    };

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(true);
    });

    closeBtn?.addEventListener('click', () => toggleModal(false));
    overlay?.addEventListener('click', () => toggleModal(false));

    // Fechar com ESC para acessibilidade
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) toggleModal(false);
    });
}

/**
 * Gestão do Modal Institucional "Sobre"
 */
function initAboutModal() {
    const triggers = document.querySelectorAll('#about-trigger, #open-about-footer');
    const modal = document.getElementById('about-premium-modal');
    const closeBtn = modal?.querySelector('.about-modal-close');
    const overlay = modal?.querySelector('.about-modal-overlay');
    const catalogBtn = document.getElementById('btn-about-catalog');
    const favBtn = document.getElementById('btn-about-fav');

    if (!modal || triggers.length === 0) return;

    let particleFrame;
    let resizeHandler;

    // --- Efeito de Partículas ---
    const handleParticles = (active) => {
        const canvas = document.getElementById('about-particles-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!active) {
            cancelAnimationFrame(particleFrame);
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
            return;
        }

        let particles = [];
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resizeHandler = resize;
        window.addEventListener('resize', resizeHandler);
        resizeHandler();

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0, 255, 135, 0.2)'; // Brilho neon subtil
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            particleFrame = requestAnimationFrame(animate);
        };
        animate();
    };

    // --- Contador Numérico ---
    const animateStats = () => {
        const numbers = modal.querySelectorAll('.stat-number');
        numbers.forEach(num => {
            const target = +num.getAttribute('data-target');
            const duration = 2000; // Aumentado para um efeito mais dramático
            const startTime = performance.now();

            const update = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Easing outExpo
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

                num.textContent = Math.floor(ease * target);

                if (progress < 1) requestAnimationFrame(update);
            };
            requestAnimationFrame(update);
        });
    };

    const toggleModal = (show) => {
        modal.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';
        modal.setAttribute('aria-hidden', !show);

        if (show) {
            setTimeout(animateStats, 300);
            handleParticles(true);
        } else {
            handleParticles(false);
        }
    };

    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal(true);
        });
    });

    closeBtn?.addEventListener('click', () => toggleModal(false));
    overlay?.addEventListener('click', () => toggleModal(false));

    catalogBtn?.addEventListener('click', () => {
        toggleModal(false);
        safeNavigate('index.html');
    });

    favBtn?.addEventListener('click', () => {
        toggleModal(false);
        document.getElementById('fav-trigger')?.click();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) toggleModal(false);
    });
}

/**
 * Gestão de Consentimento de Cookies LGPD/GDPR
 */
function initCookieConsent() {
    const banner = document.getElementById('cookie-consent-banner');
    const prefModal = document.getElementById('cookie-preferences-modal');
    const acceptAll = document.getElementById('btn-accept-all-cookies');
    const rejectAll = document.getElementById('btn-reject-all-cookies');
    const customize = document.getElementById('btn-customize-cookies');
    const savePrefs = document.getElementById('btn-save-cookie-prefs');
    const openPrefsBtn = document.getElementById('open-cookie-prefs');

    if (!banner) return;

    const consentKey = 'softsafeCookieConsent';
    const savedConsent = localStorage.getItem(consentKey);

    // Se não houver consentimento, exibe o banner com delay para elegância
    if (!savedConsent) {
        setTimeout(() => banner.classList.add('active'), 1500);
    }

    const saveConsent = (prefs) => {
        localStorage.setItem(consentKey, JSON.stringify({
            date: new Date().toISOString(),
            preferences: prefs
        }));
        banner.classList.remove('active');
        prefModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    acceptAll?.addEventListener('click', () => {
        saveConsent({ essential: true, analytics: true, marketing: true });
    });

    rejectAll?.addEventListener('click', () => {
        saveConsent({ essential: true, analytics: false, marketing: false });
    });

    customize?.addEventListener('click', () => {
        prefModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    openPrefsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        prefModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    savePrefs?.addEventListener('click', () => {
        const prefs = {
            essential: true,
            analytics: document.getElementById('pref-analytics').checked,
            marketing: document.getElementById('pref-marketing').checked
        };
        saveConsent(prefs);

        // Feedback visual
        savePrefs.textContent = '✓ Guardado!';
        setTimeout(() => savePrefs.textContent = 'Salvar Preferências', 2000);
    });

    // Fechar Modal de Preferências
    prefModal?.querySelector('.close-modal')?.addEventListener('click', () => {
        prefModal.classList.remove('active');
        document.body.style.overflow = '';
    });
}

function initNavInteraction() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const authContainer = document.getElementById('auth-nav-container');
    const menuIcon = document.getElementById('menu-icon');
    const menuOverlay = document.getElementById('menu-overlay');

    // Iniciar Modal de Favoritos
    initFavoritesModal();

    // Iniciar Modal de Privacidade
    initPrivacyModal();

    // Iniciar Modal Sobre
    initAboutModal();

    // Iniciar Consentimento de Cookies
    initCookieConsent();

    // Função auxiliar para fechar o menu de forma síncrona
    const closeMenu = () => {
        menuToggle?.classList.remove('active');
        navLinks?.classList.remove('active');
        menuOverlay?.classList.remove('active');
        document.body.classList.remove('menu-aberto');

        if (menuIcon) {
            menuIcon.className = 'fa-solid fa-bars';
            menuIcon.style.transform = 'rotate(0deg)';
        }
    };

    // 1. Lógica do Menu Hambúrguer (Sidebar Mobile)
    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = navLinks?.classList.toggle('active');
        menuToggle?.classList.toggle('active');
        menuOverlay?.classList.toggle('active');
        document.body.classList.toggle('menu-aberto');

        if (menuIcon) {
            menuIcon.style.transform = 'rotate(90deg)';
            setTimeout(() => {
                menuIcon.className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
                menuIcon.style.transform = 'rotate(0deg)';
            }, 150);
        }
    });

    // Fechar menu ao clicar no overlay (Acessibilidade/UX)
    menuOverlay?.addEventListener('click', closeMenu);

    // Fechar menu ao clicar em qualquer link interno
    navLinks?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // 1.2 Fecho automático ao detetar Landscape ou mudança de Breakpoint
    window.addEventListener('resize', () => {
        const isLandscape = window.innerWidth > window.innerHeight;
        // Fecha se o ecrã for largo (Desktop) ou se for detetado Landscape em mobile
        if ((window.innerWidth > 768 || isLandscape) && navLinks?.classList.contains('active')) {
            closeMenu();
        }
    });

    // 1.1 Lógica de Pesquisa Mobile
    const mobileSearch = document.getElementById('mobile-search');
    const clearMobileSearch = document.getElementById('clear-mobile-search');

    if (mobileSearch && clearMobileSearch) {
        mobileSearch.addEventListener('input', () => {
            clearMobileSearch.style.display = mobileSearch.value.length > 0 ? 'block' : 'none';
        });

        clearMobileSearch.addEventListener('click', () => {
            mobileSearch.value = '';
            mobileSearch.focus();
            clearMobileSearch.style.display = 'none';
        });

        mobileSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && mobileSearch.value.trim()) {
                const termo = mobileSearch.value.trim();
                closeMenu();
                // Navegação Segura para a Pesquisa
                const target = `${CONFIG.paths.search}?q=${encodeURIComponent(termo)}`;
                safeNavigate(target);
            }
        });
    }

    // 2. Integração Firebase Auth Dinâmica
    onAuthStateChanged(auth, (user) => {
        const authBtn = document.getElementById('auth-btn');
        const authIcon = document.getElementById('auth-icon');
        const authText = document.getElementById('auth-text');

        if (!authBtn || !authIcon || !authText) return;

        // Ativa o estado de loading inicialmente
        authBtn.classList.add('is-loading');

        const loginUrl = CONFIG.paths.login;
        const profileUrl = CONFIG.paths.profile;

        // Determinar o novo texto baseado no estado
        const newText = user
            ? (user.displayName ? user.displayName.split(' ')[0] : 'Minha Conta')
            : 'Entrar';

        // Disparar animação de fade-in apenas se o texto mudar
        if (authText.textContent !== newText) {
            authText.classList.remove('text-fade-in');
            void authText.offsetWidth; // Force reflow para reiniciar a animação CSS
            authText.textContent = newText;
            authText.classList.add('text-fade-in');
        }

        // Remove o estado de loading assim que o Firebase responde (primeira vez ou mudança)
        authBtn.classList.remove('is-loading');

        if (user) {
            // Utilizador Logado
            authBtn.href = profileUrl;
            authBtn.classList.add('user-active');
            authIcon.className = 'fa-solid fa-user';
        } else {
            // Utilizador Deslogado
            authBtn.href = loginUrl;
            authBtn.classList.remove('user-active');
            authIcon.className = 'fa-regular fa-user';
        }
    });

    // Inicializar Autocomplete e Pesquisa Global
    initAutocomplete();
}

/**
 * Lógica de Autocomplete para a barra de pesquisa
 */
function initAutocomplete() {
    const searchInput = document.getElementById('global-search');
    if (!searchInput) return;

    // Criar container de sugestões dinamicamente para manter o HTML limpo
    const suggestionsBox = document.createElement('div');
    suggestionsBox.id = 'search-suggestions';
    suggestionsBox.className = 'search-suggestions-box';
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(suggestionsBox);

    let allBooks = [];
    let searchTimeout; // Variável para o Debounce/Throttle

    const highlightText = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, "gi");
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    };

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length < 2) {
            suggestionsBox.classList.remove('active');
            return;
        }

        // Feedback imediato: Mostrar estado de carregamento
        suggestionsBox.innerHTML = `
            <div class="suggestion-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>A procurar no catálogo...</span>
            </div>
        `;
        suggestionsBox.classList.add('active');

        // Otimização de Performance: Limpar timeout anterior (Debounce)
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(async () => {
            // Lazy load do catálogo para evitar consumo desnecessário
            if (allBooks.length === 0) {
                try {
                    const res = await fetch(CONFIG.assets.appsJson);
                    allBooks = await res.json();
                } catch (err) { return; }
            }

            const filtered = allBooks.filter(book =>
                book.titulo.toLowerCase().includes(query) ||
                book.autor.toLowerCase().includes(query)
            ).slice(0, 5);

            if (filtered.length > 0) {
                suggestionsBox.innerHTML = filtered.map(book => `
                    <div class="suggestion-item" onclick="window.location.href='${CONFIG.paths.product}?id=${book.id}'">
                        <img src="${book.imagem}" alt="${book.titulo}">
                        <div class="suggestion-info">
                            <span class="suggestion-title">${highlightText(book.titulo, query)}</span>
                            <span class="suggestion-author">${highlightText(book.autor, query)}</span>
                        </div>
                    </div>
                `).join('');
                suggestionsBox.classList.add('active');
            } else {
                suggestionsBox.classList.remove('active');
            }
        }, 300); // Aguarda 300ms de inatividade para processar
    });

    // Redirecionamento global ao pressionar Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const target = `${CONFIG.paths.search}?q=${encodeURIComponent(searchInput.value.trim())}`;
            safeNavigate(target);
        }
    });

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target)) suggestionsBox.classList.remove('active');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectComponents);
} else {
    injectComponents();
}