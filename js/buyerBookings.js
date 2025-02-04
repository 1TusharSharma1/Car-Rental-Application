document.addEventListener("DOMContentLoaded", () => {
    loadBuyerAnalytics();
    loadBuyerBookings();
  });
  
  function loadBuyerAnalytics() {
    const buyer = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!buyer) {
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
      const index = store.index("renter_id");
      const request = index.openCursor(IDBKeyRange.only(buyer.user_id));
      let count = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          count++;
          cursor.continue();
        } else {
          document.getElementById("totalBuyerBookings").innerText = `Total Bookings: ${count}`;
        }
      };
      request.onerror = () => {
        console.error("Error fetching buyer bookings analytics.");
      };
    });
  }
  
  function loadBuyerBookings() {
    const buyer = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!buyer) {
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
      const index = store.index("renter_id");
      const request = index.openCursor(IDBKeyRange.only(buyer.user_id));
      let bookings = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          bookings.push(cursor.value);
          cursor.continue();
        } else {
          displayBuyerBookings(bookings);
        }
      };
      request.onerror = () => {
        console.error("Error fetching buyer bookings.");
      };
    });
  }
  
  function displayBuyerBookings(bookings) {
    const container = document.getElementById("buyerBookingsContainer");
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
  