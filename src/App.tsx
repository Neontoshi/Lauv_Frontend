import AppRoutes from "./AppRoutes";
import { PlayerProvider } from "./presentation/hooks/PlayerContext";
import "./styles/globals.css";

function App() {
  return (
    <PlayerProvider>
      <AppRoutes />
    </PlayerProvider>
  );
}

export default App;
