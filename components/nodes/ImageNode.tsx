"use client";

import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Image as ImageIcon, Upload, X } from "lucide-react";

interface ImageNodeData {
  imageUrl?: string;
  imageFile?: File;
}

function ImageNode({ id, data }: NodeProps<ImageNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          
          // Upload to Cloudinary
          const formData = new FormData();
          formData.append("base64", base64);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          
          if (result.success) {
            updateNodeData(id, {
              imageUrl: result.data.url,
              imageFile: file,
            });
          } else {
            console.error("Upload failed:", result.error);
          }
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error uploading image:", error);
        setUploading(false);
      }
    },
    [id, updateNodeData]
  );

  const handleRemove = useCallback(() => {
    updateNodeData(id, { imageUrl: undefined, imageFile: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[250px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-300 rounded-t-lg">
        <ImageIcon className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">Image Node</span>
      </div>
      <div className="p-3">
        {data.imageUrl ? (
          <div className="relative">
            <img
              src={data.imageUrl}
              alt="Uploaded"
              className="w-full h-32 object-cover rounded border border-gray-300"
            />
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            {uploading ? (
              <div className="text-sm text-gray-500">Uploading...</div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-purple-600 hover:text-purple-700"
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
              </>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}

export default memo(ImageNode);

