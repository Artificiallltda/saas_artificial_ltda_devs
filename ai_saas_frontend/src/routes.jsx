import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PrivateRoute } from "./components/routes/PrivateRoute";
import { FlowGuardRoute } from "./components/routes/FlowGuardRoute";
import { SecurityGuardRoute } from "./components/routes/SecurityGuardRoute";
import { AdminRoute } from "./components/routes/AdminRoute";

import Home from "./pages/home";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import EmailVerification from "./pages/auth/verify-email";
import VerifyCode from "./pages/auth/verify-code";
import TextGeneration from "./pages/generation/text-generation";
import ImageGeneration from "./pages/generation/image-generation";
import VideoGeneration from "./pages/generation/video-generation";
import DownloadBot from "./pages/generation/download-bot";
import Settings from "./pages/settings";
import Profile from "./pages/profile";
import Security from "./pages/profile/security";
import EditName from "./pages/profile/security/change-name";
import EditUsername from "./pages/profile/security/change-username";
import EditPassword from "./pages/profile/security/change-password";
import EditEmail from "./pages/profile/security/change-email";
import EditPhotoPanel from "./pages/profile/security/change-photo";
import ForgotPassword from "./pages/auth/forgot-password";
import ResetPassword  from "./pages/auth/forgot-password/reset-password";
import Projects  from "./pages/workspace/projects";
import EditProject from "./pages/workspace/projects/edit-project";
import ModifyContent from "./pages/workspace/projects/modify-content";
import GeneratedContentsList from "./pages/workspace/contents";
import Subscription from "./pages/subscription";
import NotificationsList from "./pages/notifications";
import AdminPanel from "./pages/admin";
import AdminUsersList from "./pages/admin/users/AdminUsersList";
import AdminCreateUser from "./pages/admin/users/AdminCreateUser";
import AdminUsage from "./pages/admin/AdminUsage";

// Pro Empresa (placeholders / MVP UI)
import ProEmpresaHome from "./pages/pro-empresa";
import ProEmpresaSEO from "./pages/pro-empresa/seo";
import ProEmpresaWorkspaces from "./pages/pro-empresa/workspaces";
import ProEmpresaApprovals from "./pages/pro-empresa/approvals";
import ProEmpresaIntegrations from "./pages/pro-empresa/integrations";
import ProEmpresaCompany from "./pages/pro-empresa/company";

function MainRoutes(){
  const { user, loading } = useAuth();

  if (loading) return null; // Ou um spinner aqui

  return (
    <Routes>
      {/* ROTAS PRIVADAS */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/projects"
        element={
          <PrivateRoute>
            <Projects />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/generated-contents"
        element={
          <PrivateRoute>
            <GeneratedContentsList />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/projects/:id/edit"
        element={
          <PrivateRoute>
            <EditProject />
          </PrivateRoute>
        }
      />
      <Route
        path="/workspace/projects/:id/modify-content"
        element={
          <PrivateRoute>
            <ModifyContent />
          </PrivateRoute>
        }
      />
      <Route
        path="/text-generation"
        element={
          <PrivateRoute>
            <TextGeneration />
          </PrivateRoute>
        }
      />
      <Route
        path="/image-generation"
        element={
          <PrivateRoute>
            <ImageGeneration />
          </PrivateRoute>
        }
      />
      <Route
        path="/video-generation"
        element={
          <PrivateRoute>
            <VideoGeneration />
          </PrivateRoute>
        }
      />
      <Route
        path="/download-bot"
        element={
          <PrivateRoute>
            <DownloadBot />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminUsersList />
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users/create"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminCreateUser />
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/usage"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminUsage />
            </AdminRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <PrivateRoute>
            <Subscription />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsList />
          </PrivateRoute>
        }
      />

      {/* PRO EMPRESA */}
      <Route
        path="/pro-empresa"
        element={
          <PrivateRoute>
            <ProEmpresaHome />
          </PrivateRoute>
        }
      />
      <Route
        path="/pro-empresa/seo"
        element={
          <PrivateRoute>
            <ProEmpresaSEO />
          </PrivateRoute>
        }
      />
      <Route
        path="/pro-empresa/workspaces"
        element={
          <PrivateRoute>
            <ProEmpresaWorkspaces />
          </PrivateRoute>
        }
      />
      <Route
        path="/pro-empresa/approvals"
        element={
          <PrivateRoute>
            <ProEmpresaApprovals />
          </PrivateRoute>
        }
      />
      <Route
        path="/pro-empresa/integrations"
        element={
          <PrivateRoute>
            <ProEmpresaIntegrations />
          </PrivateRoute>
        }
      />
      <Route
        path="/pro-empresa/company"
        element={
          <PrivateRoute>
            <ProEmpresaCompany />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <Security />
            </SecurityGuardRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security/name"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <EditName />
            </SecurityGuardRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security/username"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <EditUsername />
            </SecurityGuardRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security/password"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <EditPassword /> 
            </SecurityGuardRoute>
             
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security/email"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <EditEmail />
            </SecurityGuardRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/security/photo"
        element={
          <PrivateRoute>
            <SecurityGuardRoute allowedIf={true}>
              <EditPhotoPanel />
            </SecurityGuardRoute>
          </PrivateRoute>
        }
      />
      <Route path="/login/forgot-password" element={<ForgotPassword />} />
      <Route path="/login/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/verify-code" element={<VerifyCode />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default MainRoutes;