import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import MainRoutes from "./routes";

function App() {
  const { loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-600 text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  return <MainRoutes />;
}

export default App;