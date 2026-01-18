"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
  fullScreen?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "bg-blue-600 hover:bg-blue-700",
  fullScreen = false,
  children,
  disabled = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-100 flex ${fullScreen ? '' : 'items-center justify-center'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative z-10 bg-[#212126] border border-[#302e33] shadow-xl ${
        fullScreen 
          ? 'w-full h-full rounded-none' 
          : 'rounded-lg w-full max-w-md mx-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#302e33]">
          <h2 className="text-lg font-semibold text-gray-300">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#353539] text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <p className="text-sm text-gray-400 mb-2">{message}</p>
          {children}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#302e33]">
          <button
            onClick={onClose}
            disabled={disabled}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#353539] border border-[#454549] rounded hover:bg-[#3d3d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              if (!disabled) {
                onClose();
              }
            }}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-medium text-white ${confirmButtonColor} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

