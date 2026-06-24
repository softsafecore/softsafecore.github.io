const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

/**
 * ATENÇÃO: Deves descarregar o ficheiro JSON da sua Conta de Serviço
 * no Firebase Console (Configurações do Projeto > Contas de Serviço)
 * e guardá-lo como 'serviceAccountKey.json' na pasta backend.
 */
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const jsonPath = path.join(__dirname, "..", "frontend", "json", "livros.json");

async function importBooks() {
  try {
    const data = fs.readFileSync(jsonPath, "utf8");
    const books = JSON.parse(data);

    console.log(`🚀 Iniciando importação de ${books.length} livros...`);

    const batch = db.batch();

    books.forEach((book) => {
      // Usamos o ID do JSON como ID do documento para manter consistência
      const bookId = book.id.toString();
      const bookRef = db.collection("books").doc(bookId);

      // Removemos o ID do corpo do objeto pois ele já será o ID do documento
      const { id, ...bookData } = book;

      // Adicionamos um timestamp de criação
      bookData.createdAt = admin.firestore.FieldValue.serverTimestamp();

      batch.set(bookRef, bookData);
    });

    await batch.commit();
    console.log("✅ Importação concluída com sucesso!");
    process.exit();
  } catch (error) {
    console.error("❌ Erro ao importar:", error);
    process.exit(1);
  }
}

importBooks();
