import axios from "axios";

const API_URL = "/api";

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
export const login2FA = (credentials) =>
  api.post("/auth/login/2fa", credentials);
export const generate2FA = () => api.post("/auth/2fa/generate");
export const verify2FA = (token) => api.post("/auth/2fa/verify", { token });
export const disable2FA = () => api.post("/auth/2fa/disable");
export const verifyToken = () => api.get("/auth/verify");

// Sharing
export const shareFile = (fileId, email) =>
  api.post("/sharing/share", { fileId, email });
export const getSharedWithMe = () => api.get("/sharing/shared-with-me");
export const getMyShares = () => api.get("/sharing/my-shares");
export const unshareFile = (fileId, email) =>
  api.delete("/sharing/unshare", { data: { fileId, email } });

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

// Folders
export const createFolder = (name, parentId) => api.post("/folders", { name, parentId });
export const getFolders = (parentId) => api.get("/folders", { params: { parentId } });
export const renameFolder = (id, name) => api.put(`/folders/${id}`, { name });
export const deleteFolder = (id) => api.delete(`/folders/${id}`);

// Passwords
export const getPasswords = () => api.get("/passwords");
export const createPassword = (data) => api.post("/passwords", data);
export const revealPassword = (id) => api.get(`/passwords/${id}/reveal`);
export const updatePassword = (id, data) => api.put(`/passwords/${id}`, data);
export const deletePassword = (id) => api.delete(`/passwords/${id}`);

// File Operations
export const moveFiles = (fileIds, targetFolderId) => api.put("/files/move", { fileIds, targetFolderId });
export const copyFiles = (fileIds, targetFolderId) => api.post("/files/copy", { fileIds, targetFolderId });

export default api;
