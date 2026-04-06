import React from 'react';
import { KnowledgeNode } from '../types';
import { X } from 'lucide-react';

interface DataOverlayProps {
  node: KnowledgeNode | null;
  onClose: () => void;
}

export const DataOverlay: React.FC<DataOverlayProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90%] max-h-[80vh] bg-[#D4D0C8] border-2 border-black p-4 z-50 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-black text-[#FFFFFF] p-1 hover:bg-[#FF0000] transition-colors"
      >
        <X size={16} strokeWidth={3} />
      </button>

      <div className="text-xl font-black uppercase border-b-2 border-black pb-4 mb-4 tracking-widest">
        {node.id} // {node.title}
      </div>

      <div className="text-[13px] leading-relaxed font-mono space-y-4">
        <p><strong>TYPE:</strong> {node.type}</p>
        <p>{node.body}</p>

        <hr className="border-0 border-t border-dashed border-black my-4" />

        <small className="block opacity-60">
            Construct ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}
        </small>
      </div>
    </div>
  );
};
