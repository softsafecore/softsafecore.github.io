const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const path = require("path");
const Order = require("../../backend/models/Order");

/**
 * Download Seguro via Token
 * GET /api/download/:token
 */
router.get("/download/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Verificar e descriptografar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Verificar no banco se a ordem está realmente paga
    const order = await Order.findOne({
      _id: decoded.orderId,
      status: "paid",
      downloadToken: token,
    });

    if (!order) {
      return res.status(403).send("Acesso negado ou link expirado.");
    }

    // 3. Obter o caminho do arquivo (Protegido fora da pasta pública)
    // Exemplo: files/ebooks/123.pdf
    const filePath = path.join(
      __dirname,
      "../secure_files",
      `book_${decoded.bookId}.pdf`,
    );

    // 4. Stream do arquivo (Oculta o link real e faz o browser baixar diretamente)
    res.download(filePath, `VivaLeve_Ebook_${decoded.bookId}.pdf`, (err) => {
      if (err) console.error("Erro no stream do arquivo:", err);
    });
  } catch (error) {
    res.status(401).send("Link de download inválido ou expirado.");
  }
});

module.exports = router;
