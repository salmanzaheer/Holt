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
  Clock,
  FolderOpen,
  TrendingUp,
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
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState(null);

  const tabs = [
    { id: "all", label: "All Files", icon: FolderOpen, color: "indigo" },
    { id: "image", label: "Images", icon: Image, color: "blue" },
    { id: "video", label: "Videos", icon: Video, color: "purple" },
    { id: "audio", label: "Music", icon: Music, color: "pink" },
    { id: "document", label: "Documents", icon: FileText, color: "green" },
    { id: "recent", label: "Recent", icon: Clock, color: "orange" },
  ];

  useEffect(() => {
    loadFiles();
    loadProfile();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery, activeTab]);

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

    // Filter by tab
    if (activeTab === "recent") {
      filtered = [...files]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    } else if (activeTab !== "all") {
      filtered = filtered.filter((f) => f.category === activeTab);
    }

    // Filter by search
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

  const getCategoryColor = (category) => {
    switch (category) {
      case "image":
        return "from-blue-500 to-cyan-500";
      case "video":
        return "from-purple-500 to-pink-500";
      case "audio":
        return "from-pink-500 to-rose-500";
      case "document":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getTabColor = (color) => {
    const colors = {
      indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
      blue: "text-blue-600 bg-blue-50 border-blue-200",
      purple: "text-purple-600 bg-purple-50 border-purple-200",
      pink: "text-pink-600 bg-pink-50 border-pink-200",
      green: "text-green-600 bg-green-50 border-green-200",
      orange: "text-orange-600 bg-orange-50 border-orange-200",
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <HardDrive className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Local Storage
                </h1>
                <p className="text-sm text-gray-500">
                  Your personal file vault
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload</span>
              </button>
              <div className="h-10 w-px bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Files</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalFiles}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <HardDrive className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-gray-600 text-sm mb-1">Storage Used</p>
              <p className="text-3xl font-bold text-gray-800">
                {formatFileSize(stats.totalSize)}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Image className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Images</p>
              <p className="text-3xl font-bold text-gray-800">{stats.images}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Videos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.videos}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? `${getTabColor(tab.color)} shadow-sm`
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.id !== "all" && tab.id !== "recent" && stats && (
                    <span
                      className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                        isActive ? "bg-white/50" : "bg-gray-200"
                      }`}
                    >
                      {tab.id === "image"
                        ? stats.images
                        : tab.id === "video"
                        ? stats.videos
                        : tab.id === "audio"
                        ? stats.audio
                        : tab.id === "document"
                        ? stats.documents
                        : 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === "list"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Files Display */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading your files...
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No files found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Upload some files to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUpload(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Files
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-200 overflow-hidden"
              >
                <div
                  className={`aspect-square bg-gradient-to-br ${getCategoryColor(
                    file.category
                  )} flex items-center justify-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                  <div className="relative z-10 text-white">
                    {getCategoryIcon(file.category)}
                  </div>
                </div>
                <div className="p-5">
                  <p
                    className="font-semibold text-gray-800 truncate mb-2"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span className="text-xs">
                      {formatDistanceToNow(new Date(file.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg bg-gradient-to-br ${getCategoryColor(
                              file.category
                            )}`}
                          >
                            <div className="text-white">
                              {getCategoryIcon(file.category)}
                            </div>
                          </div>
                          <span className="font-medium text-gray-800">
                            {file.original_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                          {file.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDistanceToNow(new Date(file.created_at), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
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
