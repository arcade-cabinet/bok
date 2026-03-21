import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installGlobalErrorHandler } from '../platform/CapacitorBridge';
import '../main.css';

// Global error handling — no silent failures
installGlobalErrorHandler();

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

createRoot(root).render(<App />);
