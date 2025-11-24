import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, CheckCircle, AlertCircle, X } from "lucide-react";
import { uploadFiles } from "../services/api";

export default function FileUpload({ onUploadComplete }) {
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
        setFiles([]);
        setUploading(false);
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setUploading(false);
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-4xl mx-auto">
      <div className="p-6 overflow-y-auto">
        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-base-300 hover:border-primary/50 hover:bg-base-200"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 text-base-content/50 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary font-medium">
                Drop files here...
              </p>
            ) : (
              <>
                <p className="text-lg text-base-content font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-base-content/70">
                  Support for images, videos, audio, and documents
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-base-200 rounded-lg border border-base-300"
                >
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                      onLoad={() => URL.revokeObjectURL(item.preview)}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <File className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base-content truncate">
                      {item.name}
                    </p>
                    <p className="text-sm text-base-content/70">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-2 hover:bg-base-300 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!uploading && (
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-base-200 transition"
              >
                <input {...getInputProps()} />
                <p>Click or drag to add more files</p>
              </div>
            )}

            {uploading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span>Uploading files...</span>
                  <span>{progress}%</span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={progress}
                  max="100"
                ></progress>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="mt-6 alert alert-success">
                <CheckCircle className="w-5 h-5" />
                <span>Files uploaded successfully!</span>
              </div>
            )}

            {uploadStatus === "error" && (
              <div className="mt-6 alert alert-error">
                <AlertCircle className="w-5 h-5" />
                <span>Upload failed. Please try again.</span>
              </div>
            )}
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex items-center justify-between p-6 border-t border-base-300">
          <p>
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="btn btn-primary"
          >
            <Upload className="w-5 h-5" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}
    </div>
  );
}
