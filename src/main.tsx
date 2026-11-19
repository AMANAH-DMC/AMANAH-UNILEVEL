import React from 'react';
import { createRoot } from 'react-dom/client';
import AmanahApp from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root was not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <AmanahApp />
  </React.StrictMode>,
);
