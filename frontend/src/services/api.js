import axios from "axios";

const API_URL = "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ensuring cookies are sent
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // removed reload causing issues
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (userData) => api.post("/auth/register", userData);
export const login = (credentials) => api.post("/auth/login", credentials);
export const verifyToken = () => api.get("/auth/verify");

// Files
export const uploadFiles = (formData, onProgress) => {
  return api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress?.(percentCompleted);
    },
  });
};

export const getFiles = (params) => api.get("/files", { params });
export const downloadFile = (fileId) => {
  return api.get(`/files/download/${fileId}`, { responseType: "blob" });
};
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);
export const renameFile = (fileId, newName) => {
  return api.patch(`/files/${fileId}`, { newName });
};

// Media URLs
export const getMediaToken = (fileId) => api.get(`/files/token/${fileId}`);

export const getViewUrl = (fileId, token) =>
  `${API_URL}/files/view/${fileId}?token=${token}`;

export const getStreamUrl = (fileId, token) =>
  `${API_URL}/files/stream/${fileId}?token=${token}`;

export const getThumbnailUrl = (fileId, token) =>
  `${API_URL}/files/thumbnail/${fileId}?token=${token}`;


// Users
export const getUserProfile = () => api.get("/users/profile");

export default api;
