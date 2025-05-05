import React, { useState, useEffect } from 'react';
import { Loader2, Check, AlertCircle, X, Plus, Edit, Trash2 } from 'lucide-react';
import { 
  addPrice, 
  deletePrice, 
  getAllPrices, 
  updatePrice 
} from './helpers/pricedb';
import { useModal } from '../contexts/ModalContext';

const PriceManagement = () => {
    const { openModal, closeModal } = useModal();
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState([]);
    const [status, setStatus] = useState({
        success: false,
        error: false,
        message: '',
    });
    const [priceForm, setPriceForm] = useState({
        show: false,
        mode: 'add',
        id: null,
        price: ''
    });

    useEffect(() => {
        if (openModal) {
            fetchPrices();
        }
    }, [openModal]);

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const priceList = await getAllPrices();
            setPrices(priceList);
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: 'Failed to load prices'
            });
        } finally {
            setLoading(false);
        }
    };
console.log(closeModal)
    const handlePriceSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ success: false, error: false, message: '' });

        try {
            if (priceForm.mode === 'add') {
                await addPrice({
                    price: parseFloat(priceForm.price)
                });
                setStatus({
                    success: true,
                    error: false,
                    message: 'Price added successfully'
                });
            } else {
                await updatePrice(priceForm.id, {
                    price: parseFloat(priceForm.price)
                });
                setStatus({
                    success: true,
                    error: false,
                    message: 'Price updated successfully'
                });
            }
            
            await fetchPrices();
            setPriceForm({
                show: false,
                mode: 'add',
                id: null,
                price: ''
            });
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: error.message || 'Failed to save price'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePrice = async (id) => {
        if (!window.confirm('Are you sure you want to delete this price?')) return;
        
        setLoading(true);
        setStatus({ success: false, error: false, message: '' });

        try {
            await deletePrice(id);
            setStatus({
                success: true,
                error: false,
                message: 'Price deleted successfully'
            });
            await fetchPrices();
        } catch (error) {
            setStatus({
                success: false,
                error: true,
                message: error.message || 'Failed to delete price'
            });
        } finally {
            setLoading(false);
        }
    };

    const openPriceForm = (mode = 'add', priceItem = null) => {
        setPriceForm({
            show: true,
            mode,
            id: priceItem?.id || null,
            price: priceItem?.price || ''
        });
    };

    if (!openModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Price Management</h2>
                    <button
                        onClick={closeModal}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {priceForm.show ? (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">
                                {priceForm.mode === 'add' ? 'Add New Price' : 'Edit Price'}
                            </h3>
                            <form onSubmit={handlePriceSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        value={priceForm.price}
                                        onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                        onClick={() => setPriceForm({ ...priceForm, show: false })}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                                        ) : priceForm.mode === 'add' ? (
                                            <Plus className="w-4 h-4 mr-2 inline" />
                                        ) : (
                                            <Edit className="w-4 h-4 mr-2 inline" />
                                        )}
                                        {priceForm.mode === 'add' ? 'Add Price' : 'Update Price'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Current Prices</h3>
                                <button
                                    className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    onClick={() => openPriceForm('add')}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add New Price
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {prices.length > 0 ? (
                                                prices.map((price) => (
                                                    <tr key={price.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{price.price}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => openPriceForm('edit', price)}
                                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                            >
                                                                <Edit className="w-4 h-4 inline mr-1" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePrice(price.id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                <Trash2 className="w-4 h-4 inline mr-1" />
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                                                        No prices available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

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

export default PriceManagement;