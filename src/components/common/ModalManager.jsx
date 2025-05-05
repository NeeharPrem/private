import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import ExportImportModal from '../DataExport';
import CancelModal from './modal/CancelModal';
import PriceManagement from '../PriceManangement';

const ModalManager = () => {
    const { modalState } = useModal();

    const renderModal = () => {
        switch (modalState.type) {
            case 'EXPORT_IMPORT':
                return <ExportImportModal />;
            case 'CANCEL_BUTTON':
                return <CancelModal />;
            case 'PRICE_MANAGEMENT':
                return <PriceManagement />; 
            default:
                return null;
        }
    };
    

    return renderModal(); 
};

export default ModalManager;