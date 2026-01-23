import Select from "react-select";

function isDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

const lightTheme = {
  controlBg: "#ffffff",
  controlBorder: "#d1d5db",
  controlText: "#111827",
  placeholder: "#9ca3af",
  menuBg: "#ffffff",
  optionBg: "#ffffff",
  optionHoverBg: "rgba(59, 130, 246, 0.12)",
  optionText: "#111827",
  optionHoverText: "#2563eb",
  shadow: "0 2px 6px rgba(0,0,0,0.12)",
};

const darkTheme = {
  controlBg: "#0a0a0a", // neutral-950
  controlBorder: "#262626", // neutral-800
  controlText: "#f5f5f5", // neutral-100
  placeholder: "#737373", // neutral-500
  menuBg: "#0a0a0a",
  optionBg: "#0a0a0a",
  optionHoverBg: "rgba(59, 130, 246, 0.18)",
  optionText: "#e5e5e5",
  optionHoverText: "#93c5fd",
  shadow: "0 8px 24px rgba(0,0,0,0.35)",
};

const baseSelectStyles = {
  control: (base, state) => {
    const t = isDarkMode() ? darkTheme : lightTheme;

    return {
      ...base,
      backgroundColor: t.controlBg,
      borderRadius: 12,
      padding: "2px 4px",
      minHeight: 40,
      boxShadow: state.isFocused
        ? "0 0 0 2px rgba(59,130,246,0.25)"
        : t.shadow,
      border: state.isFocused ? "1px solid #3b82f6" : `1px solid ${t.controlBorder}`,
      cursor: "pointer",
      transition: "all 0.2s ease",
      ":hover": {
        borderColor: state.isFocused ? "#3b82f6" : t.controlBorder,
      },
    };
  },

  valueContainer: (base) => ({
    ...base,
    padding: "2px 8px",
  }),

  singleValue: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      color: t.controlText,
      fontWeight: "400",
    };
  },

  input: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      color: t.controlText,
    };
  },

  placeholder: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      color: t.placeholder,
    };
  },

  indicatorSeparator: (base) => ({
    ...base,
    display: "none",
  }),

  dropdownIndicator: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      color: t.placeholder,
      ":hover": { color: t.controlText },
    };
  },

  clearIndicator: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      color: t.placeholder,
      ":hover": { color: t.controlText },
    };
  },

  menu: (base) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      backgroundColor: t.menuBg,
      borderRadius: 12,
      overflow: "hidden",
      zIndex: 50,
      border: `1px solid ${t.controlBorder}`,
      boxShadow: t.shadow,
      marginTop: 8,
    };
  },

  menuList: (base) => ({
    ...base,
    padding: 6,
  }),

  option: (base, state) => {
    const t = isDarkMode() ? darkTheme : lightTheme;
    return {
      ...base,
      backgroundColor: state.isFocused ? t.optionHoverBg : t.optionBg,
      color: state.isFocused ? t.optionHoverText : t.optionText,
      cursor: "pointer",
      padding: "10px 12px",
      borderRadius: 10,
      ":active": {
        backgroundColor: t.optionHoverBg,
      },
    };
  },

  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  isSearchable = false,
  getOptionLabel,
  getOptionValue,
  className = "",
  menuPortalTarget = typeof document !== "undefined" ? document.body : null,
  styles = {},
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      isSearchable={isSearchable}
      styles={{ ...baseSelectStyles, ...styles }}
      getOptionLabel={getOptionLabel}
      getOptionValue={getOptionValue}
      className={className}
      menuPortalTarget={menuPortalTarget}
    />
  );
}