import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Save, RefreshCw, X, Coins, Plus, Trash2, Key, CheckCircle } from 'lucide-react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, isAdminUser } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateCoins } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetCoins, setTargetCoins] = useState<number>(10000);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAuthorizedAdmin = user && isAdminUser(user.email);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setUsersList(list);
    } catch (e: any) {
      console.warn('Could not fetch full users collection:', e);
      if (profile) {
        setUsersList([profile]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthorizedAdmin) {
      loadUsers();
    }
  }, [isOpen, isAuthorizedAdmin]);

  if (!isOpen || !isAuthorizedAdmin) return null;

  const handleGrantCoins = async (userId: string, amount: number) => {
    soundManager.playClick();
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        coins: amount,
        updatedAt: new Date().toISOString(),
      });
      if (user?.uid === userId) {
        await updateCoins(amount);
      }
      setStatusMessage(`Баланс пользователя успешно обновлен: ${amount} MineCoins!`);
      await loadUsers();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(`Ошибка обновления: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#1e2329] border-2 border-[#55ff55] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#14181c] border-b border-[#333d47]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#55ff55]/10 rounded-lg border border-[#55ff55]/30">
              <ShieldCheck className="w-6 h-6 text-[#55ff55]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Панель Администратора Firebase
                <span className="text-xs px-2 py-0.5 rounded bg-[#55ff55]/20 text-[#55ff55] font-mono border border-[#55ff55]/40">
                  ROOT ADMIN
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Администратор: <span className="text-[#55ff55] font-semibold">{user?.email || 'vovaryzanov2@gmail.com'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-200">
          {/* Status Alert */}
          {statusMessage && (
            <div className="p-3 bg-[#55ff55]/10 border border-[#55ff55]/40 rounded-lg text-[#55ff55] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Action: Add Coins to Current Admin */}
          <div className="p-4 bg-[#181d22] border border-[#333d47] rounded-lg space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Быстрое начисление MineCoins администратору
            </h3>
            <p className="text-xs text-gray-400">
              Мгновенно запишет выбранную сумму на ваш аккаунт в базе Firestore:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => user && handleGrantCoins(user.uid, 5000)}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                + 5,000 Coins
              </button>
              <button
                onClick={() => user && handleGrantCoins(user.uid, 25000)}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                + 25,000 Coins
              </button>
              <button
                onClick={() => user && handleGrantCoins(user.uid, 100000)}
                className="px-4 py-2 bg-yellow-500/30 hover:bg-yellow-500/40 border border-yellow-500/60 text-yellow-200 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                + 100,000 Coins (Бесконечность)
              </button>
            </div>
          </div>

          {/* Users in Firestore Database */}
          <div className="p-4 bg-[#181d22] border border-[#333d47] rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#55ff55]" />
                Пользователи Firestore (Коллекция: /users)
              </h3>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 rounded border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>

            <div className="space-y-2">
              {usersList.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-black/20 rounded">
                  {loading ? 'Загрузка профилей...' : 'Нет зарегистрированных пользователей.'}
                </div>
              ) : (
                usersList.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 bg-black/30 border border-[#333d47] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{u.displayName || u.email || 'Игрок'}</span>
                        {isAdminUser(u.email) && (
                          <span className="text-[10px] bg-[#55ff55]/20 text-[#55ff55] border border-[#55ff55]/40 px-1.5 py-0.5 rounded font-mono font-bold">
                            👑 ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">UID: {u.id}</div>
                      <div className="text-xs text-gray-400">Почта: {u.email || 'Не указана (Гость)'}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Баланс:</div>
                        <div className="font-bold text-yellow-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          {u.coins ?? 0}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGrantCoins(u.id, (u.coins || 0) + 1000)}
                          className="px-2.5 py-1.5 bg-[#55ff55]/20 hover:bg-[#55ff55]/30 text-[#55ff55] text-xs font-bold rounded border border-[#55ff55]/40 transition-colors"
                          title="Добавить 1,000 монет"
                        >
                          +1k
                        </button>
                        <button
                          onClick={() => handleGrantCoins(u.id, (u.coins || 0) + 10000)}
                          className="px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold rounded border border-yellow-500/40 transition-colors"
                          title="Добавить 10,000 монет"
                        >
                          +10k
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Database Info & Authorized Domains */}
          <div className="p-4 bg-black/40 border border-[#333d47] rounded-lg text-xs text-gray-400 space-y-2 font-mono">
            <div className="flex items-center justify-between border-b border-[#333d47] pb-2">
              <span className="font-bold text-[#55ff55]">⚙️ Конфигурация Firebase & Авторизованные домены</span>
              <span className="text-[10px] text-gray-400">Project: hostingvidgets</span>
            </div>
            <div>🔥 Firebase Project ID: <span className="text-gray-200">hostingvidgets</span></div>
            <div>🗄️ Firestore Database: <span className="text-gray-200">(default) Cloud Firestore</span></div>
            <div>👑 Администратор: <span className="text-[#55ff55]">{user?.email}</span></div>
            
            <div className="pt-2 border-t border-[#333d47] space-y-1">
              <div className="text-white font-sans font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#55ff55]" />
                Разрешенные домены авторизации (Firebase Auth Authorized Domains):
              </div>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                <span className="px-2 py-0.5 bg-[#55ff55]/10 text-[#55ff55] border border-[#55ff55]/30 rounded">
                  market.mineholde.pro
                </span>
                <span className="px-2 py-0.5 bg-[#55ff55]/10 text-[#55ff55] border border-[#55ff55]/30 rounded">
                  marketplace.mineholde.pro
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                  localhost
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-sans pt-1">
                Для активации входа через Google на ваших доменах перейдите в 
                <a 
                  href="https://console.firebase.google.com/project/hostingvidgets/authentication/settings" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[#55ff55] underline ml-1 hover:text-white"
                >
                  Firebase Console → Authentication → Settings → Authorized domains
                </a> 
                и добавьте эти адреса.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#14181c] border-t border-[#333d47] flex justify-end">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
