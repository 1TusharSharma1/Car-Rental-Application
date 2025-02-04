document.addEventListener("DOMContentLoaded", () => {
  loadSellerAnalytics();
  loadSellerBookings();
});

// ---------------------
// Seller Analytics Functions
// ---------------------
function loadSellerAnalytics() {
  const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!seller) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  // Query vehicles for this seller
  openDB(() => {
    let vehicleCount = 0;
    if (db.objectStoreNames.contains("vehicles")) {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.vehicle_owner_id === seller.user_id) {
            vehicleCount++;
          }
          cursor.continue();
        } else {
          document.getElementById("totalVehicles").innerText = `Vehicles Listed: ${vehicleCount}`;
        }
      };
    }
  });

  // Query bookings for this seller
  openDB(() => {
    if (!db.objectStoreNames.contains("bookings")) {
      console.error("Bookings store not found.");
      return;
    }
    const tx = db.transaction(["bookings"], "readonly");
    const store = tx.objectStore("bookings");
    const index = store.index("seller_id");
    const request = index.openCursor(IDBKeyRange.only(seller.user_id));
    let totalBookings = 0,
      upcomingBookings = 0,
      completedBookings = 0;
    const today = new Date();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        totalBookings++;
        const startDate = new Date(cursor.value.booking_start_date);
        const endDate = new Date(cursor.value.booking_end_date);
        if (startDate > today) {
          upcomingBookings++;
        } else if (endDate < today) {
          completedBookings++;
        }
        cursor.continue();
      } else {
        document.getElementById("totalBookings").innerText = `Total Bookings: ${totalBookings}`;
        document.getElementById("upcomingBookings").innerText = `Upcoming: ${upcomingBookings}`;
        document.getElementById("completedBookings").innerText = `Completed: ${completedBookings}`;
      }
    };
    request.onerror = () => {
      console.error("Error fetching bookings analytics.");
    };
  });
}

function loadSellerBookings() {
  const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!seller) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  openDB(() => {
    if (!db.objectStoreNames.contains("bookings")) {
      console.error("Bookings store not found.");
      return;
    }
    const tx = db.transaction(["bookings"], "readonly");
    const store = tx.objectStore("bookings");
    const index = store.index("seller_id");
    const request = index.openCursor(IDBKeyRange.only(seller.user_id));
    let bookings = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        bookings.push(cursor.value);
        cursor.continue();
      } else {
        displaySellerBookings(bookings);
      }
    };
    request.onerror = () => {
      console.error("Error fetching seller bookings.");
    };
  });
}

function displaySellerBookings(bookings) {
  const container = document.getElementById("bookingsContainer");
  container.innerHTML = "";
  if (!bookings || bookings.length === 0) {
    container.innerHTML = "<p>No bookings found.</p>";
    return;
  }
  bookings.forEach(booking => {
    getVehicleDetails(booking.vehicle_id).then(vehicle => {
      const vehicleName = vehicle ? vehicle.vehicle_model : "Unknown Vehicle";
      const card = document.createElement("div");
      card.classList.add("booking-card");
      card.innerHTML = `
        <h3>${vehicleName}</h3>
        <p><strong>Booking Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
        <p><strong>Duration:</strong> ${new Date(booking.booking_start_date).toLocaleDateString()} to ${new Date(booking.booking_end_date).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
      `;
      container.appendChild(card);
    }).catch(error => {
      console.error("Error fetching vehicle details:", error);
    });
  });
}

function getVehicleDetails(vehicleId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const request = store.get(vehicleId);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

function updateBidStatus(bidId, newStatus) {
  openDB(() => {
    const transaction = db.transaction(["bidding"], "readwrite");
    const store = transaction.objectStore("bidding");
    const request = store.get(bidId);

    request.onsuccess = (event) => {
      const bid = event.target.result;
      if (bid) {
        bid.bid_status = newStatus;
        store.put(bid).onsuccess = () => {
          if (newStatus === "Accepted") {
            createBooking(bid);
            autoRejectOverlappingBids(bid);
          }
          loadBids("Active");
        };
      }
    };

    request.onerror = () => {
      console.error("Error updating bid.");
    };
  });
}

function createBooking(bid) {
  const bookingData = {
    booking_id: crypto.randomUUID(),
    bid_id: bid.bid_id,
    vehicle_id: bid.vehicle_id,
    renter_id: bid.bidder_id,
    seller_id: bid.seller_id,
    booking_start_date: bid.booking_start_date,
    booking_end_date: bid.booking_end_date,
    booking_date: new Date().toISOString(),
    status: "Confirmed"
  };

  openDB(() => {
    const transaction = db.transaction(["bookings"], "readwrite");
    const store = transaction.objectStore("bookings");
    const addRequest = store.add(bookingData);

    addRequest.onsuccess = () => {
      console.log("Booking created successfully.");
    };

    addRequest.onerror = (event) => {
      console.error("Error creating booking:", event.target.error);
    };
  });
}
