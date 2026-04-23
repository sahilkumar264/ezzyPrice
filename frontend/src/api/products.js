import apiClient from "./client";

export const searchProducts = async (query) => {
  const response = await apiClient.get("/products/search", {
    params: { q: query },
  });

  return response.data;
};

export const fetchRecentSearches = async (limit = 6) => {
  const response = await apiClient.get("/products/recent", {
    params: { limit },
  });

  return response.data.items || [];
};

export const getApiErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Couldn't load data right now.";
