import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Fingerprint,
  Coins,
  Package,
  Heart,
  Download,
  LogOut,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAuth, UserProfileData } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInventory: () => void;
  onOpenWishlist: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenInventory,
  onOpenWishlist,
}) => {
  const { user, profile, isGuest, logout } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen || !user) return null;

  // Fallback profile if Firestore is still syncing
  const activeProfile: UserProfileData = profile || {
    id: user.uid,
    email: user.email,
    displayName: user.displayName || (user.isAnonymous ? 'Гостевой игрок' : 'Пользователь'),
    firstName: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Игрок',
    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
    photoURL: user.photoURL,
    coins: 0,
    inventory: ['item-anniversary-celebration'],
    wishlist: ['item-dragon-riders'],
    downloadedPacks: [],
    isAnonymous: user.isAnonymous,
    isVip: user.email?.toLowerCase() === 'vovaryzanov2@gmail.com' || user.email?.toLowerCase() === 'vovaryzanov5@gmail.com',
    isAdmin: user.email?.toLowerCase() === 'vovaryzanov2@gmail.com' || user.email?.toLowerCase() === 'vovaryzanov5@gmail.com',
    syncDegree: '100% Real-Time Cloud Engine',
    createdAt: new Date().toISOString(),
  };

  const handleCopyId = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(activeProfile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    soundManager.playClick();
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs">
      <div
        id="account-profile-modal"
        className="mc-panel w-full max-w-lg p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150 relative shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#3e3f42] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#3c8527] border-2 border-[#82d458] border-b-[#1e4513] border-r-[#1e4513] flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Аккаунт MineHolde
              </h3>
              <p className="text-[11px] text-[#9a9a9e]">
                {isGuest ? 'Гостевая сессия' : 'Подключен через Google'}
              </p>
            </div>
          </div>
          <button
            id="close-account-modal-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-gray px-2 py-0.5 text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className={`mc-panel-dark p-4 mb-5 border-2 ${
          activeProfile.isVip ? 'border-[#55ff55] bg-[#172619]' : 'border-[#3c8527]'
        } relative overflow-hidden`}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {activeProfile.photoURL ? (
                <img
                  src={activeProfile.photoURL}
                  referrerPolicy="no-referrer"
                  alt={activeProfile.displayName || 'MineHolde Avatar'}
                  className={`w-16 h-16 rounded-full border-2 ${
                    activeProfile.isVip ? 'border-[#55ff55]' : 'border-[#82d458]'
                  } shadow-md object-cover`}
                  onError={(e) => {
                    // Fallback to Steve / initials if Google avatar cannot be loaded
                    e.currentTarget.style.display = 'none';
                    const fallbackEl = document.getElementById('account-modal-avatar-fallback');
                    if (fallbackEl) fallbackEl.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                id="account-modal-avatar-fallback"
                style={{ display: activeProfile.photoURL ? 'none' : 'flex' }}
                className={`w-16 h-16 rounded-full ${
                  activeProfile.isVip ? 'bg-[#1b4d21] text-[#55ff55] border-[#55ff55]' : 'bg-[#2c2d30] text-white border-[#82d458]'
                } border-2 items-center justify-center text-xl font-bold shadow-md`}
              >
                {activeProfile.firstName ? activeProfile.firstName.charAt(0).toUpperCase() : 'M'}
              </div>
              {/* Online status indicator */}
              <div
                className="w-4 h-4 rounded-full bg-[#499e30] border-2 border-[#1c1d1f] absolute -bottom-0.5 -right-0.5 shadow"
                title="В сети"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-bold text-white truncate">
                  {activeProfile.displayName || 'Пользователь MineHolde'}
                </span>
                {activeProfile.isVip && (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#55ff55] text-black rounded font-mono shadow-sm">
                    👑 VIP ПЛАН
                  </span>
                )}
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.2 border ${
                    isGuest
                      ? 'bg-[#555] text-white border-[#777]'
                      : 'bg-[#3c8527] text-white border-[#82d458]'
                  }`}
                >
                  {isGuest ? 'Гость' : 'Google Auth'}
                </span>
              </div>

              {activeProfile.email && (
                <div className="text-xs text-[#9a9a9e] flex items-center gap-1.5 mt-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#777] flex-shrink-0" />
                  <span className="truncate font-mono">{activeProfile.email}</span>
                </div>
              )}

              {/* MineHolde Coins Balance */}
              <div className={`mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 border ${
                activeProfile.isVip
                  ? 'bg-[#0f1f12] border-[#55ff55] text-[#55ff55]'
                  : 'bg-[#18181a] border-[#a16f03] text-[#ffe066]'
              }`}>
                <div className="w-4 h-4 bg-[#f4b810] border border-[#a16f03] flex items-center justify-center">
                  <div className="w-1 h-1 bg-[#5b3c00]" />
                </div>
                <span className="text-xs font-bold font-mono">
                  {activeProfile.isVip
                    ? 'Баланс: ∞ MineHolde Coins (VIP Безлимит)'
                    : `Баланс: ${activeProfile.coins.toLocaleString()} MineHolde Coins`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* VIP Synchronization Degree Status Card */}
        {activeProfile.isVip && (
          <div className="mc-panel-dark p-3 mb-5 border-2 border-[#55ff55]/60 bg-[#122315] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#55ff55] flex items-center gap-1.5 uppercase tracking-wide">
                <RefreshCw className="w-3.5 h-3.5 text-[#55ff55] animate-spin" style={{ animationDuration: '4s' }} />
                Высшая степень синхронизации
              </span>
              <span className="text-[10px] bg-[#55ff55]/20 text-[#55ff55] px-1.5 py-0.2 rounded border border-[#55ff55]/40 font-mono font-bold">
                100% REAL-TIME ULTRA
              </span>
            </div>
            <p className="text-[11px] text-[#a4f576]/80 leading-relaxed">
              Для вашего аккаунта активен максимальный приоритет облачной синхронизации Firestore: мгновенная передача покупок, инвентаря и сохранений между устройствами с нулевой задержкой.
            </p>
          </div>
        )}

        {/* Detailed User Data Fields */}
        <div className="space-y-2.5 mb-5 text-xs">
          <div className="text-[11px] font-bold text-[#a0a0a5] uppercase tracking-wider mb-1">
            Данные аккаунта:
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-2">
            <div className="mc-panel-dark p-2.5 border border-[#333]">
              <div className="text-[10px] text-[#777] uppercase font-bold">Имя</div>
              <div className="text-white font-medium text-xs mt-0.5">
                {activeProfile.firstName || 'Не указано'}
              </div>
            </div>
            <div className="mc-panel-dark p-2.5 border border-[#333]">
              <div className="text-[10px] text-[#777] uppercase font-bold">Фамилия</div>
              <div className="text-white font-medium text-xs mt-0.5">
                {activeProfile.lastName || 'Не указана'}
              </div>
            </div>
          </div>

          {/* User ID with Copy button */}
          <div className="mc-panel-dark p-2.5 border border-[#333] flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-[#777] uppercase font-bold flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-[#82d458]" />
                <span>Уникальный ID аккаунта:</span>
              </div>
              <div className="text-[#a4f576] font-mono text-[11px] truncate mt-0.5">
                {activeProfile.id}
              </div>
            </div>
            <button
              id="copy-account-id-btn"
              onClick={handleCopyId}
              className="mc-button-gray px-2 py-1 text-[10px] flex items-center gap-1 flex-shrink-0"
              title="Скопировать ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3 h-3 text-[#82d458]" />
                  <span className="text-[#82d458]">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Summary Quick Nav Grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div
            onClick={() => {
              soundManager.playChest();
              onClose();
              onOpenInventory();
            }}
            className="mc-panel-dark p-2.5 text-center border border-[#333] hover:border-[#82d458] cursor-pointer transition-colors"
          >
            <Package className="w-4 h-4 text-[#82d458] mx-auto mb-1" />
            <div className="text-sm font-bold text-white">{activeProfile.inventory.length}</div>
            <div className="text-[10px] text-[#8e8e93]">Инвентарь</div>
          </div>

          <div
            onClick={() => {
              soundManager.playClick();
              onClose();
              onOpenWishlist();
            }}
            className="mc-panel-dark p-2.5 text-center border border-[#333] hover:border-[#ff5c5c] cursor-pointer transition-colors"
          >
            <Heart className="w-4 h-4 text-[#ff5c5c] mx-auto mb-1" />
            <div className="text-sm font-bold text-white">{activeProfile.wishlist.length}</div>
            <div className="text-[10px] text-[#8e8e93]">Желаемое</div>
          </div>

          <div className="mc-panel-dark p-2.5 text-center border border-[#333]">
            <Download className="w-4 h-4 text-[#4fa3ff] mx-auto mb-1" />
            <div className="text-sm font-bold text-white">
              {activeProfile.downloadedPacks?.length || 0}
            </div>
            <div className="text-[10px] text-[#8e8e93]">Скачано</div>
          </div>
        </div>

        {/* Downloaded Packs Sync History */}
        {activeProfile.downloadedPacks && activeProfile.downloadedPacks.length > 0 && (
          <div className="mb-5">
            <div className="text-[11px] font-bold text-[#a0a0a5] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Синхронизированные загрузки скинпаков:</span>
              <span className="text-[#82d458] font-normal">
                {activeProfile.downloadedPacks.length} паков
              </span>
            </div>
            <div className="mc-panel-dark p-2 max-h-28 overflow-y-auto space-y-1 divide-y divide-[#2a2a2d]">
              {activeProfile.downloadedPacks.slice(0, 10).map((pack, idx) => (
                <div key={idx} className="pt-1 first:pt-0 flex items-center justify-between text-xs">
                  <span className="text-white truncate max-w-[240px]">{pack.title}</span>
                  <span className="text-[10px] text-[#777]">
                    {new Date(pack.downloadedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout & Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#333]">
          <button
            id="account-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mc-button-gray px-3 py-1.5 text-xs font-bold text-[#ff8787] hover:text-white hover:bg-[#7a2828] flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}</span>
          </button>

          <button
            id="close-account-modal-bottom-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="mc-button-green px-5 py-1.5 text-xs font-bold text-white"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
