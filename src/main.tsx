import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle and suppress cross-origin "Script error." which commonly arises 
// from third-party scripts (like Firebase Auth iframes or Google API clients)
// running in a sandboxed iframe environment.
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || !event.filename) {
    event.preventDefault();
    console.warn('Suppressed cross-origin Script error:', event);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Log but prevent crashing the sandboxed environment for external API/auth rejections
  const reason = event.reason?.message || event.reason;
  if (typeof reason === 'string' && (reason.includes('Script error') || reason.includes('auth/'))) {
    event.preventDefault();
    console.warn('Suppressed unhandled promise rejection:', event.reason);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
