import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import baseConfig from '../../firebase-applet-config.json';

// Enforce required authDomain for browser client OAuth
export const firebaseConfig = {
  ...baseConfig,
  authDomain: 'mineral-equator-qnzsc.firebaseapp.com',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Dedicated Google Auth Provider (uses new GoogleAuthProvider())
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Dedicated Yandex ID OpenID Connect Provider (uses new OAuthProvider('oidc.yandex'))
export const yandexProvider = new OAuthProvider('oidc.yandex');
yandexProvider.addScope('login:email');
yandexProvider.addScope('login:info');
yandexProvider.addScope('login:avatar');
yandexProvider.setCustomParameters({
  client_id: '72241f9c1bc64f65b650ae8a5140b9b5',
  response_type: 'code',
  force_confirm: 'yes',
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export default app;
