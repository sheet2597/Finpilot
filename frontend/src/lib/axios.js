import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

// On 401, attempt a silent refresh once, then retry the original request.
let refreshPromise = null;
async function refreshAccessToken() {
  try {
    await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, {}, { withCredentials: true, xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken" });
    return true;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest?.url?.includes("/auth/login") ||
        originalRequest?.url?.includes("/auth/refresh-token")
      ) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const success = await refreshPromise;

      if (success) {
        return api(originalRequest);
      }

      // If refresh fails, reject the promise and let AuthContext/ProtectedRoute handle the redirect
      window.dispatchEvent(new Event("auth_error"));
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) return data.message;
    if (error.code === "ERR_NETWORK") return "Network error. Please check your connection.";
  }
  return fallback;
}
