import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import React from "react";

const Layout = ({ children, title }) => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header title={title} />
        <main className="p-4 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
