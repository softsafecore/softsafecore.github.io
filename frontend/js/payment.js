const express = require("express");
const router = express.Router();
const Order = require("../../backend/models/Order");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Simulação de base de dados de livros (No mundo real, buscaria do MongoDB)
const booksData = require("../json/livros.json");

/**
 * 1. Inicialização do Checkout
 * POST /api/checkout
 */
router.post("/checkout", async (req, res) => {
  try {
    const { bookId, phone } = req.body;

    // SEGURANÇA: Buscar preço no servidor, nunca confiar no valor vindo do front-end
    const book = booksData.find((b) => b.id === bookId);
    if (!book || book.preco <= 0) {
      return res.status(400).json({ error: "Livro inválido para venda." });
    }

    const paymentReference = `VL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Criar ordem pendente
    const order = new Order({
      bookId: book.id,
      amount: book.preco,
      customerPhone: phone,
      paymentReference,
      status: "pending",
    });
    await order.save();

    // LÓGICA DE INTEGRAÇÃO GATEWAY (M-Pesa/e-Mola)
    // Aqui dispararia o C2B Push para a API do provedor
    // Exemplo: const response = await gateway.c2bPush(phone, book.preco, paymentReference);

    res.json({
      message: "Pagamento iniciado. Por favor, confirme no seu telemóvel.",
      reference: paymentReference,
    });
  } catch (error) {
    console.error("Erro no checkout:", error);
    res.status(500).json({ error: "Falha ao processar checkout." });
  }
});

/**
 * 2. Webhook de Pagamento
 * POST /api/webhooks/payment
 */
router.post("/webhooks/payment", async (req, res) => {
  // SEGURANÇA: Validar Signature/Token do Gateway para garantir que a requisição é legítima
  const gatewayAuth = req.headers["x-gateway-token"];
  if (gatewayAuth !== process.env.GATEWAY_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { reference, transactionId, status } = req.body; // Campos dependem da API (Vodacom/Movitel)

    const order = await Order.findOne({ paymentReference: reference });
    if (!order) return res.status(404).send("Order not found");

    if (status === "SUCCESS") {
      order.status = "paid";
      order.gatewayTransactionId = transactionId;

      // Gerar Token de Download Único (Expira em 30 min)
      const downloadToken = jwt.sign(
        { orderId: order._id, bookId: order.bookId },
        process.env.JWT_SECRET,
        { expiresIn: "30m" },
      );

      order.downloadToken = downloadToken;
      await order.save();

      // Opcional: Disparar SMS/Email para o cliente com o link:
      // https://vivalevee.online/api/download/${downloadToken}
    } else {
      order.status = "failed";
      await order.save();
    }

    res.status(200).send("OK");
  } catch (error) {
    res.status(500).send("Webhook Error");
  }
});

/**
 * 3. Consulta de Status (Polling)
 * GET /api/checkout/status/:reference
 */
router.get("/checkout/status/:reference", async (req, res) => {
  try {
    const order = await Order.findOne({ paymentReference: req.params.reference });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    res.json({ status: order.status, downloadToken: order.downloadToken });
  } catch (error) {
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

module.exports = router;
