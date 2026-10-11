import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prompt S6: Global graceful handler for Firestore offline / unavailable / resource-exhausted rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const code = reason?.code;
    const message = reason?.message || '';
    if (
      code === 'unavailable' ||
      code === 'resource-exhausted' ||
      message.includes('unavailable') ||
      message.includes('resource-exhausted') ||
      message.includes('Could not reach Cloud Firestore backend')
    ) {
      // Prevent browser reporting uncaught rejection while operating offline
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('firebase-quota-exhausted'));
      window.dispatchEvent(new CustomEvent('firebase-service-unavailable'));
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
