/**
 * SoftSafe Core - Lógica da Página de Detalhes do Produto
 * Renderiza dinamicamente as informações do app baseado no ID da URL.
 */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Elementos do DOM e Estado Inicial
  const container = document.getElementById("product-details-container");
  const params = new URLSearchParams(window.location.search);
  const appId = params.get("id"); // Recupera o ID (String)
  let currentUser = null;

  // Recuperar favoritos do LocalStorage para consistência
  let favorites = JSON.parse(localStorage.getItem("softsafeFavorites")) || [];
  updateFavoritesCount();

  // Listener de Autenticação
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().favorites) {
        favorites = docSnap.data().favorites; // Sincroniza com o banco de dados
        localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));
        updateFavoritesCount();
      }
    }
  });

  /**
   * Atualiza o contador de favoritos no cabeçalho
   */
  function updateFavoritesCount() {
    const countDisplay = document.getElementById("favorites-count");
    if (countDisplay) {
      countDisplay.innerText = favorites.length;
    }
    const container = document.querySelector(".wishlist-counter-container");
    container?.classList.toggle("has-items", favorites.length > 0);
  }

  function triggerCounterAnimation() {
    const countDisplay = document.getElementById("favorites-count");
    if (!countDisplay) return;
    countDisplay.classList.remove("pulse");
    void countDisplay.offsetWidth;
    countDisplay.classList.add("pulse");
  }

  /**
   * Executa a animação visual da barra de progresso no topo
   */
  function animateDownloadProgressBar() {
    let container = document.querySelector(".download-progress-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "download-progress-container";
      container.innerHTML =
        '<div class="download-progress-bar" id="download-progress-bar"></div>';
      document.body.appendChild(container);
    }

    const bar = document.getElementById("download-progress-bar");
    bar.style.opacity = "1";
    bar.style.width = "0%";

    // Sequência de animação simulada para feedback visual imediato
    setTimeout(() => (bar.style.width = "40%"), 100);
    setTimeout(() => (bar.style.width = "75%"), 500);
    setTimeout(() => (bar.style.width = "100%"), 1000);

    // Finalizar e esconder após a conclusão
    setTimeout(() => {
      bar.style.opacity = "0";
      setTimeout(() => (bar.style.width = "0%"), 300);
    }, 1500);
  }

  /**
   * Renderiza o estado de carregamento (Skeleton)
   */
  function renderProductSkeleton() {
    container.innerHTML = `
      <div class="product-page-wrapper skeleton-product">
        <div class="product-media skeleton skeleton-product-media"></div>
        <div class="product-content">
          <div class="skeleton skeleton-product-title"></div>
          <div class="skeleton skeleton-product-text" style="width: 40%"></div>
          <div class="skeleton skeleton-product-text" style="height: 60px; margin-top: 30px"></div>
          <div class="skeleton skeleton-product-text" style="margin-top: 40px"></div>
          <div class="skeleton skeleton-product-text"></div>
          <div class="skeleton skeleton-product-text" style="width: 80%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza Skeletons para Livros Relacionados
   */
  function renderRelatedSkeletons() {
    const grid = document.getElementById("related-books-grid");
    if (grid) {
      grid.innerHTML = Array(4)
        .fill(0)
        .map(
          () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-related"></div>
        </div>
      `,
        )
        .join("");
    }
  }

  /**
   * Busca os dados do livro no arquivo JSON e gerencia o estado de carregamento
   */
  async function loadProductDetails() {
    if (!appId) {
      renderError("Produto não encontrado.");
      return;
    }

    try {
      renderProductSkeleton();
      renderRelatedSkeletons();

      // Busca do arquivo JSON
      const response = await fetch("../json/apps.json");
      const allApps = await response.json();
      const app = allApps.find(b => b.id.toString() === appId);

      if (!app) {
        renderError("O app solicitado não existe em nosso catálogo.");
        return;
      }

      // Simulação de delay para visualização do skeleton
      setTimeout(() => {
        renderProduct(app);
        loadRelatedApps(app);
      }, 600);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      renderError("Ocorreu um erro ao carregar os detalhes do produto.");
    }
  }

  /**
   * Injeta o HTML dinâmico do app e as meta tags de SEO
   * @param {Object} app - Objeto contendo os dados do app
   */
  function renderProduct(app) {
    // Atualização dinâmica das Meta Tags para SEO e Browser
    document.title = `${app.title} - SoftSafe Core`;

    const ogTitle = document.getElementById("og-title");
    const ogDesc = document.getElementById("og-description");
    const ogImg = document.getElementById("og-image");
    const ogUrl = document.getElementById("og-url");

    if (ogTitle) ogTitle.setAttribute("content", app.title);
    if (ogDesc)
      ogDesc.setAttribute("content", app.description || "Apps e Jogos Seguros");
    if (ogImg) ogImg.setAttribute("content", app.image);
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);

    injectJSONLD(app);

    const isFavorite = favorites.some(fav => fav.id.toString() === app.id.toString());
    const price = app.price;
    const formattedPrice = (price === "0" || price === "00") ? "Grátis" : `MT ${parseFloat(price).toFixed(2)}`;
    const formattedDescription = app.description.replace(/\n/g, '<br>');
    const imageScreenshots = (app.media || []).filter(m => m.type === 'image');

    container.innerHTML = `
      <a href="../index.html" class="btn-back"><i class="ph ph-arrow-left"></i> Voltar ao Catálogo</a>
      <div class="product-page-wrapper fade-in-node">
        <!-- Coluna da Imagem e Galeria -->
        <div class="product-media">
          <img src="${app.image}" alt="${app.title}" class="product-main-image img-loaded">
          <div class="carousel-container">
            <button class="carousel-btn prev" id="carousel-prev" aria-label="Anterior">&#10094;</button>
            <div class="carousel-viewport">
              <div class="screenshot-gallery" id="screenshot-gallery">
                ${imageScreenshots.map(ss => `<img src="${ss.src.replace('./frontend/', '../')}" alt="Screenshot de ${app.title}" class="screenshot-thumb">`).join('')}
              </div>
            </div>
            <button class="carousel-btn next" id="carousel-next" aria-label="Próximo">&#10095;</button>
          </div>
        </div>

        <!-- Coluna de Informações e Ações -->
        <div class="product-content">
          <p class="breadcrumb">${app.categoria_tag || 'Software'}</p>
          <h1 class="product-title">${app.title}</h1>
          <p class="product-author">Desenvolvido por <span>${app.author}</span></p>

          <div class="product-meta-grid">
            <div class="meta-item"><span>Versão</span>${app.version || 'N/A'}</div>
            <div class="meta-item"><span>Tamanho</span>${app.size || 'N/A'}</div>
            <div class="meta-item"><span>Plataforma</span>${app.compatibility || 'N/A'}</div>
          </div>

          <div class="product-price-row">
            <span class="product-price">${formattedPrice}</span>
            <button id="fav-btn" class="btn-favorite-large ${isFavorite ? 'active' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              <span class="fav-text">${isFavorite ? 'FAVORITADO' : 'ADICIONAR AOS FAVORITOS'}</span>
            </button>
          </div>

          <div class="product-actions">
            <a href="${app.download_link}" target="_blank" class="btn-buy-now">Obter Agora</a>
            <button id="share-btn" class="btn-share"><i class="ph ph-share-network"></i> Partilhar</button>
          </div>

          <div class="product-description">
            <h2>Sobre este App</h2>
            <p>${formattedDescription || 'Nenhuma descrição disponível.'}</p>
          </div>
        </div>
      </div>
    `;

    // Adiciona listeners aos botões recém-criados
    document.getElementById('fav-btn').addEventListener('click', (e) => toggleFavorite(e, app));
    document.getElementById('share-btn').addEventListener('click', () => handleShare(app));

    // Inicializa o carrossel e a galeria
    initCarousel();
  }

  /**
   * Inicializa a lógica do carrossel de screenshots
   */
  function initCarousel() {
    const mainImage = document.querySelector('.product-main-image');
    const thumbs = document.querySelectorAll('.screenshot-thumb');
    const gallery = document.getElementById('screenshot-gallery');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    let currentIndex = 0;

    if (!gallery || thumbs.length === 0) return;

    const thumbWidth = thumbs[0].offsetWidth + 10; // Largura da imagem + gap

    function updateCarousel() {
      gallery.style.transform = `translateX(-${currentIndex * thumbWidth}px)`;
      prevBtn.disabled = currentIndex === 0;
      // Verifica se o final do carrossel foi alcançado
      const viewportWidth = gallery.parentElement.offsetWidth;
      const galleryWidth = gallery.scrollWidth;
      nextBtn.disabled = (currentIndex * thumbWidth) + viewportWidth >= galleryWidth;

      // Atualiza a classe 'active' na miniatura
      thumbs.forEach((t, i) => t.classList.toggle('active', t.src === mainImage.src));
    }

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', () => {
      currentIndex++;
      updateCarousel();
    });

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        mainImage.style.opacity = 0;
        setTimeout(() => {
          mainImage.src = thumb.src;
          mainImage.style.opacity = 1;
          updateCarousel(); // Sincroniza o estado ativo
        }, 200);
      });
    });

    updateCarousel(); // Define o estado inicial
  }

  /**
   * Lógica do Drawer de Favoritos para a Página de Produto
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

  window.clearAllFavorites = () => {
    favorites = [];
    localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));
    updateFavoritesCount();
    renderFavoritesDrawer();

    const favBtn = document.getElementById("fav-btn");
    if (favBtn) {
      favBtn.classList.remove("active");
      favBtn.querySelector(".fav-text").innerText = "ADICIONAR AOS FAVORITOS";
    }
  };

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
        <div class="drawer-item-clickable" onclick="window.location.href='product.html?id=${app.id}'">
          <img src="${app.image.replace('./frontend/', '../')}" alt="${app.title}">
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

  window.removeFromDrawer = async (id) => {
    favorites = favorites.filter((fav) => fav.id.toString() !== id.toString());
    localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));
    updateFavoritesCount();
    renderFavoritesDrawer();

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { favorites: favorites });
    }

    // Se o app removido for o que estamos a visualizar, atualiza o botão da página
    if (appId === id) {
      const favBtn = document.getElementById("fav-btn");
      if (favBtn) {
        favBtn.classList.remove("active");
        favBtn.querySelector(".fav-text").innerText = "ADICIONAR AOS FAVORITOS";
      }
    }
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
   * Renderiza apps da mesma categoria (Relacionados)
   */
  async function loadRelatedApps(currentApp) {
    const relatedGrid = document.getElementById("related-books-grid");
    if (!relatedGrid) return;

    // Busca apps relacionados do JSON
    const response = await fetch("../json/apps.json");
    const allApps = await response.json();

    const related = allApps
      .filter(b => b.categoria_tag === currentApp.categoria_tag && b.id.toString() !== currentApp.id.toString())
      .slice(0, 4);

    if (related.length === 0) {
      document.querySelector(".related-books-section").style.display = "none";
      return;
    }

    relatedGrid.innerHTML = related
      .map((app, index) => {
        return `
        <article class="book-card fade-in-node" style="animation-delay: ${index * 0.1}s" onclick="window.location.href='product.html?id=${app.id}'">
            <img src="${app.image.replace('./frontend/', '../')}" alt="${app.title}" class="book-cover" loading="lazy" onload="this.classList.add('img-loaded')">
            <div class="book-info">
                <h3 class="book-title">${app.title}</h3>
                <span class="book-price">${(app.price === "0" || app.price === "00") ? "Grátis" : `MT ${parseFloat(app.price).toFixed(2)}`}</span>
            </div>
        </article>
      `;
      })
      .join("");
  }

  /**
   * Injeta dados estruturados (JSON-LD) para otimização de Rich Snippets
   * @param {Object} app
   */
  function injectJSONLD(app) {
    // Remove script anterior se existir (evita duplicados em SPAs ou navegação interna)
    const existingScript = document.getElementById("json-ld-product");
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.id = "json-ld-product";
    script.type = "application/ld+json";

    // Define a raiz do site para garantir links absolutos corretos no Breadcrumb
    const siteRoot = window.location.origin + "/";

    const appSchema = {
      "@type": "SoftwareApplication",
      name: app.title,
      applicationCategory: app.categoria_tag,
      operatingSystem: app.compatibility,
      image: app.image,
      description: app.description || "Apps e Jogos Seguros",
      offers: {
        "@type": "Offer",
        price: app.price,
        priceCurrency: app.moeda || "MZN",
        availability: "https://schema.org/InStock",
      },
    };

    const breadcrumbSchema = {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: `${siteRoot}index.html`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: app.categoria_tag || "Catálogo",
          item: `${siteRoot}index.html?tag=${app.categoria_tag}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: app.title,
          item: window.location.href,
        },
      ],
    };

    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [appSchema, breadcrumbSchema],
    });

    document.head.appendChild(script);
  }

  /**
   * Gerencia a partilha nativa (Web Share API) ou copia o link
   * @param {Object} app
   */
  async function handleShare(app) {
    const shareData = {
      title: `SoftSafe Core - ${app.title}`,
      text: `Dá uma olhada neste app: "${app.title}". Encontrei no SoftSafe Core!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback para Desktop: Copiar link e dar feedback
        await navigator.clipboard.writeText(window.location.href);
        const shareBtn = document.getElementById("share-btn");
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '<i class="ph ph-check"></i> Link Copiado!';
        setTimeout(() => (shareBtn.innerHTML = originalText), 2000);
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Erro ao partilhar:", err);
    }
  }

  /**
   * Alterna o estado de favorito de um app e persiste no LocalStorage
   * @param {Event} event
   * @param {Object} app
   */
  async function toggleFavorite(event, app) {
    const btn = event.currentTarget;
    const index = favorites.findIndex((fav) => fav.id.toString() === app.id.toString());

    if (index === -1) {
      favorites.push(app);
      btn.classList.add("active");
      btn.querySelector(".fav-text").innerText = "FAVORITADO";
      triggerCounterAnimation();
      openFavoritesDrawer(); // Abre o menu automaticamente ao adicionar
    } else {
      favorites.splice(index, 1);
      btn.classList.remove("active");
      btn.querySelector(".fav-text").innerText = "ADICIONAR AOS FAVORITOS";
    }

    localStorage.setItem("softsafeFavorites", JSON.stringify(favorites));

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { favorites: favorites });
    }
    updateFavoritesCount();
  }

  /**
   * Renderiza uma mensagem de erro
   * @param {string} msg
   */
  function renderError(msg) {
    container.innerHTML = `<div class="error-state" style="text-align: center; padding: 40px;"><p>${msg}</p><a href="../index.html" class="btn-member" style="margin-top: 20px; display: inline-block;">Voltar ao Catálogo</a></div>`;
  }

  /**
   * Lógica de Header Sticky (Revelar ao subir o scroll)
   */
  let lastScrollTop = 0;
  window.addEventListener("scroll", () => {
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

  loadProductDetails();
});
