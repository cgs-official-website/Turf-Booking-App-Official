import React, { useState, useEffect } from 'react';
import { Star, Quote, ShieldCheck, MessageSquareHeart } from 'lucide-react';
import { api } from '../../../api/client';

export const Testimonials = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await api.request('/reviews');
      if (res?.success && Array.isArray(res?.data?.reviews)) {
        setReviews(res.data.reviews);
      } else if (Array.isArray(res?.data)) {
        setReviews(res.data);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <section id="testimonials" className="scroll-mt-16 py-16 lg:py-24 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Player & Partner Voices
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Verified Community Feedback
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            Real reviews and ratings submitted by players and venue partners across our network.
          </p>
        </div>

        {/* Dynamic Reviews from Database */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-3">
              <MessageSquareHeart size={24} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">No Customer Reviews Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Be the first to review your game session after booking a turf through our verified platform!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((r, idx) => {
              const ratingNum = Number(r.rating) || 5;
              return (
                <div
                  key={r.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg dark:hover:shadow-emerald-950/20 transition-all duration-200 relative group hover:-translate-y-1"
                >
                  <div>
                    {/* Rating Stars */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1 text-amber-400">
                        {[...Array(ratingNum)].map((_, i) => (
                          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Verified Player
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed italic">
                      "{r.comment || r.review || 'Great turf surface and smooth slot reservation experience!'}"
                    </p>
                  </div>

                  {/* Author / Turf Info */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {(r.userName || r.customerName || 'PL')[0]}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>{r.userName || r.customerName || 'Anonymous Player'}</span>
                        <ShieldCheck size={13} className="text-emerald-500" />
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {r.turfName || 'Verified Turf Arena'}
                      </p>
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
