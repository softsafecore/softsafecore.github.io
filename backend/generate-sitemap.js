/**
 * Script de utilitário Node.js para gerar o sitemap.xml automaticamente
 * Baseia-se no conteúdo do arquivo livros.json
 */
const fs = require("fs");
const path = require("path");

// Configurações básicas
const BASE_URL = "https://vivalevee.online"; // Substitua pelo seu domínio real
const BOOKS_JSON_PATH = path.join(__dirname, "..", "frontend", "json", "livros.json");
const SITEMAP_PATH = path.join(__dirname, "..", "sitemap.xml");

function generateSitemap() {
  try {
    const data = fs.readFileSync(BOOKS_JSON_PATH, "utf8");
    const books = JSON.parse(data);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Adicionar página inicial
    xml += `  <url>\n    <loc>${BASE_URL}/index.html</loc>\n    <priority>1.0</priority>\n  </url>\n`;

    // 2. Adicionar cada livro dinamicamente na nova rota
    books.forEach((book) => {
      const bookIdentifier = book.slug || book.id;
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/produto/${bookIdentifier}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, xml);
    console.log(
      "✅ sitemap.xml gerado com sucesso para " + books.length + " livros!",
    );
  } catch (err) {
    console.error("❌ Erro ao gerar o sitemap:", err);
  }
}

generateSitemap();

// Para rodar: abra o terminal na pasta do projeto e digite: node frontend/js/generate-sitemap.js
