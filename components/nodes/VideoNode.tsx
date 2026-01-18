"use client";

import { memo, useCallback, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Video, Upload, X } from "lucide-react";

interface VideoNodeData {
  videoUrl?: string; // Transloadit URL (after save)
  videoBase64?: string; // Base64 data URI (before save)
  videoFile?: File;
}

function VideoNode({ id, data }: NodeProps<VideoNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Select node when clicking header
  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const { onNodesChange } = useWorkflowStore.getState();
    onNodesChange([{ id, type: 'select', selected: true }]);
  }, [id]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid video file (mp4, mov, webm, m4v)");
        return;
      }

      // Convert to base64 for preview and local storage (no upload yet)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateNodeData(id, {
          videoBase64: base64, // Store base64 locally
          videoUrl: undefined, // Clear Transloadit URL until save
          videoFile: file,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleRemove = useCallback(() => {
    updateNodeData(id, { videoUrl: undefined, videoBase64: undefined, videoFile: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  return (
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      <div className="p-4">
        {/* Video label at top-left */}
        <div 
          className="flex items-center gap-2 h-[42px] items-center cursor-pointer"
          onClick={handleHeaderClick}
        >
          <Video className="w-4 h-4 text-gray-400" />
          <span className="text-md font-medium text-[#919196] pointer-events-none z-10">
            Video
          </span>
        </div>

        {(data.videoUrl || data.videoBase64) ? (
          <div className="relative bg-[#353539] rounded p-2 mt-2">
            <video
              src={data.videoUrl || data.videoBase64}
              controls
              className="w-full h-auto max-h-[300px] object-contain rounded"
            />
            <button
              onClick={handleRemove}
              className="absolute top-3 right-3 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {!data.videoUrl && data.videoBase64 && (
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
              Click to upload video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>
      
      {/* Video Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="video"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-45px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Video
      </div>
    </div>
  );
}

export default memo(VideoNode);


