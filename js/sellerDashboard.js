document.addEventListener("DOMContentLoaded", () => {
  const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!seller || !Array.isArray(seller.user_role) || !seller.user_role.includes("seller")) {
    window.location.href = "login.html";
    return;
  }

  loadBids("Active");

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
  document.getElementById("showActiveBids").classList.remove("active");
  document.getElementById("showInactiveBids").classList.remove("active");
  document.getElementById(activeButtonId).classList.add("active");
  document.getElementById("bidTitle").innerText =
    activeButtonId === "showActiveBids" ? "Active Bids" : "Inactive Bids";
}

function loadBids(status) {
  const seller = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!seller) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return;
  }

  openDB(() => {
    if (!db.objectStoreNames.contains("bidding")) {
      console.error("Object store 'bidding' not found.");
      return;
    }

    const transaction = db.transaction(["bidding"], "readonly");
    const store = transaction.objectStore("bidding");
    const index = store.index("seller_id");
    const request = index.openCursor(IDBKeyRange.only(seller.user_id));
    let bids = [];
    const now = new Date();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {

        if (cursor.value.bid_status === "Active" && now > new Date(cursor.value.booking_start_date)) {
          updateBidStatus(cursor.value.bid_id, "Inactive");
          cursor.value.bid_status = "Inactive";
        }
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

  // Create table elements.
  const table = document.createElement("table");
  table.classList.add("bids-table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Car Name</th>
      <th>Booker Name</th>
      <th>Booker's GovtID</th>
      <th>Bid Amount</th>
      <th>Bid Date</th>
      <th>Status</th>
      <th>Booking Duration</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  bidsContainer.appendChild(table);

  // Pagination: 10 rows per page.
  const rowsPerPage = 10;
  let currentPage = 1;
  const totalPages = Math.ceil(bids.length / rowsPerPage);

  // Create pagination controls.
  const paginationControls = document.createElement("div");
  paginationControls.classList.add("pagination-controls");
  const prevButton = document.createElement("button");
  prevButton.innerText = "Previous";
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTablePage(currentPage);
    }
  });
  const nextButton = document.createElement("button");
  nextButton.innerText = "Next";
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTablePage(currentPage);
    }
  });
  const pageInfo = document.createElement("span");
  pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageInfo);
  paginationControls.appendChild(nextButton);
  bidsContainer.appendChild(paginationControls);

  function renderTablePage(page) {
    tbody.innerHTML = "";
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, bids.length);
    // Iterate over each bid for this page.
    for (let i = startIndex; i < endIndex; i++) {
      const bid = bids[i];
      // Fetch vehicle and booker details in parallel.
      Promise.all([
        getVehicleDetails(bid.vehicle_id),
        getUserDetails(bid.bidder_id)
      ]).then(([vehicle, booker]) => {
        const carName = vehicle ? vehicle.vehicle_model : bid.vehicle_id;
        const bookerName = booker ? booker.username : "Unknown Booker";
        const govtId = booker && booker.user_govtId ? booker.user_govtId : "N/A";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${carName}</td>
          <td>${bookerName}</td>
          <td>${govtId}</td>
          <td>Rs ${bid.bid_amount}</td>
          <td>${new Date(bid.bid_date).toLocaleDateString()}</td>
          <td>${bid.bid_status}</td>
          <td>${new Date(bid.booking_start_date).toLocaleDateString()} - ${new Date(bid.booking_end_date).toLocaleDateString()}</td>
          <td>
            ${bid.bid_status === "Active" ? `
              <button class="btn--accept" onclick="updateBidStatus('${bid.bid_id}', 'Accepted')">Accept</button>
              <button class="btn--reject" onclick="updateBidStatus('${bid.bid_id}', 'Rejected')">Reject</button>
            ` : ""}
          </td>
        `;
        tbody.appendChild(tr);
      }).catch(error => {
        console.error("Error fetching bid details:", error);
      });
    }
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
  }

  renderTablePage(currentPage);
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
    booking_amount: bid.bid_amount,
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

function getVehicleDetails(vehicleId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const request = store.get(vehicleId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

function getUserDetails(userId) {
  return new Promise((resolve, reject) => {
    openDB(() => {
      if (!db.objectStoreNames.contains("users"))
        return reject("Users store not found.");
      const tx = db.transaction(["users"], "readonly");
      const store = tx.objectStore("users");
      const request = store.get(userId);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  });
}

function openChat(conversationId) {
  window.location.href = `chat.html?conversationId=${conversationId}`;
}
