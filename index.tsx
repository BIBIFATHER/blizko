import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setStorageAdapter } from "./src/core/platform/storage";
import { webStorageAdapter } from "./src/web/platform/storage.web";




// Set web platform adapters (Expo will provide native adapters later)
setStorageAdapter(webStorageAdapter);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);