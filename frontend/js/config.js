/**
 * SoftSafe Core - Configuração Global de Rotas e Caminhos
 */

const pathname = window.location.pathname;
// Verifica se estamos dentro da pasta /pages/ para ajustar a profundidade
const isSubPage = pathname.includes('/pages/');
const root = isSubPage ? '../../' : './';

export const CONFIG = {
    root: root,
    paths: {
        index: `${root}index.html`,
        search: `${root}frontend/pages/search.html`,
        product: `${root}frontend/pages/product.html`,
        about: `${root}frontend/pages/about.html`,
        login: `${root}frontend/pages/login.html`,
        profile: `${root}frontend/pages/profile.html`,
    },
    assets: {
        logo: `${root}frontend/assets/logo.png`,
        appsJson: `${root}frontend/json/apps.json`,
        placeholder: `${root}frontend/assets/covers/placeholder.jpg`
    }
};

/**
 * Verifica se uma página existe antes de navegar.
 * @param {string} targetUrl - O destino desejado.
 * @param {string} fallbackUrl - Para onde ir se o destino falhar (padrão: index).
 */
export async function safeNavigate(targetUrl, fallbackUrl = CONFIG.paths.index) {
    try {
        // Usamos o método HEAD para ser mais rápido (não descarrega o corpo da página)
        const response = await fetch(targetUrl, { method: 'HEAD' });

        if (response.ok) {
            window.location.href = targetUrl;
        } else {
            console.warn(`[Router] 404: ${targetUrl} não encontrado. Redirecionando para fallback.`);
            window.location.href = fallbackUrl;
        }
    } catch (error) {
        // Em caso de erro de rede ou CORS, tentamos o fallback
        console.error(`[Router] Erro ao verificar rota:`, error);
        window.location.href = fallbackUrl;
    }
}