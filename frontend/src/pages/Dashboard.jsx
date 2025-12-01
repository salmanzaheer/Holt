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
  Folder,
  PenSquare,
  ExternalLink,
  Plus,
  ChevronRight,
  ArrowLeft,
  Move,
  Upload
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
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFiles
} from "../services/api";
import { formatDistanceToNow } from "date-fns";
import FileUpload from "../components/FileUpload";

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
    <div className="w-full h-48 bg-base-300 flex items-center justify-center overflow-hidden rounded-t-xl">
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
        if (file.category === "video" || file.category === "audio") {
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
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex flex-col items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors p-2 bg-black/50 rounded-full"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-white text-xl mb-4 font-semibold">{file.original_name}</div>
        
        <div className="w-full max-w-6xl h-full flex items-center justify-center overflow-auto">
            {mediaUrl && file.category === "image" && (
              <img
                src={mediaUrl}
                alt={file.original_name}
                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
              />
            )}
            {mediaUrl && file.category === "video" && (
              <video
                src={mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] shadow-2xl rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            )}
             {mediaUrl && file.category === "audio" && (
               <div className="bg-base-100 p-10 rounded-box shadow-xl flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <Music className="w-16 h-16" />
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-2">{file.original_name}</h2>
                  <audio
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="w-full"
                  >
                    Your browser does not support the audio tag.
                  </audio>
               </div>
            )}
            {mediaUrl && file.category === "document" && (
               <iframe src={mediaUrl} className="w-full h-[85vh] bg-white rounded-lg shadow-2xl" title="Document Viewer"></iframe>
            )}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [stats, setStats] = useState(null);
  const [mediaViewerFile, setMediaViewerFile] = useState(null);
  
  // Folder Logic
  const [currentFolder, setCurrentFolder] = useState(null); // {id, name}
  const [folderPath, setFolderPath] = useState([]); // Array of folder objects
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const tabs = [
    { id: "all", label: "All Files", icon: FolderOpen },
    { id: "image", label: "Images", icon: Image },
    { id: "video", label: "Videos", icon: Video },
    { id: "audio", label: "Music", icon: Music },
    { id: "document", label: "Documents", icon: FileText },
    { id: "recent", label: "Recent", icon: Clock },
  ];

  useEffect(() => {
    fetchContent();
    loadProfile();
  }, [activeTab, currentFolder, searchQuery]); // Refetch when context changes

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (activeTab === "all" && !searchQuery) {
        // Fetch folders and files for current folder
        const [filesRes, foldersRes] = await Promise.all([
          getFiles({ folderId: currentFolder ? currentFolder.id : 'null' }),
          getFolders(currentFolder ? currentFolder.id : 'null')
        ]);
        setFiles(filesRes.data.files);
        setFolders(foldersRes.data.folders);
      } else {
        // Filtered view (Search or Category) - Global view
        // Ignore folders, show matching files globally
        const params = {};
        if (activeTab !== 'all' && activeTab !== 'recent') params.category = activeTab;
        if (searchQuery) params.search = searchQuery;
        
        const filesRes = await getFiles(params);
        let fetchedFiles = filesRes.data.files;
        
        if (activeTab === 'recent') {
             fetchedFiles = fetchedFiles.slice(0, 20); // Already sorted by backend DESC
        }
        
        setFiles(fetchedFiles);
        setFolders([]); // No folders in filtered views
      }
    } catch (error) {
      console.error("Error fetching content:", error);
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

  // Folder Navigation
  const handleFolderClick = (folder) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolder(folder);
    setSearchQuery(""); // Clear search on nav
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
        setFolderPath([]);
        setCurrentFolder(null);
    } else {
        const newPath = folderPath.slice(0, index + 1);
        setFolderPath(newPath);
        setCurrentFolder(newPath[newPath.length - 1]);
    }
    setSearchQuery("");
  };

  const handleUpOneLevel = () => {
     if (folderPath.length > 0) {
         handleBreadcrumbClick(folderPath.length - 2);
     }
  };

  const handleCreateFolder = async (e) => {
      e.preventDefault();
      if (!newFolderName) return;
      try {
          await createFolder(newFolderName, currentFolder ? currentFolder.id : null);
          setNewFolderName("");
          setIsCreateFolderOpen(false);
          fetchContent();
      } catch (error) {
          console.error("Create folder failed", error);
          alert("Failed to create folder");
      }
  };

  // File Actions
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteFile(fileId);
      fetchContent();
      loadProfile();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };
  
  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder? Subfolders will be deleted, files moved to root.")) return;
    try {
        await deleteFolder(folderId);
        fetchContent();
    } catch (error) {
        console.error("Delete folder failed", error);
        alert("Failed to delete folder");
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

  const handleRenameFile = async (file) => {
    const newName = prompt("Enter new name:", file.original_name);
    if (newName && newName !== file.original_name) {
      try {
        await renameFile(file.id, newName);
        fetchContent();
      } catch (error) {
        console.error("Error renaming file:", error);
        alert("Failed to rename file.");
      }
    }
  };
  
  const handleRenameFolder = async (folder) => {
      const newName = prompt("Enter new folder name:", folder.name);
      if (newName && newName !== folder.name) {
          try {
              await renameFolder(folder.id, newName);
              fetchContent();
          } catch (error) {
              console.error("Rename folder failed", error);
          }
      }
  };

  const handleMoveFile = async (file) => {
      // Simple prompt for now. Ideal: Modal with folder tree.
      const targetId = prompt("Enter Target Folder ID (leave empty for Root):");
      // Validation omitted for prototype speed
      try {
          await moveFiles([file.id], targetId || null);
          fetchContent();
      } catch (error) {
          console.error("Move failed", error);
          alert("Move failed");
      }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Stats & Header */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat bg-base-100 shadow rounded-2xl p-4">
            <div className="stat-figure text-primary">
              <FolderOpen className="inline-block w-8 h-8 stroke-current" />
            </div>
            <div className="stat-title">Total Files</div>
            <div className="stat-value text-2xl">{stats.totalFiles}</div>
          </div>
          {/* Add more stats if available in profile response */}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-4 bg-base-200 p-1 rounded-xl inline-flex">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab-active" : ""} rounded-lg transition-all`}
            onClick={() => { setActiveTab(tab.id); setFolderPath([]); setCurrentFolder(null); setSearchQuery(""); }}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </a>
        ))}
      </div>

      {/* Toolbar: Breadcrumbs, Search, View Mode */}
      <div className="navbar bg-base-100 rounded-box shadow-lg mb-4 p-2 flex flex-wrap gap-2 min-h-16">
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {activeTab === 'all' && !searchQuery && (
                <div className="text-sm breadcrumbs px-2 overflow-hidden whitespace-nowrap text-ellipsis">
                  <ul>
                    <li><a onClick={() => handleBreadcrumbClick(-1)} className="flex items-center gap-1 hover:text-primary"><HomeIcon/> Home</a></li>
                    {folderPath.map((folder, idx) => (
                        <li key={folder.id}><a onClick={() => handleBreadcrumbClick(idx)}>{folder.name}</a></li>
                    ))}
                  </ul>
                </div>
            )}
            {folderPath.length > 0 && (
                 <button onClick={handleUpOneLevel} className="btn btn-circle btn-ghost btn-sm" title="Up one level"><ArrowLeft className="w-4 h-4"/></button>
            )}
        </div>

        <div className="flex-none flex items-center gap-2">
           {activeTab === 'all' && !searchQuery && (
             <>
               <button className="btn btn-primary btn-sm gap-2" onClick={() => setIsUploadModalOpen(true)}>
                   <Upload className="w-4 h-4"/> Upload
               </button>
               <button className="btn btn-ghost btn-sm gap-2" onClick={() => setIsCreateFolderOpen(true)}>
                   <Plus className="w-4 h-4"/> New Folder
               </button>
             </>
           )}
           
          <div className="form-control">
            <input
              type="text"
              placeholder="Search files..."
              className="input input-bordered input-sm w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="btn-group">
            <button
                className={`btn btn-square btn-sm btn-ghost ${viewMode === "grid" ? "bg-base-200" : ""}`}
                onClick={() => setViewMode("grid")}
            >
                <Grid className="w-4 h-4" />
            </button>
            <button
                className={`btn btn-square btn-sm btn-ghost ${viewMode === "list" ? "bg-base-200" : ""}`}
                onClick={() => setViewMode("list")}
            >
                <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative min-h-[300px]">
        {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="loading loading-lg text-primary"></span>
            </div>
        ) : (
            <>
                {/* Folders Grid */}
                {folders.length > 0 && (
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-500 mb-2 px-2 text-sm uppercase tracking-wider">Folders</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {folders.map(folder => (
                                <div 
                                    key={folder.id} 
                                    className="card bg-base-100 shadow-md hover:shadow-xl transition-all cursor-pointer border border-base-200 group"
                                    onClick={() => handleFolderClick(folder)}
                                >
                                    <div className="card-body p-4 flex flex-row items-center gap-3">
                                        <Folder className="w-10 h-10 text-yellow-500 fill-yellow-500/20" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate" title={folder.name}>{folder.name}</h3>
                                        </div>
                                        <div className="dropdown dropdown-end" onClick={e => e.stopPropagation()}>
                                            <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100">
                                                ...
                                            </label>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40 border border-base-200">
                                                <li><a onClick={() => handleRenameFolder(folder)}><PenSquare className="w-4 h-4"/> Rename</a></li>
                                                <li><a onClick={() => handleDeleteFolder(folder.id)} className="text-error"><Trash2 className="w-4 h-4"/> Delete</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Files Grid/List */}
                {files.length > 0 ? (
                   <div>
                       <h3 className="font-bold text-gray-500 mb-2 px-2 text-sm uppercase tracking-wider">Files</h3>
                       {viewMode === 'grid' ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                               {files.map(file => (
                                   <div key={file.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-200 group">
                                       <figure className="cursor-pointer" onClick={() => setMediaViewerFile(file)}>
                                           <Thumbnail file={file} tabs={tabs} />
                                       </figure>
                                       <div className="card-body p-4">
                                           <h2 className="card-title text-sm truncate" title={file.original_name}>{file.original_name}</h2>
                                           <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                                           <div className="card-actions justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="join">
                                                    <button className="btn btn-xs join-item" onClick={() => handleRenameFile(file)} title="Rename"><PenSquare className="w-3 h-3"/></button>
                                                    <button className="btn btn-xs join-item" onClick={() => handleMoveFile(file)} title="Move"><Move className="w-3 h-3"/></button>
                                                    <button className="btn btn-xs join-item" onClick={() => handleDownload(file)} title="Download"><Download className="w-3 h-3"/></button>
                                                    <button className="btn btn-xs join-item btn-error text-white" onClick={() => handleDeleteFile(file.id)} title="Delete"><Trash2 className="w-3 h-3"/></button>
                                                </div>
                                           </div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <table className="table w-full bg-base-100 shadow-xl rounded-xl">
                               <thead>
                                   <tr>
                                       <th>Name</th>
                                       <th>Size</th>
                                       <th>Date</th>
                                       <th>Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {files.map(file => (
                                       <tr key={file.id} className="hover">
                                           <td className="flex items-center gap-3 cursor-pointer" onClick={() => setMediaViewerFile(file)}>
                                               <div className="avatar">
                                                   <div className="w-10 h-10 rounded bg-base-200 flex items-center justify-center">
                                                        {React.createElement(tabs.find(t => t.id === file.category)?.icon || FileText, { className: "w-5 h-5" })}
                                                   </div>
                                               </div>
                                               <div className="font-bold truncate max-w-xs" title={file.original_name}>{file.original_name}</div>
                                           </td>
                                           <td>{formatFileSize(file.file_size)}</td>
                                           <td>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</td>
                                           <td>
                                               <div className="flex gap-1">
                                                    <button className="btn btn-ghost btn-xs" onClick={() => handleRenameFile(file)}><PenSquare className="w-3 h-3"/></button>
                                                    <button className="btn btn-ghost btn-xs" onClick={() => handleMoveFile(file)}><Move className="w-3 h-3"/></button>
                                                    <button className="btn btn-ghost btn-xs" onClick={() => handleDownload(file)}><Download className="w-3 h-3"/></button>
                                                    <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDeleteFile(file.id)}><Trash2 className="w-3 h-3"/></button>
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       )}
                   </div>
                ) : (
                    !loading && folders.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                            <p>This folder is empty.</p>
                        </div>
                    )
                )}
            </>
        )}
      </div>

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="py-4">
              <input 
                type="text" 
                placeholder="Folder Name" 
                className="input input-bordered w-full" 
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setIsCreateFolderOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newFolderName.trim()}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
          <div className="modal modal-open">
              <div className="modal-box max-w-4xl p-0 overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-base-200">
                      <h3 className="font-bold text-lg">Upload to {currentFolder ? currentFolder.name : 'Home'}</h3>
                      <button onClick={() => setIsUploadModalOpen(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
                  </div>
                  <div className="p-4">
                    <FileUpload 
                        folderId={currentFolder ? currentFolder.id : null} 
                        onUploadComplete={() => {
                            fetchContent();
                            // Optional: Close modal automatically? Or let user close.
                            // setIsUploadModalOpen(false); 
                        }} 
                    />
                  </div>
              </div>
          </div>
      )}

      {/* Media Viewer Modal */}
      {mediaViewerFile && (
        <MediaViewer
          file={mediaViewerFile}
          onClose={() => setMediaViewerFile(null)}
        />
      )}
    </div>
  );
}

function HomeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    )
}
