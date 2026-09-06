import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { SkinPreview } from '../types';

export const ADMIN_EMAILS = [
  'vovaryzanov2@gmail.com',
  'vovaryzanov5@gmail.com',
];

export const VIP_EMAILS = [
  'vovaryzanov5@gmail.com',
  'vovaryzanov2@gmail.com',
];

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function isVipUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return VIP_EMAILS.includes(email.toLowerCase().trim());
}

export interface UserProfileData {
  id: string;
  email: string | null;
  displayName: string | null;
  firstName: string;
  lastName: string;
  photoURL: string | null;
  coins: number;
  inventory: string[];
  wishlist: string[];
  downloadedPacks: {
    id: string;
    title: string;
    type: string;
    downloadedAt: string;
  }[];
  isAnonymous: boolean;
  isVip?: boolean;
  isAdmin?: boolean;
  syncDegree?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isVip: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateCoins: (newAmount: number) => Promise<void>;
  addToInventory: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  recordDownloadedPack: (pack: { id: string; title: string; type: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to parse first/last names
  const parseNames = (displayName: string | null, email: string | null) => {
    if (displayName) {
      const parts = displayName.trim().split(' ');
      const firstName = parts[0] || 'Пользователь';
      const lastName = parts.slice(1).join(' ') || '';
      return { firstName, lastName };
    }
    if (email) {
      const namePart = email.split('@')[0];
      return { firstName: namePart, lastName: '' };
    }
    return { firstName: 'Гость', lastName: 'MineHolde' };
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        const userIsVip = isVipUser(currentUser.email);
        const userIsAdmin = isAdminUser(currentUser.email);
        const { firstName, lastName } = parseNames(currentUser.displayName, currentUser.email);
        const syncDegree = userIsVip
          ? 'ВЫСШАЯ СТЕПЕНЬ (100% Real-Time Cloud Engine • 0ms)'
          : 'Стандартная синхронизация';

        // Immediately populate profile with authenticated user credentials
        const instantProfile: UserProfileData = {
          id: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Гостевой игрок' : 'Пользователь'),
          firstName,
          lastName,
          photoURL: currentUser.photoURL,
          coins: userIsVip ? 999999999 : 0,
          inventory: ['item-anniversary-celebration'],
          wishlist: ['item-dragon-riders'],
          downloadedPacks: [],
          isAnonymous: currentUser.isAnonymous,
          isVip: userIsVip,
          isAdmin: userIsAdmin,
          syncDegree,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        setProfile(instantProfile);
        setLoading(false);

        // Real-time synchronization across devices via Firestore onSnapshot
        try {
          const userRef = doc(db, 'users', currentUser.uid);

          unsubscribeDoc = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile((prev) => ({
                  ...(prev || instantProfile),
                  ...data,
                  id: currentUser.uid,
                  email: currentUser.email,
                  displayName: currentUser.displayName || data.displayName || (currentUser.isAnonymous ? 'Гостевой игрок' : 'Пользователь'),
                  firstName: data.firstName || prev?.firstName || firstName,
                  lastName: data.lastName || prev?.lastName || lastName,
                  photoURL: currentUser.photoURL || data.photoURL || null,
                  coins: userIsVip ? 999999999 : (typeof data.coins === 'number' ? data.coins : (prev?.coins ?? 0)),
                  inventory: Array.isArray(data.inventory) ? data.inventory : (prev?.inventory || []),
                  wishlist: Array.isArray(data.wishlist) ? data.wishlist : (prev?.wishlist || []),
                  downloadedPacks: Array.isArray(data.downloadedPacks) ? data.downloadedPacks : (prev?.downloadedPacks || []),
                  isAnonymous: currentUser.isAnonymous,
                  isVip: userIsVip,
                  isAdmin: userIsAdmin,
                  syncDegree,
                  createdAt: data.createdAt || prev?.createdAt,
                  lastLoginAt: data.lastLoginAt || prev?.lastLoginAt,
                }));
              } else {
                // Initialize user document in Firestore in background
                setDoc(userRef, {
                  ...instantProfile,
                  updatedAt: new Date().toISOString(),
                }, { merge: true }).catch((err) => {
                  console.warn('Firestore initial sync notice:', err);
                });
              }
              setLoading(false);
            },
            (error) => {
              console.warn('Firestore real-time subscription notice (using robust local profile):', error);
              setLoading(false);
            }
          );
        } catch (dbErr) {
          console.warn('Firestore init catch:', dbErr);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Google Login
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setLoading(false);
      throw err;
    }
  };

  // Guest Login (Anonymous)
  const loginAsGuest = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Guest Sign In Error:', err);
      setLoading(false);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      setUser(null);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      throw err;
    }
  };

  // Synchronized updates
  const updateCoins = async (newAmount: number) => {
    if (!user) return;
    if (isVipUser(user.email)) {
      // VIP users maintain infinite coins
      return;
    }
    const validAmount = Math.max(0, newAmount);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: validAmount,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to update coins in cloud:', e);
    }
  };

  const addToInventory = async (productId: string) => {
    if (!user || !profile) return;
    if (profile.inventory.includes(productId)) return;
    const newInventory = [...profile.inventory, productId];
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        inventory: newInventory,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to update inventory in cloud:', e);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user || !profile) return;
    const isPresent = profile.wishlist.includes(productId);
    const newWishlist = isPresent
      ? profile.wishlist.filter((id) => id !== productId)
      : [...profile.wishlist, productId];
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        wishlist: newWishlist,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to update wishlist in cloud:', e);
    }
  };

  const recordDownloadedPack = async (pack: { id: string; title: string; type: string }) => {
    if (!user || !profile) return;
    const existing = profile.downloadedPacks || [];
    const updated = [
      {
        id: pack.id,
        title: pack.title,
        type: pack.type,
        downloadedAt: new Date().toISOString(),
      },
      ...existing.filter((p) => p.id !== pack.id),
    ].slice(0, 50);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        downloadedPacks: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to record downloaded pack in cloud:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest: !!user?.isAnonymous,
        isAdmin: isAdminUser(user?.email),
        isVip: isVipUser(user?.email),
        loginWithGoogle,
        loginAsGuest,
        logout,
        updateCoins,
        addToInventory,
        toggleWishlist,
        recordDownloadedPack,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
