import React, { useState, useRef } from 'react';
import {
  Globe,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LandingPageView = () => {
  const navigate = useNavigate();
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop', 'tablet', 'mobile'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const iframeRef = useRef(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      iframeRef.current.src = '/';
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'max-w-[390px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Globe size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Public Landing Page
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time live view and customer experience preview of the public website.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Responsive Device Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg font-semibold flex items-center space-x-1 transition ${
                deviceMode === 'desktop'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Desktop Full Width"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>

            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg font-semibold flex items-center space-x-1 transition ${
                deviceMode === 'tablet'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={14} />
              <span className="hidden sm:inline">Tablet</span>
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg font-semibold flex items-center space-x-1 transition ${
                deviceMode === 'mobile'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Mobile View (390px)"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Refresh Frame Button */}
          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
            title="Reload Preview"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>

          {/* Open in New Tab Button */}
          <button
            onClick={() => window.open('/', '_blank')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <span>Open in Tab</span>
            <ExternalLink size={13} />
          </button>

          {/* Visit Live Website Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>Go to Website</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Embedded Live Preview Frame */}
      <div className="flex justify-center transition-all duration-300">
        <div
          className={`${getContainerWidth()} h-[calc(100vh-175px)] min-h-[600px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden relative transition-all duration-300 flex flex-col`}
        >
          {/* Frame Top Bar when in Mobile/Tablet Mode */}
          {deviceMode !== 'desktop' && (
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Globe size={12} className="text-emerald-500" />
                <span>http://localhost:5173/</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                {deviceMode} Preview
              </span>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src="/"
            title="Public Landing Page Live Preview"
            className="w-full flex-1 border-0"
          />
        </div>
      </div>
    </div>
  );
};

export default LandingPageView;
