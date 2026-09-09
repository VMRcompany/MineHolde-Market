import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { registerPwaServiceWorker } from './pwaRegister.ts';
import { initNativePwaPrompt } from './utils/nativePwaPrompt.ts';
import './index.css';

// Initialize PWA Service Worker and Native Browser Install Prompt
registerPwaServiceWorker();
initNativePwaPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

