document.addEventListener("DOMContentLoaded", () => {
    // Load active bids on page load
    loadBids("Active");
  
    // Set up bid filter button events
    document.getElementById("showActiveBids").addEventListener("click", () => {
      setActiveButton("showActiveBids");
      loadBids("Active");
    });
  
    document.getElementById("showInactiveBids").addEventListener("click", () => {
      setActiveButton("showInactiveBids");
      loadBids("Inactive");
    });
  });
  
  function setActiveButton(activeButtonId) {
    // Remove active class from both buttons, then add to the selected one
    document.getElementById("showActiveBids").classList.remove("active");
    document.getElementById("showInactiveBids").classList.remove("active");
    document.getElementById(activeButtonId).classList.add("active");
  
    // Update the bids section title
    document.getElementById("bidTitle").innerText =
      activeButtonId === "showActiveBids" ? "Active Bids" : "Inactive Bids";
  }
  
  function loadBids(status) {
    // Retrieve logged-in seller data from sessionStorage
    const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!seller) {
      alert("Please log in first.");
      window.location.href = "login.html";
      return;
    }
  
    openDB(() => {
      // Ensure the "bidding" store exists
      if (!db.objectStoreNames.contains("bidding")) {
        console.error("Object store 'bidding' not found.");
        return;
      }
  
      const transaction = db.transaction(["bidding"], "readonly");
      const store = transaction.objectStore("bidding");
      const index = store.index("seller_id");
      // Open a cursor that returns bids for the current seller
      const request = index.openCursor(IDBKeyRange.only(seller.user_id));
      let bids = [];
  
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Only include bids that match the specified status
          if (cursor.value.bid_status === status) {
            bids.push(cursor.value);
          }
          cursor.continue();
        } else {
          displayBids(bids);
        }
      };
  
      request.onerror = () => {
        console.error("Error fetching bids from IndexedDB.");
      };
    });
  }
  
  function displayBids(bids) {
    const bidsContainer = document.getElementById("bidsContainer");
    bidsContainer.innerHTML = "";
  
    if (!bids || bids.length === 0) {
      bidsContainer.innerHTML = "<p>No bids found.</p>";
      return;
    }
  
    // For each bid, fetch the vehicle details to display the vehicle name
    bids.forEach(bid => {
      getVehicleDetails(bid.vehicle_id)
        .then(vehicle => {
          const vehicleName = vehicle ? vehicle.vehicle_model : bid.vehicle_id;
          const bidCard = document.createElement("div");
          bidCard.classList.add("bid-card");
  
          bidCard.innerHTML = `
            <h3>Bid ID: ${bid.bid_id}</h3>
            <p><strong>Vehicle Name:</strong> ${vehicleName}</p>
            <p><strong>Bid Amount:</strong> Rs ${bid.bid_amount}</p>
            <p><strong>Bid Date:</strong> ${new Date(bid.bid_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${bid.bid_status}</p>
            <p><strong>Booking Duration:</strong> ${new Date(bid.booking_start_date).toLocaleDateString()} to ${new Date(bid.booking_end_date).toLocaleDateString()}</p>
            ${bid.bid_status === "Active" ? `
                <button class="btn--accept" onclick="updateBidStatus('${bid.bid_id}', 'Accepted')">Accept</button>
                <button class="btn--reject" onclick="updateBidStatus('${bid.bid_id}', 'Rejected')">Reject</button>
            ` : ""}
          `;
  
          bidsContainer.appendChild(bidCard);
        })
        .catch(error => {
          console.error("Error fetching vehicle details:", error);
        });
    });
  }
  
  function getVehicleDetails(vehicleId) {
    return new Promise((resolve, reject) => {
      openDB(() => {
        const transaction = db.transaction(["vehicles"], "readonly");
        const store = transaction.objectStore("vehicles");
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
  

  function isOverlap(start1, end1, start2, end2) {
    const s1 = new Date(start1),
          e1 = new Date(end1),
          s2 = new Date(start2),
          e2 = new Date(end2);
    return s1 <= e2 && s2 <= e1;
  }
  
  function autoRejectOverlappingBids(confirmedBooking) {
    openDB(() => {
      if (!db.objectStoreNames.contains("bidding")) {
        console.error("Bidding store not found.");
        return;
      }
      const tx = db.transaction(["bidding"], "readwrite");
      const store = tx.objectStore("bidding");
      const index = store.index("vehicle_id");
      const request = index.getAll(confirmedBooking.vehicle_id);
      
      request.onsuccess = (event) => {
        const bids = event.target.result;
        bids.forEach(bid => {
          if (bid.bid_status === "Active" &&
              isOverlap(
                confirmedBooking.booking_start_date,
                confirmedBooking.booking_end_date,
                bid.booking_start_date,
                bid.booking_end_date
              )
          ) {
            bid.bid_status = "Rejected";
            store.put(bid);
            console.log(`Bid ${bid.bid_id} auto-rejected due to overlap.`);
          }
        });
      };
  
      request.onerror = () => {
        console.error("Error processing overlapping bids.");
      };
    });
  }
  