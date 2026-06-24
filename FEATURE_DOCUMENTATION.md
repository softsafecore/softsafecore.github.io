# Funcionalidades de Design - Viva Leve

## 1. Transição de Cor Suave no Fundo

### 📝 Descrição

Quando o usuário muda de categoria, o fundo da página realiza uma transição suave de cor, criando uma experiência visual imersiva.

### 🎨 Cores por Categoria

- **Romance**: Tons de roxo escuro (`#1a0f1a`)
- **Alimentação Saudável**: Tons de verde escuro (`#0f1a0a`)
- **Saúde Mental & Emocional**: Tons de azul escuro (`#0a0f1a`)
- **Ficção & Fantasias**: Tons de vermelho escuro (`#1a0a0f`)
- **Conto**: Tons de teal escuro (`#0f1a16`)
- **Todos os Livros**: Cor padrão (`#0A1016`)

### 🔧 Como Funciona

1. Ao clicar em uma categoria (desktop ou mobile), a função `changeBackgroundByCategory()` é acionada
2. A cor de fundo transiciona suavemente em **0.8 segundos** usando a função de easing `cubic-bezier(0.4, 0, 0.2, 1)`
3. As classes CSS `category-[nome]` são aplicadas/removidas dinamicamente

### 💻 Código Relevante

- **CSS**: `e:\DEVELOPER TOOL\github\vivalevee.online\frontend\css\style.css` (linhas com `category-` e `transition: background-color`)
- **JS**: `e:\DEVELOPER TOOL\github\vivalevee.online\frontend\js\app.js` (função `changeBackgroundByCategory()`)

---

## 2. Badge Neon "E-book" ou "PDF"

### 📝 Descrição

Um badge visual no canto superior direito de cada capa de livro indica se é um E-book ou PDF, com um efeito neon brilhante e animado.

### ✨ Características

- **Posição**: Canto superior direito da imagem da capa
- **Cores**:
  - **E-book**: Verde neon (`#00ff88`) com animação de brilho
  - **PDF**: Magenta neon (`#ff00ff`) com animação de brilho
- **Animação**: Efeito neon pulsante que se repete a cada 2 segundos
- **Efeito**: Sombra dupla (caixa e interna) que cria profundidade

### 🔧 Como Funciona

1. O sistema detecta automaticamente se o arquivo é PDF ou E-book através da extensão do arquivo em `book.arquivoUrl`
2. O badge é renderizado dinamicamente na função `renderBooks()`
3. A animação CSS `neon-glow` (e `neon-glow-pink` para PDF) cria o efeito de brilho contínuo

### 💻 Código Relevante

- **CSS**: `e:\DEVELOPER TOOL\github\vivalevee.online\frontend\css\style.css` (classes `.book-badge`, animações `@keyframes neon-glow`)
- **JS**: `e:\DEVELOPER TOOL\github\vivalevee.online\frontend\js\app.js` (função `renderBooks()`, linhas que criam o badge)

---

## 🎯 Como Customizar

### Alterar Cores de Fundo por Categoria

No arquivo `style.css`, localize:

```css
body.category-romance {
  background-color: #1a0f1a; /* Altere aqui */
}
```

### Alterar Cores do Badge Neon

No arquivo `style.css`, procure por:

```css
.book-badge {
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); /* Verde */
}

.book-badge.pdf {
  background: linear-gradient(135deg, #ff00ff 0%, #cc00cc 100%); /* Magenta */
}
```

### Alterar Velocidade da Transição de Fundo

No `style.css`, procure por:

```css
body {
  transition: background-color 0.8s cubic-bezier(0.4, 0, 0.2, 1); /* 0.8s é a duração */
}
```

### Alterar Velocidade da Animação Neon

No `style.css`, procure por:

```css
animation: neon-glow 2s ease-in-out infinite; /* 2s é a duração */
```

---

## 🧪 Testando as Funcionalidades

### Teste de Transição de Cor

1. Abra o site
2. Clique em diferentes categorias na navegação
3. Observe a cor de fundo transicionando suavemente

### Teste de Badge Neon

1. Abra o site
2. Procure pelas capas de livros
3. Observe o badge colorido no canto superior direito
4. Veja o efeito neon pulsante

---

## 📋 Estrutura de Dados Necessária

Para que os badges funcionem corretamente, certifique-se de que cada livro no JSON tem a propriedade `arquivoUrl`:

```json
{
  "id": 1,
  "titulo": "Nome do Livro",
  "arquivoUrl": "../assets/ebooks/livro.pdf", // ou .pdf para PDF
  "categoriaTag": "romance" // use os tags corretos
}
```

---

## 🚀 Performance

- **Transição de Fundo**: Sem impacto de performance (simples mudança CSS)
- **Badges Neon**: Otimizado com animações CSS3 (GPU acelerado)
- **Renderização**: Os badges são renderizados inline, sem callbacks adicionais

---

## ⚠️ Notas Importantes

1. Certifique-se de que o JSON dos livros possui a propriedade `categoriaTag` corretamente preenchida
2. A transição de cor usa `cubic-bezier` para suavidade; ajuste conforme necessário
3. Os badges usam `box-shadow` duplo para criar o efeito neon; navegadores mais antigos podem não renderizar perfeitamente
4. A animação neon é contínua; considere reduzir a duração em dispositivos móveis se necessário

---

## 📞 Suporte

Para modificações ou perguntas sobre essas funcionalidades, consulte:

- `frontend/css/style.css` - Todos os estilos visuais
- `frontend/js/app.js` - Lógica de renderização e filtros
