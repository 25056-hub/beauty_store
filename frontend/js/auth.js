// Ce fichier gere le token JWT dans le navigateur.
// Toutes les pages utilisent les memes fonctions pour eviter la duplication.
const TOKEN_KEY = "beauty_shop_token";
const USER_KEY = "beauty_shop_user";

// Enregistre le token apres une connexion reussie.
function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Lit le token courant pour savoir si l'utilisateur est connecte.
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Supprime le token lors de la deconnexion.
function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Enregistre quelques informations utilisateur non sensibles.
function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Recupere les informations utilisateur si elles existent.
function getUser() {
  const rawUser = localStorage.getItem(USER_KEY);

  try {
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

// Indique si un token existe dans le navigateur.
function isLoggedIn() {
  return Boolean(getToken());
}

// Deconnecte l'utilisateur puis le renvoie vers la page de connexion.
function logout() {
  removeToken();
  localStorage.removeItem(USER_KEY);
  window.location.href = "login.html";
}

// Met a jour les liens de navigation lorsque la page contient une zone auth.
function updateAuthLinks() {
  const authLinks = document.querySelectorAll("[data-auth-link]");

  authLinks.forEach((link) => {
    if (isLoggedIn()) {
      link.textContent = "Logout";
      link.href = "#";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", updateAuthLinks);
