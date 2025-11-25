import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function TwoFactorAuth() {
  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const generateQrCode = async () => {
      try {
        const response = await api.post("/auth/2fa/generate");
        setQrCode(response.data.qr_code);
      } catch (err) {
        setError("Failed to generate QR code. Please try again.");
      }
    };
    generateQrCode();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/2fa/verify", { token });
      navigate("/");
    } catch (err) {
      setError("Invalid 2FA token. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Set Up Two-Factor Authentication
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="flex justify-center mb-4">
          {qrCode ? (
            <img src={qrCode} alt="QR Code" />
          ) : (
            <p>Loading QR Code...</p>
          )}
        </div>
        <p className="text-center text-gray-600 mb-4">
          Scan the QR code with your authenticator app.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700"
            >
              Verification Token
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Verify and Enable
          </button>
        </form>
      </div>
    </div>
  );
}

export default TwoFactorAuth;
