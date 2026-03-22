import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { App } from './App';
import { installGlobalErrorHandler } from './globalErrorHandler';
import { setupAudioResumeOnGesture } from '../audio/AudioResume.ts';
import '../main.css';

// Global error handling — catches uncaught errors and unhandled rejections
installGlobalErrorHandler();

// Resume audio context on first user gesture (mobile browser policy)
setupAudioResumeOnGesture();

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
