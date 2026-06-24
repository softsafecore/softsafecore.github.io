/**
 * Viva Leve - Checkout Logic & Polling
 */

class Checkout {
  constructor(bookId, amount) {
    this.bookId = bookId;
    this.amount = amount;
    this.pollingInterval = null;
    this.modal = document.getElementById("payment-modal");
    this.backBtn = document.getElementById("payment-back");
    this.steps = {
      0: document.getElementById("payment-step-0"),
      "1a": document.getElementById("payment-step-1a"),
      "1b": document.getElementById("payment-step-1b"),
      "1c": document.getElementById("payment-step-1c"),
      2: document.getElementById("payment-step-2"),
    };
    this.step2 = document.getElementById("payment-step-2");
    this.phoneInput = document.getElementById("checkout-phone");
    this.confirmBtn = document.getElementById("confirm-payment");
  }

  init() {
    this.modal.style.display = "flex";
    this.switchStep(0);

    // Atualiza todos os displays de preço no modal
    document.querySelectorAll(".modal-amount-val").forEach((el) => {
      el.innerText = `${this.amount.toFixed(2)} MT`;
    });

    // Configura listeners dos cartões de método
    document.querySelectorAll(".method-card").forEach((card) => {
      card.onclick = () => {
        const method = card.dataset.method;
        this.handleMethodSelection(method);
      };
    });

    this.backBtn.onclick = () => this.switchStep(0);
    this.confirmBtn.onclick = () => this.startCheckout();
  }

  switchStep(stepKey) {
    // Esconde todas as etapas
    Object.values(this.steps).forEach((step) => (step.style.display = "none"));
    // Mostra a etapa selecionada
    this.steps[stepKey].style.display = "block";
    // Controla botão voltar
    this.backBtn.style.display =
      stepKey === 0 || stepKey === 2 ? "none" : "flex";
  }

  handleMethodSelection(method) {
    if (method === "mpesa" || method === "emola") {
      const title = document.getElementById("mobile-money-title");
      title.innerText =
        method === "mpesa" ? "PAGAMENTO M-PESA" : "PAGAMENTO e-MOLA";
      this.phoneInput.placeholder =
        method === "mpesa" ? "84 / 85 XXXXXXX" : "86 / 87 XXXXXXX";
      this.switchStep("1a");
    } else if (method === "paypal") {
      this.switchStep("1b");
    } else if (method === "bank") {
      this.switchStep("1c");
    }
  }

  async startCheckout() {
    const phone = this.phoneInput.value.trim();

    // Validação básica Moçambique (82, 83, 84, 85, 86, 87)
    if (!/^(82|83|84|85|86|87)\d{7}$/.test(phone)) {
      alert("Por favor, insira um número M-Pesa ou e-Mola válido.");
      return;
    }

    this.confirmBtn.disabled = true;
    this.confirmBtn.innerText = "A PROCESSAR...";

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: this.bookId, phone: phone }),
      });

      const data = await response.json();

      if (data.reference) {
        this.showPolling(data.reference);
      } else {
        throw new Error(data.error || "Erro ao inicializar checkout");
      }
    } catch (err) {
      alert(err.message);
      this.confirmBtn.disabled = false;
      this.confirmBtn.innerText = "CONFIRMAR E PAGAR";
    }
  }

  showPolling(reference) {
    this.switchStep(2);

    this.pollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${reference}`);
        const statusData = await res.json();

        if (statusData.status === "paid") {
          clearInterval(this.pollingInterval);
          window.location.href = `/api/download/${statusData.downloadToken}`;
        } else if (statusData.status === "failed") {
          clearInterval(this.pollingInterval);
          alert("O pagamento falhou ou foi cancelado.");
          location.reload();
        }
      } catch (e) {
        console.error("Erro no polling:", e);
      }
    }, 3000);
  }

  static close() {
    const modal = document.getElementById("payment-modal");
    if (modal) {
      modal.style.display = "none";
      // Limpar estado se necessário
    }
  }
}

/**
 * Função global para inicializar o fluxo de pagamento
 * @param {number} price - Preço do livro capturado do data-price
 * @param {number|string} bookId - ID do livro capturado do data-id
 */
window.abrirModalPagamento = (price, bookId) => {
  const checkout = new Checkout(bookId, price);
  checkout.init();
};

// Event Listeners globais para fechar
document
  .querySelector(".close-payment-modal")
  ?.addEventListener("click", () => {
    document.getElementById("payment-modal").style.display = "none";
    // Se houver polling ativo, idealmente limpar aqui também
  });
