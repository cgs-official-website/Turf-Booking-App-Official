import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Trophy, Key, Users, Loader2, Coins } from 'lucide-react';

export const MatchesView = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await api.getAllMatches();
      setMatches(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Community Matches & Live Scorecards</h2>
          <p className="text-xs text-slate-500">Real-time live cricket scorecards created by players across venues.</p>
        </div>
        <button
          onClick={loadMatches}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : null}
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs">Loading match scorecards...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Trophy size={32} className="text-slate-300 mx-auto mb-2" />
          <h3 className="text-slate-900 font-extrabold text-base">No Matches Yet</h3>
          <p className="text-slate-500 text-xs mt-1">Community cricket matches created by players will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm hover:shadow transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {m.sport || 'Cricket'} @ {m.place || 'Turf Venue'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Organized by: <strong className="text-emerald-700 font-bold">{m.creatorName || 'Player'}</strong>
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.status === 'live'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500 font-medium">
                    <Key size={13} className="text-amber-500 mr-1.5" />
                    <span>Join Code:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {m.joinCode || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-500 font-medium">
                    <Users size={13} className="text-blue-500 mr-1.5" />
                    <span>Players Joined:</span>
                  </span>
                  <span className="font-bold text-slate-900">{m.players?.length || 1} players</span>
                </div>

                {m.toss && (
                  <div className="flex items-center justify-between text-slate-800 pt-1 border-t border-slate-200">
                    <span className="flex items-center text-slate-500 font-medium">
                      <Coins size={13} className="mr-1.5 text-amber-500" />
                      <span>Toss:</span>
                    </span>
                    <span className="font-bold text-[11px] text-slate-900">
                      {m.toss.winner} chose to {m.toss.decision}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
