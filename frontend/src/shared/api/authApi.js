import { apiRequest, clearToken, setToken } from "./client";

export async function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

export async function updateCurrentUser(profileData) {
  return apiRequest("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

export async function updatePassword(passwordData) {
  return apiRequest("/api/auth/me/password", {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });
}

export async function getAdminUsers() {
  return apiRequest("/api/auth/admin/users");
}

export async function updateAdminUserRole(userId, role) {
  return apiRequest(`/api/auth/admin/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function login(credentials) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  setToken(data.access_token);
  return data;
}

export async function register(userData) {
  const data = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  setToken(data.access_token);
  return data;
}

export async function logout() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } catch {
    // The local token may already be expired or invalid; logout should still clear it.
  } finally {
    clearToken();
  }
}
