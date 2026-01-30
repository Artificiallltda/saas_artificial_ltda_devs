import React from 'react';

export function ChatSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2 px-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton({ count = 2 }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] p-4 rounded-2xl space-y-3 ${
            index % 2 === 0 
              ? 'bg-gray-200 rounded-br-none' 
              : 'bg-gray-100 rounded-bl-none'
          }`}>
            <div className="space-y-2">
              <div className={`h-4 bg-gray-300 rounded animate-pulse ${index % 2 === 0 ? 'w-full' : 'w-5/6'}`}></div>
              <div className={`h-4 bg-gray-300 rounded animate-pulse ${index % 2 === 0 ? 'w-4/5' : 'w-full'}`}></div>
              <div className={`h-4 bg-gray-300 rounded animate-pulse w-3/4`}></div>
            </div>
            <div className="h-3 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 p-3 rounded-md hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
      ))}
    </div>
  );
}

export default { ChatSkeleton, MessageSkeleton, SearchSkeleton };
