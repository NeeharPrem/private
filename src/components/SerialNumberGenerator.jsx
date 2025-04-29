import React, { useState, useEffect, useRef, useMemo } from 'react';
import { saveTicketsToDB, getAllTicketsFromDB, updateTicketInDB, deleteTicketFromDB } from '../components/helpers/indexdb'
import { toast } from 'react-toastify';
import BillingModal from './BillingModal';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {FaTrash} from 'react-icons/fa';
import { ChevronDown } from 'lucide-react';
import { useModal } from '../contexts/ModalContext'

class Lottery {
    constructor(serial, number, ticketname, serialNumber, state, drawDate, identifier,date) {
        this.id = `${serial}-${number}`;
        this.serial = serial;
        this.number = number;
        this.ticketname = ticketname;
        this.serialNumber = serialNumber;
        this.state = state;
        this.drawDate = drawDate;
        this.identifier = identifier;
        this.date= date
        this.unique = `${serialNumber}-${serial}-${number}`
    }
}

const generateLotteryTickets = (firstSerial, lastSerial, firstNumber, lastNumber, ticketname, serialNumber, drawDate) => {
    const ticket_arr = [];
    let temp_first_lott_ser = firstSerial;
    let temp_first_lottery_num = firstNumber;
    const alphabet_limit = (lastSerial.charCodeAt(1) - firstSerial.charCodeAt(1)) + 1;
    const identifier = `${firstSerial}-${lastSerial}-${firstNumber}-${lastNumber}-${ticketname}-${serialNumber}-${drawDate.toISOString()}`;

    for (let alphabet = 0; alphabet < alphabet_limit; alphabet++) {
        if (temp_first_lott_ser[1] !== 'I' && temp_first_lott_ser[1] !== 'Q') {
            for (let num = 0; num < 25; num++) {
                ticket_arr.push(new Lottery(temp_first_lott_ser, temp_first_lottery_num, ticketname, serialNumber, true, drawDate, identifier,new Date()));
                temp_first_lottery_num++;
                if (temp_first_lottery_num > lastNumber) break;
            }
            temp_first_lottery_num = firstNumber;
        }
        temp_first_lott_ser = temp_first_lott_ser[0] + String.fromCharCode(temp_first_lott_ser.charCodeAt(1) + 1);
    }

    return ticket_arr;
};

