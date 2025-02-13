let allUsers = [];
let allListings = [];
let currentUserPage = 1;
let currentListingPage = 1;
const itemsPerPage = 5;

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (
    !user ||
    !Array.isArray(user.user_role) ||
    !user.user_role.includes("admin")
  ) {
    window.location.href = "../validations/login.html";
    return;
  }
  loadAnalytics();
  loadUsers();
  loadListings();
});

function loadAnalytics() {
  analyticsUtils.loadTotalUsers((count) => {
    document.getElementById("totalUsers").innerText = `Total Users: ${count}`;
  });
  analyticsUtils.loadTotalVehicles((count) => {
    document.getElementById("totalVehicles").innerText = `Total Vehicles: ${count}`;
  });
  analyticsUtils.loadTotalBookings((count) => {
    document.getElementById("totalBookings").innerText = `Total Bookings: ${count}`;
  });
  analyticsUtils.loadTotalBids((count) => {
    document.getElementById("totalBids").innerText = `Total Bids: ${count}`;
  });
  analyticsUtils.loadTotalMessages((count) => {
    document.getElementById("totalMessages").innerText = `Total Messages: ${count}`;
  });
}

function loadUsers() {
  openDB(() => {
    const tx = db.transaction(["users"], "readonly");
    const store = tx.objectStore("users");
    const request = store.getAll();
    request.onsuccess = (event) => {
      allUsers = event.target.result;
      const totalPages = Math.ceil(allUsers.length / itemsPerPage);
      if (currentUserPage > totalPages) {
        currentUserPage = totalPages || 1;
      }
      displayUsersPage(currentUserPage);
      renderUserPagination();
    };
  });
}

function displayUsersPage(page) {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";
  if (!allUsers || allUsers.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5'>No users found.</td></tr>";
    return;
  }
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = allUsers.slice(startIndex, endIndex);
  paginatedUsers.forEach((user) => {
    const tr = document.createElement("tr");
    let viewListingsBtn = "";
    if (
      Array.isArray(user.user_role) &&
      user.user_role.includes("seller")
    ) {
      viewListingsBtn = `<button class="btn btn--view" onclick="viewListings('${user.user_id}')">View Listings</button>`;
    }

    tr.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${Array.isArray(user.user_role) ? user.user_role.join(", ") : user.user_role}</td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>${viewListingsBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderUserPagination() {
  const paginationContainer = document.getElementById("usersPagination");
  if (!paginationContainer) return;
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(allUsers.length / itemsPerPage);
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.classList.add("pagination-btn");
    if (i === currentUserPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentUserPage = i;
      displayUsersPage(currentUserPage);
      renderUserPagination();
    });
    paginationContainer.appendChild(btn);
  }
}

function loadListings() {
  openDB(() => {
    const tx = db.transaction(["vehicles"], "readonly");
    const store = tx.objectStore("vehicles");
    const request = store.getAll();
    request.onsuccess = (event) => {
      allListings = event.target.result;
      const totalPages = Math.ceil(allListings.length / itemsPerPage);
      if (currentListingPage > totalPages) {
        currentListingPage = totalPages || 1;
      }
      displayListingsPage(currentListingPage);
      renderListingPagination();
    };
  });
}

function displayListingsPage(page) {
  const tbody = document.querySelector("#listingsTable tbody");
  tbody.innerHTML = "";
  if (!allListings || allListings.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7'>No listings found.</td></tr>";
    return;
  }
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = allListings.slice(startIndex, endIndex);
  paginatedListings.forEach((vehicle) => {
    const tr = document.createElement("tr");

    let actionBtn = "";
    if (vehicle.availability.toLowerCase() === "unavailable") {
      tr.classList.add("delisted"); 
      actionBtn = `<button class="btn btn--primary" onclick="listListing('${vehicle.vehicle_id}')">List Again</button>`;
    } else {
      actionBtn = `<button class="btn btn--danger" onclick="deleteListing('${vehicle.vehicle_id}')">De-List</button>`;
    }
    
    tr.innerHTML = `
      <td>${vehicle.vehicle_model}</td>
      <td>${vehicle.vehicle_owner_name}</td>
      <td>Rs ${vehicle.minimum_rental_price}</td>
      <td>${vehicle.location}</td>
      <td>${new Date(vehicle.uploaded_at).toLocaleDateString()}</td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderListingPagination() {
  const paginationContainer = document.getElementById("listingsPagination");
  if (!paginationContainer) return;
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(allListings.length / itemsPerPage);
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.classList.add("pagination-btn");
    if (i === currentListingPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentListingPage = i;
      displayListingsPage(currentListingPage);
      renderListingPagination();
    });
    paginationContainer.appendChild(btn);
  }
}

function deleteListing(vehicleId) {
  if (!confirm("Are you sure you want to de-list this listing?")) return;
  openDB(() => {
    const tx = db.transaction(["vehicles"], "readwrite");
    const store = tx.objectStore("vehicles");
    store.get(vehicleId).onsuccess = (event) => {
      const vehicle = event.target.result;
      if (vehicle) {
        vehicle.availability = "Unavailable";
        store.put(vehicle);
      }
    };
    tx.oncomplete = () => {
      alert("Listing de-listed successfully!");
      loadListings();
    };
  });
}

function listListing(vehicleId) {
  if (!confirm("Are you sure you want to list this vehicle again?")) return;
  openDB(() => {
    const tx = db.transaction(["vehicles"], "readwrite");
    const store = tx.objectStore("vehicles");
    store.get(vehicleId).onsuccess = (event) => {
      const vehicle = event.target.result;
      if (vehicle) {
        vehicle.availability = "Available"; 
        store.put(vehicle);
      }
    };
    tx.oncomplete = () => {
      alert("Listing re-listed successfully!");
      loadListings();
    };
  });
}

function logout() {
  sessionStorage.removeItem("loggedInUser");
  window.location.href = `/seller/listings/sellerListings.html?sellerId=${userId}`;
}

function viewListings(userId) {
  window.location.href = `/seller/listings/sellerListings.html?sellerId=${userId}`;
}
