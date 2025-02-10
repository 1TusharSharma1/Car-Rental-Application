document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    let sellerId = urlParams.get("sellerId");
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    
    if (!sellerId) {
      if (
        !loggedInUser ||
        !loggedInUser.user_id ||
        !loggedInUser.user_role ||
        !loggedInUser.user_role.includes("seller")
      ) {
        console.error("Access denied: Only sellers can access this page.");
        window.location.href = "login.html";
        return;
      }
      sellerId = loggedInUser.user_id;
    }
    window.sellerId = sellerId;
    
    analyticsUtils.preloadSellerVehicles(sellerId).then((vehicles) => {
      window.cachedSellerVehicles = vehicles;
      loadSellerAnalytics();
    });
  });
  
  function loadSellerAnalytics() {
    displayListingToFirstBooking();
    displayAvgBookingDuration();
    displayMostQueried();
    drawActiveLocationChart();
    drawPriceCompetitivenessChart();
    drawMostBiddedChart();
    drawBidVsRentalChart();
    drawMostRentedChart();
    displayTotalRevenue();
    drawConversionRateChart();
  }
  
  function drawActiveLocationChart() {
    const vehicles = window.cachedSellerVehicles || [];
    const locationCounts = {};
    vehicles.forEach(v => {
      const loc = v.location || "Unknown";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const labels = Object.keys(locationCounts);
    const data = labels.map(label => locationCounts[label]);
    const ctx = document.getElementById("activeLocationChart").getContext("2d");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ["#3498db", "#2ecc71", "#e74c3c", "#f1c40f", "#9b59b6"]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }
  
  function drawPriceCompetitivenessChart() {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      store.getAll().onsuccess = (e) => {
        const allVehicles = e.target.result;
        const marketPrices = allVehicles.map(v => Number(v.minimum_rental_price) || 0);
        const marketAvg = marketPrices.length > 0 ? marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length : 0;
    
        const sellerVehicles = window.cachedSellerVehicles || [];
        const sellerPrices = sellerVehicles.map(v => Number(v.minimum_rental_price) || 0);
        const sellerAvg = sellerPrices.length > 0 ? sellerPrices.reduce((a, b) => a + b, 0) / sellerPrices.length : 0;
    
        const ctx = document.getElementById("priceCompetitivenessChart").getContext("2d");
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Your Avg Price", "Market Avg Price"],
            datasets: [{
              label: "Min Rental Price",
              data: [sellerAvg.toFixed(2), marketAvg.toFixed(2)],
              backgroundColor: ["#2ecc71", "#e74c3c"]
            }]
          },
          options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
      };
    });
  }
  
  function drawMostBiddedChart() {
    const sellerVehicles = window.cachedSellerVehicles || [];
    const vehicleBidsCount = {};
    let promises = sellerVehicles.map(vehicle => {
      return new Promise((resolve) => {
        const tx = db.transaction(["bidding"], "readonly");
        const store = tx.objectStore("bidding");
        store.index("vehicle_id").getAll(vehicle.vehicle_id).onsuccess = (e) => {
          vehicleBidsCount[vehicle.vehicle_model] = (e.target.result || []).length;
          resolve();
        };
      });
    });
    Promise.all(promises).then(() => {
      const sorted = Object.entries(vehicleBidsCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const labels = sorted.map(item => item[0]);
      const data = sorted.map(item => item[1]);
      const ctx = document.getElementById("mostBiddedChart").getContext("2d");
      new Chart(ctx, {
        type: "pie",
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: ["#f1c40f", "#e74c3c", "#3498db"]
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } }
        }
      });
    });
  }
  
  function drawBidVsRentalChart() {
    const sellerVehicles = window.cachedSellerVehicles || [];
    const rentalPrices = sellerVehicles.map(v => Number(v.minimum_rental_price) || 0);
    const avgBids = [];
    let promises = sellerVehicles.map(v => {
      return new Promise((resolve) => {
        const tx = db.transaction(["bidding"], "readonly");
        const store = tx.objectStore("bidding");
        store.index("vehicle_id").getAll(v.vehicle_id).onsuccess = (e) => {
          const bids = e.target.result;
          const avgBid = bids.length > 0 ? bids.reduce((sum, b) => sum + Number(b.bid_amount), 0) / bids.length : 0;
          avgBids.push(avgBid);
          resolve();
        };
      });
    });
    Promise.all(promises).then(() => {
      const ctx = document.getElementById("bidVsRentalChart").getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: sellerVehicles.map(v => v.vehicle_model),
          datasets: [
            {
              label: "Min Rental Price",
              data: rentalPrices,
              backgroundColor: "#e74c3c"
            },
            {
              label: "Avg Bid Amount",
              data: avgBids,
              backgroundColor: "#2ecc71"
            }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    });
  }
  
  function drawMostRentedChart() {
    const sellerVehicles = window.cachedSellerVehicles || [];
    const sellerVehicleIds = sellerVehicles.map(v => v.vehicle_id);
    const tx = db.transaction(["bookings"], "readonly");
    const store = tx.objectStore("bookings");
    store.getAll().onsuccess = (e) => {
      const bookings = (e.target.result || []).filter(b => sellerVehicleIds.includes(b.vehicle_id));
      const counts = {};
      bookings.forEach(b => {
        counts[b.vehicle_id] = (counts[b.vehicle_id] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const topVehicleId = sorted.length ? sorted[0][0] : null;
      if (!topVehicleId) return;
      getVehicleDetails(topVehicleId).then(vehicle => {
        const ctx = document.getElementById("mostRentedChart").getContext("2d");
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: [vehicle ? vehicle.vehicle_model : topVehicleId, "Others"],
            datasets: [{
              data: [sorted[0][1], bookings.length - sorted[0][1]],
              backgroundColor: ["#2ecc71", "#e74c3c"]
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } }
          }
        });
      });
    };
  }
  
  function displayTotalRevenue() {
    const sellerVehicleIds = (window.cachedSellerVehicles || []).map(v => v.vehicle_id);
    const tx = db.transaction(["bookings"], "readonly");
    const store = tx.objectStore("bookings");
    store.getAll().onsuccess = (e) => {
      const bookings = (e.target.result || []).filter(b => sellerVehicleIds.includes(b.vehicle_id));
      let totalRevenue = 0;
      bookings.forEach(b => {
        if (b.booking_start_date && b.booking_end_date && b.booking_amount) {
          const start = new Date(b.booking_start_date);
          const end = new Date(b.booking_end_date);
          const durationDays = (end - start) / (1000 * 60 * 60 * 24);
          totalRevenue += durationDays * Number(b.booking_amount);
        }
      });
      document.getElementById("totalRevenue").innerText = "Rs " + totalRevenue.toFixed(2);
    };
  }
  
  function drawConversionRateChart() {
    const sellerVehicleIds = (window.cachedSellerVehicles || []).map(v => v.vehicle_id);
    const tx = db.transaction(["bidding"], "readonly");
    const store = tx.objectStore("bidding");
    store.getAll().onsuccess = (e) => {
      const bids = (e.target.result || []).filter(b => sellerVehicleIds.includes(b.vehicle_id));
      const tx2 = db.transaction(["bookings"], "readonly");
      const store2 = tx2.objectStore("bookings");
      store2.getAll().onsuccess = (e2) => {
        const bookings = (e2.target.result || []).filter(b => sellerVehicleIds.includes(b.vehicle_id));
        const conversionRate = bids.length > 0 ? (bookings.length / bids.length) * 100 : 0;
        const ctx = document.getElementById("conversionRateChart").getContext("2d");
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Converted", "Not Converted"],
            datasets: [{
              data: [bookings.length, bids.length - bookings.length],
              backgroundColor: ["#2ecc71", "#e74c3c"]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "bottom" },
              title: {
                display: true,
                text: `Conversion Rate: ${conversionRate.toFixed(1)}%`
              }
            }
          }
        });
      };
    };
  }
  
  function displayListingToFirstBooking() {
    const sellerVehicles = window.cachedSellerVehicles || [];
    const timeDiffs = [];
    let promises = sellerVehicles.map(vehicle => {
      return new Promise((resolve) => {
        const tx = db.transaction(["bookings"], "readonly");
        const store = tx.objectStore("bookings");
        store.index("vehicle_id").getAll(vehicle.vehicle_id).onsuccess = (e) => {
          const bookings = (e.target.result || []).sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));
          if (bookings.length > 0 && vehicle.uploaded_at) {
            const diffMs = new Date(bookings[0].booking_date) - new Date(vehicle.uploaded_at);
            if (!isNaN(diffMs)) {
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              timeDiffs.push(diffDays);
            }
          }
          resolve();
        };
      });
    });
    Promise.all(promises).then(() => {
      const avgDays = timeDiffs.length > 0 ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length : 0;
      document.getElementById("listingToFirstBooking").innerText = avgDays.toFixed(1);
    });
  }
  
  function displayAvgBookingDuration() {
    const sellerVehicleIds = (window.cachedSellerVehicles || []).map(v => v.vehicle_id);
    const tx = db.transaction(["bookings"], "readonly");
    const store = tx.objectStore("bookings");
    store.getAll().onsuccess = (e) => {
      const bookings = (e.target.result || []).filter(b => sellerVehicleIds.includes(b.vehicle_id));
      const durations = bookings.map(b => {
        if (b.booking_start_date && b.booking_end_date) {
          return (new Date(b.booking_end_date) - new Date(b.booking_start_date)) / (1000 * 60 * 60 * 24);
        }
        return 0;
      });
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      document.getElementById("avgBookingDuration").innerText = avgDuration.toFixed(1);
    };
  }
  
  function displayMostQueried() {
    const sellerVehicles = window.cachedSellerVehicles || [];
    const sellerVehicleIds = sellerVehicles.map(v => v.vehicle_id);
    const tx = db.transaction(["conversations"], "readonly");
    const store = tx.objectStore("conversations");
    store.getAll().onsuccess = (e) => {
      const convs = (e.target.result || []).filter(conv => sellerVehicleIds.includes(conv.vehicle_id));
      const queryCounts = {};
      convs.forEach(conv => {
        const vehicleId = conv.vehicle_id;
        queryCounts[vehicleId] = (queryCounts[vehicleId] || 0) + 1;
      });
      const sorted = Object.entries(queryCounts).sort((a, b) => b[1] - a[1]);
      const topVehicleId = sorted.length ? sorted[0][0] : null;
      if (!topVehicleId) return;
      getVehicleDetails(topVehicleId).then(vehicle => {
        const vehicleModel = vehicle ? vehicle.vehicle_model : topVehicleId;
        document.getElementById("mostQueried").innerText = `${vehicleModel} (${sorted[0][1]} queries)`;
      });
    };
  }
  
  function getVehicleDetails(vehicleId) {
    if (window.cachedSellerVehicles) {
      const vehicle = window.cachedSellerVehicles.find(v => v.vehicle_id === vehicleId);
      if (vehicle) return Promise.resolve(vehicle);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      store.get(vehicleId).onsuccess = (e) => resolve(e.target.result);
    });
  }
  
  function getUserDetails(userId) {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains("users"))
        return reject("Users store not found.");
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      store.get(userId).onsuccess = (e) => resolve(e.target.result);
    });
  }
  
  function logout() {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  }
  