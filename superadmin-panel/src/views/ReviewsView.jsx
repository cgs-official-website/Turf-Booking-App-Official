import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';

export const ReviewsView = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllReviews(ratingFilter === 'ALL' ? undefined : ratingFilter);
      if (res.success && res.data) {
        setReviews(Array.isArray(res.data) ? res.data : (res.data.items || []));
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError(err.message || 'Failed to load turf customer reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [ratingFilter]);

  // Filter by search query
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const userName = (r.userName || '').toLowerCase();
      const turfName = (r.turfName || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const bookingId = (r.bookingId || '').toLowerCase();
      return (
        userName.includes(q) ||
        turfName.includes(q) ||
        comment.includes(q) ||
        bookingId.includes(q)
      );
    });
  }, [reviews, searchQuery]);

  // Calculate Rating Metrics
  const metrics = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        total: 0,
        avg: '0.0',
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviews.forEach((r) => {
      const rate = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      dist[rate] = (dist[rate] || 0) + 1;
      sum += Number(r.rating) || 5;
    });

    return {
      total,
      avg: (sum / total).toFixed(1),
      distribution: dist,
    };
  }, [reviews]);

  const renderStars = (rating = 5, size = 14) => {
    const num = Math.round(Number(rating) || 5);
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${
              star <= num
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star size={20} className="fill-amber-500" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Turf Customer Reviews</h2>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-slate-200">
              Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin real-time view of verified customer reviews, player ratings, and arena feedback across all turfs.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center space-x-1 text-xs font-bold"
            title="Refresh reviews"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Analytics & Rating Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Platform Rating */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Average Rating</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Star size={16} className="fill-amber-400" />
            </span>
          </div>
          <div className="my-3 flex items-baseline space-x-3">
            <span className="text-4xl font-black text-slate-900">{metrics.avg}</span>
            <div className="space-y-1">
              {renderStars(Number(metrics.avg), 16)}
              <p className="text-[11px] font-bold text-slate-500">out of 5.0 stars</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Based on {metrics.total} verified match bookings
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Rating Distribution</span>
            <span className="text-xs font-bold text-slate-400">{metrics.total} Total Reviews</span>
          </div>

          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics.distribution[star] || 0;
              const percentage = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1 w-12 shrink-0 font-bold text-slate-700">
                    <span>{star}</span>
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        star >= 4
                          ? 'bg-emerald-500'
                          : star === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-bold text-slate-500 text-[11px]">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name, turf facility, or review keywords..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Star Rating Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', '5', '4', '3', '2', '1'].map((rate) => (
            <button
              key={rate}
              onClick={() => setRatingFilter(rate)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center space-x-1 shrink-0 ${
                ratingFilter === rate
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {rate === 'ALL' ? (
                <span>All Ratings</span>
              ) : (
                <>
                  <span>{rate}</span>
                  <Star size={12} className={ratingFilter === rate ? 'fill-white' : 'fill-amber-400 text-amber-400'} />
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-xs font-semibold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-amber-500" />
          <p className="text-xs font-medium">Fetching verified player reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Reviews Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No player reviews matched "${searchQuery}". Try a different keyword or reset filters.`
              : 'There are currently no reviews submitted for this rating criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id || rev._id || rev.bookingId}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: User & Rating */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {rev.userPhoto ? (
                      <img
                        src={rev.userPhoto}
                        alt={rev.userName || 'Player'}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {(rev.userName || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        {rev.userName || 'Verified Player'}
                      </h4>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                          Verified Player
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {renderStars(rev.rating, 13)}
                    <span className="text-[10px] font-black text-amber-600 block mt-0.5">
                      {rev.rating || 5}.0 / 5.0
                    </span>
                  </div>
                </div>

                {/* Turf Location Badge */}
                <div className="flex items-center space-x-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{rev.turfName || 'Turf Facility'}</span>
                  {rev.turfCity && (
                    <span className="text-slate-400 font-normal truncate">• {rev.turfCity}</span>
                  )}
                </div>

                {/* Feedback Comment */}
                <div className="pt-1">
                  <p className="text-xs text-slate-700 italic font-medium leading-relaxed bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                    "{rev.comment || 'Great turf and pitch experience!'}"
                  </p>
                </div>
              </div>

              {/* Card Footer: Metadata */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <div className="flex items-center space-x-1">
                  <Calendar size={11} />
                  <span>
                    {rev.createdAt
                      ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recently'}
                  </span>
                </div>
                {rev.bookingId && (
                  <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    Ref: {rev.bookingId.slice(0, 8)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
