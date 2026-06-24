/**
 * Viva Leve - Product Details Logic
 * Renderiza dinamicamente as informações do livro baseado no ID da URL.
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
  const bookId = params.get("id"); // Recupera o ID (String)
  let currentUser = null;

  // Recuperar favoritos do LocalStorage para consistência
  let favorites = JSON.parse(localStorage.getItem("vivaLeveFavorites")) || [];
  updateFavoritesCount();

  // Listener de Autenticação
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().favorites) {
        favorites = docSnap.data().favorites;
        localStorage.setItem("vivaLeveFavorites", JSON.stringify(favorites));
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
    if (!bookId) {
      renderError("Produto não encontrado.");
      return;
    }

    try {
      renderProductSkeleton();
      renderRelatedSkeletons();

      // Busca do arquivo JSON
      const response = await fetch("../json/livros.json");
      const allBooks = await response.json();
      const book = allBooks.find(b => b.id.toString() === bookId);

      if (!book) {
        renderError("O livro solicitado não existe no nosso catálogo.");
        return;
      }

      // Simulação de delay para visualização do skeleton
      setTimeout(() => {
        renderProduct(book);
        loadRelatedBooks(book);
      }, 600);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      renderError("Ocorreu um erro ao carregar os detalhes do produto.");
    }
  }

  /**
   * Injeta o HTML dinâmico do produto e as meta tags de SEO
   * @param {Object} book - Objeto contendo os dados do livro
   */
  function renderProduct(book) {
    // Atualização dinâmica das Meta Tags para SEO e Browser
    document.title = `${book.titulo} - Viva Leve`;

    const ogTitle = document.getElementById("og-title");
    const ogDesc = document.getElementById("og-description");
    const ogImg = document.getElementById("og-image");
    const ogUrl = document.getElementById("og-url");

    if (ogTitle) ogTitle.setAttribute("content", book.titulo);
    if (ogDesc)
      ogDesc.setAttribute("content", book.descricao || "Saúde e Bem-Estar");
    if (ogImg) ogImg.setAttribute("content", book.imagem);
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);

    injectJSONLD(book);

    // Validação de Segurança: Se não houver chave do Payhip, falha graciosamente
    if (!book.payhip_key || book.payhip_key === "XXXXX") {
      renderError(`
        <div class="error-container">
          <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--verde-brilho);"></i>
          <h2 class="poppins-bold">Produto em Manutenção</h2>
          <p>O checkout para este e-book está a ser atualizado. Por favor, tente novamente em alguns minutos.</p>
          <a href="../index.html" class="btn-member">Explorar Outros Livros</a>
        </div>
      `);
      return;
    }

    // Injeção Dinâmica do Container alvo do Payhip
    container.innerHTML = `
      <div class="payhip-integration-wrapper fade-in-node">
        <nav class="breadcrumb-nav">
           <a href="../index.html" class="btn-back">
             <i class="ph ph-arrow-left"></i> Voltar ao Catálogo
           </a>
        </nav>
        
        <div class="payhip-embed-page" data-key="${book.payhip_key}">
          <div class="payhip-placeholder-loading">
            <div class="spinner-minimal"></div>
            <p class="poppins-light">A preparar o seu checkout seguro...</p>
          </div>
        </div>
      </div>
    `;

    // --- ESTRATÉGIA DE HYDRATION SÉNIOR ---
    // O script do Payhip precisa que a div .payhip-embed-page exista ANTES da execução
    const payhipScript = document.createElement('script');
    payhipScript.type = 'text/javascript';

    // Cache busting evita que versões antigas do widget interfiram na renderização dinâmica
    const cacheBuster = Math.random().toString(36).substring(7);
    payhipScript.src = `https://payhip.com/embed-page.js?v=${cacheBuster}`;

    payhipScript.onload = () => {
      console.log("Viva Leve: Widget do Payhip carregado com sucesso.");
    };

    payhipScript.onerror = () => {
      renderError("Não foi possível carregar o sistema de pagamento. Por favor, tente mais tarde.");
    };

    document.body.appendChild(payhipScript);
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
    localStorage.setItem("vivaLeveFavorites", JSON.stringify(favorites));
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
      content.innerHTML = `<p class="empty-drawer-msg">Ainda não tens livros nos teus favoritos.</p>`;
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
          (book) => `
      <div class="drawer-item">
        <div class="drawer-item-clickable" onclick="window.location.href='product.html?id=${book.id}'">
          <img src="${book.imagem}" alt="${book.titulo}">
          <div class="drawer-item-info">
            <span class="drawer-item-title">${book.titulo}</span>
            <span class="drawer-item-author">${book.autor}</span>
          </div>
        </div>
        <button class="btn-remove-fav" onclick="removeFromDrawer('${book.id}')">Remover</button>
      </div>
    `,
        )
        .join("");
  }

  window.removeFromDrawer = async (id) => {
    favorites = favorites.filter((fav) => fav.id !== id);
    localStorage.setItem("vivaLeveFavorites", JSON.stringify(favorites));
    updateFavoritesCount();
    renderFavoritesDrawer();

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { favorites: favorites });
    }

    // Se o livro removido for o que estamos a visualizar, atualiza o botão da página
    if (bookId === id) {
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
   * Renderiza livros da mesma categoria (Relacionados)
   */
  async function loadRelatedBooks(currentBook) {
    const relatedGrid = document.getElementById("related-books-grid");
    if (!relatedGrid) return;

    // Busca livros relacionados do JSON
    const response = await fetch("../json/livros.json");
    const allBooks = await response.json();

    const related = allBooks
      .filter(b => b.categoria_tag === currentBook.categoria_tag && b.id.toString() !== currentBook.id.toString())
      .slice(0, 4);

    if (related.length === 0) {
      document.querySelector(".related-books-section").style.display = "none";
      return;
    }

    relatedGrid.innerHTML = related
      .map((book, index) => {
        return `
        <article class="book-card fade-in-node" style="animation-delay: ${index * 0.1}s" onclick="window.location.href='product.html?id=${book.id}'">
            <img src="${book.imagem}" alt="${book.titulo}" class="book-cover" loading="lazy" onload="this.classList.add('img-loaded')">
            <div class="book-info">
                <h3 class="book-title">${book.titulo}</h3>
                <span class="book-price">${book.preco === 0 ? "GRÁTIS" : book.preco.toFixed(2) + " MT"}</span>
            </div>
        </article>
      `;
      })
      .join("");
  }

  /**
   * Injeta dados estruturados (JSON-LD) para otimização de Rich Snippets no Google
   * @param {Object} book
   */
  function injectJSONLD(book) {
    // Remove script anterior se existir (evita duplicados em SPAs ou navegação interna)
    const existingScript = document.getElementById("json-ld-product");
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.id = "json-ld-product";
    script.type = "application/ld+json";

    // Define a raiz do site para garantir links absolutos corretos no Breadcrumb
    const siteRoot = window.location.origin + "/";

    const bookSchema = {
      "@type": "Book",
      name: book.titulo,
      author: { "@type": "Person", name: book.autor },
      image: book.imagem,
      description: book.descricao || "Saúde e Bem-Estar",
      offers: {
        "@type": "Offer",
        price: book.preco,
        priceCurrency: "MZN",
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
          name: book.categoria || "Catálogo",
          item: `${siteRoot}index.html?tag=${book.categoriaTag}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: book.titulo,
          item: window.location.href,
        },
      ],
    };

    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [bookSchema, breadcrumbSchema],
    });

    document.head.appendChild(script);
  }

  /**
   * Gerencia a partilha nativa (Web Share API) ou copia o link no Desktop
   * @param {Object} book
   */
  async function handleShare(book) {
    const shareData = {
      title: `Viva Leve - ${book.titulo}`,
      text: `Dá uma olhadela neste livro: "${book.titulo}" de ${book.autor}. Encontrei na Viva Leve!`,
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
   * Alterna o estado de favorito de um livro e persiste no LocalStorage
   * @param {Event} event
   * @param {Object} book
   */
  async function toggleFavorite(event, book) {
    const btn = event.currentTarget;
    const index = favorites.findIndex((fav) => fav.id === book.id);

    if (index === -1) {
      favorites.push(book);
      btn.classList.add("active");
      btn.querySelector(".fav-text").innerText = "FAVORITADO";
      triggerCounterAnimation();
      openFavoritesDrawer(); // Abre o menu automaticamente ao adicionar
    } else {
      favorites.splice(index, 1);
      btn.classList.remove("active");
      btn.querySelector(".fav-text").innerText = "ADICIONAR AOS FAVORITOS";
    }

    localStorage.setItem("vivaLeveFavorites", JSON.stringify(favorites));

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { favorites: favorites });
    }
    updateFavoritesCount();
  }

  /**
   * Renderiza uma mensagem de erro caso o produto não seja encontrado
   * @param {string} msg
   */
  function renderError(msg) {
    container.innerHTML = `<div class="error-state"><p>${msg}</p><a href="index.html">Voltar ao catálogo</a></div>`;
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
