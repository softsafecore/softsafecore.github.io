/**
 * Viva Leve - Auth Logic (Modular Firebase v10)
 */
import { auth, db, functions } from "../../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
const googleProvider = new GoogleAuthProvider();

const msgEl = document.getElementById("auth-message");
let usernameTimer;
let confirmationResult = null;

// --- Inicializador de Recaptcha (Necessário para Telefone) ---
function initRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "btn-login-submit", {
      size: "invisible",
    });
  }
}

// --- Helper de Redirecionamento Pós-Autenticação ---
async function handlePostAuth(user) {
  if (typeof syncFavoritesToFirestore === "function") {
    await syncFavoritesToFirestore(user.uid);
  }
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "profile.html";
  }
}

// --- Alternar Abas ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".auth-form")
      .forEach((f) => f.classList.remove("active"));

    btn.classList.add("active");
    document
      .getElementById(`${btn.dataset.target}-form`)
      .classList.add("active");
    msgEl.innerText = "";
  });
});

// --- Criar Conta ---
document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const country = document.getElementById("register-country").value;
    const password = document.getElementById("register-password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: name, // Unificado para 'fullName' para o profile.js
        username: username,
        email: email,
        country: country,
        role: "user",
        createdAt: serverTimestamp(), // Senior approach: consistent server time
      });

      await handlePostAuth(userCredential.user);
    } catch (error) {
      msgEl.innerText = "Erro ao criar conta: " + error.message;
    }
  });

// --- Login com Google ---
const googleBtn = document.getElementById("google-auth-btn");
if (googleBtn)
  googleBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          fullName: user.displayName,
          username: `@${user.email.split("@")[0]}`,
          email: user.email,
          country: "Desconhecido",
          createdAt: serverTimestamp(),
        });
      }
      await handlePostAuth(user);
    } catch (error) {
      msgEl.innerText = "Erro Google: " + error.message;
    }
  });

// --- Login Normal ---
const loginForm = document.getElementById("login-form");
if (loginForm)
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const activeMethod =
      document.querySelector(".method-btn.active").dataset.method;
    const btn = document.getElementById("btn-login-submit");

    try {
      if (activeMethod === "email") {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await handlePostAuth(userCredential.user);
      } else {
        // Lógica de Telefone
        if (!confirmationResult) {
          initRecaptcha();
          const phoneNumber = document.getElementById("login-phone").value;
          btn.innerText = "A ENVIAR SMS...";
          confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            window.recaptchaVerifier,
          );
          document.getElementById("otp-container").style.display = "block";
          btn.innerText = "VERIFICAR CÓDIGO";
        } else {
          const code = document.getElementById("login-otp").value;
          const result = await confirmationResult.confirm(code);
          const user = result.user;

          // Criar perfil base se for novo utilizador via Telefone
          await setDoc(
            doc(db, "users", user.uid),
            {
              fullName: "Utilizador SMS",
              username: `@user_${user.uid.slice(0, 5)}`,
              email: user.phoneNumber,
              lastLogin: serverTimestamp(),
              role: "user",
            },
            { merge: true },
          );

          await handlePostAuth(user);
        }
      }
    } catch (error) {
      handleAuthError(error);
      btn.innerText = "Entrar no Painel";
      confirmationResult = null;
    }
  });

// --- Recuperar Palavra-passe ---
const forgotLink = document.getElementById("forgot-password-link");
if (forgotLink)
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;

    if (!email) {
      msgEl.innerText =
        "Insira o seu e-mail no campo acima para recuperar a senha.";
      msgEl.style.color = "var(--error)";
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      msgEl.innerText = "E-mail de recuperação enviado com sucesso!";
      msgEl.style.color = "var(--success)";
    } catch (error) {
      handleAuthError(error);
    }
  });

// --- Tratamento de Erros ---
function handleAuthError(error) {
  console.error(error);
  let message = "Ocorreu um erro inesperado.";

  switch (error.code) {
    case "custom/username-taken":
      message = "Este nome de utilizador já está a ser usado.";
      break;
    case "auth/email-already-in-use":
      message = "Este e-mail já está em uso.";
      break;
    case "auth/invalid-email":
      message = "O e-mail inserido é inválido.";
      break;
    case "auth/weak-password":
      message = "A palavra-passe deve ter pelo menos 6 caracteres.";
      break;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      message = "E-mail ou palavra-passe incorretos.";
      break;
    case "auth/popup-closed-by-user":
      message = "Login com Google cancelado.";
      break;
    case "auth/configuration-not-found":
      message =
        "Erro interno: O método de login não está ativado no Firebase Console.";
      break;
  }

  msgEl.innerText = message;
  msgEl.style.color = "var(--error)";
}
