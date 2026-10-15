import React, { useState } from 'react';
import { api } from '../api/client';
import { Trophy, X, Plus, Calendar, Clock, MapPin, Users, Flame, CheckCircle2 } from 'lucide-react';
import { useModal } from '../context/ModalContext';

export const CreateMatchModal = ({ isOpen, onClose, onCreated }) => {
  const { showAlert } = useModal();
  const [sport, setSport] = useState('Cricket');
  const [place, setPlace] = useState('Zuna Arena Turf');
  const [teamAName, setTeamAName] = useState('Team Alpha');
  const [teamBName, setTeamBName] = useState('Team Beta');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('18:00');
  const [overs, setOvers] = useState(6);
  const [status, setStatus] = useState('created'); // 'created' or 'live'
  const [playWithStrangers, setPlayWithStrangers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!place.trim()) {
      await showAlert({ title: 'Validation Error', message: 'Venue / Place name is required.', type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sport,
        place: place.trim(),
        teamAName: teamAName.trim() || 'Team A',
        teamBName: teamBName.trim() || 'Team B',
        matchDate,
        matchTime,
        overs: Number(overs) || 6,
        status,
        playWithStrangers,
      };

      const res = await api.createAdminMatch(payload);
      if (res.success && res.data?.match) {
        await showAlert({
          title: 'Match Launched!',
          message: `Official match created successfully!\nJoin Code: ${res.data.match.joinCode}`,
          type: 'success',
        });
        if (onCreated) onCreated(res.data.match);
        onClose();
      }
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.message || 'Failed to create match fixture',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden scale-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                Launch Official Match Fixture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate join code & community scorecard from Super Admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="Cricket">Cricket</option>
                <option value="Football">Football</option>
                <option value="Badminton">Badminton</option>
                <option value="Tennis">Tennis</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Basketball">Basketball</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Total Overs (Cricket)
              </label>
              <select
                value={overs}
                onChange={(e) => setOvers(Number(e.target.value))}
                disabled={sport !== 'Cricket'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value={4}>4 Overs</option>
                <option value={6}>6 Overs</option>
                <option value={8}>8 Overs</option>
                <option value={10}>10 Overs</option>
                <option value={12}>12 Overs</option>
                <option value={20}>20 Overs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
              Venue / Turf Location
            </label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. Thunder Arena Turf - Perundurai"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Team A Name
              </label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                placeholder="Team Alpha"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Team B Name
              </label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                placeholder="Team Beta"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Date
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Time
              </label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Initial Status
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('created')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                    status === 'created'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Scheduled
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('live')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                    status === 'live'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Live Now
                </button>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playWithStrangers}
                  onChange={(e) => setPlayWithStrangers(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Public Match (Anyone can join)</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center space-x-1.5"
            >
              <Plus size={14} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Launching Fixture...' : 'Launch Match Fixture'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
