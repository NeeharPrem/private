import { useMemo } from 'react';
import { formatDate } from './fortmatDate'

// const createTicketSummary = (selectedTickets, selectedPrice) => {
//     const seriesSummary = Array.from(selectedTickets).reduce((acc, ticket) => {
//         const identifierParts = ticket.identifier.split('-');
//         const arrayLength = identifierParts.length;
//         console.log(`The length of the array is: ${arrayLength}`);
//         const [, , , , ticketname, , drawDate] = identifierParts;
//         const seriesKey = `${ticketname}-${ticket.serialNumber}`;

//         if (!acc[seriesKey]) {
//             acc[seriesKey] = {
//                 ticketname: ticket.ticketname,
//                 drawDate: formatDate(ticket.drawDate),
//                 serialNum: ticket.serialNumber,
//                 seriesRanges: {}
//             };
//         }

//         if (!acc[seriesKey].seriesRanges[ticket.serial]) {
//             acc[seriesKey].seriesRanges[ticket.serial] = [];
//         }
//         acc[seriesKey].seriesRanges[ticket.serial].push(ticket.number);
//         return acc;
//     }, {});

//     Object.keys(seriesSummary).forEach(seriesKey => {
//         const group = seriesSummary[seriesKey];
//         const allRanges = {};
//         Object.entries(group.seriesRanges).forEach(([series, numbers]) => {
//             const sortedNums = [...numbers].sort((a, b) => a - b);
//             let start = sortedNums[0];
//             let prev = start;

//             for (let i = 1; i <= sortedNums.length; i++) {
//                 if (i === sortedNums.length || sortedNums[i] > prev + 1) {
//                     const rangeKey = `${start}-${prev}`;
//                     if (!allRanges[rangeKey]) {
//                         allRanges[rangeKey] = {
//                             startNumber: start.toString(),
//                             endNumber: prev.toString(),
//                             series: {},
//                             serialNum: group.serialNum,
//                             price: Number(selectedPrice)
//                         };
//                     }
//                     allRanges[rangeKey].series[series] =
//                         (prev - start + 1);

//                     if (i < sortedNums.length) {
//                         start = sortedNums[i];
//                         prev = start;
//                     }
//                 } else {
//                     prev = sortedNums[i];
//                 }
//             }
//         });

//         group.ranges = allRanges;
//         delete group.seriesRanges;
//     });

//     return seriesSummary;
// };


const createTicketSummary = (selectedTickets, selectedPrice) => {
    const seriesSummary = Array.from(selectedTickets).reduce((acc, ticket) => {
        const identifierParts = ticket.identifier.split('-');
        const [, , startNumber, endNumber, ticketname, , drawDate] = identifierParts;

        const seriesKey = `${ticketname}-${ticket.serialNumber}-${drawDate}`;

        if (!acc[seriesKey]) {
            acc[seriesKey] = {
                ticketname: ticket.ticketname,
                drawDate: formatDate(ticket.drawDate),
                serialNum: ticket.serialNumber,
                allSeries: new Set(),
                ranges: {}
            };
        }

        acc[seriesKey].allSeries.add(ticket.serial);

        if (!acc[seriesKey].ranges[startNumber]) {
            acc[seriesKey].ranges[startNumber] = {
                startNumber,
                endNumber,
                seriesRanges: {}
            };
        }

        if (!acc[seriesKey].ranges[startNumber].seriesRanges[ticket.serial]) {
            acc[seriesKey].ranges[startNumber].seriesRanges[ticket.serial] = [];
        }
        acc[seriesKey].ranges[startNumber].seriesRanges[ticket.serial].push(ticket.number);

        return acc;
    }, {});


    Object.keys(seriesSummary).forEach(seriesKey => {
        const group = seriesSummary[seriesKey];

        group.series = Array.from(group.allSeries).sort();
        delete group.allSeries;

        const processedRanges = Object.values(group.ranges).map(range => {
            const allRanges = {};
            Object.entries(range.seriesRanges).forEach(([series, numbers]) => {
                const sortedNums = [...numbers].sort((a, b) => a - b);
                let start = sortedNums[0];
                let prev = start;

                for (let i = 1; i <= sortedNums.length; i++) {
                    if (i === sortedNums.length || sortedNums[i] > prev + 1) {
                        const rangeKey = `${start}-${prev}`;
                        if (!allRanges[rangeKey]) {
                            allRanges[rangeKey] = {
                                startNumber: start.toString(),
                                endNumber: prev.toString(),
                                series: {},
                                count: 0
                            };
                        }
                        allRanges[rangeKey].series[series] = (prev - start + 1);
                        allRanges[rangeKey].count += (prev - start + 1);

                        if (i < sortedNums.length) {
                            start = sortedNums[i];
                            prev = start;
                        }
                    } else {
                        prev = sortedNums[i];
                    }
                }
            });

            return {
                startNumber: range.startNumber,
                endNumber: range.endNumber,
                details: Object.values(allRanges)
            };
        });

        group.processedRanges = processedRanges;
        delete group.ranges;
    });

    return seriesSummary;
};

const createFinalSummary = (summary, selectedPrice) => {
    return Object.values(summary).map(item => ({
        ticketname: item.ticketname,
        drawDate: item.drawDate,
        serialNum: item.serialNum,
        series: item.series.join(','),
        groups: item.processedRanges.map(range => ({
            startNumber: range.startNumber,
            endNumber: range.endNumber,
            details: range.details.map(detail => ({
                startNumber: detail.startNumber,
                endNumber: detail.endNumber,
                series: Object.keys(detail.series).join(','),
                count: detail.count
            })),
            totalCount: range.details.reduce((sum, detail) => sum + detail.count, 0),
            price: Number(selectedPrice)
        }))
    }));
};

export const generateSummary = (selectedTickets, selectedPrice) => {
    return useMemo(() => {
        const summary = createTicketSummary(selectedTickets, selectedPrice);
        return createFinalSummary(summary, selectedPrice);
    }, [selectedTickets, selectedPrice]);
};