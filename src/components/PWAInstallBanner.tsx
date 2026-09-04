import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';

interface PWAInstallBannerProps {
  appName?: string;
  appDescription?: string;
  iconSrc?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  appName = 'MineHolde Market',
  appDescription = 'Каталог модов, текстур и миров прямо на главном экране. Быстрый запуск в один клик и мгновенная работа.',
  iconSrc = '/icons/icon-192x192.png',
}) => {
  const {
    isOpen,
    isIOS,
    isStandalone,
    isInstalled,
    handleInstallClick,
    handleDismiss,
  } = usePWAInstallPrompt();

  // If already installed as standalone app, don't show the prompt
  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <aside
          id="pwa-install-bottom-sheet"
          aria-label="Установка веб-приложения"
          className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-4 pointer-events-none flex justify-center"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="pointer-events-auto w-full max-w-lg bg-[#202022]/95 border border-[#3e3e42] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-[#ececed] relative overflow-hidden"
            style={{
              boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Ambient emerald light accent */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#3c8527]/25 rounded-full blur-3xl pointer-events-none" />

            {/* Mobile Sheet grab handle */}
            <div className="w-10 h-1 bg-[#4a4a4e] rounded-full mx-auto mb-3 sm:hidden" />

            {/* Header Content */}
            <div className="flex items-start gap-3.5">
              {/* App Icon */}
              <div className="relative flex-shrink-0">
                <img
                  src={iconSrc}
                  alt={appName}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover bg-[#2b2b2e] border border-[#48484d] shadow-md ring-1 ring-black/40"
                  onError={(e) => {
                    // Fallback to SVG icon
                    (e.target as HTMLImageElement).src = '/icons/icon.svg';
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-[#3c8527] border-2 border-[#202022] rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-[15px] sm:text-base font-bold text-white tracking-wide truncate">
                    {appName}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#85e05a] bg-[#3c8527]/20 border border-[#3c8527]/40 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-2.5 h-2.5" /> PWA
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#b5b5ba] leading-snug line-clamp-2">
                  {appDescription}
                </p>
              </div>

              {/* Close / Dismiss Button */}
              <button
                id="btn-pwa-close"
                type="button"
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-[#8e8e93] hover:text-white hover:bg-[#343438] transition-colors"
                aria-label="Закрыть уведомление"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="mt-4 pt-3 border-t border-[#343438] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {isIOS ? (
                /* iOS Safari installation guide */
                <div className="w-full flex items-center gap-2 bg-[#2a2a2e] border border-[#3a3a3e] rounded-xl px-3 py-2 text-xs text-[#cfcfd4]">
                  <span className="text-[#8e8e93]">1. Нажмите</span>
                  <span className="p-1 bg-[#38383e] rounded text-[#60a5fa] inline-flex items-center">
                    <Share2 className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[#8e8e93]">2. Выберите</span>
                  <span className="font-semibold text-white inline-flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-[#3c8527]" /> «На экран «Домой»»
                  </span>
                </div>
              ) : (
                /* Native prompt button for Android / Chrome / Edge */
                <>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#9d9da3]">
                    <span>⚡ Мгновенный запуск без браузерной строки</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      id="btn-pwa-dismiss"
                      type="button"
                      onClick={handleDismiss}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-medium text-[#9d9da3] hover:text-white bg-transparent hover:bg-[#2e2e33] transition-colors"
                    >
                      Не сейчас
                    </button>

                    <button
                      id="btn-pwa-install"
                      type="button"
                      onClick={handleInstallClick}
                      className="flex-2 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#3c8527] hover:bg-[#489f2f] active:scale-[0.98] border border-[#5cb838] shadow-[0_4px_14px_rgba(60,133,39,0.35)] transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Установить
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
};
