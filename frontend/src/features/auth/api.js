import { api } from "@/lib/axios";

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),

  verifyOtp: (email, otp_code) => api.post("/auth/verify-otp", { email, otp_code }),

  resendOtp: (email) => api.post("/auth/resend-otp", { email }),

  login: (email, password) =>
    api.post("/auth/login", { email, password }),

  logout: () => api.post("/auth/logout"),

  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),

  verifyResetOtp: (email, otp_code) =>
    api.post("/auth/verify-reset-otp", { email, otp_code }),

  resetPassword: (email, reset_token, new_password, confirm_password) =>
    api.post("/auth/reset-password", { email, reset_token, new_password, confirm_password }),

  getProfile: () => api.get("/auth/profile", { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } }),

  updateProfile: (payload) =>
    api.put("/auth/profile", payload, { headers: { "Content-Type": "multipart/form-data" } }),

  changePassword: (old_password, new_password, confirm_password) =>
    api.post("/auth/change-password", { old_password, new_password, confirm_password }),

  getProfileStats: () => api.get("/auth/profile/stats"),

  deleteAccount: (password) => api.post("/auth/delete", { password }),
};
