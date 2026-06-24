/**
 * Viva Leve - Sistema de Pesquisa Resiliente
 * Engenharia Front-End Sénior & Debugging
 */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { CONFIG } from "./config.js";
import "./vv-image.js";

let allBooks = [];
let favorites = JSON.parse(localStorage.getItem("vivaLeveFavorites")) || [];
let currentUser = null;

/**
 * 1. ARQUITETURA DE INICIALIZAÇÃO SEGURA
 * Encapsulamento global para evitar que erros matem a página.
 */
async function initSearch() {
    try {
        console.log("Viva Leve: A iniciar motor de busca...");

        // 4. LOGICA DE CAPTURA DA URL
        const params = new URLSearchParams(window.location.search);
        const termoPesquisa = params.get('q') ? params.get('q').trim() : '';

        // 2. PROGRAMAÇÃO DEFENSIVA (Null Checks)
        const grid = document.getElementById('search-results-grid');
        const termDisplay = document.getElementById('search-query-text');
        const resultsCount = document.getElementById('results-count');

        if (!grid) {
            console.warn('Aviso: Elemento #search-results-grid não encontrado no HTML.');
            return; // Interrompe a execução local, mas não quebra o script global
        }

        // Atualiza o texto da query se o elemento existir
        if (termDisplay) {
            termDisplay.textContent = termoPesquisa ? `"${termoPesquisa}"` : "Todos os livros";
        }

        // Caso a URL venha sem 'q' ou vazia, mostramos o catálogo completo ou mensagem
        if (!termoPesquisa) {
            await loadAndFilterBooks('', grid, resultsCount);
            return;
        }

        // Execução da busca propriamente dita
        await loadAndFilterBooks(termoPesquisa, grid, resultsCount);

    } catch (error) {
        // 1. CATCH GLOBAL: Impede o ecrã branco
        console.error("Erro detetado no search.js:", error);

        const grid = document.getElementById('search-results-grid');
        if (grid) {
            renderErrorState("Não foi possível processar a sua pesquisa neste momento.");
        }
    }
}

/**
 * Fetch e Filtragem do Catálogo
 */
async function loadAndFilterBooks(termo, grid, countEl) {
    renderSearchSkeletons(grid);

    // Usa CONFIG para garantir que o fetch funcione mesmo se o ficheiro mudar de pasta
    const response = await fetch(CONFIG.assets.livrosJson).catch(() => null);
    if (!response || !response.ok) throw new Error("Base de dados de livros (JSON) inacessível.");

    allBooks = await response.json();

    const termoNorm = normalizarTexto(termo);
    const resultados = allBooks.filter(book => {
        const titulo = normalizarTexto(book.titulo);
        const autor = normalizarTexto(book.autor);
        const categoria = normalizarTexto(book.categoria_tag || "");
        return titulo.includes(termoNorm) || autor.includes(termoNorm) || categoria.includes(termoNorm);
    });

    if (countEl) countEl.textContent = resultados.length;

    if (resultados.length === 0) {
        renderNoResults(grid, termo);
    } else {
        renderBooks(resultados, termo, grid);
    }
}

/**
 * Renderiza cartões de carregamento visual
 */
function renderSearchSkeletons(container) {
    container.innerHTML = Array(6).fill(0).map(() => `
        <div class="book-card skeleton-card">
            <div class="skeleton skeleton-cover" style="height: 350px;"></div>
            <div class="book-info">
                <div class="skeleton skeleton-title" style="width: 80%; margin: 10px auto;"></div>
                <div class="skeleton skeleton-author" style="width: 40%; margin: 0 auto;"></div>
            </div>
        </div>
    `).join("");
}

function renderErrorState(message) {
    const grid = document.getElementById('search-results-grid') || document.querySelector('.books-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #ff4d4d;"></i>
                <p style="margin-top: 15px;">Lamentamos, ocorreu um problema: <br><small>${message}</small></p>
            </div>
        `;
    }
}

function normalizarTexto(texto) {
    if (!texto) return "";
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function renderBooks(books, query, container) {
    container.innerHTML = books.map((book, index) => {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const displayTitle = book.titulo.replace(
            new RegExp(`(${escapedQuery})`, "gi"),
            '<mark class="search-highlight">$1</mark>'
        );

        return `
            <article class="book-card" onclick="window.location.href='product.html?id=${book.id}'">
                <vv-image src="${book.imagem}" alt="${book.titulo}" img-class="book-cover"></vv-image>
                <div class="book-info">
                    <h3 class="book-title">${displayTitle}</h3>
                    <span class="book-price">${book.preco === 0 ? "Grátis" : book.preco.toFixed(2) + " MT"}</span>
                </div>
            </article>
        `;
    }).join("");
}

function renderNoResults(container, query) {
    // 4. ESTADO VAZIO (No Results State)
    container.innerHTML = `
        <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 60px;">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 3.5rem; color: var(--verde-brilho); opacity: 0.5; margin-bottom: 20px;"></i>
            <p>Nenhum livro encontrado para "<strong>${query}</strong>"</p>
            <p style="font-size: 0.9rem; color: var(--texto-mutado); margin-bottom: 25px;">Verifica a ortografia ou tenta termos mais genéricos.</p>
            <a href="${CONFIG.paths.index}" class="btn-member" style="display: inline-block; text-decoration: none;">Ver todo o catálogo</a>
        </div>
    `;
}

function renderMessage(container, msg) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--texto-mutado);">${msg}</p>`;
}

/**
 * SINCRONIZAÇÃO DE UI (Favoritos e Auth)
 */
function updateFavoritesUI() {
    const countDisplay = document.getElementById("favorites-count");
    if (countDisplay) {
        countDisplay.innerText = favorites.length;
    }
}

// Listeners de estado
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    // Lógica de favoritos do Firestore pode ser injetada aqui se necessário
});

// Sincroniza UI quando a Navbar (injetada pelo nav-footer.js) estiver pronta
document.addEventListener("nav-footer-loaded", () => {
    updateFavoritesUI();
});

// Inicialização Segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}

export { initSearch };