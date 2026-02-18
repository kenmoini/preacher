import './index.css';
import { createRoot } from 'react-dom/client';
import App from './renderer/App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
