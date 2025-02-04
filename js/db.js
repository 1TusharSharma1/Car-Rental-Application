const DB_NAME = "CarRentalDB";
const DB_VERSION = 4;

let db;

function openDB(callback) {
    if (db) {
        console.log("📌 IndexedDB already initialized.");
        if (callback) callback();
        return;
    }

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = function (event) {
    const db = event.target.result;

    // 1) USERS
    if (!db.objectStoreNames.contains("users")) {
      const usersStore = db.createObjectStore("users", { keyPath: "user_id" });
  
      usersStore.createIndex("address_id", "address_id", { unique: false });
      usersStore.createIndex("email", "email", { unique: true });
    }

    // 2) ADDRESSES
    if (!db.objectStoreNames.contains("addresses")) {
      db.createObjectStore("addresses", { keyPath: "address_id" });
    }

    // 3) CATEGORIES
    if (!db.objectStoreNames.contains("categories")) {
      const catStore = db.createObjectStore("categories", {
        keyPath: "category_id",
      });
      catStore.createIndex("supercategory_id", "supercategory_id", {
        unique: false,
      });
    }

    // 4) SUPER CATEGORIES
    if (!db.objectStoreNames.contains("superCategories")) {
      db.createObjectStore("superCategories", { keyPath: "supercategory_id" });
    }

    // 5) VEHICLES
    if (!db.objectStoreNames.contains("vehicles")) {
      const vehiclesStore = db.createObjectStore("vehicles", {
        keyPath: "vehicle_id",
      });
      vehiclesStore.createIndex("vehicle_owner_id", "vehicle_owner_id", {
        unique: false,
      });
      vehiclesStore.createIndex("category_id", "category_id", {
        unique: false,
      });
      // vehiclesStore.createIndex("location", "location", { 
      //   unique: false 
      // });

     
    }

    // 6) BOOKINGS
    if (!db.objectStoreNames.contains("bookings")) {
      const bookingsStore = db.createObjectStore("bookings", {
        keyPath: "booking_id",
      });
      bookingsStore.createIndex("renter_id", "renter_id", { unique: false });
      bookingsStore.createIndex("seller_id", "seller_id", { unique: false });
      bookingsStore.createIndex("vehicle_id", "vehicle_id", { unique: false });
      bookingsStore.createIndex("bid_id", "bid_id", { unique: false });
    }

    // 7) REVIEWS
    if (!db.objectStoreNames.contains("reviews")) {
      const reviewsStore = db.createObjectStore("reviews", {
        keyPath: "review_id",
      });
      reviewsStore.createIndex("user_id", "user_id", { unique: false });
      reviewsStore.createIndex("vehicle_id", "vehicle_id", { unique: false });
    }

    // 8) MESSAGES
    if (!db.objectStoreNames.contains("messages")) {
      const messagesStore = db.createObjectStore("messages", {
        keyPath: "message_id",
      });
      messagesStore.createIndex("sender_id", "sender_id", { unique: false });
      messagesStore.createIndex("receiver_id", "receiver_id", {
        unique: false,
      });
      messagesStore.createIndex("vehicle_id", "vehicle_id", { unique: false });
      messagesStore.createIndex("timestamp", "timestamp", { unique: false });
    }

    // 9) BIDDING
    if (!db.objectStoreNames.contains("bidding")) {
      const biddingStore = db.createObjectStore("bidding", {
        keyPath: "bid_id",
      });
      biddingStore.createIndex("vehicle_id", "vehicle_id", { unique: false });
      biddingStore.createIndex("bidder_id", "bidder_id", { unique: false });
      biddingStore.createIndex("seller_id", "seller_id", { unique: false });
      biddingStore.createIndex("bid_date", "bid_date", { unique: false });
    }
  };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("✅ Database Connected:", db.name);
        if (callback) callback();
    };
    
  request.onerror = function (event) {
    console.error("Error opening IndexedDB:", event.target.error);
  };
}

openDB();
