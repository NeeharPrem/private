import { openDB } from 'idb';

const DB_NAME = 'lotteryPricesDB';
const STORE_NAME = 'prices';

async function initDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('name', 'name', { unique: true });
                store.createIndex('price', 'price');
                store.createIndex('createdAt', 'createdAt');
                store.createIndex('updatedAt', 'updatedAt');
            }
        },
    });
}

// Add a new price
async function addPrice(priceData) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    if (!priceData.name || priceData.price === undefined) {
        throw new Error('Name and price are required');
    }

    const priceValue = parseFloat(priceData.price);
    if (isNaN(priceValue)) {
        throw new Error('Price must be a valid number');
    }

    const timestamp = new Date();
    const newPrice = {
        name: priceData.name.trim(),
        price: priceValue,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await store.add(newPrice);
    await tx.done;
    return { success: true, message: 'Price added successfully' };
}

// Update an existing price
async function updatePrice(id, priceData) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Get the existing price
    const existingPrice = await store.get(id);
    if (!existingPrice) {
        throw new Error('Price not found');
    }

    // Validate input
    if (priceData.name !== undefined && !priceData.name.trim()) {
        throw new Error('Name cannot be empty');
    }

    let priceValue = existingPrice.price;
    if (priceData.price !== undefined) {
        priceValue = parseFloat(priceData.price);
        if (isNaN(priceValue)) {
            throw new Error('Price must be a valid number');
        }
    }

    const updatedPrice = {
        ...existingPrice,
        name: priceData.name || existingPrice.name,
        price: priceValue,
        updatedAt: new Date()
    };

    await store.put(updatedPrice);
    await tx.done;
    return { success: true, message: 'Price updated successfully' };
}

// Delete a price
async function deletePrice(id) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Verify the price exists
    const existingPrice = await store.get(id);
    if (!existingPrice) {
        throw new Error('Price not found');
    }

    await store.delete(id);
    await tx.done;
    return { success: true, message: 'Price deleted successfully' };
}

// Get all prices
async function getAllPrices() {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const prices = await store.getAll();
    await tx.done;
    return prices;
}

// Get price by name
async function getPriceByName(name) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const nameIndex = store.index('name');
    const price = await nameIndex.get(name.trim());
    await tx.done;
    return price;
}

// Get price by ID
async function getPriceById(id) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const price = await store.get(id);
    await tx.done;
    return price;
}

// Clear all prices (for testing/reset purposes)
async function clearAllPrices() {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    await tx.done;
    return { success: true, message: 'All prices cleared' };
}

export {
    addPrice,
    updatePrice,
    deletePrice,
    getAllPrices,
    getPriceByName,
    getPriceById,
    clearAllPrices
};