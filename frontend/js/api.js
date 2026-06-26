// Ce fichier centralise tous les appels fetch du projet.
// Si l'adresse du backend change, il suffit de modifier BASE_URL ici.
const BASE_URL = "https://fakestoreapi.com";

// Construit une URL propre a partir d'un endpoint comme "/products".
function buildApiUrl(endpoint) {
  return `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

// Prepare les entetes HTTP et ajoute le token JWT lorsqu'il existe.
function buildHeaders(customHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders
  };

  if (typeof getToken === "function") {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

// Analyse la reponse du serveur et transforme les erreurs en messages lisibles.
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data.message
      ? data.message
      : "Une erreur est survenue pendant la communication avec le serveur.";

    throw new Error(message);
  }

  return data;
}

// Requete GET: utile pour charger des listes ou des details de produits.
async function apiGet(endpoint, options = {}) {
  const response = await fetch(buildApiUrl(endpoint), {
    method: "GET",
    headers: buildHeaders(options.headers)
  });

  return parseResponse(response);
}

// Requete POST: utile pour la connexion, l'inscription ou l'envoi de donnees.
async function apiPost(endpoint, data, options = {}) {
  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers: buildHeaders(options.headers),
    body: JSON.stringify(data)
  });

  return parseResponse(response);
}
