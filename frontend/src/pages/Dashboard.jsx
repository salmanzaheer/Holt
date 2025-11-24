import React, { useState, useEffect } from "react";
import {
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
  PenSquare,
  ExternalLink,
} from "lucide-react";
import {
  getFiles,
  deleteFile,
  downloadFile,
  getUserProfile,
  getMediaToken,
  getThumbnailUrl,
  renameFile,
  getViewUrl,
  getStreamUrl,
} from "../services/api";
import { formatDistanceToNow } from "date-fns";

const Thumbnail = ({ file, tabs }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (file.thumbnail_path) {
        try {
          const tokenRes = await getMediaToken(file.id);
          const token = tokenRes.data.token;
          setThumbnailUrl(getThumbnailUrl(file.id, token));
        } catch (error) {
          console.error("Could not fetch thumbnail token", error);
          // Render fallback icon by leaving URL null
        }
      }
    };
    fetchThumbnail();
  }, [file]);

  const fallbackIcon = React.createElement(
    tabs.find((t) => t.id === file.category)?.icon || FileText,
    { className: "w-16 h-16 text-base-content/50" }
  );

  return (
    <div className="w-full h-48 bg-base-300 flex items-center justify-center">
      {file.thumbnail_path && thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Thumbnail for ${file.original_name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        fallbackIcon
      )}
    </div>
  );
};

const MediaViewer = ({ file, onClose }) => {
  const [mediaUrl, setMediaUrl] = useState(null);

  useEffect(() => {
    const fetchMediaUrl = async () => {
      try {
        const tokenRes = await getMediaToken(file.id);
        const token = tokenRes.data.token;
        if (file.category === "video") {
          setMediaUrl(getStreamUrl(file.id, token));
        } else {
          setMediaUrl(getViewUrl(file.id, token));
        }
      } catch (error) {
        console.error("Error fetching media URL:", error);
      }
    };
    fetchMediaUrl();
  }, [file]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute -top-10 right-0 text-white text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        {mediaUrl && file.category === "image" && (
          <img
            src={mediaUrl}
            alt={file.original_name}
            className="max-w-full max-h-screen"
          />
        )}
        {mediaUrl && file.category === "video" && (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-screen"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [stats, setStats] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [mediaViewerFile, setMediaViewerFile] = useState(null);

  const tabs = [
    { id: "all", label: "All Files", icon: FolderOpen },
    { id: "image", label: "Images", icon: Image },
    { id: "video", label: "Videos", icon: Video },
    { id: "audio", label: "Music", icon: Music },
    { id: "document", label: "Documents", icon: FileText },
    { id: "recent", label: "Recent", icon: Clock },
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
    if (activeTab === "recent") {
      filtered = [...files]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    } else if (activeTab !== "all") {
      filtered = filtered.filter((f) => f.category === activeTab);
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

  const handleRename = async (file) => {
    const newName = prompt("Enter new name:", file.original_name);
    if (newName && newName !== file.original_name) {
      try {
        await renameFile(file.id, newName);
        setFiles(
          files.map((f) =>
            f.id === file.id ? { ...f, original_name: newName } : f
          )
        );
      } catch (error) {
        console.error("Error renaming file:", error);
        alert("Failed to rename file.");
      }
    }
  };

  const handleOpen = async (file) => {
    if (file.category === "image" || file.category === "video") {
      setMediaViewerFile(file);
    } else {
      try {
        const tokenRes = await getMediaToken(file.id);
        const url = getViewUrl(file.id, tokenRes.data.token);
        window.open(url, "_blank");
      } catch (error) {
        console.error("Error opening file:", error);
        alert("Could not open file.");
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;

    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const GridItem = ({ file }) => (
    <div className="card bg-base-100 shadow-xl image-full">
      <figure>
        <Thumbnail file={file} tabs={tabs} />
      </figure>

      <div className="card-body">
        <h2 className="card-title truncate">{file.original_name}</h2>

        <p>{formatFileSize(file.file_size)}</p>

        <div className="card-actions justify-end">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleOpen(file)}
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleRename(file)}
          >
            <PenSquare className="h-4 w-4" />
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleDownload(file)}
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            className="btn btn-error btn-sm"
            onClick={() => handleDelete(file.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const ListItem = ({ file }) => (
    <tr>
      <td>
        <div className="flex items-center space-x-3">
          <div className="avatar">
            <div className="mask mask-squircle w-12 h-12 bg-base-300 flex items-center justify-center">
              {React.createElement(
                tabs.find((t) => t.id === file.category)?.icon || FileText,

                { className: "w-6 h-6" }
              )}
            </div>
          </div>

          <div>
            <div className="font-bold">{file.original_name}</div>

            <div className="text-sm opacity-50">{file.category}</div>
          </div>
        </div>
      </td>

      <td>{formatFileSize(file.file_size)}</td>

      <td>
        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
      </td>

      <th>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => handleOpen(file)}
        >
          <ExternalLink className="h-4 w-4" />
        </button>

        <button
          className="btn btn-ghost btn-xs"
          onClick={() => handleRename(file)}
        >
          <PenSquare className="h-4 w-4" />
        </button>

        <button
          className="btn btn-ghost btn-xs"
          onClick={() => handleDownload(file)}
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          className="btn btn-ghost btn-xs"
          onClick={() => handleDelete(file.id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </th>
    </tr>
  );

  return (
    <div className="p-4">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat">
            <div className="stat-figure text-primary">
              <FolderOpen className="inline-block w-8 h-8 stroke-current" />
            </div>

            <div className="stat-title">Total Files</div>

            <div className="stat-value">{stats.totalFiles}</div>
          </div>

          {/* other stats */}
        </div>
      )}

      <div className="tabs tabs-boxed mb-6">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4 mr-2" />

            {tab.label}
          </a>
        ))}
      </div>

      <div className="navbar bg-base-100 rounded-box shadow-lg mb-6">
        <div className="flex-1">
          <div className="form-control w-full">
            <input
              type="text"
              placeholder="Search"
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-none">
          <button
            className={`btn btn-square btn-ghost ${
              viewMode === "grid" ? "btn-active" : ""
            }`}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-5 h-5" />
          </button>

          <button
            className={`btn btn-square btn-ghost ${
              viewMode === "list" ? "btn-active" : ""
            }`}
            onClick={() => setViewMode("list")}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10">
          <span className="loading loading-lg"></span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center p-10">
          <h3 className="text-xl">No files found</h3>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <GridItem key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>

                <th>Size</th>

                <th>Modified</th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredFiles.map((file) => (
                <ListItem key={file.id} file={file} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mediaViewerFile && (
        <MediaViewer
          file={mediaViewerFile}
          onClose={() => setMediaViewerFile(null)}
        />
      )}
    </div>
  );
}
