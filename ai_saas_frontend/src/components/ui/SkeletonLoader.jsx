import React from "react";

export default function SkeletonLoader({ 
  variant = "text", 
  width, 
  height, 
  lines = 1, 
  className = "" 
}) {
  const baseClasses = "animate-pulse bg-gray-200 rounded";
  
  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return "h-4";
      case "chat":
        return "h-12";
      case "message":
        return "h-16";
      case "avatar":
        return "w-10 h-10 rounded-full";
      case "button":
        return "h-10 w-20";
      default:
        return "h-4";
    }
  };

  const style = {
    width: width || (variant === "avatar" ? "40px" : "100%"),
    height: height || undefined,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              width: index === lines - 1 ? "70%" : "100%",
              ...style,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
}
