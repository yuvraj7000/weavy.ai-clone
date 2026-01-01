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
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      <div className="p-4">
        {/* Image label at top-left */}
        <div className="flex items-center gap-2 h-[42px] items-center">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          <span className="text-md font-medium text-[#919196] pointer-events-none z-10">
            Image
          </span>
        </div>

        {(data.imageUrl || data.imageBase64) ? (
          <div className="relative bg-[#353539] rounded p-2 mt-2">
            <img
              src={data.imageUrl || data.imageBase64}
              alt="Selected"
              className="w-full h-auto max-h-[300px] object-contain rounded"
            />
            <button
              onClick={handleRemove}
              className="absolute top-3 right-3 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {!data.imageUrl && data.imageBase64 && (
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                Not saved
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#353539] border-2 border-dashed border-[#5C5C5F] rounded p-8 text-center mt-2 cursor-pointer hover:border-[#7a7a7d] transition-colors" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-10 h-10 mx-auto mb-3 text-[#919196]" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-[#919196] hover:text-white transition-colors"
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
      
      {/* Image Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="image"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-45px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Image
      </div>
    </div>
  );
}

export default memo(ImageNode);

