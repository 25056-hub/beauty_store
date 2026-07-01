import { apiRequest } from "./client";

export function getProducts(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }

  if (params.skip !== undefined) {
    searchParams.set("skip", params.skip);
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return apiRequest(`/api/products/${query ? `?${query}` : ""}`);
}

export function getProduct(productId) {
  return apiRequest(`/api/products/${productId}`);
}

export function createProduct(productData) {
  return apiRequest("/api/products/", {
    method: "POST",
    body: JSON.stringify(productData),
  });
}

export function updateProduct(productId, productData) {
  return apiRequest(`/api/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(productData),
  });
}

export function uploadProductImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  return apiRequest("/api/products/upload-image", {
    method: "POST",
    body: formData,
  });
}

export function deleteProduct(productId) {
  return apiRequest(`/api/products/${productId}`, {
    method: "DELETE",
  });
}
