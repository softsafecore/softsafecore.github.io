import { auth, db, storage } from "../../firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const loginMsg = document.getElementById("login-msg");

// --- Auth State ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().role === "admin") {
      if (!user.emailVerified) {
        loginMsg.innerText =
          "Por favor, verifique o seu e-mail antes de aceder ao painel.";
        loginMsg.style.display = "block";
        await signOut(auth); // Força logout para garantir re-verificação
        window.location.href = "login.html";
      } else {
        adminSection.style.display = "block";
      }
    } else {
      window.location.href = "login.html";
    }
  } else {
    window.location.href = "login.html";
  }
});

// --- Logout ---
document
  .getElementById("btn-logout")
  .addEventListener("click", () => signOut(auth));

// --- Upload e Publicação ---
document
  .getElementById("publish-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-publish");
    const msg = document.getElementById("publish-msg");
    const fileInput = document.getElementById("book-file");

    btn.disabled = true;
    btn.innerText = "A carregar PDF...";

    try {
      let arquivoUrl = "";
      const file = fileInput.files[0];

      if (file) {
        // Criar referência única no Storage
        const storageRef = ref(storage, `ebooks/${Date.now()}_${file.name}`);
        // Fazer o upload
        const snapshot = await uploadBytes(storageRef, file);
        // Obter URL pública
        arquivoUrl = await getDownloadURL(snapshot.ref);
      }

      btn.innerText = "A guardar dados...";

      const bookData = {
        titulo: document.getElementById("book-title").value,
        autor: document.getElementById("book-author").value,
        preco: parseFloat(document.getElementById("book-price").value),
        imagem: document.getElementById("book-image").value,
        arquivoUrl: arquivoUrl, // URL vinda do Storage
        categoriaTag: document.getElementById("book-category").value,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "books"), bookData);

      // Solicitar ao servidor que atualize o arquivo JSON
      btn.innerText = "Sincronizando catálogo...";
      await fetch("/api/admin/sync-json", { method: "POST" });

      msg.innerText = "Sucesso! Livro publicado e catálogo atualizado.";
      msg.className = "message success";
      document.getElementById("publish-form").reset();
    } catch (err) {
      console.error(err);
      msg.innerText = "Erro ao publicar. Verifica Storage/Firestore.";
      msg.className = "message error";
    } finally {
      msg.style.display = "block";
      btn.disabled = false;
      btn.innerText = "Publicar Livro";
    }
  });
