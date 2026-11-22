import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as {message?: string; stack?: string} | undefined;
    const msg = typeof reason?.message === 'string' ? reason.message : '';
    const stack = typeof reason?.stack === 'string' ? reason.stack : '';
    if (
      stack.includes('chrome-extension://') ||
      msg.includes('Failed to connect to MetaMask')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
