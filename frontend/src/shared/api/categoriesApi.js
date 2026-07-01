import { apiRequest } from "./client";

export function getCategories(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.skip !== undefined) {
    searchParams.set("skip", params.skip);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return apiRequest(`/api/categories/${query ? `?${query}` : ""}`);
}

export function createCategory(categoryData) {
  return apiRequest("/api/categories/", {
    method: "POST",
    body: JSON.stringify(categoryData),
  });
}

export function deleteCategory(categoryId) {
  return apiRequest(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
}
