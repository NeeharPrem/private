import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';
import { findBills, getBills,saveBills} from './helpers/billsdb';
import BillEditModal from './BillEditModal';
import SlipModal from './SlipModal'
import { generateSummary } from '../utils/groupTickets'

const BillDetails = () => {
    const navigate = useNavigate();

    const [searchDate, setSearchDate] = useState(null);
    const [billsData, setBillsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [selectedTickets, setSelectedTickets] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize,] = useState(5);
    const [selectedBillDetails, setSelectedBillDetails] = useState({
        price: 0,
        name: '',
        billNo: null,
        pwt: 0,
    });

    // const handlePrinting = (bill)=>{
    //     setSelectedTickets(new Set(bill.tickets))
    //     setSelectedBillDetails({
    //         name: bill.name,
    //         billNo: bill.billno,
    //         price: bill.ticketPrice,
    //         pwt: bill.pwt,
    //     });
    //     setModalIsOpen(true)
    // }
    const handlePrinting = (bill) => {
        const ticketsSet = bill.tickets ? new Set(bill.tickets) : new Set();
        
        setSelectedTickets(ticketsSet);
        setSelectedBillDetails({
            name: bill.name || '',
            billNo: bill.billno || '',
            price: bill.ticketPrice || 0,
            pwt: bill.pwt || 0,
            date: bill.date || new Date()
        });
        setModalIsOpen(true);
    };

    const handlePrintSuccess = async () => {
            setModalIsOpen(false)
    };

    const handleEdit = (bill) => {
        setSelectedBill(bill);
        setIsModalOpen(true);
    };

    const handleSaveEdit = async (updatedBill) => {
        try {
            await saveBills(updatedBill)
            await fetchBills(currentPage, pageSize);
            setIsModalOpen(false);
            setSelectedBill(null);
        } catch (error) {
            console.error('Error updating bill:', error);
        }
    };

    const fetchBills = useCallback(async (page, size) => {
        setLoading(true);
        try {
            const result = await getBills(size, page * size);
            setTotalCount(result.total);
            processBilldata(result.data);
        } catch (error) {
            console.error('Error fetching bills:', error);
        }
        setLoading(false);
    }, []);

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // const processBilldata = (bills) => {
    //     const processed = bills.map(bill => ({
    //         billno: bill.billno,
    //         name: bill.name,
    //         totalAmount: bill.totalAmount,
    //         date: formatDate(bill.date),
    //         tickets: Array.from(bill.tickets),
    //         pwt: bill.pwt,
    //         ticketPrice: bill?.ticketPrice,
    //         type:bill?.type,
    //         totalPayable: bill?.totalPayable
    //     }));
    //     setBillsData(processed);
    // };
    const processBilldata = (bills) => {
        const processed = bills.map(bill => ({
            billno: bill.billno || '',
            name: bill.name || '',
            totalAmount: bill.totalAmount || 0,
            date: bill.date ? formatDate(bill.date) : formatDate(new Date()),
            tickets: Array.isArray(bill.tickets) ? bill.tickets : Array.from(bill.tickets || []),
            pwt: bill.pwt || 0,
            ticketPrice: bill.ticketPrice || 0,
            type: bill.type || 'Original',
            totalPayable: bill.totalPayable || (bill.totalAmount - (bill.pwt || 0)),
            id: bill.id || Date.now() // Add a unique ID if missing
        }));
        setBillsData(processed);
    };

    useEffect(() => {
        fetchBills(currentPage, pageSize);
    }, [currentPage, pageSize]);

    const handlePageChange = (newPage) => {
        if (newPage === currentPage) return;
        setCurrentPage(newPage);
    };


    const data = React.useMemo(() => billsData, [billsData]);
    const pageCount = Math.ceil(totalCount / pageSize);


    const searchBills = async (query) => {
        setLoading(true);
        try {
            const bills = await findBills(query);
            processBilldata(bills);
        } catch (error) {
            console.error('Error searching bills:', error);
        }
        setLoading(false);
    };

    const handleSearchChange = (e) => {
        // setGlobalFilter(e.target.value);
    };

    const handleDateSearch = () => {
        if (searchDate) {
            const formattedDate = formatDate(searchDate);
            searchBills(formattedDate);
        } else {
            fetchBills(0, 5);
        }
    };

    const finalSortedSummary = generateSummary(selectedTickets, selectedBillDetails.price)

    return (
        <div className="flex flex-col h-screen bg-gray-100 p-4">
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate('/')}
                    className="bg-[#6c757d] hover:bg-[#545b62] text-white font-bold py-2 px-4"
                >
                    Home
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Bills Management</h1>
                <div className="w-20"></div>
            </div>

            <div className="flex justify-between mb-4">
                <div className="flex items-center space-x-2 w-1/3 relative">
                    <input
                        value={""}
                        onChange={handleSearchChange}
                        placeholder="Search bills..."
                        className="pl-8 pr-4 py-2 w-full border rounded-md"
                    />
                    <Search className="w-4 h-4 absolute left-2 text-gray-500" />
                </div>

                <div className="flex items-center space-x-2">
                    <DatePicker
                        selected={searchDate}
                        onChange={date => setSearchDate(date)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                    <button onClick={handleDateSearch} className="px-4 py-2 bg-blue-500 text-white rounded-md">
                        Search by Date
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow flex-grow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Payable</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Print</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((bill) => (
                                <tr key={bill.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.billno}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.totalAmount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{bill.totalPayable}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleEdit(bill)}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handlePrinting(bill)}
                                            className="px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500"
                                        >
                                            Print
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-lg">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0 || loading}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </button>

                <span className="text-sm text-gray-700">
                    Page {currentPage + 1} of {pageCount} | Total Records: {totalCount}
                </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= pageCount - 1 || loading}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                </button>
            </div>
            {isModalOpen && (
                <BillEditModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    billData={selectedBill}
                    onSave={handleSaveEdit}
                    onUpdateBill={handleSaveEdit}
                />
            )}
            <>
                <SlipModal
                    isOpen={modalIsOpen}
                    onRequestClose={() => setModalIsOpen(false)}
                    ticketSummary={finalSortedSummary}
                    currentDateTime={new Date()}
                    name={selectedBillDetails.name}
                    pwt={selectedBillDetails.pwt}
                    billno={selectedBillDetails.billNo}
                    onPrintSuccess={handlePrintSuccess}
                />
            </>
        </div>
    );
};

export default BillDetails;