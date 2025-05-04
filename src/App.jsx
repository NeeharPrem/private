import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useModal } from './contexts/ModalContext';
import ModalManager from './components/common/ModalManager';
import SerialNumberGenerator from './components/SerialNumberGenerator';
import BillDetails from './components/BillDetails';
import UpdateManager from './components/UpdateManager';
import BillingPage from './components/BillingPage';

const AppContent = () => {
  const navigate = useNavigate();
  const { openModal } = useModal();

  useEffect(() => {
    if (!window.electronAPI) return;

    const setupElectronListeners = () => {
      const routeHandlers = [
        { event: 'onOpenBillsPage', path: '/bills', listenerName: 'open-bills-page' },
        { event: 'onOpenUpdaterPage', path: '/updater', listenerName: 'open-updater-page' }
      ];

      if (window.electronAPI.onOpenExportModal) {
        window.electronAPI.onOpenExportModal(() => {
          openModal('EXPORT_IMPORT');
        });
      }

      const cleanup = routeHandlers.map(handler => {
        if (window.electronAPI[handler.event]) {
          try {
            const navigationListener = () => navigate(handler.path);
            window.electronAPI[handler.event](navigationListener);
            return () => {
              if (window.electronAPI.removeAllListeners) {
                window.electronAPI.removeAllListeners(handler.listenerName);
              }
            };
          } catch (error) {
            console.error(`Error setting up ${handler.event} listener:`, error);
            return null;
          }
        }
        return null;
      }).filter(Boolean);

      return () => {
        cleanup.forEach(cleanupFn => cleanupFn());
        if (window.electronAPI.removeAllListeners) {
          window.electronAPI.removeAllListeners('open-export-modal');
        }
      };
    };

    return setupElectronListeners();
  }, [navigate, openModal]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<SerialNumberGenerator />} />
        <Route path="/bills" element={<BillDetails />} />
        <Route path="/updater" element={<UpdateManager />} />
        <Route path="/billing" element={<BillingPage/>}/>
      </Routes>
      <ModalManager />
    </div>
  );
};

function App() {
  return (
      <AppContent />
  );
}

export default App;