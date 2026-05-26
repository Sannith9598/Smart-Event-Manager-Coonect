import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

// Resolves or rejects all queued requests once the token refresh completes
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Attaches the JWT token to every outgoing request if one exists in localStorage
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// Intercepts 401 responses and attempts a silent token refresh before retrying the original request
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried to refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/auth/refresh-token`,
            { refreshToken }
          );

          localStorage.setItem("token", data.token);
          localStorage.setItem("refreshToken", data.refreshToken);

          API.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          processQueue(null, data.token);

          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return API(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("auth-change"));
          if (window.location.pathname !== "/login" && window.location.pathname !== "/register" && window.location.pathname !== "/forgot-password") {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-change"));
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register" && window.location.pathname !== "/forgot-password") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default API;
