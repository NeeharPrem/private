import React, { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import Modal from 'react-modal';
import Barcode from 'react-barcode';

const modalStyles = {
    overlay: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        width: '80%',
        height: '80%',
        padding: '20px',
        overflow: 'hidden',
    },
};

const styles = {
    page: {
        fontFamily: 'Helvetica, Arial, sans-serif,Times-New-Roman',
        padding: '10px',
        maxWidth: '400px',
        margin: '0 auto',
        fontSize: '10px',
    },
    header: {
        marginBottom: '5px',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
    },
    subheader: {
        textAlign: 'center',
        fontSize: '12px',
        marginBottom: '10px',
    },
    infoColumn: {
        flex: '1',
        fontSize: '10px',
    },
    boldText: {
        fontWeight: 'bold',
        fontSize: '11px',
    },
    borderBottom: {
        borderBottom: '1px dashed black',
        margin: '5px 0',
    },
    ticketSection: {
        marginBottom: '8px',
    },
    ticketHeader: {
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '3px',
    },
    groupSection: {
        marginLeft: '10px',
        marginBottom: '5px',
    },
    seriesText: {
        fontWeight: 'bold',
        marginBottom: '3px',
        fontSize: '10px',
    },
    rangeTable: {
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
    },
    tableHeader: {
        borderBottom: '1px solid black',
        textAlign: 'left',
        padding: '2px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
    },
    drawHeader: {
        borderBottom: '1px solid black',
        textAlign: 'left',
        padding: '2px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
    },
    valueHeader: {
        borderBottom: '1px solid black',
        textAlign: 'center',
        padding: '2px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        padding: '4px',
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        whiteSpace: 'wrap',
        fontWeight: 'bold',
        textOverflow: 'ellipsis',
    },
    tableDraw: {
        padding: '3px',
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        whiteSpace: 'wrap',
        fontWeight: 'bold',
        textOverflow: 'ellipsis',
    },
    tablegrpCell: {
        padding: '4px',
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        whiteSpace: 'wrap',
        fontWeight: 'bold',
        textOverflow: 'ellipsis',
    },
    tableqtyCell: {
        padding: '4px',
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        whiteSpace: 'wrap',
        fontWeight: 'bold',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    tabletotalCell: {
        padding: '0px',
        fontFamily: 'Courier, monospace',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        fontWeight: 'bold',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    tabletkCell: {
        padding: '4px',
        fontFamily: 'Courier, monospace',
        fontSize: '15px',
        whiteSpace: 'wrap',
        fontWeight: 'bold',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    colNo: { width: '8%' },
    colDraw: { width: '120%' },
    colQty: { width: '17%' },
    colRate: { width: '23%' },
    colValue: { width: '35%' },
    buttonContainer: {
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        zIndex: '10',
        padding: '10px 20px',
        borderTop: '1px solid #ccc',
    },
    button: {
        padding: '10px 20px',
        cursor: 'pointer',
    },
    printHide: {
        '@media print': {
            display: 'none',
        },
    },
    contentContainer: {
        height: 'calc(100% - 60px)',
        overflowY: 'auto',
        paddingBottom: '60px',
    },
};

const PrintableContent = forwardRef(({ ticketSummary, currentDateTime, name, pwt, billno, total, setTotal }, ref) => {
    const contentRef = useRef();
    console.log(ticketSummary)
    const safeSummary = Array.isArray(ticketSummary) ? ticketSummary : [ticketSummary];

    useImperativeHandle(ref, () => ({
        print: () => contentRef.current,
    }));

    const formattedDate = (date) => {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const period = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        const out = `${hours}.${minutes} ${period}`;
        return out;
    }
    let out = formattedDate(currentDateTime)

    useEffect(() => {
        const calculateTotal = (items) => {
            return items.reduce((acc, item) => {
                const groupTotal = (item.groups || []).reduce((groupAcc, group) => {
                    return groupAcc + (group.ranges || group.details || []).reduce((rangeAcc, range) => {
                        return rangeAcc + (range.count || 0) * (range.price || 0);
                    }, 0);
                }, 0);
                return acc + groupTotal;
            }, 0);
        };

        const newTotal = calculateTotal(safeSummary);
        setTotal(newTotal);
    }, [ticketSummary, setTotal]);

    const calculatePayable = (item) => {
        return pwt ? total - pwt : total;
    };

    const calculateTotalQuantity = (items) => {
        return items.reduce((acc, item) => {
            const groupQuantity = (item.groups || []).reduce((groupAcc, group) => {
                return groupAcc + (group.ranges || group.details || []).reduce((rangeAcc, range) => {
                    return rangeAcc + (range.totalCount || 0);
                }, 0);
            }, 0);
            return acc + groupQuantity;
        }, 0);
    };

    function formatDate(date) {
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    return (
        <div ref={contentRef} id="print-content" style={styles.page}>
            <div style={styles.header}>Devan Lottery Agency</div>
            <div style={styles.subheader}>Mambaram, Mob: 9497050070, 8848578005</div>

            <div className='flex justify-between'>
                <div style={styles.infoColumn}>
                    <p><span style={styles.boldText}>Bill no : </span><span style={styles.boldText}>{billno}</span></p>
                    <p><span style={styles.boldText}>Name: </span><span style={styles.boldText}>{name}</span></p>
                </div>
                <div className='item-end'>
                    <p><span style={styles.boldText}>Date:</span> {formatDate(currentDateTime)}</p>
                    <p><span style={styles.boldText}></span> {out}</p>
                </div>
            </div>

            <div style={styles.borderBottom} />

            <table style={styles.rangeTable}>
                <thead>
                    <tr>
                        <th style={{ ...styles.tableHeader, ...styles.colNo }}>No</th>
                        <th style={{ ...styles.drawHeader, ...styles.colDraw }}>Lottery Draw</th>
                        <th style={{ ...styles.tableHeader, ...styles.colQty }}>Qty</th>
                        <th style={{ ...styles.tableHeader, ...styles.colRate }}>Rate</th>
                        <th style={{ ...styles.valueHeader, ...styles.colValue }}>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {safeSummary.map((item, index) => (
                        <React.Fragment key={index}>
                            <tr>
                                <td style={{ ...styles.tableCell, ...styles.colNo }}>{index + 1}.</td>
                                <td style={{ ...styles.tableDraw, ...styles.colDraw }}>
                                    {item.ticketname} {item.serialNum}-{item.drawDate}
                                </td>
                                <td style={{ ...styles.tableCell, ...styles.colQty }}></td>
                                <td style={{ ...styles.tableCell, ...styles.colRate }}></td>
                                <td style={{ ...styles.tableCell, ...styles.colValue }}></td>
                            </tr>
                            {(item.groups || []).map((group, groupIndex) => (
                                <React.Fragment key={groupIndex}>
                                    <tr>
                                        <td style={{ ...styles.tableCell, ...styles.colNo }}></td>
                                        <td style={{ ...styles.tablegrpCell, ...styles.colDraw }}>
                                            ({group.details[0].series || item.series})
                                        </td>
                                        <td style={{ ...styles.tableCell, ...styles.colQty }}></td>
                                        <td style={{ ...styles.tableCell, ...styles.colRate }}></td>
                                        <td style={{ ...styles.tableCell, ...styles.colValue }}></td>
                                    </tr>
                                    {(group.ranges || group.details || []).map((range, rangeIndex) => (
                                        <tr key={rangeIndex}>
                                            <td style={{ ...styles.tableCell, ...styles.colNo }}></td>
                                            <td style={{ ...styles.tabletkCell, ...styles.colDraw }}>
                                                {`${range.startNumber}-${range.endNumber}`}
                                            </td>
                                            <td style={{ ...styles.tableqtyCell, ...styles.colQty }}>
                                                {(range.count || 0).toString().padStart(3, ' ')}
                                            </td>
                                            <td style={{ ...styles.tableCell, ...styles.colRate }}>
                                                {(group.price || 0).toFixed(2)}
                                            </td>
                                            <td style={{ ...styles.tableCell, ...styles.colValue }}>
                                                {((range.count || 0) * (group.price || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                    <tr>
                        <td colSpan="5" style={{ ...styles.tableCell, borderTop: '1px solid black' }}></td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.tableCell, ...styles.colNo }}></td>
                        <td style={{ ...styles.tabletotalCell, ...styles.colTotal }}>Total</td>
                        <td style={{ ...styles.tableCell, ...styles.colQty }}>{calculateTotalQuantity(safeSummary)}</td>
                        <td style={{ ...styles.tableCell, ...styles.colRate }}></td>
                        <td style={{ ...styles.tabletotalCell, ...styles.colValue }}>₹{total.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colSpan="5" style={{ ...styles.tableCell, borderTop: '1px solid black' }}></td>
                    </tr>
                </tbody>
            </table>
            <div className='flex flex-row justify-between'>
                <div>
                    <p className='text-black text-[13px]'>PWT : ₹ <span className='text-black text-sm font-semibold'>{pwt}</span></p>
                    <p className='text-black text-[13px]'>Total Payable Amount : ₹ <span className='text-black text-sm font-semibold'>{calculatePayable(safeSummary[0]).toFixed(2)}</span></p>
                    <p className='text-black text-[13px] mt-1'>DC shall be claimed within 30 days</p>
                </div>
                <div className='mt-5'>
                    <Barcode value={billno.toString()} height={30} format="CODE39" displayValue={false} />
                </div>
            </div>
        </div>
    );
});

const SlipModal = ({ isOpen, onRequestClose, ticketSummary, currentDateTime, name, pwt, billno, onPrintSuccess }) => {
    const printableRef = useRef();
    const [currentBillNo, setCurrentBillNo] = useState(billno);
    const [isPrinting, setIsPrinting] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setCurrentBillNo(billno);
    }, [billno]);

    const handlePrint = async () => {
        console.log('handlePrint called');
        setIsPrinting(true);
        try {
            const content = document.getElementById('print-content');
            if (!content) {
                throw new Error('Print content not found');
            }
            const htmlContent = content.outerHTML;
            const printResult = await window.electronAPI.print(htmlContent);
            console.log('print result:', printResult);

            const pdfResult = await window.electronAPI.printToPDF({
                fileName: `${currentBillNo}_${name}.pdf`,
                htmlContent: htmlContent
            });
            console.log('printToPDF result:', pdfResult);

            if (printResult.success && pdfResult.success) {
                console.log('Print initiated and PDF generated successfully');
                await onPrintSuccess();
            } else {
                console.error('Printing or PDF generation failed:', printResult.error || pdfResult.error);
            }
        } catch (error) {
            console.error('Error in handlePrint:', error);
        } finally {
            setIsPrinting(false);
        }
    };

    useEffect(() => {
        const printReplyHandler = (event, result) => {
            if (result.success) {
                console.log('Print successful:', result.message);
            } else {
                console.error('Print failed:', result.error);
            }
        };

        const removeListener = window.electronAPI.onPrintReply(printReplyHandler);
        return () => removeListener();
    }, []);

    if (!ticketSummary || (Array.isArray(ticketSummary) && ticketSummary.length === 0)) {
        return (
            <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={modalStyles}>
                <div style={styles.page}>
                    <p>No data available</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onRequestClose={onRequestClose} style={modalStyles}>
            <div style={styles.contentContainer}>
                <PrintableContent
                    ref={printableRef}
                    ticketSummary={ticketSummary}
                    currentDateTime={currentDateTime}
                    name={name}
                    pwt={pwt}
                    billno={isPrinting ? currentBillNo : billno}
                    total={total}
                    setTotal={setTotal}
                />
            </div>
            <div style={{ ...styles.buttonContainer, ...styles.printHide }}>
                <button onClick={handlePrint} style={styles.button}>Print</button>
                <button onClick={onRequestClose} style={styles.button}>Edit</button>
            </div>
        </Modal>
    );
};

export default SlipModal;