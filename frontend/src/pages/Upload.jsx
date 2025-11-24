import React from "react";
import FileUpload from "../components/FileUpload";

const Upload = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Upload Files</h1>
      <div className="max-w-4xl mx-auto">
        <FileUpload
          onClose={() => {
            // In this version, onClose can be a no-op or navigate away
            // For now, let's just log it.
            console.log("Upload complete or cancelled");
          }}
          onUploadComplete={() => {
            console.log("Upload finished!");
            // Maybe navigate back to dashboard or show a success message
          }}
        />
      </div>
    </div>
  );
};

export default Upload;
