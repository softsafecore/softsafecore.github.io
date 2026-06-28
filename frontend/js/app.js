/**
 * SoftSafe Core - Lógica Principal (Catálogo, Filtros e Newsletter)
 */
import { auth, db, analytics } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { CONFIG } from "./config.js";
import "./vv-image.js";

let allApps = [];
let favorites = JSON.parse(localStorage.getItem("softsafeFavorites")) || [];
let currentUser = null;

/**
 * Inicializa o Payhip SDK para suportar o Overlay Checkout
 */
function initPayhip() {
  if (document.getElementById('payhip-js')) return;
  const script = document.createElement('script');
  script.id = 'payhip-js';
  script.src = 'https://payhip.com/payhip.js';
  script.async = true;
  document.head.appendChild(script);
}

initPayhip();

/**
 * Normaliza o texto removendo acentos e convertendo para minúsculas
 * @param {string} texto 
 * @returns {string}
 */
const normalizarTexto = (texto) => {
  if (!texto) return "";
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const categoryMap = {
  produtividade: "Produtividade",
  jogos: "Jogos",
  utilitarios: "Utilitários",
  seguranca: "Segurança",
  design: "Design",
};

const booksGrid = document.getElementById("books-grid");
const filterLinks = document.querySelectorAll(".category-link");
const mobileFilter = document.getElementById("mobile-category-filter");
// Removidas as referências estáticas aos elementos de pesquisa (IDs antigos)

// Listener de Autenticação
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  // NOTA: A UI da Navbar agora é gerida centralizadamente pelo nav-footer.js
});

/**
 * Inicializa a aplicação, carregando os dados do JSON e tratando skeletons
 */
