import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Percent,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductUnit } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

const COMMON_UNITS: ProductUnit[] = ['NOS', 'PCS', 'BOX', 'HRS', 'KGS', 'MTR', 'SET', 'LITRE', 'BAG'];

interface ProductListViewProps {
  onNavigate: (path: string) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({ onNavigate }) => {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { currentUser, role } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Goods' | 'Services'>('All');
  const [gstFilter, setGstFilter] = useState<string>('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [type, setType] = useState<'Goods' | 'Services'>('Goods');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('NOS');
  const [price, setPrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [cess, setCess] = useState<number>(0);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== 'All' && p.type !== typeFilter) return false;
      if (gstFilter !== 'All' && p.gstRate !== parseFloat(gstFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchHsn = p.hsnSacCode?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchHsn && !matchDesc) return false;
      }
      return true;
    });
  }, [products, typeFilter, gstFilter, searchQuery]);

  const openAddModal = () => {
    setEditingProduct(null);
    setType('Goods');
    setName('');
    setDescription('');
    setHsnSacCode('');
    setUnit('NOS');
    setPrice(0);
    setPurchasePrice(0);
    setGstRate(18);
    setCess(0);
    setOpeningStock(0);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setType(p.type);
    setName(p.name);
    setDescription(p.description || '');
    setHsnSacCode(p.hsnSacCode || '');
    setUnit(p.unit);
    setPrice(p.price);
    setPurchasePrice(p.purchasePrice || 0);
    setGstRate(p.gstRate);
    setCess(p.cess || 0);
    setOpeningStock(p.openingStock || 0);
    setIsActive(p.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) {
      showToast('Product name and positive selling price are required', 'error');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          type,
          name,
          description,
          hsnSacCode,
          unit,
          price: Number(price),
          purchasePrice: Number(purchasePrice),
          gstRate: Number(gstRate),
          cess: Number(cess),
          openingStock: Number(openingStock),
          isActive,
        });
        showToast('Product updated successfully');
      } else {
        await addProduct({
          type,
          name,
          description,
          hsnSacCode,
          unit,
          price: Number(price),
          purchasePrice: Number(purchasePrice),
          gstRate: Number(gstRate),
          cess: Number(cess),
          openingStock: Number(openingStock),
          isActive: true,
          createdBy: currentUser?.uid || 'user',
        });
        showToast('Product added to catalog');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Failed to save product: ' + err.message, 'error');
    }
  };

  const handleToggleStatus = async (p: Product) => {
    try {
      await updateProduct(p.id, { isActive: !p.isActive });
      showToast(`Item set to ${!p.isActive ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      showToast('Failed to toggle status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (p: Product) => {
    if (confirm(`Remove ${p.name} from active catalog?`)) {
      try {
        await deleteProduct(p.id);
        showToast('Product deleted');
      } catch (err: any) {
        showToast('Failed to delete: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Products &amp; Services Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard pricing, HSN/SAC classifications, and default GST tax slabs
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Item / Service
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, HSN/SAC code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
          >
            <option value="All">All Types (Goods &amp; Services)</option>
            <option value="Goods">Goods only</option>
            <option value="Services">Services only</option>
          </select>
        </div>

        <div>
          <select
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
          >
            <option value="All">All GST Rates</option>
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
            <option value="28">28%</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Item Name &amp; Description</th>
                <th className="px-5 py-3">HSN / SAC</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3 text-right">Selling Price</th>
                <th className="px-5 py-3 text-center">GST Slab</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    No items found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          p.type === 'Goods'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {p.hsnSacCode || '-'}
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-slate-700">
                      {p.unit}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      {formatCurrency(p.price)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-slate-800">{p.gstRate}%</span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className="cursor-pointer"
                        title="Click to toggle active state"
                      >
                        <Badge variant={p.isActive ? 'success' : 'neutral'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Item"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleDelete(p)}
                            title="Delete Item"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Catalog Item' : 'Add Item to Catalog'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="radio"
                name="itemType"
                checked={type === 'Goods'}
                onChange={() => setType('Goods')}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Goods / Products</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="radio"
                name="itemType"
                checked={type === 'Services'}
                onChange={() => setType('Services')}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span>Services</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item / Service Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Dell XPS 15 Laptop / Cloud Hosting"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, warranty notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === 'Goods' ? 'HSN Code' : 'SAC Code'}
              </label>
              <input
                type="text"
                value={hsnSacCode}
                onChange={(e) => setHsnSacCode(e.target.value)}
                placeholder={type === 'Goods' ? '84713010' : '998313'}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Slab *
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Price (Optional ₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs cursor-pointer"
            >
              {editingProduct ? 'Update Item' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
