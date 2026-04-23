import apiClient from "./client";

export const requestSignupOtp = async (payload) => {
  const response = await apiClient.post("/auth/signup/request-otp", payload);
  return response.data;
};

export const verifySignupOtp = async (payload) => {
  const response = await apiClient.post("/auth/signup/verify-otp", payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await apiClient.post("/auth/login", payload);
  return response.data;
};

export const loginWithGoogle = async (credential) => {
  const response = await apiClient.post("/auth/google", { credential });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post("/auth/logout");
  return response.data;
};
