import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  HardDrive,
  LogOut,
  Upload,
  Image,
  Video,
  Music,
  FileText,
  Search,
  Trash2,
  Download,
  Grid,
  List,
  Filter,
} from "lucide-react";
import {
  getFiles,
  deleteFile,
  downloadFile,
  getUserProfile,
} from "../services/api";
import { formatDistanceToNow } from "date-fns";
import FileUpload from "../components/FileUpload";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadFiles();
    loadProfile();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery, categoryFilter]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await getFiles();
      setFiles(response.data.files);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await getUserProfile();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const filterFiles = () => {
    let filtered = files;

    if (categoryFilter !== "all") {
      filtered = filtered.filter((f) => f.category === categoryFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((f) =>
        f.original_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteFile(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      loadProfile();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "image":
        return <Image className="w-5 h-5" />;
      case "video":
        return <Video className="w-5 h-5" />;
      case "audio":
        return <Music className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <HardDrive className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-800">
                Local Storage
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.username}!</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Files</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalFiles}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Size</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatFileSize(stats.totalSize)}
                  </p>
                </div>
                <HardDrive className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Images</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.images}
                  </p>
                </div>
                <Image className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Videos</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.videos}
                  </p>
                </div>
                <Video className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="all">All Files</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
              </select>
              <button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {viewMode === "grid" ? (
                  <List className="w-5 h-5" />
                ) : (
                  <Grid className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Upload className="w-5 h-5" />
                Upload
              </button>
            </div>
          </div>
        </div>

        {/* Files Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No files found</p>
            <p className="text-gray-500 text-sm mt-2">
              Upload some files to get started
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden"
              >
                <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  {getCategoryIcon(file.category)}
                </div>
                <div className="p-4">
                  <p
                    className="font-medium text-gray-800 truncate"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(file.file_size)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(file.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(file.category)}
                        <span className="text-gray-800">
                          {file.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {file.category}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDistanceToNow(new Date(file.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <FileUpload
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            loadFiles();
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
