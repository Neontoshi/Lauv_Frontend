import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import PlayerBar from "../Player/PlayerBar";

const Layout: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <div className="main">
          <Outlet />
        </div>
      </div>
      <PlayerBar />
    </div>
  );
};

export default Layout;
