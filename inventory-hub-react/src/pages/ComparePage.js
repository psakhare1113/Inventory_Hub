import React from 'react';
import { formatPrice } from '../data';
import { icons } from '../utils/icons';

export const ComparePage = ({ compareProducts, onClear, onRemove, onAddToCart, onNavigate }) => {
  if (compareProducts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-serif mb-4">Compare Products</h1>
        <p className="text-muted mb-8">You haven't selected any products to compare.</p>
        <button onClick={() => onNavigate('shop')} className="px-6 py-3 bg-primary text-white rounded-lg font-medium">Back to Shop</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-serif mb-2">Compare Products</h1>
          <p className="text-muted">Detailed comparison to help you choose perfectly.</p>
        </div>
        <button onClick={onClear} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Clear All</button>
      </div>

      <div className="overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="w-1/4 p-4 border-b-2 border-border font-serif text-lg text-muted align-bottom">Features</th>
              {compareProducts.map(p => (
                <th key={p.id} className="w-1/4 p-4 border-b-2 border-border align-bottom">
                  <div className="relative bg-secondary/50 rounded-xl p-4 flex flex-col gap-4 group">
                    <button onClick={() => onRemove(p.id)} className="absolute top-2 right-2 bg-white hover:bg-red-500 hover:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                      ×
                    </button>
                    <img src={p.imageUrl} alt={p.name} className="w-full aspect-[4/5] object-cover rounded-lg" />
                    <div>
                      <h3 className="font-medium text-lg truncate">{p.name}</h3>
                      <p className="text-primary font-semibold mt-1">{formatPrice(p.price)}</p>
                    </div>
                    <button onClick={() => onAddToCart(p.id)} className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:shadow-lg transition-all">
                      Add to Cart
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr>
              <td className="p-4 font-medium text-muted">Price</td>
              {compareProducts.map(p => <td key={p.id} className="p-4 font-semibold">{formatPrice(p.price)}</td>)}
            </tr>
            <tr>
              <td className="p-4 font-medium text-muted">Description</td>
              {compareProducts.map(p => <td key={p.id} className="p-4 text-sm text-muted">{p.description}</td>)}
            </tr>
            <tr>
              <td className="p-4 font-medium text-muted">Features</td>
              {compareProducts.map(p => (
                <td key={p.id} className="p-4">
                  <ul className="text-sm space-y-1">
                    {p.features ? p.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1 text-muted">
                        <span className="text-primary mt-0.5">•</span> {f}
                      </li>
                    )) : <span className="text-muted/50">N/A</span>}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
