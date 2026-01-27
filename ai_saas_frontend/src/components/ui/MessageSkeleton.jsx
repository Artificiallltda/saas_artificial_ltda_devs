import React from "react";
import SkeletonLoader from "./SkeletonLoader";

export default function MessageSkeleton({ isUser = false, count = 1 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] p-4 rounded-2xl space-y-2 ${
              isUser
                ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-theme-dark)]"
                : "bg-gray-100"
            }`}
          >
            <SkeletonLoader
              variant="text"
              lines={2}
              className={isUser ? "bg-white/20" : "bg-gray-200"}
            />
            <SkeletonLoader
              variant="text"
              width="80%"
              className={isUser ? "bg-white/20" : "bg-gray-200"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
