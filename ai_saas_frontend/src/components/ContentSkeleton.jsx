import React from 'react';

export function ContentSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
