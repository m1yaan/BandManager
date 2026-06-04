import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-base)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: '13.5px',
        },
      }}
    />
  </StrictMode>
);