import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Universal OAuthProvider for Yandex ID
export const yandexProvider = new OAuthProvider('oidc.yandex');
yandexProvider.addScope('login:email');
yandexProvider.addScope('login:info');
yandexProvider.addScope('login:avatar');

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export default app;
