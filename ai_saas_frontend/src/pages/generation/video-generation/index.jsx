import { useState } from 'react';
import styles from './video.module.css';
import Layout from "../../../components/layout/Layout";
import CustomSelect from '../../../components/common/CustomSelect';
import { Download, Send, Loader2, Video as VideoIcon, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes, generatedContentRoutes, userRoutes } from '../../../services/apiRoutes';
import { apiFetch } from '../../../services/apiService';
import { VIDEO_MODELS, VIDEO_RATIOS } from '../../../utils/constants';

function VideoGeneration() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("veo-3.0-fast-generate-001");
  const [ratio, setRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning("Digite um prompt antes de gerar!");
      return;
    }

    setLoading(true);
    setGeneratedVideo(null);

    try {
      const userData = await apiFetch(userRoutes.getCurrentUser(), { method: "GET" });
      const userPlan = userData?.plan?.name || "Básico";

      if (userPlan !== "Pro") {
        toast.error("A geração de vídeo está disponível apenas para usuários do plano Pro!");
        setLoading(false);
        return;
      }

      const res = await apiFetch(aiRoutes.generateVideo, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model_used: model, ratio }),
      });

      if (res?.video?.id) {
        const videoRes = await apiFetch(generatedContentRoutes.getVideo(res.video.id), {
          method: "GET",
        });
        const blob = await videoRes.blob();
        setGeneratedVideo(URL.createObjectURL(blob));
      }

      toast.success("Vídeo gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar vídeo!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideo) return;

    fetch(generatedVideo)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        const filename = `Artificiall Video - ${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")
          .replace(/:/g, "-")}.mp4`;
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error("Falha ao baixar o vídeo"));
  };

  return (
    <Layout>
      <section className={`${styles.section} space-y-6`}>
        <div>
          <h1 className={styles.title}>Geração de Vídeo</h1>
          <p className="text-gray-600">Crie vídeos incríveis usando IA generativa</p>
        </div>

        <div className={styles.panelGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <Settings className="w-5 h-5 text-black mr-2" />
              <p className={styles.blockSubtitle}>Configurações</p>
            </div>

            {/* Modelo */}
            <div className="flex flex-col mb-2">
              <label htmlFor="model" className={styles.blockTitle}>Modelo</label>
              <CustomSelect
                value={VIDEO_MODELS.find((m) => m.value === model)}
                onChange={(s) => setModel(s.value)}
                options={VIDEO_MODELS}
                isSearchable={false}
                placeholder="Selecione o modelo"
              />
            </div>

            {/* Proporção */}
            <div className="flex flex-col mb-2">
              <label htmlFor="ratio" className={styles.blockTitle}>Proporção</label>
              <CustomSelect
                value={VIDEO_RATIOS.find((m) => m.value === ratio)}
                onChange={(s) => setRatio(s.value)}
                options={VIDEO_RATIOS}
                isSearchable={false}
                placeholder="Selecione a proporção"
              />
            </div>
          </div>

          <div className={`${styles.statCard} flex flex-col flex-1`}>
            <p className={styles.blockSubtitle}>Prompt</p>
            <p className={`${styles.statSubtext} text-sm`}>
              Descreva o vídeo que você gostaria de gerar
            </p>
            <textarea
              placeholder="Ex: Uma cena futurista com carros voadores passando por uma cidade iluminada à noite..."
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full pl-4 pr-4 py-2 rounded-lg border text-black border-gray-300 text-sm shadow-sm focus:outline-none focus:shadow-md mt-6"
            />
            <div className="flex justify-between items-center mt-6">
              <p className={`${styles.statSubtext} text-sm`}>{prompt.length} caracteres</p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`${styles.btn} ${styles.btnStandard} flex items-center gap-2`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="text-sm">{loading ? "Gerando..." : "Gerar Vídeo"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.panelGrid}>
          <div className={`${styles.statCard} flex flex-col flex-1 col-start-2`}>
            <p className={styles.blockSubtitle}>Vídeo Gerado</p>
            <p className={`${styles.statSubtext} text-sm m-4`}>Seu vídeo criado pela IA</p>
            <div className="flex flex-col flex-1 justify-center items-center text-center min-h-[35vh] space-y-4">
              {generatedVideo ? (
                <div className="flex flex-col items-center space-y-4">
                  <video
                    controls
                    src={generatedVideo}
                    className="max-h-96 rounded-md shadow-md"
                  />
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Vídeo</span>
                  </button>
                </div>
              ) : (
                <>
                  <VideoIcon className="w-16 h-16 text-gray-300" />
                  <p className="text-gray-500">O vídeo gerado aparecerá aqui</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default VideoGeneration;