const LotteryTicketGenerator = () => {
    const [firstSerial, setFirstSerial] = useState('');
    const [lastSerial, setLastSerial] = useState('');
    const [firstNumber, setFirstNumber] = useState('');
    const [lastNumber, setLastNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [lotteryTickets, setLotteryTickets] = useState([]);
    const [ticketname, setTicketName] = useState('');
    const dropdownRefs = useRef({});
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [drawDate, setDrawDate] = useState(new Date());
    // const [tickets,] = useState([
    //     { name: 'WIN-WIN',serial:'W-'},
    //     { name: 'AKSHAYA',serial:'AK-'},
    //     { name: 'KARUNYA',serial:'KR-'},
    //     { name: 'NIRMAL',serial:'NR-'},
    //     { name: 'KARUNYA PLUS',serial:'KN-'},
    //     { name: 'FIFTY-FIFTY',serial:'FF-'},
    //     { name: 'STHREE-SAKTHI',serial:'SS-'}
    // ]);
    const [tickets,] = useState([
        { name: 'DHANALEKSHMI', serial: 'DL-' },
        { name: 'SUVARNA KERALAM', serial: 'SK-' },
        { name: 'BHAGYATHARA', serial: 'BT-' },
        { name: 'SAMRUDHI', serial: 'SM-' },
        { name: 'STHREE-SAKTHI', serial: 'SS-' },
        { name: 'KARUNYA', serial: 'KR-' },
        { name: 'KARUNYA PLUS', serial: 'KN-' },
        // { name: 'FIFTY-FIFTY', serial: 'FF-' },
    ]);
    const[showTicket,setShowTickets]=useState(new Date())
    const [totalTickets,setTotalTickets]=useState(0)

    const inputRefs = useRef([]);
    const { openModal} = useModal();
    
    function formatDate(date) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    const openBillingModal = () => {
        setIsBillingModalOpen(true);
    };

    const closeBillingModal = () => {
        fetchTickets(showTicket);
        setIsBillingModalOpen(false);
    };

    async function fetchTickets(showTicket) {
        try {
            const ticketsFromDB = await getAllTicketsFromDB(showTicket);
            if (ticketsFromDB.length === 0) {
                setLotteryTickets([]);
                return;
            }
            const parsedTickets = ticketsFromDB.map(ticket => ({
                ...ticket,
                drawDate: new Date(ticket.drawDate)
            }));
            setLotteryTickets(parsedTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setLotteryTickets([]);
        }
    }

    useEffect(() => {
        fetchTickets(showTicket);
    }, [showTicket]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(dropdownRefs.current).forEach(prefix => {
                if (dropdownRefs.current[prefix] && !dropdownRefs.current[prefix].contains(event.target)) {
                    setShowDropdown(prevState => ({ ...prevState, [prefix]: false }));
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleGenerate = async () => {
        const firstNum = parseInt(firstNumber, 10);
        const lastNum = parseInt(lastNumber, 10);
        const newTickets = generateLotteryTickets(firstSerial, lastSerial, firstNum, lastNum, ticketname.toLocaleUpperCase(), serialNumber, drawDate);
        const ticketsFromDB = await getAllTicketsFromDB(showTicket);

        const filteredNewTickets = newTickets.filter(newTicket => {
            return !ticketsFromDB.some(existingTicket => existingTicket.identifier === newTicket.identifier);
        });

        if (filteredNewTickets.length > 0) {
            const updatedTickets = [...lotteryTickets, ...filteredNewTickets];
            setLotteryTickets(updatedTickets);
            await saveTicketsToDB(filteredNewTickets);
            await getAllTicketsFromDB(showTicket);
            toast.success('Tickets added');
        } else {
            toast.error('Some tickets are already existing in the specified range');
        }
    };

    const handleDeleteTicket = async (identifier) => {
        const deleteTicketAction = async () => {
            try {
                const filteredTickets = lotteryTickets.filter(ticket => ticket.identifier !== identifier);
                setLotteryTickets(filteredTickets);

                const ticketsToDelete = lotteryTickets.filter(ticket => ticket.identifier === identifier);

                for (let ticket of ticketsToDelete) {
                    await deleteTicketFromDB(ticket.unique);
                }
            } catch (error) {
                toast.error('Error deleting tickets');
                throw error;
            }
        };

        openModal('CANCEL_BUTTON', {
            title: 'Delete Ticket',
            message: 'Are you sure you want to delete this ticket?',
            confirmButtonText: 'Delete',
            confirmButtonColor: 'red',
            onConfirm: deleteTicketAction,
            toastMessage: 'Tickets deleted successfully'
        });
    };
    
    const TicketsByPrefix = () => {
        const ticketSummary = {};
        let totalTickets = 0;

        lotteryTickets.forEach(ticket => {
            const key = ticket.identifier;
            const serialNumber = ticket.serial + ticket.number.toString().padStart(6, '0');
            totalTickets += 1;
            if (!ticketSummary[key]) {
                ticketSummary[key] = {
                    start: serialNumber,
                    end: serialNumber,
                    count: 1,
                    serials: [serialNumber],
                    ticketname: ticket.ticketname,
                    serialNumber: ticket.serialNumber,
                    drawDate: ticket.drawDate,
                    identifier: ticket.identifier,
                    unsoldCount: ticket.state ? 1 : 0
                };
            } else {
                ticketSummary[key].end = serialNumber;
                ticketSummary[key].count += 1;
                ticketSummary[key].serials.push(serialNumber);
                if (ticket.state) {
                    ticketSummary[key].unsoldCount += 1;
                }
            }
        });
        return ticketSummary;
    };

    const ticketsByPrefix = useMemo(() => TicketsByPrefix(), [lotteryTickets]);

    const totalCount = useMemo(() => {
        return Object.values(ticketsByPrefix).reduce((acc, item) => acc + item.count, 0);
    }, [ticketsByPrefix, lotteryTickets]);

    useEffect(() => {
        if (Object.keys(ticketsByPrefix).length > 0) {
            setTotalTickets(totalCount);
        }else{
            setTotalTickets(0);
        }
    }, [ticketsByPrefix, totalCount, lotteryTickets]);

    const handleTicketSelect = (ticket) => {
        setTicketName(ticket.name);
        setSerialNumber(ticket.serial);
    };

    return (
        <div className="flex flex-col w-full min-h-screen p-8 bg-[#f0f0f0]">
            <div className="bg-white p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <InputField 
                    label="First Serial" 
                    value={firstSerial} 
                    onChange={(e) => setFirstSerial(e.target.value.toUpperCase().substring(0, 2))} 
                    />
                    <InputField 
                    label="Last Serial" 
                    value={lastSerial} 
                    onChange={(e) => setLastSerial(e.target.value.toUpperCase().substring(0, 2))} 
                    />
                    <InputField 
                    label="First Ticket Number" 
                    type="number" 
                    value={firstNumber} 
                    onChange={(e) => setFirstNumber(e.target.value)} 
                    />
                    <InputField 
                    label="Last Ticket Number" 
                    type="number" 
                    value={lastNumber} 
                    onChange={(e) => setLastNumber(e.target.value)} 
                    />
                    <DropdownInput
                        label="Ticket Name"
                        value={ticketname}
                        onChange={(e) => setTicketName(e.target.value.toUpperCase())}
                        options={tickets}
                        onSelect={handleTicketSelect}
                        displayKey="name"
                    />
                    <InputField
                        label="Lottery Serial Number"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                    />
                    <div className="mb-4">
                        <label className="block mb-2 font-bold text-gray-700">Draw Date:</label>
                        <DatePicker
                            selected={drawDate}
                            onChange={date => setDrawDate(date)}
                            className="w-32 px-4 py-2 border border-gray-300"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-6 space-x-4">
                    <button
                        onClick={handleGenerate}
                        className="bg-[#007bff] hover:bg-[#0056b3] text-white font-bold py-2 px-4"
                    >
                        Save
                    </button>
                    <button
                        onClick={openBillingModal}
                        className="bg-[#6c757d] hover:bg-[#545b62] text-white font-bold py-2 px-4"
                    >
                        Billing
                    </button>
                </div>
            </div>
            <div className="bg-white p-6 mt-8">
                <div className='flex flex-row justify-between'>
                    <div className='flex flex-col gap-2 mb-4'>
                        <h2 className="text-xl font-bold">Tickets</h2>
                        <p>Total tickets : <span>{totalTickets}</span></p>
                    </div>
                    <div className="mb-4">
                        <DatePicker
                            selected={showTicket}
                            onChange={date => setShowTickets(date)}
                            className="w-36 px-2 py-2 border border-black"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#e9ecef]">
                                <th className="px-4 py-2 text-left">No</th>
                                <th className="px-4 py-2 text-left">Ticket Name</th>
                                <th className="px-4 py-2 text-left">Serial Number</th>
                                <th className="px-4 py-2 text-left">Start Serial</th>
                                <th className="px-4 py-2 text-left">End Serial</th>
                                <th className="px-4 py-2 text-left">Count</th>
                                <th className='px-4 py-2 text-left'>unsold tickets</th>
                                <th className="px-4 py-2 text-left">Draw Date</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(TicketsByPrefix()).sort(([, a], [, b]) => b.date - a.date).map(([key, { start, end, count, serialNumber, ticketname, drawDate, identifier, unsoldCount }],index) => (
                                <tr key={key} className={`border-t`}>
                                    <td className="px-4 py-2">{index +1}</td>
                                    <td className="px-4 py-2">{ticketname}</td>
                                    <td className="px-4 py-2">{serialNumber}</td>
                                    <td className="px-4 py-2">{start}</td>
                                    <td className="px-4 py-2">{end}</td>
                                    <td className="px-4 py-2">{count}</td>
                                    {unsoldCount === 0 ? (
                                        <td className="px-4 py-2">sold out</td>
                                    ):(
                                        <td className="px-4 py-2">{unsoldCount}</td>
                                    )}
                                    <td className="px-4 py-2">{formatDate(drawDate)}</td>
                                    <td className="px-4 py-2 flex items-center space-x-2">
                                        {(unsoldCount == 0 || unsoldCount !== 0) && (
                                            <button
                                                onClick={() => handleDeleteTicket(identifier)}
                                                className="bg-[#dc3545] hover:bg-[#c82333] text-white font-bold py-1 px-2 rounded text-sm"
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <BillingModal isOpen={isBillingModalOpen} onClose={closeBillingModal} />
        </div>
    );
};

const DropdownInput = ({ label, value, onChange, options, onSelect, displayKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="mb-4 relative" ref={dropdownRef}>
            <label className="block mb-2 font-bold text-gray-700">{label}:</label>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#007bff] pr-10"
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                </button>
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 shadow-lg">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                                onSelect(option);
                                setIsOpen(false);
                            }}
                        >
                            {option[displayKey]}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const InputField = React.forwardRef(({ label, type = "text", value, onChange }, ref) => (
    <div className="mb-4">
        <label className="block mb-2 font-bold text-gray-700">{label}:</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            ref={ref}
            className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#007bff]"
        />
    </div>
));

export default LotteryTicketGenerator;