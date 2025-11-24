import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import React from "react";
const Header = ({ title }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar bg-base-100">
      <div className="flex-1">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex-none">
        <button className="btn btn-square btn-ghost" onClick={toggleTheme}>
          {theme === "light" ? (
            <Moon className="h-6 w-6" />
          ) : (
            <Sun className="h-6 w-6" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
