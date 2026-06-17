import React from 'react';
import { icons } from '../utils/icons';

export const CompareBar = ({ compareProducts, onRemove, onClear, onNavigate, onOpenModal }) => {
  if (compareProducts.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center text-sm font-medium text-muted mr-2 shrink-0">
            Compare ({compareProducts.length}/3)
          </div>
          
          <div className="flex gap-4">
            {compareProducts.map(p => (
              <div key={p.id} className="relative flex items-center gap-3 bg-secondary p-2 rounded-lg pr-8 shrink-0 w-[200px]">
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-md" />
                <span className="text-xs font-medium truncate">{p.name}</span>
                <button onClick={() => onRemove(p.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-red-500 p-1">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button onClick={onClear} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Clear</button>
          <button 
            onClick={onOpenModal} 
            className={`px-6 py-2 bg-primary text-white rounded-lg font-medium ${compareProducts.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={compareProducts.length < 2}
          >
            Compare Models
          </button>
        </div>
      </div>
    </div>
  );
};
