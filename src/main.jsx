import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import { HashRouter } from 'react-router-dom';
import { ModalProvider } from './contexts/ModalContext';

Modal.setAppElement('#root');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ModalProvider>
        <App />
        <ToastContainer />
      </ModalProvider>
    </HashRouter>
  </React.StrictMode>
);