/**
 * Viva Leve - Web Component de Imagem com Fallback Automático
 * Uso: <vv-image src="..." alt="..." img-class="..."></vv-image>
 */
import { CONFIG } from './config.js';

class VVImage extends HTMLElement {
    static get observedAttributes() { return ['src']; }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'src' && oldVal !== newVal && oldVal !== null) {
            this.render();
        }
    }

    render() {
        const src = this.getAttribute('src');
        const alt = this.getAttribute('alt') || '';
        const className = this.getAttribute('img-class') || '';

        // Injeta a estrutura de imagem. 
        // O skeleton é controlado pela classe CSS .book-cover até que .img-loaded seja aplicada.
        this.innerHTML = `<img src="${src}" alt="${alt}" class="${className} vv-blur-loading" loading="lazy">`;

        const img = this.querySelector('img');

        img.onload = () => {
            img.classList.remove('vv-blur-loading');
            img.classList.add('img-loaded');
            this.dispatchEvent(new CustomEvent('vv-load-success', { bubbles: true }));
        };

        img.onerror = () => {
            if (img.src !== CONFIG.assets.placeholder) {
                console.warn(`[VV-Image] Fallback ativado para: ${src}`);
                img.src = CONFIG.assets.placeholder;
                img.classList.remove('vv-blur-loading');
                img.classList.add('img-loaded');
            }
            img.onerror = null;
        };
    }
}

if (!customElements.get('vv-image')) {
    customElements.define('vv-image', VVImage);
}