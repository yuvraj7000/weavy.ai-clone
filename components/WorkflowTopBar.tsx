"use client";

export default function WorkflowTopBar() {
  return (
    <div className="h-12 bg-[#0f0f0f] border-b border-[#1a1a1a] flex items-center px-4">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <span className="text-sm text-gray-300 font-medium">Copy of Weavy Welcome</span>
      </div>
    </div>
  );
}

