import React, { useEffect } from "react";
import Select, { components } from "react-select";
import { TEXT_MODELS } from "../../../../utils/constants";
import { useAuth } from "../../../../context/AuthContext";

// Componente de Option customizado para tooltip
const Option = (props) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between">
        <span>{data.label}</span>
        {!data.isAllowed && (
          <span
            className="ml-2 text-xs text-red-500"
            title={data.tooltip || "Melhore seu plano para utilizar esse recurso!"}
          >
            ⚠
          </span>
        )}
      </div>
    </components.Option>
  );
};

export default function ChatControls({
  model,
  setModel,
  temperature,
  setTemperature,
  isTemperatureLocked,
}) {
  const { user } = useAuth();

  // transforma a lista de features do plano em um objeto key → boolean
  const featuresMap = (user?.plan?.features || []).reduce((acc, pf) => {
    acc[pf.key] = pf.value === "true";
    return acc;
  }, {});

  // nome do plano para regras de exibição (ex.: "Básico" | "Pro" | "Premium")
  const planName = user?.id ? (user?.plan?.name || "") : "";
  const planNameLower = planName.toLowerCase();

  // 1) gating por feature (requiredFeature p/ modelos como Gemini) e por generate_text (G* avançados)
  const canUseGpt5 = !!featuresMap["generate_text"];
  const baseModels = TEXT_MODELS.map((m) => {
    const gptOk = m.isGpt5 ? canUseGpt5 : true;
    const featureOk = m.requiredFeature ? !!featuresMap[m.requiredFeature] : true;
    const isAllowed = gptOk && featureOk;
    return {
      ...m,
      isAllowed,
      tooltip: isAllowed ? "" : "Seu plano atual não permite usar este modelo",
    };
  });

  // 2) ocultação específica para Gemini por plano (não ocultar Flash Lite em nenhum plano)
  const HIDE_GEMINI_BY_PLAN = {
    "Básico": new Set(["gemini-2.5-pro"]),
    "Pro": new Set(["gemini-2.5-pro"]),
    "Premium": new Set(["gemini-2.5-pro"]),
  };
  const hiddenValues = (planNameLower === "básico" || planNameLower === "basico") ? new Set() : (HIDE_GEMINI_BY_PLAN[planName] || new Set());

  // 3) regras de plano Básico: exibir todos os modelos, mas bloquear os não permitidos
  const BASIC_ALLOWED = new Set([
    "gpt-4o",
    "deepseek/deepseek-r1-0528:free",
    "sonar",
    "sonar-reasoning",
    "claude-haiku-4-5",
    "gemini-2.5-flash-lite",
  ]);

  // aplica ocultação (se houver) e, se for Básico, marca como bloqueado os não permitidos (sem ocultar)
  const afterHidden = baseModels.filter((m) => !hiddenValues.has(m.value));
  const allowedModels = (planNameLower === "básico" || planNameLower === "basico")
    ? afterHidden.map((m) => ({
        ...m,
        isAllowed: BASIC_ALLOWED.has(m.value),
        tooltip: BASIC_ALLOWED.has(m.value)
          ? ""
          : "Disponível nos planos Pro/Premium",
      }))
    : afterHidden;

  // 4) se o modelo atual não está disponível para o plano, ajusta para o primeiro permitido
  useEffect(() => {
    const inList = allowedModels.some((m) => m.value === model);
    if (!inList) {
      const firstAllowed = allowedModels.find((m) => m.isAllowed) || allowedModels[0];
      if (firstAllowed && firstAllowed.value !== model) {
        setModel(firstAllowed.value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planName, JSON.stringify(allowedModels.map((m) => ({ v: m.value, a: m.isAllowed })))]);

  return (
    <div className="flex items-center gap-4 text-sm justify-between mt-3">
      <div className="flex-1">
        <Select
          value={allowedModels.find((m) => m.value === model)}
          onChange={(selected) => setModel(selected.value)}
          options={allowedModels}
          isSearchable={false}
          isOptionDisabled={(option) => !option.isAllowed}
          components={{ Option }}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "var(--color-primary)",
              border: "none",
              borderRadius: 12,
              padding: "2px 4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              cursor: "pointer",
            }),
            singleValue: (base) => ({ ...base, color: "#fff", fontWeight: "500" }),
            dropdownIndicator: (base) => ({ ...base, color: "#fff" }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            menu: (base) => ({ ...base, borderRadius: 12, overflow: "hidden" }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? "rgba(59, 130, 246,0.2)" : "#fff",
              color: state.isFocused ? "#3b82f6" : "#000",
              cursor: "pointer",
              opacity: state.data.isAllowed ? 1 : 0.5,
            }),
          }}
        />
      </div>

      {!isTemperatureLocked && (
        <div className="flex-1 flex flex-col">
          <label className="text-gray-700 font-medium mb-1">Temp: {temperature}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full bg-gray-200 accent-[var(--color-primary)] cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}