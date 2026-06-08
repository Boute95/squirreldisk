import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MemoryRouter as Router, Route, Routes } from "react-router-dom";
import { ConfigProvider, theme } from 'antd';
import themeConfig from './theme-config';

import TitleBar from "./components/TitleBar";
import DiskListView from "./components/DiskListView";
import DiskDetail from "./components/DiskDetail";

import { platform } from "@tauri-apps/plugin-os";

function App() {
  const [isLinux, setIsLinux] = useState(false);
  useEffect(() => {
    if (platform() === "linux") {
      setIsLinux(true);
    }
  }, []);
   return (
      <Router>
         <ConfigProvider
            theme={{
               algorithm: theme.defaultAlgorithm,
               token: {
                  colorPrimary: themeConfig.colors.primary,
                  colorBgBase: themeConfig.colors.primaryBg,
                  colorTextBase: themeConfig.colors.textBase,
               },
            }}
         >
            <div
               className={
                  "flex flex-col justify-items-stretch items-stretch h-screen bg-primary-bg" +
                  (isLinux ? " bg-primaryBg" : "")
               }
            >
               <TitleBar></TitleBar>
               <Routes>
                  <Route path="/" element={<DiskListView />} />
                  <Route path="/disk" element={<DiskDetail />} />
               </Routes>
            </div>
         </ConfigProvider>
      </Router>
   );
}

export default App;
