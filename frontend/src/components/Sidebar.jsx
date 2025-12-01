import { NavLink } from "react-router-dom";
import { Home, Upload, Settings, Share2, Lock } from "lucide-react";
import React from "react";

const Sidebar = () => {
  return (
    <aside className="w-64 bg-base-200 text-base-content">
      <div className="p-4 text-xl font-bold">Hault</div>
      <ul className="menu p-4">
        <li>
          <NavLink to="/" end>
            <Home className="h-5 w-5" />
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/upload">
            <Upload className="h-5 w-5" />
            Upload
          </NavLink>
        </li>
        <li>
          <NavLink to="/passwords">
            <Lock className="h-5 w-5" />
            Passwords
          </NavLink>
        </li>
        <li>
          <NavLink to="/sharing">
            <Share2 className="h-5 w-5" />
            Sharing
          </NavLink>
        </li>
        <li>
          <NavLink to="/settings">
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
