const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.verifyAdminCode = onCall(async (request) => {
  // SEGURANÇA: A chave agora vive apenas no servidor
  const ADMIN_SECRET_KEY =
    process.env.ADMIN_SECRET_KEY || "VIVA_LEVE_2024_ADMIN";
  const { adminCode } = request.data;
  const uid = request.auth.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Utilizador não autenticado.");
  }

  if (adminCode === ADMIN_SECRET_KEY) {
    await getFirestore().collection("users").doc(uid).update({
      role: "admin",
    });
    return {
      status: "success",
      message: "Privilégios de administrador concedidos.",
    };
  } else {
    throw new HttpsError(
      "permission-denied",
      "Código de administrador inválido.",
    );
  }
});
