import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check } from 'lucide-react';
import { soundManager } from '../utils/audio';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const isAccepted = localStorage.getItem('cookie_accepted');
      if (!isAccepted) {
        // Delay slightly for natural and smooth appearance
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // In case localStorage is blocked by user privacy mode
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('cookie_accepted', 'true');
    } catch {
      // Handle private storage
    }
    soundManager.playClick();
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="cookie-consent-banner"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
        >
          <div className="bg-[#242426] text-[#e0e0e0] border-2 border-[#454547] shadow-[4px_4px_0px_#101011] p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-none">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-none bg-[#333336] border border-[#555558] flex items-center justify-center shrink-0 shadow-inner">
                <Cookie className="w-4 h-4 text-[#e0a84c]" />
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-[#cccccc] font-minecraft select-none">
                Мы используем файлы cookie для улучшения работы сайта.
              </p>
            </div>

            <button
              id="accept-cookie-button"
              onClick={handleAccept}
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-[#3c8527] hover:bg-[#479a2f] active:bg-[#2e681e] text-white text-xs sm:text-[13px] font-bold tracking-wide border-t border-l border-[#5bb73f] border-b-2 border-r-2 border-[#1c4512] shadow-[2px_2px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Принять</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
