function getCachedData(storeName) {
    return new Promise((resolve, reject) => {
      if (window.cachedData && window.cachedData[storeName]) {
        resolve(window.cachedData[storeName]);
        return;
      }
      openDB(() => {
        const tx = db.transaction([storeName], "readonly");
        const store = tx.objectStore(storeName);
        store.getAll().onsuccess = (e) => {
          if (!window.cachedData) window.cachedData = {};
          window.cachedData[storeName] = e.target.result;
          resolve(e.target.result);
        };
      });
    });
  }
  

  function getUserDetails(userId) {
    return new Promise((resolve, reject) => {
      getCachedData("users").then(users => {
        const user = users.find(u => u.user_id === userId);
        if (user) {
          resolve(user);
        } else {
          openDB(() => {
            const tx = db.transaction(["users"], "readonly");
            const store = tx.objectStore("users");
            store.get(userId).onsuccess = (e) => resolve(e.target.result);
          });
        }
      });
    });
  }
  

  function getVehicleDetails(vehicleId) {
    return new Promise((resolve, reject) => {
      getCachedData("vehicles").then(vehicles => {
        const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
        if (vehicle) {
          resolve(vehicle);
        } else {
          openDB(() => {
            const tx = db.transaction(["vehicles"], "readonly");
            const store = tx.objectStore("vehicles");
            store.get(vehicleId).onsuccess = (e) => resolve(e.target.result);
          });
        }
      });
    });
  }
  

  function loadTotalUsers(callback) {
    getCachedData("users").then(users => callback(users.length));
  }
  function loadTotalVehicles(callback) {
    getCachedData("vehicles").then(vehicles => callback(vehicles.length));
  }
  function loadTotalBookings(callback) {
    getCachedData("bookings").then(bookings => callback(bookings.length));
  }
  function loadTotalBids(callback) {
    getCachedData("bidding").then(bids => callback(bids.length));
  }
  function loadTotalMessages(callback) {
    getCachedData("messages").then(messages => callback(messages.length));
  }
  

  function preloadSellerVehicles(sellerId) {
    return new Promise((resolve, reject) => {
      openDB(() => {
        const tx = db.transaction(["vehicles"], "readonly");
        const store = tx.objectStore("vehicles");
        store.getAll().onsuccess = (e) => {
          const allVehicles = e.target.result;
          const sellerVehicles = allVehicles.filter(v => v.vehicle_owner_id === sellerId);
          resolve(sellerVehicles);
        };
      });
    });
  }
  
  window.analyticsUtils = {
    getCachedData,
    getUserDetails,
    getVehicleDetails,
    loadTotalUsers,
    loadTotalVehicles,
    loadTotalBookings,
    loadTotalBids,
    loadTotalMessages,
    preloadSellerVehicles
  };
  