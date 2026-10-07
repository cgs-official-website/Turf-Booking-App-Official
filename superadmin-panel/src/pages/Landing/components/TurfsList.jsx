import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Star,
  Clock,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { api } from '../../../api/client';

export const TurfsList = ({ onSelectTurfForBooking }) => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const sportsList = ['All', 'Football', 'Cricket', 'Badminton', 'Tennis'];

  const fetchTurfs = async () => {
    try {
      const res = await api.getTurfs({ limit: 12 });
      if (res?.success && res?.data?.turfs && Array.isArray(res.data.turfs)) {
        setTurfs(res.data.turfs);
      } else if (Array.isArray(res?.data?.items)) {
        setTurfs(res.data.items);
      } else if (Array.isArray(res?.data)) {
        setTurfs(res.data);
      } else {
        setTurfs([]);
      }
    } catch (err) {
      console.error('Error fetching live turfs from database:', err);
      setTurfs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurfs();
  }, []);

  const filteredTurfs = turfs.filter((turf) => {
    const matchesSport =
      selectedSport === 'All' ||
      (Array.isArray(turf.sports) && turf.sports.includes(selectedSport)) ||
      turf.sport === selectedSport;

    const matchesSearch =
      !searchQuery ||
      turf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turf.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSport && matchesSearch;
  });

  return (
    <section id="turfs" className="scroll-mt-16 py-16 lg:py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Verified Venues
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Featured Arenas & Pitches Ready for Play
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
              Book certified synthetic football grounds, indoor cricket cages, and tournament courts with zero double-booking risk.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Sport Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {sportsList.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedSport === sport
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Turfs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredTurfs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No turfs matched your search or sport filter.
            </p>
            <button
              onClick={() => {
                setSelectedSport('All');
                setSearchQuery('');
              }}
              className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTurfs.map((turf) => {
              const ratingVal = turf.ratingAvg || turf.rating?.avg || 4.8;
              const reviewsVal = turf.reviewsCount || turf.rating?.count || 12;
              const price = turf.pricePerHour || turf.hourlyRate || 800;
              const image =
                (turf.images && turf.images[0]) ||
                'https://images.unsplash.com/photo-1529900245534-47fbf7b0bf9e?w=800';

              return (
                <div
                  key={turf.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl dark:hover:shadow-emerald-950/20 transition-all duration-200 flex flex-col group hover:-translate-y-1"
                >
                  {/* Image with Tag Badges */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={image}
                      alt={turf.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1529900245534-47fbf7b0bf9e?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

                    {/* Verified Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                      <ShieldCheck size={13} className="text-emerald-400" />
                      <span>KYC Verified</span>
                    </div>

                    {/* Rating Pill */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white text-[11px] font-bold flex items-center space-x-1 shadow-xs">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span>{ratingVal}</span>
                      <span className="text-[10px] text-slate-400">({reviewsVal})</span>
                    </div>

                    {/* Bottom Price Pill in Image */}
                    <div className="absolute bottom-3 left-3 text-white">
                      <span className="text-xl font-black">₹{price}</span>
                      <span className="text-[11px] text-slate-200 font-medium"> / hour</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Sports Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(turf.sports || [turf.sport || 'Football']).map((sp, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {turf.name}
                      </h3>

                      <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs mt-1.5 space-x-1">
                        <MapPin size={13} className="shrink-0 text-emerald-500" />
                        <span className="line-clamp-1">
                          {turf.location?.address ? `${turf.location.address}, ${turf.location.city || ''}` : 'Chennai, Tamil Nadu'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {turf.description || 'High-performance synthetic grass pitch with LED floodlighting and private locker rooms.'}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <Clock size={13} className="mr-1 text-slate-400" />
                        <span>06:00 - 23:00</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTurfForBooking(turf)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                      >
                        <CalendarCheck size={14} />
                        <span>Book Slot</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
