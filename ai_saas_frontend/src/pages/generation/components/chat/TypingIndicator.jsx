import React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span
        className="w-2 h-2 rounded-full animate-bounce
                   bg-gray-400 dark:bg-neutral-500"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="w-2 h-2 rounded-full animate-bounce
                   bg-gray-400 dark:bg-neutral-500"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="w-2 h-2 rounded-full animate-bounce
                   bg-gray-400 dark:bg-neutral-500"
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}