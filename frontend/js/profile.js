import { auth, db } from "../../firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
let currentUser = null;

// --- Proteção de Rota & Carregamento de Dados ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadUserData();
});

async function loadUserData() {
  const card = document.getElementById("user-info-card");
  try {
    const docRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Preencher View Mode
      document.getElementById("user-name").innerText = data.fullName;
      document.getElementById("user-handle").innerText = data.username;
      document.getElementById("user-email").innerText = data.email;
      document.getElementById("view-location").innerText =
        data.country || "Não definido";
      document.getElementById("user-joined").innerText =
        data.createdAt?.toDate().toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }) || "Recentemente";

      // Preencher Edit Mode
      document.getElementById("edit-name").value = data.fullName;
      document.getElementById("edit-username").value = data.username;
      document.getElementById("edit-country").value = data.country || "MZ";

      // Avatar
      const initials = data.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      document.getElementById("user-initials").innerText = initials;

      // Carregar Favoritos do Firestore se existirem
      if (data.favorites) {
        localStorage.setItem(
          "vivaLeveFavorites",
          JSON.stringify(data.favorites),
        );
        renderFavoritesFromList(data.favorites);
      } else {
        loadFavorites(); // Fallback para local
      }

      card.classList.remove("skeleton");
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

// --- Lógica de Edição ---
const editBtn = document.getElementById("edit-profile-btn");
const cancelBtn = document.getElementById("cancel-edit");
const saveBtn = document.getElementById("save-profile");
const viewMode = document.getElementById("view-mode");
const editMode = document.getElementById("edit-mode");
const viewLocation = document.getElementById("view-location");
const editLocation = document.getElementById("edit-country");
const editActions = document.getElementById("edit-actions");
const editUsernameField = document.getElementById("edit-username");

// Máscara de Username
editUsernameField.addEventListener("input", (e) => {
  let val = e.target.value;
  if (val && !val.startsWith("@")) val = "@" + val;
  if (val.length > 1) val = "@" + val.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
  e.target.value = val;
});

editBtn.addEventListener("click", () => toggleEdit(true));
cancelBtn.addEventListener("click", () => toggleEdit(false));

function toggleEdit(isEditing) {
  viewMode.style.display = isEditing ? "none" : "block";
  editMode.style.display = isEditing ? "block" : "none";
  viewLocation.style.display = isEditing ? "none" : "block";
  editLocation.style.display = isEditing ? "block" : "none";
  editActions.style.display = isEditing ? "flex" : "none";
  editBtn.style.display = isEditing ? "none" : "flex";
}

saveBtn.addEventListener("click", async () => {
  saveBtn.innerText = "A guardar...";
  saveBtn.disabled = true;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      fullName: document.getElementById("edit-name").value,
      username: document.getElementById("edit-username").value,
      country: document.getElementById("edit-country").value,
    });
    await loadUserData();
    toggleEdit(false);
  } catch (err) {
    alert("Erro ao atualizar perfil.");
  } finally {
    saveBtn.innerText = "Guardar Alterações";
    saveBtn.disabled = false;
  }
});

// --- Componente de Favoritos ---
function loadFavorites() {
  const grid = document.getElementById("favorites-grid");
  const favorites = JSON.parse(localStorage.getItem("vivaLeveFavorites")) || [];
  renderFavoritesFromList(favorites);
}

function renderFavoritesFromList(favorites) {
  const grid = document.getElementById("favorites-grid");
  if (favorites.length === 0) {
    grid.innerHTML = `<p class="empty-drawer-msg">Ainda não tens favoritos.</p>`;
    return;
  }

  grid.innerHTML = favorites
    .map(
      (book) => `
        <div class="fav-item">
            <img src="${book.imagem}" alt="${book.titulo}">
            <h3>${book.titulo}</h3>
            <button class="btn-remove-fav" onclick="removeFavorite('${book.id}')">Remover</button>
        </div>
    `,
    )
    .join("");
}

window.removeFavorite = async (id) => {
  let favorites = JSON.parse(localStorage.getItem("vivaLeveFavorites")) || [];
  favorites = favorites.filter((f) => f.id !== id);
  localStorage.setItem("vivaLeveFavorites", JSON.stringify(favorites));

  if (currentUser) {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { favorites: favorites });
  }
  renderFavoritesFromList(favorites);
};

// --- Logout ---
document.getElementById("logout-btn").addEventListener("click", async (e) => {
  e.preventDefault();
  if (confirm("Deseja realmente sair da conta?")) {
    await signOut(auth);
    window.location.href = "login.html";
  }
});
