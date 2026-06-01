import { useEffect } from "react";
import AppRoutes from "./AppRoutes";
import { PlayerProvider } from "./presentation/hooks/PlayerContext";
import { useSystemStore } from "./presentation/stores/systemStore";
import "./styles/globals.css";

function App() {
  const checkYtdlp = useSystemStore((s) => s.checkYtdlp);

  useEffect(() => {
    checkYtdlp();
  }, []);

  return (
    <PlayerProvider>
      <AppRoutes />
    </PlayerProvider>
  );
}

export default App;
