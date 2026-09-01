import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Phone, Mail, Loader2 } from 'lucide-react';

export const VendorsView = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await api.getAllVendors();
      setVendors(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.name || '').toLowerCase().includes(q) ||
      (v.businessName || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Registered Turf Partners</h2>
          <p className="text-xs text-slate-500">All turf business owners and facility managers.</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-56 transition shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Partner Name</th>
              <th className="p-3.5">Business Entity</th>
              <th className="p-3.5">Contact (Phone/Email)</th>
              <th className="p-3.5">Linked Turf</th>
              <th className="p-3.5">KYC Status</th>
              <th className="p-3.5">Subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading partners...</span>
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No partners found matching your search.
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => (
                <tr key={v.uid || v.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-900 text-xs">{v.name || 'Turf Partner'}</td>
                  <td className="p-3.5 text-slate-700 font-semibold">{v.businessName || 'N/A'}</td>
                  <td className="p-3.5 text-slate-600">
                    <p className="flex items-center"><Phone size={11} className="mr-1 text-slate-400" />{v.phone || 'N/A'}</p>
                    <p className="flex items-center text-[11px] text-slate-500 mt-0.5"><Mail size={11} className="mr-1 text-slate-400" />{v.email || 'N/A'}</p>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">{v.turfName || 'No Turf Linked'}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.kycStatus === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {v.kycStatus || 'pending'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {v.subscription?.active ? (
                      <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active ({v.subscription.planId || 'Plan'})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Inactive</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
