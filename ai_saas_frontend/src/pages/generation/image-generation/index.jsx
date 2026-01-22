import { useState } from 'react';
import styles from './image.module.css';
import Layout from "../../../components/layout/Layout";
import CustomSelect from "../../../components/common/CustomSelect";
import { Download, Send, Loader2, Image as ImageIcon, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiRoutes, generatedContentRoutes } from '../../../services/apiRoutes'; // ajuste conforme sua estrutura
import { apiFetch } from '../../../services/apiService';
import { IMAGE_MODELS, IMAGE_STYLES, IMAGE_RATIOS, IMAGE_QUALITIES } from '../../../utils/constants';

function ImageGeneration() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-image-1");
  const [style, setStyle] = useState("auto");
  const [ratio, setRatio] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning("Digite um prompt antes de gerar!");
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    try {
      const res = await apiFetch(aiRoutes.generateImage, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, style, ratio }),
      });

      if (res.content?.id) {
        const imgRes = await apiFetch(generatedContentRoutes.getImage(res.content.id), {
          method: "GET",
        });
        const blob = await imgRes.blob();
        setGeneratedImage(URL.createObjectURL(blob));
      }

      toast.success("Imagem gerada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    fetch(generatedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        const filename = `Artificiall Image - ${new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", "_")
          .replace(/:/g, "-")}.png`;
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error("Falha ao baixar a imagem"));
  };

  return (
    <Layout>
      <section className={`${styles.section} space-y-6`}>
        <div>
          <h1 className={styles.title}>Geração de Imagem</h1>
          <p className="text-gray-600">Crie imagens incríveis usando IA generativa</p>
        </div>

        <div className={styles.panelGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <Settings className="w-5 h-5 text-black mr-2" />
              <p className={styles.blockSubtitle}>Configurações</p>
            </div>
            {/* Modelo, estilo, proporção */}
            <div className="flex flex-col mb-2">
              <label htmlFor="model" className={styles.blockTitle}>Modelo</label>
              <CustomSelect
                value={IMAGE_MODELS.find((m) => m.value === model)}
                onChange={(s) => setModel(s.value)}
                options={IMAGE_MODELS}
              />
            </div>

            <div className="flex flex-col mb-2">
              <label htmlFor="style" className={styles.blockTitle}>Estilo</label>
              <CustomSelect
                value={IMAGE_STYLES.find((m) => m.value === style)}
                onChange={(s) => setStyle(s.value)}
                options={IMAGE_STYLES}
              />
            </div>

            <div className="flex flex-col mb-2">
              <label htmlFor="ratio" className={styles.blockTitle}>Proporção</label>
              <CustomSelect
                value={IMAGE_RATIOS.find((r) => r.value === ratio)}
                onChange={(s) => setRatio(s.value)}
                options={IMAGE_RATIOS}
              />
            </div>
          </div>

          <div className={`${styles.statCard} flex flex-col flex-1`}>
            <p className={styles.blockSubtitle}>Prompt</p>
            <p className={`${styles.statSubtext} text-sm`}>Descreva a imagem que você gostaria de gerar</p>
            <textarea
              placeholder="Ex: Um gato laranja sentado em uma janela olhando para a chuva, estilo fotorrealista, iluminação suave..."
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
                <span className="text-sm">{loading ? "Gerando..." : "Gerar Imagem"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.panelGrid}>
          <div className={`${styles.statCard} flex flex-col flex-1 col-start-2`}>
            <p className={styles.blockSubtitle}>Imagem Gerada</p>
            <p className={`${styles.statSubtext} text-sm m-4`}>Sua imagem criada pela IA</p>
            <div className="flex flex-col flex-1 justify-center items-center text-center min-h-[35vh] space-y-2">
              {generatedImage ? (
              <div className="flex flex-col items-center space-y-4">
                <img src={generatedImage} alt="Gerada pela IA" className="max-h-96 rounded-md" />
                <button
                  onClick={() => {
                    fetch(generatedImage)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const a = document.createElement("a");
                        const filename = `Artificiall Image - ${new Date()
                          .toISOString()
                          .slice(0, 19)
                          .replace("T", "_")
                          .replace(/:/g, "-")}.png`;
                        a.href = URL.createObjectURL(blob);
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      })
                      .catch(() => toast.error("Falha ao baixar a imagem"));
                  }}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Imagem</span>
                </button>
              </div>
            ) : (
              <>
                  <ImageIcon className="w-16 h-16 text-gray-300" />
                  <p className="text-gray-500">A imagem gerada aparecerá aqui</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default ImageGeneration;
