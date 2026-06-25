import { useState } from "react";
import { DashboardShell } from "./features/dashboard/DashboardShell";
import { LoginScreen } from "./features/auth/LoginScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import type { MockUser } from "./features/auth/users";

type AppScreen = "welcome" | "login" | "dashboard";

function App() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [activeUser, setActiveUser] = useState<MockUser | null>(null);

  const handleLogin = (user: MockUser) => {
    setActiveUser(user);
    setScreen("dashboard");
  };

  const handleLogout = () => {
    setActiveUser(null);
    setScreen("login");
  };

  if (screen === "welcome") {
    return <WelcomeScreen onEnter={() => setScreen("login")} />;
  }

  if (screen === "login" || !activeUser) {
    return <LoginScreen onBack={() => setScreen("welcome")} onLogin={handleLogin} />;
  }

  return <DashboardShell user={activeUser} onLogout={handleLogout} />;
}

export default App;
