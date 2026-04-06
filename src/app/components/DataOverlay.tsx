import React from 'react';
import { KnowledgeNode } from '../types';

interface DataOverlayProps {
  node: KnowledgeNode | null;
  onClose: () => void;
}

export const DataOverlay: React.FC<DataOverlayProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[90%] max-h-[80vh] z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white border-[4px] border-black flex flex-col">
        {/* Header beam */}
        <div className="beam-h-heavy flex items-center justify-between px-4 text-white">
          <span className="font-black text-[11px] tracking-wider">{node.id}</span>
          <button onClick={onClose} className="font-black text-[14px] hover:opacity-50">×</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <div className="node-label mb-1">Title</div>
            <div className="text-[14px] font-black uppercase">{node.title}</div>
          </div>
          <div className="beam-h" />
          <div>
            <div className="node-label mb-1">Type</div>
            <span className="inv-inline">{node.type}</span>
          </div>
          <div className="beam-h" />
          <div>
            <div className="node-label mb-1">Body</div>
            <div className="text-[12px] font-bold leading-relaxed">{node.body}</div>
          </div>
          <div className="beam-h" />
          <div className="flex justify-end">
            <button className="brut-btn text-[11px]" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};
