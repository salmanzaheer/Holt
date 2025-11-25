import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const Settings = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/users/profile");
        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    };
    fetchUser();
  }, []);

  const handleDisable2FA = async () => {
    try {
      await api.post("/auth/2fa/disable");
      // Refresh user data
      const response = await api.get("/users/profile");
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to disable 2FA", error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          Two-Factor Authentication
        </h2>
        {user ? (
          user.two_factor_enabled ? (
            <div>
              <p className="text-green-600 mb-4">2FA is currently enabled.</p>
              <button
                onClick={handleDisable2FA}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Disable 2FA
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                2FA is currently disabled. Enable it for extra security.
              </p>
              <Link
                to="/2fa"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Enable 2FA
              </Link>
            </div>
          )
        ) : (
          <p>Loading user settings...</p>
        )}
      </div>
    </div>
  );
};

export default Settings;
