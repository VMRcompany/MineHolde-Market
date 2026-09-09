import React, { useState } from 'react';
import { X, LogIn, User, Shield, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginAsGuest } = useAuth();
  const [loadingType, setLoadingType] = useState<'google' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    soundManager.playClick();
    setError(null);
    setLoadingType('google');
    try {
      await loginWithGoogle();
      soundManager.playLevelUp();
      onClose();
    } catch (err: any) {
      console.error('Google login failed:', err);
      setError(err?.message || 'Не удалось выполнить вход через Google. Попробуйте еще раз.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleGuestLogin = () => {
    soundManager.playClick();
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div
        id="login-modal"
        className="mc-panel w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150 relative shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#3e3f42] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#3c8527] border-2 border-[#82d458] border-b-[#1e4513] border-r-[#1e4513] flex items-center justify-center shadow-md">
              <LogIn className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Вход в аккаунт
              </h3>
              <p className="text-[11px] text-[#9a9a9e]">MineHolde Market</p>
            </div>
          </div>
          <button
            id="close-login-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray px-2 py-0.5 text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[#2a1717] border-2 border-[#8f2b2b] text-xs text-[#ffb4b4] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#a0a0a5] mb-5 leading-relaxed">
          Выберите вариант входа для доступа к персональному профилю и синхронизации ваших покупок, списка желаемого, скачанных скин-паков и баланса коинов:
        </p>

        {/* Options */}
        <div className="space-y-3.5 mb-6">
          {/* Google Sign In Option */}
          <button
            id="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={loadingType !== null}
            className="w-full bg-[#2a2a2d] hover:bg-[#34353a] text-white p-3.5 border-2 border-[#555] hover:border-[#82d458] flex items-center justify-between transition-all group active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {/* Google G SVG */}
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center p-1 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-full h-full">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white group-hover:text-[#a4f576] transition-colors">
                  Войти с помощью Google
                </div>
                <div className="text-[11px] text-[#8e8e93]">
                  Синхронизация на всех ваших устройствах
                </div>
              </div>
            </div>
            {loadingType === 'google' ? (
              <Loader2 className="w-5 h-5 text-[#82d458] animate-spin" />
            ) : (
              <span className="text-xs bg-[#3c8527] text-white px-2.5 py-1 font-bold">
                Выбрать
              </span>
            )}
          </button>

          {/* Guest Login Option */}
          <button
            id="login-guest-btn"
            onClick={handleGuestLogin}
            disabled={loadingType !== null}
            className="w-full bg-[#202022] hover:bg-[#28292c] text-white p-3.5 border-2 border-[#444] hover:border-[#aaa] flex items-center justify-between transition-all group active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-[#3a3a3e] border border-[#555] flex items-center justify-center text-[#ccc]">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white group-hover:text-[#ddd] transition-colors">
                  Продолжить как гость
                </div>
                <div className="text-[11px] text-[#8e8e93]">
                  Быстрый вход без привязки учетной записи
                </div>
              </div>
            </div>
            {loadingType === 'guest' ? (
              <Loader2 className="w-5 h-5 text-[#aaa] animate-spin" />
            ) : (
              <span className="text-xs bg-[#444] text-[#ddd] px-2.5 py-1 font-bold group-hover:bg-[#555]">
                Гость
              </span>
            )}
          </button>
        </div>

        {/* Sync features list */}
        <div className="p-3 bg-[#171719] border border-[#2b2b2e] mb-4 space-y-1.5 text-[11px] text-[#8e8e93]">
          <div className="text-[#a0a0a5] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#82d458]" />
            <span>Преимущества аккаунта MineHolde:</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
            <span>Синхронизация инвентаря и купленного контента</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
            <span>Синхронизация списка желаемого</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
            <span>Сохранение скачанных скин-паков и дополнений</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#82d458] flex-shrink-0" />
            <span>Синхронизация баланса MineHolde Coins</span>
          </div>
        </div>

        {/* Cancel */}
        <div className="text-center">
          <button
            id="cancel-login-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray px-6 py-1.5 text-xs font-bold"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
