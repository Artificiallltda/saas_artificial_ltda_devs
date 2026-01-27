import React from "react";
import SkeletonLoader from "./SkeletonLoader";

export default function ChatSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-3 py-2 rounded-md"
        >
          <div className="flex items-center gap-3 flex-1">
            <SkeletonLoader variant="avatar" />
            <div className="flex-1 space-y-1">
              <SkeletonLoader 
                variant="text" 
                width="60%" 
                height="h-4" 
              />
              <SkeletonLoader 
                variant="text" 
                width="40%" 
                height="h-3" 
                className="opacity-70"
              />
            </div>
          </div>
          <SkeletonLoader variant="button" />
        </div>
      ))}
    </div>
  );
}
