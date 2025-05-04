import React, { useState, useEffect, useMemo,useCallback} from 'react';
import { getAllTicketsFromDB, updateSelectedTicketsStatus,getAllTickets} from '../components/helpers/indexdb';
import { getLastBillNumber, saveBillNumber } from './helpers/billnodb'
import { saveBills } from './helpers/billsdb'
import SlipModal from './SlipModal';
import { FaSearch, FaTrash} from 'react-icons/fa';
import { TiTickOutline } from 'react-icons/ti';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { generateSummary } from './../utils/groupTickets'
import { formatDate } from '../utils/fortmatDate'
import SelectedTickets from './SelectedTickets'

const BillingModal = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [displayedTickets, setDisplayedTickets] = useState([]);
    const [selectedTickets, setSelectedTickets] = useState(new Set());
    const [buyerName, setBuyerName] = useState('');
    const [selectedDrawDate, setSelectedDrawDate] = useState('');
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [modalIsOpen, setModalIsOpen] = useState(false);
    // const [ticketprice] = useState([33.36, 42.50, 33.10, 42.10])
    const [ticketprice] = useState([42.65])
    const [selectedPrice, setSelectedPrice] = useState(Number(ticketprice[0]));
    const [newprice, setNewprice] = useState(false)
    const [pwtPrice, setpwtPrice] = useState(0)
    const [lastbillno,setBillno]=useState(0)
    const [tempBillNo, setTempBillNo] = useState(null);
    const [start,setStart]=useState('')
    const [end, setEnd]=useState('')
    const [prefixFilter, setPrefixFilter]=useState([])
    const [filterTicketData,setFilterTicketData]=useState([])
    const [newSelected,setNewSelected]=useState(new Set())
    const [newSelected1, setNewSelected1] = useState(new Set())
    const [showTicket, setShowTickets] = useState(new Date())
    const currentDateTime= new Date();
    const ticketsToShow= 50;

    useEffect(()=>{
        setSelectedDrawDate(formatDate(showTicket))
        localStorage.setItem('showTicket', showTicket);
    }, [showTicket])

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
                setDisplayedTickets([])
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, allTickets, selectedDrawDate, showTicket]);

    const handlePrintSuccess = async () => {
        if (tempBillNo !== null) {
            await saveBillNumber(tempBillNo);
            setBillno(tempBillNo);
            await updateSelectedTicketsStatus(Array.from(selectedTickets))
            await handleBillsave(selectedTickets, tempBillNo, buyerName, pwtPrice, currentDateTime)
            setTempBillNo(null);
            setModalIsOpen(false)
            setBuyerName('')
            handleReset()
            await fetchTickets();
        }
    };

    const handleReset = () => {
        setSelectedTickets(new Set());
        setNewSelected(new Set())
        setNewSelected1(new Set())
        setFilterTicketData([])
        setAllTickets([])
        setSearchQuery('');
        setStart('');
        setEnd('');
    }

    function filterTicketsByRange(tickets, start, end) {
        if (start !== null && end !== null && (start.length && end.length)==2) {
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

    useEffect(()=>{
        const out = filterTicketsByRange(selectedTickets, start, end)
        setPrefixFilter(out)
    }, [start, end])
    
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

    const resetFilters =() => {
        if (newSelected.size > 0) {
            setNewSelected1(prevSelected => {
                const updatedSet = new Set(prevSelected); 
                newSelected.forEach(item => updatedSet.add(item));
                return updatedSet;
            });
            setStart('');
            setEnd('');
            setPrefixFilter([]);
        }else{
            return
        }
    };

    const handleFilter = () => {
        if (start && end) {
            setSelectedTickets(new Set())
            resetFilters()
        }else{
            setNewSelected1(prevSelected => {
                const updatedSet = new Set(prevSelected);
                selectedTickets.forEach(item => updatedSet.add(item));
                return updatedSet;
            });
            setSelectedTickets(new Set())
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

    useEffect(()=>{
        async function fetchbillno(){
            const billno = await getLastBillNumber()
            setBillno(billno)
          }
        fetchbillno()
    },[])

    useEffect(() => {
        if (isOpen && modalIsOpen == false) {
            async function fetchTickets(showTicket) {
                const ticketsFromDB = await getAllTicketsFromDB(showTicket);
                const unsoldTickets = ticketsFromDB.filter(ticket => ticket.state === true);
                if (unsoldTickets[0]?.ticketName === 'FIFTY-FIFTY'){
                    setSelectedPrice(Number(ticketprice[1]))
                }else{
                    setSelectedPrice(Number(ticketprice[0]))
                }
                setAllTickets(unsoldTickets);
            }
            fetchTickets(showTicket);
        }
    }, [isOpen, showTicket]);

    const searchTickets = useCallback((query, drawDate) => {
        if (query.trim() === '' && !drawDate) {
            setSearchResults([]);
            setDisplayedTickets([]);
            return;
        }

        const queryLowerCase = query.toLowerCase();
        let filteredTickets
        filteredTickets = allTickets.filter(ticket => {
            const [serialPart,numberPart] = queryLowerCase.split('-');
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
                acc[mainKey] = { info: { serialNumber, drawDate:ticket.drawDate, totalTickets: 0 }, subGroups: {} };
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
        if (newSelected.size < 1){
            console.log('1')
            setSelectedTickets(prevSelected => {
                const newSelected = new Set(prevSelected);
                if (groupKey) {
                    const [mainKey, subKey, groupIndex] = groupKey.split('|');
                    const mainGroup = searchResults.find(([key]) => key === mainKey);
                    if (mainGroup) {
                        let ticketsToToggle;
                        if (groupIndex !== undefined) {
                            console.log('2')
                            ticketsToToggle = groupTicketsInFives(mainGroup[1].subGroups[subKey])[parseInt(groupIndex)];
                        } else if (subKey) {
                            console.log('3')
                            ticketsToToggle = mainGroup[1].subGroups[subKey];
                        } else {
                        console.log('4')
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
        }else{
            setNewSelected(prevSelected => {
                const newSelected = new Set(prevSelected);
                if (groupKey) {
                    console.log(groupKey)
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
        if(newSelected1.size>0){
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

    const handleClose = ()=>{
        handleReset()
        setBuyerName('')
        setShowTickets(new Date())
        setSelectedDrawDate('')
        onClose()
    }

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

    const finalSortedSummary = generateSummary(selectedTickets, selectedPrice)
    
    return (
        isOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 max-w-7xl w-full flex">
                    <div className="w-36% pt-3 pb-3 pr-3">
                        <div className='flex flex-row justify-between'>
                            <h2 className="text-lg font-bold mb-4">Billing Information</h2>
                        </div>
                        <div className='flex flex-row gap-3'>
                            <div className="mb-4 flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search Ticket Serial..."
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 pr-8"
                                    />
                                    <div className="absolute top-1/2 transform -translate-y-1/2 right-2 text-gray-400 cursor-pointer">
                                        <FaSearch />
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <DatePicker
                                    selected={showTicket}
                                    onChange={date => setShowTickets(date)}
                                    className="w-28 px-2 py-2 border border-gray-300"
                                    dateFormat="dd/MM/yyyy"
                                />
                            </div>
                            
                            <div>
                                <button className='bg-[#dc3545] h-[40px] hover:bg-[#c82333] text-white font-bold py-2 px-4' onClick={handleReset}><FaTrash /></button>
                            </div>
                        </div>
                        {selectedTickets.size > 0 && selectedDrawDate !== ''  && (
                            <div className='flex flex-row gap-3'>
                                <div className="mb-4">
                                    <input type="text" placeholder="Start number" value={start} onChange={(event) => setStart(event.target.value)} className="w-full px-4 py-2 border border-gray-300" />
                                </div>
                                <div className="mb-4">
                                    <input type="text" placeholder="End number" value={end} onChange={(event)=>setEnd(event.target.value)} className="w-full px-4 py-2 border border-gray-300" />
                                </div>
                                <div className=''>
                                    <button className='bg-[#1a923e] hover:bg-[#1a923e] text-white font-bold py-3 px-3' onClick={handleFilter}><TiTickOutline /></button>
                                </div>
                            </div>
                        )}
                        <div className="mb-4">
                            <input type="text" placeholder="Enter Buyer's Name" value={buyerName} onChange={(event) => setBuyerName(event.target.value.toUpperCase())} className="w-full px-4 py-2 border border-gray-300" />
                        </div>
                        <div className="flex gap-2 mb-4">
                            {newprice ? (
                                <input
                                    type='Number'
                                    placeholder='Enter Ticket Price'
                                    onChange={(e) => setSelectedPrice(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <select
                                    value={selectedPrice}
                                        onChange={(e) => setSelectedPrice(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ticketprice.map((price, index) => (
                                        <option key={index} value={price}>
                                            ₹ {price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button onClick={() => setNewprice(!newprice)} className="px-4 py-2 text-black border font-bold hover:bg-blue-200 hover:text-white">
                                +
                            </button>
                        </div>
                        <div>
                            <input
                                type='Number'
                                placeholder='Price winning ticket'
                                onChange={(e) => setpwtPrice(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className='flex flex-row gap-3'>
                            <button onClick={handleClose} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4">Close</button>
                            {(selectedTickets.size > 0 || newSelected1.size> 0 ) && buyerName.trim() !== '' &&
                                <button onClick={handleOpenmodal} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4">show bill slip</button>}
                        </div>
                        <div>
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
                    </div>
                    <div className="w-32% p-4 border-l border-gray-200">
                        <h2 className="text-lg font-bold mb-4">Search Results</h2>
                        <div className="max-h-96 overflow-y-auto">
                            {displayedTickets.length > 0 && newSelected.size< 1 && filterTicketData.length< 1 ? (
                                <div>
                                    {displayedTickets.map(([mainKey, groupData]) => (
                                        <div key={mainKey} className="my-2 border border-gray-200 p-2">
                                            <div className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Object.values(groupData.subGroups).flat().every(t => selectedTickets.has(t))}
                                                    onChange={() => handleSelectTicket(null, mainKey)}
                                                    className="mr-2 w-6 h-6"
                                                />
                                                <span onClick={() => handleGroupExpand(mainKey)} className="flex-grow">
                                                    {expandedGroups.has(mainKey) ? '▼' : '▶'}{' '}{mainKey}
                                                    {groupData && groupData.info ?
                                                        `(${groupData.info.totalTickets} tickets) [Serial: ${groupData.info.serialNumber}, Draw Date: ${formatDate(groupData.info.drawDate)}]`
                                                        : '(No info available)'}
                                                </span>
                                            </div>
                                            {expandedGroups.has(mainKey) && (
                                                <div className="ml-6 mt-2">
                                                    {Object.entries(groupData.subGroups).map(([subKey, tickets]) => (
                                                        <div key={subKey} className="my-1">
                                                            <div className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={tickets.every(t => selectedTickets.has(t))}
                                                                    onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}`)}
                                                                    className="mr-2 w-6 h-6"
                                                                />
                                                                <span onClick={() => handleGroupExpand(`${mainKey}-${subKey}`)} className="flex-grow">
                                                                    {expandedGroups.has(`${mainKey}-${subKey}`) ? '▼' : '▶'}{' '}{subKey}
                                                                </span>
                                                            </div>
                                                            {expandedGroups.has(`${mainKey}-${subKey}`) && (
                                                                <div className="ml-6 mt-2">
                                                                    {groupTicketsInFives(tickets).map((ticketGroup, groupIndex) => (
                                                                        <div key={groupIndex} className="my-1">
                                                                            <div className="flex items-center cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={ticketGroup.every(t => selectedTickets.has(t))}
                                                                                    onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}|${groupIndex}`)}
                                                                                    className="mr-2 w-6 h-6"
                                                                                />
                                                                                <span onClick={() => handleGroupExpand(`${mainKey}-${subKey}-${groupIndex}`)}>
                                                                                    {expandedGroups.has(`${mainKey}-${subKey}-${groupIndex}`) ? '▼' : '▶'}{' '}
                                                                                    {ticketGroup[0].serial}-{ticketGroup[0].number} to {ticketGroup[ticketGroup.length - 1].serial}-{ticketGroup[ticketGroup.length - 1].number}
                                                                                </span>
                                                                            </div>
                                                                            {expandedGroups.has(`${mainKey}-${subKey}-${groupIndex}`) && (
                                                                                <div className="ml-6 mt-2">
                                                                                    {ticketGroup.map((ticket, ticketIndex) => (
                                                                                        <div key={ticketIndex} className="my-1">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selectedTickets.has(ticket)}
                                                                                                onChange={() => handleSelectTicket(ticket)}
                                                                                                className="mr-2 w-6 h-6"
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
                                        <button onClick={handleLoadMore} className="text-blue-500 hover:text-blue-700 cursor-pointer mt-2">Load More</button>
                                    )}
                                </div>
                            ) : (prefixFilter && prefixFilter.length > 1 ? (
                                    <div>
                                            {filterTicketData.map(([mainKey, groupData]) => (
                                                <div key={mainKey} className="my-2 border border-gray-200 p-2">
                                                    <div className="flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={Object.values(groupData.subGroups)
                                                                .flat()
                                                                .every(t => newSelected.has(t))}
                                                            onChange={() => handleSelectTicket(null, mainKey)}
                                                            className="mr-2"
                                                        />
                                                        <span onClick={() => handleGroupExpand(mainKey)} className="flex-grow">
                                                            {expandedGroups.has(mainKey) ? '▼' : '▶'}{' '}{mainKey}
                                                            {groupData && groupData.info ?
                                                                `(${groupData.info.totalTickets} tickets) [Serial: ${groupData.info.serialNumber}, Draw Date: ${formatDate(groupData.info.drawDate)}]`
                                                                : '(No info available)'}
                                                        </span>
                                                    </div>
                                                    {expandedGroups.has(mainKey) && (
                                                        <div className="ml-6 mt-2">
                                                            {Object.entries(groupData.subGroups).map(([subKey, tickets], groupIndex) => (
                                                                <div key={subKey} className="my-1">
                                                                    <div className="flex items-center cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={tickets.every(t => newSelected.has(t))}
                                                                            onChange={() => handleSelectTicket(null, `${mainKey}|${subKey}`)}
                                                                            className="mr-2"
                                                                        />
                                                                        <span onClick={() => handleGroupExpand(`${mainKey}-${subKey}-${groupIndex}`)} className="flex-grow">
                                                                            {subKey}
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
                                    <p className="text-gray-500 text-sm">Enter ticket serial, number, draw date, or ID</p>
                                )
                            )}
                        </div>
                    </div>
                    {/* <div className="w-52 p-4 border-l border-gray-200">
                        <SelectedTickets
                            tickets={newSelected1.size > 0 ? newSelected1 : selectedTickets}
                            onRemove={handleRemoveSelectedTickets}
                        />
                    </div> */}
                </div>
            </div>
        )
    );
};

export default BillingModal;