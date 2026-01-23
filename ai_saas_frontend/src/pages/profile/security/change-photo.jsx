import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import Layout from "../../../components/layout/Layout";
import { toast } from "react-toastify";
import { Image as ImageIcon, User as UserIcon, Trash2, ArrowLeft } from "lucide-react";
import styles from "../../profile/profile.module.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { userRoutes, profileRoutes, notificationRoutes } from "../../../services/apiRoutes";
import { apiFetch } from "../../../services/apiService";
import { useNotifications } from "../../../context/NotificationContext";


export default function EditPhotoPanel() {
  const { user, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const { fetchNotifications } = useNotifications();

  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Atualiza preview da foto: local se selecionou, senão rota protegida
  useEffect(() => {
  const fetchPhoto = async () => {
    if (!user?.perfil_photo) {
      setPreviewUrl(""); // fallback
      return;
    }

    try {
      const res = await fetch(profileRoutes.getPhoto(user.id), {
        credentials: "include"
      });

      if (!res.ok) throw new Error("Não foi possível carregar a foto");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Erro ao buscar foto:", err);
      setPreviewUrl(""); // fallback
    }
  };

  if (photoFile) {
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  } else {
    fetchPhoto();
  }
}, [photoFile, user]);

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("perfil_photo", photoFile);

      // Substitui fetch por apiFetch
      await apiFetch(profileRoutes.updatePhoto(user.id), {
        method: "PUT",
        body: formData, // formData funciona com apiFetch
      });

      toast.success("Foto atualizada com sucesso!");

      const updatedUser = await fetch(userRoutes.getCurrentUser(), { credentials: "include" }).then(res => res.json());
      loginSuccess({ user: updatedUser });
      setPhotoFile(null);
      navigate("/profile/security");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Tem certeza que deseja remover sua foto de perfil?")) return;

    setLoading(true);
    try {
      await apiFetch(profileRoutes.deletePhoto(user.id), {
        method: "DELETE",
      });

      toast.success("Foto removida com sucesso!");

      await apiFetch(notificationRoutes.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Sua foto foi alterada!",
          link: "/profile",
        }),
      });
      fetchNotifications();

      const updatedUser = await fetch(userRoutes.getCurrentUser(), { credentials: "include" }).then(res => res.json());
      loginSuccess({ user: updatedUser });
      setPhotoFile(null);
      navigate("/profile/security");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className={styles.returnLink}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-700 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
        </button>
        <nav className="flex items-center text-sm space-x-1">
          <Link to="/profile" className="text-gray-700 hover:text-black">Perfil</Link>
          <span>/</span>
          <Link to="/profile/security" className="text-gray-700 hover:text-black">Segurança</Link>
          <span>/</span>
          <span className="text-gray-500">Editar Foto</span>
        </nav>
      </div>

      <section className="max-w-md mx-auto space-y-6">
        <h1 className={styles.title}>Atualizar Foto de Perfil</h1>

        <div className={`${styles.statCard} flex flex-col items-center space-y-6 relative`}>
          <div className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Foto de perfil"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-gray-300 shadow-md bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {(previewUrl || photoFile) && (
              <button
                onClick={handleRemovePhoto}
                disabled={loading}
                title="Remover foto"
                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition flex items-center justify-center"
                type="button"
                style={{ width: 28, height: 28 }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-4">
            <p className={`${styles.statSubtext} mb-4`}>Selecione uma nova foto de perfil</p>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <ImageIcon className="w-4 h-4" />
              <input
                type="file"
                name="perfil_photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className="ml-2"
              />
            </label>

            <button
              type="submit"
              disabled={!photoFile || loading}
              className={`w-full py-2 rounded-md text-white ${
                  photoFile && !loading ? "bg-[var(--color-primary)] hover:brightness-95" : "bg-gray-400 cursor-not-allowed"
                } transition`}
            >
              {loading ? "Salvando..." : "Salvar Foto"}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
