import React, { useState, useRef } from 'react';
import { Upload, Loader2, Check, AlertCircle, Download, X } from 'lucide-react';
import { getAllBillData, importBillData } from './helpers/billsdb';
import { getAllTickets,restoreTickets } from './helpers/indexdb'
import { useModal } from '../contexts/ModalContext';

const ExportImportModal = () => {
    const { openModal,closeModal } = useModal();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({
        success: false,
        error: false,
        message: '',
        type: ''
    });
    const fileInputRef = useRef(null);

    const handleExport = async () => {
        setLoading(true);
        setStatus({ success: false, error: false, message: '', type: '' });
        try {
            const data = await getAllBillData();
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bill_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({
                success: true,
                error: false,
                message: 'Bill data exported successfully',
                type: 'export'
            });
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: 'Failed to export bill data',
                type: 'export'
            });
        } finally {
            setLoading(false);
        }
    };
    console.log(openModal)
    const handleExportTickets = async () => {
        setLoading(true);
        setStatus({ success: false, error: false, message: '', type: '' });
        try {
            const data = await getAllTickets();
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ticket_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({
                success: true,
                error: false,
                message: 'Tickets data exported successfully',
                type: 'export'
            });
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: 'Failed to export data',
                type: 'export'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus({ success: false, error: false, message: '', type: '' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = await importBillData(e.target.result);
                    setStatus({
                        success: true,
                        error: false,
                        message: result.message,
                        type: 'import'
                    });
                } catch (error) {
                    setStatus({
                        success: false,
                        error: true,
                        message: error.message || 'Failed to import data',
                        type: 'import'
                    });
                } finally {
                    setLoading(false);
                }
            };

            reader.onerror = () => {
                setStatus({
                    success: false,
                    error: true,
                    message: 'Error reading file',
                    type: 'import'
                });
                setLoading(false);
            };

            reader.readAsText(file);
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: 'Failed to process file',
                type: 'import'
            });
            setLoading(false);
        }
    };

    const handleTicketImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus({ success: false, error: false, message: '', type: '' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const tickets = JSON.parse(e.target.result);
                    if (!Array.isArray(tickets)) {
                        throw new Error('Invalid data format: Expected an array of tickets');
                    }
                    const result = await restoreTickets(tickets);
                    setStatus({
                        success: true,
                        error: false,
                        message: result.message,
                        type: 'import'
                    });
                } catch (error) {
                    setStatus({
                        success: false,
                        error: true,
                        message: error.message || 'Failed to import data',
                        type: 'import'
                    });
                } finally {
                    setLoading(false);
                }
            };

            reader.onerror = () => {
                setStatus({
                    success: false,
                    error: true,
                    message: 'Error reading file',
                    type: 'import'
                });
                setLoading(false);
            };

            reader.readAsText(file);
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: 'Failed to process file',
                type: 'import'
            });
            setLoading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (!openModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="w-full max-w-3xl mx-4 bg-white rounded-lg shadow-lg">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
                    <button
                        onClick={closeModal}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">Export Bill Data</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Download your bill data as a JSON file.
                            </p>
                            <button
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors
                                    ${loading && status.type === 'export' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleExport}
                                disabled={loading && status.type === 'export'}
                            >
                                {loading && status.type === 'export' ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5 mr-2" />
                                )}
                                {loading && status.type === 'export' ? 'Exporting...' : 'Export Bills'}
                            </button>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">Export Tickets</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Download your Ticket data as a JSON file.
                            </p>
                            <button
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors
                                    ${loading && status.type === 'export' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleExportTickets}
                                disabled={loading && status.type === 'export'}
                            >
                                {loading && status.type === 'export' ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5 mr-2" />
                                )}
                                {loading && status.type === 'export' ? 'Exporting...' : 'Export Tickets'}
                            </button>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">Import Bill</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Restore your bill data from JSON file.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".json"
                                className="hidden"
                            />
                            <button
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors
                                    ${loading && status.type === 'import' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={triggerFileInput}
                                disabled={loading && status.type === 'import'}
                            >
                                {loading && status.type === 'import' ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-5 h-5 mr-2" />
                                )}
                                {loading && status.type === 'import' ? 'Importing...' : 'Import Bills'}
                            </button>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">Import Tickets</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Restore your Tickets data from a JSON file.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleTicketImport}
                                accept=".json"
                                className="hidden"
                            />
                            <button
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors
                                    ${loading && status.type === 'import' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={triggerFileInput}
                                disabled={loading && status.type === 'import'}
                            >
                                {loading && status.type === 'import' ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-5 h-5 mr-2" />
                                )}
                                {loading && status.type === 'import' ? 'Importing...' : 'Import Tickets'}
                            </button>
                        </div>
                    </div>
                    {status.success && (
                        <div className="flex items-center p-4 rounded-md bg-green-50 border border-green-200">
                            <Check className="h-4 w-4 text-green-600 mr-2" />
                            <p className="text-green-700">{status.message}</p>
                        </div>
                    )}

                    {status.error && (
                        <div className="flex items-center p-4 rounded-md bg-red-50 border border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                            <p className="text-red-700">{status.message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportImportModal;