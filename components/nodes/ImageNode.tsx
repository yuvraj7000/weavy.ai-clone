"use client";

import { memo, useCallback, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Image as ImageIcon, Upload, X } from "lucide-react";

interface ImageNodeData {
  imageUrl?: string; // Cloudinary URL (after save)
  imageBase64?: string; // Base64 data URI (before save)
  imageFile?: File;
}

function ImageNode({ id, data }: NodeProps<ImageNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Convert to base64 for preview and local storage (no upload yet)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateNodeData(id, {
          imageBase64: base64, // Store base64 locally
          imageUrl: undefined, // Clear Cloudinary URL until save
          imageFile: file,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleRemove = useCallback(() => {
    updateNodeData(id, { imageUrl: undefined, imageBase64: undefined, imageFile: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg min-w-[250px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border-b border-[#2a2a2a] rounded-t-lg">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">Image</span>
      </div>
      <div className="p-3">
        {(data.imageUrl || data.imageBase64) ? (
          <div className="relative">
            <img
              src={data.imageUrl || data.imageBase64}
              alt="Selected"
              className="w-full h-32 object-cover rounded border border-[#2a2a2a]"
            />
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X className="w-3 h-3" />
            </button>
            {!data.imageUrl && data.imageBase64 && (
              <div className="absolute bottom-1 left-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                Not saved
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#2a2a2a] rounded p-4 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-green-400 hover:text-green-300"
            >
              Click to upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-[#0a0a0a]"
      />
    </div>
  );
}

export default memo(ImageNode);

