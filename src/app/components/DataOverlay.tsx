import React from 'react';
import { KnowledgeNode } from '../types';

interface DataOverlayProps {
  node: KnowledgeNode | null;
  onClose: () => void;
}

export const DataOverlay: React.FC<DataOverlayProps> = ({ node, onClose }) => {
  if (!node) return null;

  const constructId = Math.random().toString(36).substring(2, 9).toUpperCase();

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[90%] max-h-[80vh] z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="win95-window flex flex-col">
        {/* Title bar */}
        <div className="win95-titlebar">
          <span>{node.id} — Properties</span>
          <button className="win95-sys-btn" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="p-4 bg-[#D4D0C8] space-y-3 overflow-y-auto max-h-[60vh]">
          <div className="win95-groupbox">
            <span className="win95-groupbox-label">Identity</span>
            <div className="font-mono text-[11px] space-y-1">
              <div><span className="text-black/50">NODE_ID:</span> {node.id}</div>
              <div><span className="text-black/50">TITLE:  </span> {node.title}</div>
              <div><span className="text-black/50">TYPE:   </span> {node.type}</div>
              <div><span className="text-black/50">REF:    </span> {constructId}</div>
            </div>
          </div>

          <div className="win95-inset p-3 bg-white">
            <div className="text-[11px] font-mono leading-relaxed">{node.body}</div>
          </div>

          <div className="flex justify-end">
            <button className="win95-btn text-[11px]" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
};
