import { openDB } from 'idb';

const DB_NAME = 'lotteryDB';
const STORE_NAME = 'tickets';

async function initializeDB() {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        },
    });
    return db;
}

async function saveTicketsToDB(tickets) {
    const db = await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const ticket of tickets) {
        const existingTicket = await store.get(ticket.id);
        if (!existingTicket) {
            store.add(ticket);
        }
    }
    await tx.done;
}


async function getAllTicketsFromDB() {
    const db = await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return store.getAll();
}

async function updateTicketInDB(ticket) {
    const db = await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put(ticket);

    await tx.done;
}

async function deleteTicketFromDB(ticketId) {
    const db = await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.delete(ticketId);

    await tx.done;
}

export { initializeDB, saveTicketsToDB, getAllTicketsFromDB, updateTicketInDB, deleteTicketFromDB };