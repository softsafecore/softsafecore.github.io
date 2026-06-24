const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: false }, // Opcional se não houver login
  customerPhone: { type: String, required: true },
  bookId: { type: Number, required: true },
  amount: { type: Number, required: true },
  paymentReference: { type: String, required: true, unique: true },
  gatewayTransactionId: { type: String },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  downloadToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
