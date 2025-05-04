import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTicketsFromDB, updateSelectedTicketsStatus, getAllTickets } from '../components/helpers/indexdb';
import { getLastBillNumber, saveBillNumber } from './helpers/billnodb';
import { saveBills } from './helpers/billsdb';
import SlipModal from './SlipModal';
import { FaSearch, FaTrash, FaPrint, FaTimes } from 'react-icons/fa';
import { TiTickOutline } from 'react-icons/ti';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { generateSummary } from './../utils/groupTickets';
import { formatDate } from '../utils/fortmatDate';
import SelectedTickets from './SelectedTickets';

const BillingPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [displayedTickets, setDisplayedTickets] = useState([]);
    const [selectedTickets, setSelectedTickets] = useState(new Set());
    const [buyerName, setBuyerName] = useState('');
    const [selectedDrawDate, setSelectedDrawDate] = useState('');
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [ticketprice] = useState([42.70]);
    const [selectedPrice, setSelectedPrice] = useState(Number(ticketprice[0]));
    const [newprice, setNewprice] = useState(false);
    const [pwtPrice, setpwtPrice] = useState(0);
    const [lastbillno, setBillno] = useState(0);
    const [tempBillNo, setTempBillNo] = useState(null);
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [prefixFilter, setPrefixFilter] = useState([]);
    const [filterTicketData, setFilterTicketData] = useState([]);
    const [newSelected, setNewSelected] = useState(new Set());
    const [newSelected1, setNewSelected1] = useState(new Set());
    const [showTicket, setShowTickets] = useState(new Date());
    const currentDateTime = new Date();
    const ticketsToShow = 50;

    useEffect(() => {
        setSelectedDrawDate(formatDate(showTicket));
        localStorage.setItem('showTicket', showTicket);
    }, [showTicket]);

    async function fetchTickets() {
        const date = localStorage.getItem('showTicket') || '';
        const ticketsFromDB = await getAllTicketsFromDB(date);
        const unsoldTickets = ticketsFromDB.filter(ticket => ticket.state === true);
        setAllTickets(unsoldTickets);
    }

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (allTickets.length > 0) {
                searchTickets(searchQuery, selectedDrawDate);
            } else {
                setDisplayedTickets([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, allTickets, selectedDrawDate, showTicket]);

    const handlePrintSuccess = async () => {
        if (tempBillNo !== null) {
            await saveBillNumber(tempBillNo);
            setBillno(tempBillNo);
            await updateSelectedTicketsStatus(Array.from(selectedTickets));
            await handleBillsave(selectedTickets, tempBillNo, buyerName, pwtPrice, currentDateTime);
            setTempBillNo(null);
            setModalIsOpen(false);
            setBuyerName('');
            handleReset();
            await fetchTickets();
        }
    };

    const handleReset = () => {
        setSelectedTickets(new Set());
        setNewSelected(new Set());
        setNewSelected1(new Set());
        setFilterTicketData([]);
        setAllTickets([]);
        setSearchQuery('');
        setStart('');
        setEnd('');
    };

    function filterTicketsByRange(tickets, start, end) {
        if (start !== null && end !== null && (start.length && end.length) == 2) {
            const filteredTickets = [];

            for (const ticket of tickets) {
                const idSuffix = parseInt(ticket.id.slice(-2), 10);
                if (idSuffix >= start && idSuffix <= end) {
                    filteredTickets.push(ticket);
                }
            }

            return filteredTickets;
        } else {
            return null;
        }
    }

    useEffect(() => {
        const out = filterTicketsByRange(selectedTickets, start, end);
        setPrefixFilter(out);
    }, [start, end]);

    const groupedTicketData = useMemo(() => {
        if (!prefixFilter) return [];

        const filteredGroupedTickets = prefixFilter.reduce((acc, ticket) => {
            const [startSerial, endSerial, , , ticketname, serialNumber, drawDate] =
                ticket.identifier.split('-');
            const startNumber = prefixFilter[0].number;
            const endNumber = prefixFilter[prefixFilter.length - 1].number;
            const mainKey = `${startSerial}-${endSerial} (${startNumber}-${endNumber}) - ${ticketname}`;

            if (!acc[mainKey]) {
                acc[mainKey] = {
                    info: {
                        serialNumber,
                        drawDate: ticket.drawDate,
                        totalTickets: 0
                    },
                    subGroups: {}
                };
            }

            const subKey = `${ticket.serial}-${startNumber} to ${ticket.serial}-${endNumber}`;
            if (!acc[mainKey].subGroups[subKey]) {
                acc[mainKey].subGroups[subKey] = [];
            }

            acc[mainKey].subGroups[subKey].push(ticket);
            acc[mainKey].info.totalTickets += 1;
            return acc;
        }, {});

        return Object.entries(filteredGroupedTickets);
    }, [prefixFilter]);

    useEffect(() => {
        setFilterTicketData(groupedTicketData);
    }, [groupedTicketData]);

    const getSelectedTickets = (groupedTicketData) => {
        let addToSet = new Set();
        groupedTicketData.forEach(([, { subGroups }]) => {
            Object.values(subGroups).forEach((tickets) => {
                tickets.forEach((ticket) => {
                    addToSet.add(ticket);
                });
            });
        });
        return addToSet;
    };

    useEffect(() => {
        setNewSelected(getSelectedTickets(groupedTicketData));
    }, [groupedTicketData]);

    const resetFilters = () => {
        if (newSelected.size > 0) {
            setNewSelected1(prevSelected => {
                const updatedSet = new Set(prevSelected);
                newSelected.forEach(item => updatedSet.add(item));
                return updatedSet;
            });
            setStart('');
            setEnd('');
            setPrefixFilter([]);
        } else {
            return;
        }
    };

    const handleFilter = () => {
        if (start && end) {
            setSelectedTickets(new Set());
            resetFilters();
        } else {
            setNewSelected1(prevSelected => {
                const updatedSet = new Set(prevSelected);
                selectedTickets.forEach(item => updatedSet.add(item));
                return updatedSet;
            });
            setSelectedTickets(new Set());
        }
    };

    const calculateTotal = (items) => {
        return items.reduce((acc, item) => {
            return acc + item.groups.reduce((groupAcc, group) => {
                return groupAcc + group.ranges.reduce((rangeAcc, range) => {
                    return rangeAcc + range.count * range.price;
                }, 0);
            }, 0);
        }, 0);
    };

    const handleBillsave = async (ticketData, billNo, buyerName, pwtPrice, currentDateTime) => {
        try {
            if (!finalSortedSummary || !selectedPrice) {
                throw new Error('Required data is missing: finalSortedSummary or selectedPrice');
            }

            const totalOut = calculateTotal(finalSortedSummary);
            const totalPay = pwtPrice ? totalOut - pwtPrice : totalOut;

            const saveData = {
                type: 'Original',
                billno: billNo,
                name: buyerName,
                date: currentDateTime,
                tickets: ticketData,
                pwt: pwtPrice,
                totalAmount: totalOut.toFixed(2),
                ticketPrice: selectedPrice,
                totalPayable: totalPay.toFixed(2),
                claimStatus: false
            };
            await saveBills(saveData);

            console.log('Bill data saved successfully');
        } catch (error) {
            console.error('Error saving the Bill data:', error);
        }
    };

    useEffect(() => {
        async function fetchbillno() {
            const billno = await getLastBillNumber();
            setBillno(billno);
        }
        fetchbillno();
    }, []);

    useEffect(() => {
        async function fetchTickets(showTicket) {
            const ticketsFromDB = await getAllTicketsFromDB(showTicket);
            const unsoldTickets = ticketsFromDB.filter(ticket => ticket.state === true);
            if (unsoldTickets[0]?.ticketName === 'FIFTY-FIFTY') {
                setSelectedPrice(Number(ticketprice[1]));
            } else {
                setSelectedPrice(Number(ticketprice[0]));
            }
            setAllTickets(unsoldTickets);
        }
        fetchTickets(showTicket);
    }, [showTicket]);

    const searchTickets = useCallback((query, drawDate) => {
        if (query.trim() === '' && !drawDate) {
            setSearchResults([]);
            setDisplayedTickets([]);
            return;
        }

        const queryLowerCase = query.toLowerCase();
        let filteredTickets;
        filteredTickets = allTickets.filter(ticket => {
            const [serialPart, numberPart] = queryLowerCase.split('-');
            const serialMatch = ticket.serial.toLowerCase().includes(serialPart);
            const numberMatch = numberPart ? ticket.number.toString().startsWith(numberPart) : true;
            const otherFieldsMatch = ticket.id.toLowerCase().includes(queryLowerCase) || ticket.ticketname.toLowerCase().includes(queryLowerCase) || ticket.serialNumber.toLowerCase().includes(queryLowerCase);
            const drawDateMatch = drawDate ? formatDate(ticket.drawDate) === drawDate : true;
            return ((serialMatch && numberMatch) || otherFieldsMatch) && drawDateMatch;
        });

        if (filteredTickets && queryLowerCase) {
            const identifierMatch = filteredTickets[0]?.identifier;
            const parts = identifierMatch.split('-').slice(2, 9).join('-');
            filteredTickets = allTickets.filter(ticket => ticket.identifier.split('-').slice(2, 9).join('-') === parts);
        }

        const groupedTickets = filteredTickets.reduce((acc, ticket) => {
            const [startSerial, endSerial, startNumber, endNumber, ticketname, serialNumber, drawDate] = ticket.identifier.split('-');
            const mainKey = `${startSerial}-${endSerial} (${startNumber}-${endNumber}) - ${ticketname}`;
            if (!acc[mainKey]) {
                acc[mainKey] = { info: { serialNumber, drawDate: ticket.drawDate, totalTickets: 0 }, subGroups: {} };
            }

            const subKey = `${ticket.serial}-${startNumber} to ${ticket.serial}-${endNumber}`;
            if (!acc[mainKey].subGroups[subKey]) {
                acc[mainKey].subGroups[subKey] = [];
            }

            acc[mainKey].subGroups[subKey].push(ticket);
            acc[mainKey].info.totalTickets += 1;
            return acc;
        }, {});

        const results = Object.entries(groupedTickets);
        setSearchResults(results);
        setDisplayedTickets(results.slice(0, ticketsToShow));
    }, [allTickets]);

    const handleGroupExpand = (groupKey) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    const handleSearchInputChange = (event) => {
        let value = event.target.value;
        if (event.nativeEvent.inputType === 'deleteContentBackward') {
            if (value.length === 2 && searchQuery.charAt(2) === '-') {
                value = value.charAt(0);
            }
        } else if (value.length === 2 && /^[a-zA-Z]{2}$/.test(value)) {
            value = value.toUpperCase() + '-';
        }
        setSearchQuery(value);
    };

    const handleSelectTicket = (ticket, groupKey = null) => {
        if (newSelected.size < 1) {
            setSelectedTickets(prevSelected => {
                const newSelected = new Set(prevSelected);
                if (groupKey) {
                    const [mainKey, subKey, groupIndex] = groupKey.split('|');
                    const mainGroup = searchResults.find(([key]) => key === mainKey);
                    if (mainGroup) {
                        let ticketsToToggle;
                        if (groupIndex !== undefined) {
                            ticketsToToggle = groupTicketsInFives(mainGroup[1].subGroups[subKey])[parseInt(groupIndex)];
                        } else if (subKey) {
                            ticketsToToggle = mainGroup[1].subGroups[subKey];
                        } else {
                            ticketsToToggle = Object.values(mainGroup[1].subGroups).flat();
                        }
                        const allSelected = ticketsToToggle.every(t => newSelected.has(t));
                        ticketsToToggle.forEach(t => {
                            if (allSelected) {
                                newSelected.delete(t);
                            } else {
                                newSelected.add(t);
                            }
                        });
                    }
                } else if (ticket) {
                    if (newSelected.has(ticket)) {
                        newSelected.delete(ticket);
                    } else {
                        newSelected.add(ticket);
                    }
                }
                return newSelected;
            });
        } else {
            setNewSelected(prevSelected => {
                const newSelected = new Set(prevSelected);
                if (groupKey) {
                    const [mainKey, subKey, groupIndex] = groupKey.split('|');
                    const mainGroup = filterTicketData.find(([key]) => key === mainKey);
                    if (mainGroup) {
                        let ticketsToToggle;
                        if (subKey) {
                            ticketsToToggle = mainGroup[1].subGroups[subKey];
                        } else {
                            ticketsToToggle = Object.values(mainGroup[1].subGroups).flat();
                        }
                        const allSelected = ticketsToToggle.every(t => newSelected.has(t));
                        ticketsToToggle.forEach(t => {
                            if (allSelected) {
                                newSelected.delete(t);
                            } else {
                                newSelected.add(t);
                            }
                        });
                    }
                }
                return newSelected;
            });
        }
    };

    const groupTicketsInFives = (tickets) => {
        return tickets.reduce((acc, ticket, index) => {
            const groupIndex = Math.floor(index / 5);
            if (!acc[groupIndex]) {
                acc[groupIndex] = [];
            }
            acc[groupIndex].push(ticket);
            return acc;
        }, []);
    };

    const handleOpenmodal = () => {
        if (newSelected1.size > 0) {
            setSelectedTickets(prevSelected => {
                const updatedSet = new Set(prevSelected);
                newSelected1.forEach(item => updatedSet.add(item));
                return updatedSet;
            });
        }
        const newBillNo = lastbillno == null ? 1 : lastbillno + 1;
        setTempBillNo(newBillNo);
        setModalIsOpen(true);
    };

    const handleRemoveSelectedTickets = (ticketsToRemove) => {
        if (newSelected1.size > 0) {
            setNewSelected1(prevSelected => {
                const updatedSet = new Set(prevSelected);
                ticketsToRemove.forEach(ticket => updatedSet.delete(ticket));
                return updatedSet;
            });
        } else {
            setSelectedTickets(prevSelected => {
                const updatedSet = new Set(prevSelected);
                ticketsToRemove.forEach(ticket => updatedSet.delete(ticket));
                return updatedSet;
            });
        }
    };

    const finalSortedSummary = generateSummary(selectedTickets, selectedPrice);

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">Lottery Billing System</h1>
                <div className="flex space-x-2">
                    <button className="p-2 hover:bg-blue-700 rounded">
                        <FaPrint />
                    </button>
                    <button className="p-2 hover:bg-blue-700 rounded">
                        <FaTimes />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Billing Information */}
                <div className="w-1/3 bg-white p-4 border-r border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Billing Information</h2>
                    
                    <div className="flex space-x-2 mb-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Search Ticket Serial..."
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                className="w-full px-4 py-2 border border-gray-300 pr-8"
                            />
                            <FaSearch className="absolute right-3 top-3 text-gray-400" />
                        </div>
                        <DatePicker
                            selected={showTicket}
                            onChange={date => setShowTickets(date)}
                            className="w-28 px-2 py-2 border border-gray-300"
                            dateFormat="dd/MM/yyyy"
                        />
                        <button 
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                            onClick={handleReset}
                        >
                            <FaTrash />
                        </button>
                    </div>

                    {selectedTickets.size > 0 && selectedDrawDate !== '' && (
                        <div className="flex space-x-2 mb-4">
                            <input 
                                type="text" 
                                placeholder="Start number" 
                                value={start} 
                                onChange={(e) => setStart(e.target.value)} 
                                className="flex-1 px-4 py-2 border border-gray-300" 
                            />
                            <input 
                                type="text" 
                                placeholder="End number" 
                                value={end} 
                                onChange={(e) => setEnd(e.target.value)} 
                                className="flex-1 px-4 py-2 border border-gray-300" 
                            />
                            <button 
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
                                onClick={handleFilter}
                            >
                                <TiTickOutline size={18} />
                            </button>
                        </div>
                    )}

                    <div className="mb-4">
                        <input 
                            type="text" 
                            placeholder="Enter Buyer's Name" 
                            value={buyerName} 
                            onChange={(e) => setBuyerName(e.target.value.toUpperCase())} 
                            className="w-full px-4 py-2 border border-gray-300" 
                        />
                    </div>

                    <div className="flex space-x-2 mb-4">
                        {newprice ? (
                            <input
                                type="number"
                                placeholder="Enter Ticket Price"
                                value={selectedPrice}
                                onChange={(e) => setSelectedPrice(Number(e.target.value))}
                                className="flex-1 px-4 py-2 border border-gray-300"
                            />
                        ) : (
                            <select
                                value={selectedPrice}
                                onChange={(e) => setSelectedPrice(Number(e.target.value))}
                                className="flex-1 px-4 py-2 border border-gray-300"
                            >
                                {ticketprice.map((price, index) => (
                                    <option key={index} value={price}>
                                        ₹ {price.toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button 
                            onClick={() => setNewprice(!newprice)} 
                            className="bg-gray-200 hover:bg-gray-300 p-2 rounded"
                        >
                            {newprice ? '×' : '+'}
                        </button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="number"
                            placeholder="Price winning ticket"
                            value={pwtPrice}
                            onChange={(e) => setpwtPrice(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300"
                        />
                    </div>

                    <div className="mt-auto flex space-x-2">
                        <button 
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                        >
                            Close
                        </button>
                        {(selectedTickets.size > 0 || newSelected1.size > 0) && buyerName.trim() !== '' && (
                            <button 
                                onClick={handleOpenmodal}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Show Bill Slip
                            </button>
                        )}
                    </div>
                </div>

                {/* Middle Panel - Search Results */}
                <div className="w-1/3 bg-white p-4 border-r border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Search Results</h2>
                    <div className="flex-1 overflow-y-auto">
                        {displayedTickets.length > 0 && newSelected.size < 1 && filterTicketData.length < 1 ? (
                            <div>
                                {displayedTickets.map(([mainKey, groupData]) => (
                                    <div key={mainKey} className="mb-2 border border-gray-200 p-2 rounded">
                                        <div className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Object.values(groupData.subGroups).flat().every(t => selectedTickets.has(t))}
                                                onChange={() => handleSelectTicket(null, mainKey)}
                                                className="mr-2 w-5 h-5"
                                            />
                                            <span 
                                                onClick={() => handleGroupExpand(mainKey)} 
                                                className="flex-grow flex items-center"
                                            >
                                                <span className="mr-1">
                                                    {expandedGroups.has(mainKey) ? '▼' : '▶'}
                                                </span>
                                                <span className="truncate">
                                                    {mainKey}
                                                    {groupData && groupData.info ?
                                                        ` (${groupData.info.totalTickets} tickets) [Serial: ${groupData.info.serialNumber}, Draw Date: ${formatDate(groupData.info.drawDate)}]`
                                                        : ' (No info available)'}
                                                </span>
                                            </span>
                                        </div>
                                        {expandedGroups.has(mainKey) && (
                                            <div className="ml-6 mt-2">
                                                {Object.entries(groupData.subGroups).map(([subKey, tickets]) => (
                                                    <div key={subKey} className="mb-1">
                                                        <div className="flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={tickets.every(t => selectedTickets.has(t))}
                                                                onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}`)}
                                                                className="mr-2 w-5 h-5"
                                                            />
                                                            <span 
                                                                onClick={() => handleGroupExpand(`${mainKey}-${subKey}`)} 
                                                                className="flex-grow flex items-center"
                                                            >
                                                                <span className="mr-1">
                                                                    {expandedGroups.has(`${mainKey}-${subKey}`) ? '▼' : '▶'}
                                                                </span>
                                                                <span className="truncate">{subKey}</span>
                                                            </span>
                                                        </div>
                                                        {expandedGroups.has(`${mainKey}-${subKey}`) && (
                                                            <div className="ml-6 mt-2">
                                                                {groupTicketsInFives(tickets).map((ticketGroup, groupIndex) => (
                                                                    <div key={groupIndex} className="mb-1">
                                                                        <div className="flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={ticketGroup.every(t => selectedTickets.has(t))}
                                                                                onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}|${groupIndex}`)}
                                                                                className="mr-2 w-5 h-5"
                                                                            />
                                                                            <span 
                                                                                onClick={() => handleGroupExpand(`${mainKey}-${subKey}-${groupIndex}`)}
                                                                                className="flex items-center"
                                                                            >
                                                                                <span className="mr-1">
                                                                                    {expandedGroups.has(`${mainKey}-${subKey}-${groupIndex}`) ? '▼' : '▶'}
                                                                                </span>
                                                                                <span>
                                                                                    {ticketGroup[0].serial}-{ticketGroup[0].number} to {ticketGroup[ticketGroup.length - 1].serial}-{ticketGroup[ticketGroup.length - 1].number}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                        {expandedGroups.has(`${mainKey}-${subKey}-${groupIndex}`) && (
                                                                            <div className="ml-6 mt-2">
                                                                                {ticketGroup.map((ticket, ticketIndex) => (
                                                                                    <div key={ticketIndex} className="flex items-center mb-1">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={selectedTickets.has(ticket)}
                                                                                            onChange={() => handleSelectTicket(ticket)}
                                                                                            className="mr-2 w-5 h-5"
                                                                                        />
                                                                                        <span>{ticket.serial}-{ticket.number}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {searchResults.length > displayedTickets.length && (
                                    <button 
                                        onClick={() => setDisplayedTickets(searchResults)}
                                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-center mt-2 rounded"
                                    >
                                        Load More
                                    </button>
                                )}
                            </div>
                        ) : (prefixFilter && prefixFilter.length > 1) ? (
                            <div>
                                {filterTicketData.map(([mainKey, groupData]) => (
                                    <div key={mainKey} className="mb-2 border border-gray-200 p-2 rounded">
                                        <div className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Object.values(groupData.subGroups)
                                                    .flat()
                                                    .every(t => newSelected.has(t))}
                                                onChange={() => handleSelectTicket(null, mainKey)}
                                                className="mr-2 w-5 h-5"
                                            />
                                            <span 
                                                onClick={() => handleGroupExpand(mainKey)} 
                                                className="flex-grow flex items-center"
                                            >
                                                <span className="mr-1">
                                                    {expandedGroups.has(mainKey) ? '▼' : '▶'}
                                                </span>
                                                <span className="truncate">
                                                    {mainKey}
                                                    {groupData && groupData.info ?
                                                        `(${groupData.info.totalTickets} tickets) [Serial: ${groupData.info.serialNumber}, Draw Date: ${formatDate(groupData.info.drawDate)}]`
                                                        : '(No info available)'}
                                                </span>
                                            </span>
                                        </div>
                                        {expandedGroups.has(mainKey) && (
                                            <div className="ml-6 mt-2">
                                                {Object.entries(groupData.subGroups).map(([subKey, tickets], groupIndex) => (
                                                    <div key={subKey} className="mb-1">
                                                        <div className="flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={tickets.every(t => newSelected.has(t))}
                                                                onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}`)}
                                                                className="mr-2 w-5 h-5"
                                                            />
                                                            <span 
                                                                onClick={() => handleGroupExpand(`${mainKey}-${subKey}-${groupIndex}`)} 
                                                                className="flex-grow flex items-center"
                                                            >
                                                                <span className="mr-1">
                                                                    {expandedGroups.has(`${mainKey}-${subKey}-${groupIndex}`) ? '▼' : '▶'}
                                                                </span>
                                                                <span className="truncate">{subKey}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Enter ticket serial, number, draw date, or ID</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Selected Tickets */}
                <div className="w-1/3 bg-white p-4 flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Selected Tickets</h2>
                    <div className="flex-1 overflow-y-auto">
                        <SelectedTickets
                            tickets={newSelected1.size > 0 ? newSelected1 : selectedTickets}
                            onRemove={handleRemoveSelectedTickets}
                        />
                    </div>
                    <div className="mt-4 p-4 bg-gray-100 rounded">
                        <div className="flex justify-between mb-2">
                            <span className="font-semibold">Total Tickets:</span>
                            <span>{(newSelected1.size > 0 ? newSelected1.size : selectedTickets.size)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="font-semibold">Ticket Price:</span>
                            <span>₹{selectedPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="font-semibold">PWT Amount:</span>
                            <span>₹{pwtPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Payable:</span>
                            <span>₹{((newSelected1.size > 0 ? newSelected1.size : selectedTickets.size) * selectedPrice - pwtPrice).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slip Modal */}
            <SlipModal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                ticketSummary={finalSortedSummary}
                currentDateTime={currentDateTime}
                name={buyerName}
                pwt={pwtPrice}
                billno={tempBillNo || lastbillno}
                onPrintSuccess={handlePrintSuccess}
            />
        </div>
    );
};

export default BillingPage;