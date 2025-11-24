import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, File, CheckCircle, AlertCircle } from "lucide-react";
import { uploadFiles } from "../services/api";

export default function FileUpload({ onClose, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append("files", file);
      });

      await uploadFiles(formData, setProgress);

      setUploadStatus("success");
      setTimeout(() => {
        onUploadComplete();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Upload Files</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Dropzone */}
          {files.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                isDragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg text-indigo-600 font-medium">
                  Drop files here...
                </p>
              ) : (
                <>
                  <p className="text-lg text-gray-700 font-medium mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Support for images, videos, audio, and documents
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* File List */}
              <div className="space-y-3 mb-4">
                {files.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-100 rounded flex items-center justify-center">
                        <File className="w-6 h-6 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              {!uploading && (
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition"
                >
                  <input {...getInputProps()} />
                  <p className="text-gray-600">
                    Click or drag to add more files
                  </p>
                </div>
              )}

              {/* Progress Bar */}
              {uploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Uploading files...
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {uploadStatus === "success" && (
                <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Files uploaded successfully!</span>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>Upload failed. Please try again.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
