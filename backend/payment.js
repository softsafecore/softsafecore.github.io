const express = require("express");
const router = express.Router();
const Order = require("./models/Order");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Ajuste de caminho: saindo de backend/ para frontend/json/
const booksData = require("../frontend/json/livros.json");

/**
 * 1. Inicialização do Checkout
 */
router.post("/checkout", async (req, res) => {
  try {
    const { bookId, phone } = req.body;
    const book = booksData.find((b) => b.id === bookId);

    if (!book || book.preco <= 0) {
      return res.status(400).json({ error: "Livro inválido para venda." });
    }

    const paymentReference = `VL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const order = new Order({
      bookId: book.id,
      amount: book.preco,
      customerPhone: phone,
      paymentReference,
      status: "pending",
    });
    await order.save();

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
 */
router.post("/webhooks/payment", async (req, res) => {
  const gatewayAuth = req.headers["x-gateway-token"];
  if (gatewayAuth !== process.env.GATEWAY_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { reference, transactionId, status } = req.body;

    const order = await Order.findOne({ paymentReference: reference });
    if (!order) return res.status(404).send("Order not found");

    if (status === "SUCCESS") {
      order.status = "paid";
      order.gatewayTransactionId = transactionId;

      const downloadToken = jwt.sign(
        { orderId: order._id, bookId: order.bookId },
        process.env.JWT_SECRET,
        { expiresIn: "30m" },
      );

      order.downloadToken = downloadToken;
      await order.save();
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
 */
router.get("/checkout/status/:reference", async (req, res) => {
  try {
    const order = await Order.findOne({
      paymentReference: req.params.reference,
    });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    res.json({ status: order.status, downloadToken: order.downloadToken });
  } catch (error) {
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

module.exports = router;