async function init() {
  try {
    renderSkeletons(); // Mostra o loading antes do fetch

    // Busca direta do arquivo JSON
    const response = await fetch("frontend/json/apps.json");
    if (!response.ok) throw new Error("Falha ao carregar o arquivo JSON");
    allApps = await response.json();

    if (allApps.length === 0) {
      booksGrid.innerHTML = `<p class="empty-msg">O catálogo está vazio. Adicione apps pelo painel de administrador.</p>`;
      return;
    }

    // Simulando um pequeno delay para que o skeleton seja visível (opcional)
    setTimeout(() => {
      changeBackgroundByCategory("all"); // Aplica cor de fundo padrão
      renderApps(allApps);
      updateFavoritesUI();
    }, 800);
  } catch (error) {
    console.error("SoftSafe Core Debug - Falha ao buscar catálogo:", error);
    booksGrid.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px; grid-column: 1/-1;">
        <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--accent-orange);"></i>
        <p style="margin: 20px 0;">Não foi possível carregar os livros. Verifique sua conexão ou as permissões do banco de dados.</p>
        <button onclick="location.reload()" class="btn-member">Tentar Novamente</button>
      </div>`;
  }
}

/**
 * Renderiza os cartões de carregamento visual
 */
function renderSkeletons() {
  const skeletons = Array(4)
    .fill(0)
    .map(
      () => `
    <div class="book-card skeleton-card">
      <div class="skeleton skeleton-cover"></div>
      <div class="book-info">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-author"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </div>
  `,
    )
    .join("");
  booksGrid.innerHTML = skeletons;
}

/**
 * Muda a cor de fundo baseado na categoria
 * @param {string} category
 */
function changeBackgroundByCategory(category) {
  // Remove todas as classes de categoria
  document.body.classList.remove(
    "category-all",
    "category-produtividade",
    "category-jogos",
    "category-utilitarios",
    "category-seguranca",
    "category-design",
  );

  // Adiciona a classe da categoria selecionada
  document.body.classList.add(`category-${category}`);
}

/**
 * Renderiza a grade de apps dinamicamente
 * @param {Array} apps
 * @param {string} query - Termo opcional para destaque
 */
function renderApps(apps, query = "") {
  booksGrid.innerHTML = apps
    .map((app, index) => {
      const isFav = favorites.some((fav) => fav.id?.toString() === app.id.toString());
      const price = app.price;
      const formattedPrice = (price === "0" || price === "00") ? "Grátis" : `MT ${parseFloat(price).toFixed(2)}`;

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Aplica o destaque se houver uma pesquisa ativa
      const displayTitle = query
        ? app.title.replace(new RegExp(`(${escapedQuery})`, "gi"), '<mark class="search-highlight">$1</mark>')
        : app.title;

      return `
        <article class="book-card fade-in-node" style="animation-delay: ${index * 0.05}s" data-category="${app.categoria_tag}">
            <div style="position: relative;">
              <vv-image src="${app.image.replace('./frontend/', '')}" alt="${app.title}" img-class="book-cover"></vv-image>
            </div>
            <div class="book-info">
                <h3 class="book-title">${displayTitle}</h3>
                <span class="book-price">${formattedPrice}</span>
                
                <div class="book-actions">
                  <a href="frontend/pages/product.html?id=${app.id}" class="btn-buy-direct">
                    Obter Agora
                  </a>
                </div>
            </div>
            <button class="btn-favorite ${isFav ? "active" : ""}" onclick="addToFavorites(event, '${app.id}')" aria-label="Adicionar aos favoritos">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
        </article>
    `;
    })
    .join("");
}

/**
 * Adiciona ou remove um app dos favoritos via clique no ícone de coração
 * @param {Event} event
 * @param {number} id
 */
window.addToFavorites = async (event, id) => {
  // Impede que o clique no botão de favorito dispare o clique do card (redirecionamento)
  event.stopPropagation();

  const app = allApps.find((b) => b.id.toString() === id.toString());
  if (!app) return;

  const index = favorites.findIndex((fav) => fav.id.toString() === id.toString());
  const btn = event.currentTarget;

  if (index === -1) {
    favorites.push(app);
    btn.classList.add("active");
    triggerCounterAnimation();
    openFavoritesDrawer();
  } else {
    favorites.splice(index, 1);
    btn.classList.remove("active");
  }

  localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));

  if (currentUser) {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { favorites: favorites });
  }

  updateFavoritesUI();
};

window.clearAllFavorites = () => {
  favorites = [];
  localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));
  updateFavoritesUI();
  renderFavoritesDrawer();
  renderApps(allApps);
};

/**
 * Lógica do Drawer de Favoritos
 */
function openFavoritesDrawer() {
  renderFavoritesDrawer();
  document.getElementById("favorites-drawer").classList.add("open");
  document.getElementById("drawer-overlay").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeFavoritesDrawer() {
  document.getElementById("favorites-drawer").classList.remove("open");
  document.getElementById("drawer-overlay").style.display = "none";
  document.body.style.overflow = "auto";
}

function renderFavoritesDrawer() {
  const content = document.getElementById("drawer-content");
  if (!content) return;

  if (favorites.length === 0) {
    content.innerHTML = `<p class="empty-drawer-msg">Ainda não tens apps nos teus favoritos.</p>`;
    return;
  }

  content.innerHTML =
    `
    <div class="drawer-actions">
      <button class="btn-clear-all" onclick="clearAllFavorites()">Limpar Tudo</button>
    </div>
  ` +
    favorites
      .map(
        (app) => `
    <div class="drawer-item">
      <div class="drawer-item-clickable" onclick="window.location.href='frontend/pages/product.html?id=${app.id}'">
        <img src="${app.image.replace('./frontend/', '')}" alt="${app.title}">
        <div class="drawer-item-info">
          <span class="drawer-item-title">${app.title}</span>
          <span class="drawer-item-author">${app.author}</span>
        </div>
      </div>
      <button class="btn-remove-fav" onclick="removeFromDrawer('${app.id}')">Remover</button>
    </div>
  `,
      )
      .join("");
}

window.removeFromDrawer = (id) => {
  favorites = favorites.filter((fav) => fav.id.toString() !== id.toString());
  localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));
  updateFavoritesUI();
  renderFavoritesDrawer();
  renderApps(allApps); // Sincroniza os corações na grade
};

document
  .getElementById("close-drawer")
  ?.addEventListener("click", closeFavoritesDrawer);
document
  .getElementById("drawer-overlay")
  ?.addEventListener("click", closeFavoritesDrawer);
document
  .querySelector(".wishlist-counter-container")
  ?.addEventListener("click", openFavoritesDrawer);

/**
 * Dispara a animação visual no contador
 */
function triggerCounterAnimation() {
  const countDisplay = document.getElementById("favorites-count");
  if (!countDisplay) return;
  countDisplay.classList.remove("pulse");
  void countDisplay.offsetWidth; // Force reflow
  countDisplay.classList.add("pulse");
}

/**
 * Atualiza o contador de favoritos no cabeçalho
 */
function updateFavoritesUI() {
  const countDisplay = document.getElementById("favorites-count");
  if (countDisplay) {
    countDisplay.innerText = favorites.length;
  }
  const container = document.querySelector(".wishlist-counter-container") || document.querySelector(".c-navbar__link");
  container?.classList.toggle("has-items", favorites.length > 0);
}

/**
 * Renderiza mensagem de erro quando não há resultados
 */
function renderNoResults(query) {
  booksGrid.innerHTML = `
    <div class="no-results">
      <i class="ph ph-magnifying-glass"></i>
      <p>Nenhum resultado para "<strong>${query}</strong>"</p>
      <span>Verifica a ortografia ou tenta pesquisar por outro nome ou desenvolvedor.</span>
    </div>
  `;
}

/**
 * Executa a lógica de filtragem por texto
 */
let searchDebounceTimer;

const handleSearch = (queryValue) => {
  clearTimeout(searchDebounceTimer);

  // Implementação de Debounce de 300ms para performance
  searchDebounceTimer = setTimeout(() => {
    // Normaliza o termo pesquisado e remove espaços vazios
    const query = normalizarTexto(queryValue).trim();

    // Se a pesquisa estiver vazia, restaura o catálogo completo automaticamente
    if (query === "") {
      renderApps(allApps);
      return;
    }

    const filtered = allApps.filter(
      (app) => {
        const titulo = normalizarTexto(app.title);
        const autor = normalizarTexto(app.author);
        const categoria = app.categoria_tag ? normalizarTexto(app.categoria_tag) : "";

        return titulo.includes(query) || autor.includes(query) || categoria.includes(query);
      }
    );

    if (filtered.length === 0) {
      renderNoResults(queryValue);
    } else {
      renderApps(filtered, query);
    }
  }, 300);
};

// Delegação de Eventos: Escuta o input de pesquisa global injetado dinamicamente
document.addEventListener("input", (e) => {
  if (e.target.id === "global-search") {
    handleSearch(e.target.value);
  }
});

/**
 * Filtra os apps baseando-se na tagId
 * @param {string} tag
 */
function applyFilter(tag) {
  const filtered =
    tag === "all"
      ? allApps
      : allApps.filter((app) => app.categoria_tag === tag);

  // Muda a cor de fundo baseado na categoria
  changeBackgroundByCategory(tag);

  renderApps(filtered);
}

// Eventos para Filtros Desktop
filterLinks.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    filterLinks.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tag = btn.dataset.tag;
    applyFilter(tag);
  });
});

// Evento para Filtro Mobile
mobileFilter?.addEventListener("change", (e) => {
  const category = e.target.value;
  applyFilter(category);
});

/**
 * Lógica de Header Sticky (Revelar ao subir o scroll)
 */
let lastScrollTop = 0;

window.addEventListener("scroll", () => {
  // Verifica tanto a classe legada como a nova classe BEM para compatibilidade
  const header = document.querySelector(".main-header") || document.querySelector(".c-navbar");
  if (!header || !header.style) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > lastScrollTop && scrollTop > 100) {
    // Scrolling down - Esconder
    header.style.transform = "translateY(-100%)";
  } else {
    // Scrolling up - Mostrar
    header.style.transform = "translateY(0)";
  }
  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});

/**
 * Gera o efeito de confetti usando a API de Canvas
 */
function startConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let particles = [];
  const colors = ["#f1c40f", "#ff8c00", "#0070f3", "#ffffff"];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 6.28,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.y += p.speed;
      p.x += Math.sin(p.angle) * 2;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      if (p.y > canvas.height) particles[i].y = -20;
    });
    requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => {
    canvas.style.display = "none";
  }, 4000);
}

// 6. Newsletter & Modal Logic
document.addEventListener("DOMContentLoaded", () => {
  // Newsletter
  const newsletterForm = document.getElementById("newsletter-form");
  const newsletterEmail = document.getElementById("newsletter-email");
  const newsletterError = document.getElementById("newsletter-error");
  const subscribeButton = document.getElementById("btn-newsletter-subscribe"); // Referência ao botão
  const spinner = subscribeButton?.querySelector(".spinner"); // Referência ao spinner

  // Validação em tempo real
  newsletterEmail?.addEventListener("input", (e) => {
    const email = e.target.value;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (email.length > 0 && !isValid) {
      newsletterEmail.classList.add("invalid");
      newsletterError.style.display = "block";
    } else {
      newsletterEmail.classList.remove("invalid");
      newsletterError.style.display = "none";
    }
  });

  newsletterForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = newsletterEmail.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    // 1. Mostrar estado de carregamento
    if (subscribeButton) {
      subscribeButton.disabled = true; // Desabilita o botão
      subscribeButton.classList.add("loading"); // Adiciona classe para mostrar spinner
    }

    // 2. Simular uma operação assíncrona (ex: envio para um servidor)
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simula 1.5 segundos de atraso

    const container = document.querySelector(".newsletter-container");
    container.innerHTML = `
      <div class="success-message">
        <i class="ph ph-check-circle"></i>
        <h2 class="poppins-bold">Obrigado!</h2>
        <p>A sua inscrição foi realizada com sucesso. Em breve receberá as nossas novidades.</p>
      </div>
    `;

    // 3. O estado do botão é automaticamente "resetado" porque o container é substituído.
    // Se o container não fosse substituído, seria necessário remover a classe 'loading' e reabilitar o botão aqui.

    startConfetti();
  });

  // Modal Política de Privacidade
  const modal = document.getElementById("privacy-modal");
  const openBtn = document.getElementById("open-privacy");
  const closeBtn = document.querySelector(".close-modal");

  openBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Trava o scroll do fundo
  });

  const closeModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  };

  closeBtn?.addEventListener("click", closeModal);
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
});

/**
 * Gestão de Interface da Navbar Premium
 */
function initNavbar() {
  const hamburger = document.getElementById("hamburger-btn");
  const navMenu = document.getElementById("nav-menu");

  // Alternar Menu Lateral
  hamburger?.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
  });
}

// Sincroniza os favoritos assim que a Navbar modular estiver pronta no DOM
document.addEventListener("nav-footer-loaded", updateFavoritesUI);

document.addEventListener("DOMContentLoaded", initNavbar);
init();
