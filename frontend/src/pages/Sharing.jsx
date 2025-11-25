import React, { useState, useEffect } from "react";
import api from "../services/api";

function Sharing() {
  const [myShares, setMyShares] = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [shareFileId, setShareFileId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      const mySharesResponse = await api.get("/sharing/my-shares");
      setMyShares(mySharesResponse.data.files);
      const sharedWithMeResponse = await api.get("/sharing/shared-with-me");
      setSharedWithMe(sharedWithMeResponse.data.files);
    } catch (err) {
      setError("Failed to fetch sharing information.");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post("/sharing/share", {
        fileId: shareFileId,
        email: shareEmail,
      });
      setSuccess("File shared successfully.");
      fetchShares();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to share file.");
    }
  };

  const handleUnshare = async (fileId, email) => {
    try {
      await api.delete("/sharing/unshare", { data: { fileId, email } });
      fetchShares();
    } catch (err) {
      setError("Failed to unshare file.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sharing</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Share a File</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}
        <form onSubmit={handleShare} className="flex gap-4">
          <input
            type="text"
            placeholder="File ID"
            value={shareFileId}
            onChange={(e) => setShareFileId(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <input
            type="email"
            placeholder="Email of user to share with"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            Share
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Files You've Shared</h2>
          <ul>
            {myShares.map((file) => (
              <li
                key={file.id}
                className="flex justify-between items-center mb-2"
              >
                <span>
                  {file.original_name} (shared with {file.shared_with})
                </span>
                <button
                  onClick={() => handleUnshare(file.id, file.shared_with)}
                  className="text-red-500"
                >
                  Unshare
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Files Shared With You</h2>
          <ul>
            {sharedWithMe.map((file) => (
              <li key={file.id}>
                {file.original_name} (shared by {file.shared_by})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Sharing;
