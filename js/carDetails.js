document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded – initializing car details page.");
    loadCarDetails();
    document.getElementById("placeBidBtn").addEventListener("click", openBidModal);
    document.querySelector(".close-btn").addEventListener("click", closeBidModal);
    document.getElementById("bidForm").addEventListener("submit", placeBid);
  });
  
  function loadCarDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get("carId");
    console.log("Loading details for carId:", carId);
  
    if (!carId) {
      alert("Car not found!");
      window.location.href = "buyerHomePage.html";
      return;
    }
  
    openDB(() => {
      const transaction = db.transaction(["vehicles"], "readonly");
      const store = transaction.objectStore("vehicles");
      const request = store.get(carId);
  
      request.onsuccess = (event) => {
        const car = event.target.result;
        if (!car) {
          alert("Car not found!");
          window.location.href = "buyerHomePage.html";
          return;
        }
        console.log("Car details loaded:", car);
  
        document.getElementById("carTitle").innerText = car.vehicle_model;
        document.getElementById("carLocation").innerText = car.location;
        document.getElementById("carPrice").innerText = `${car.minimum_rental_price}`;
        document.getElementById("carAvailability").innerText = car.availability;
        document.getElementById("carFeatures").innerText = car.features;
        document.getElementById("minBidAmount").innerText = `Minimum Bid: Rs ${car.minimum_rental_price}`;
        document.getElementById("minBidAmount").dataset.minPrice = car.minimum_rental_price;
        document.getElementById("vehicleId").value = car.vehicle_id;
  
        const images = JSON.parse(car.images_URL);
        const mainImageEl = document.getElementById("mainCarImage");
        mainImageEl.src = images[0] || "placeholder.jpg";
        const thumbnailContainer = document.getElementById("carThumbnails");
        thumbnailContainer.innerHTML = ""; 
        images.forEach((imgSrc) => {
          let img = document.createElement("img");
          img.src = imgSrc;
          img.classList.add("thumbnail");
          img.addEventListener("click", () => {
            mainImageEl.src = imgSrc;
          });
          thumbnailContainer.appendChild(img);
        });
  
        loadBiddingDetails(car.vehicle_id);
      };
  
      request.onerror = () => {
        alert("Error loading car details.");
      };
    });
  }
  
  function loadBiddingDetails(carId) {
    console.log("Loading bidding details for carId:", carId);
    openDB(() => {
      if (!db.objectStoreNames.contains("bidding")) {
        console.error("Object store 'bidding' not found in IndexedDB.");
        return;
      }
      const transaction = db.transaction(["bidding"], "readonly");
      const store = transaction.objectStore("bidding");
      const index = store.index("vehicle_id");
      const request = index.getAll(IDBKeyRange.only(carId));
  
      request.onsuccess = (event) => {
        const bids = event.target.result;
        console.log("Bidding details loaded:", bids);
        if (bids.length === 0) {
          document.getElementById("highestBid").innerText = "No bids yet";
          return;
        }
        const highestBid = Math.max(...bids.map(bid => bid.bid_amount));
        document.getElementById("highestBid").innerText = `${highestBid}`;
      };
  
      request.onerror = () => {
        console.error("Error fetching bids from IndexedDB.");
      };
    });
  }
  
  function openBidModal() {
    console.log("openBidModal called.");
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("Please log in to place a bid.");
      return;
    }
    console.log("Logged in user:", loggedInUser);
  
    const modal = document.getElementById("bidModal");
    if (!modal) {
      console.error("bidModal element not found.");
      return;
    }
    modal.style.display = "flex";
    const vehicleId = document.getElementById("vehicleId").value;
    console.log("Vehicle ID in modal:", vehicleId);
    
    // Initialize Flatpickr on date inputs with disabled date ranges
    initDatePickers(vehicleId);
    loadBiddingDetails(vehicleId);
  }
  
  function closeBidModal() {
    const modal = document.getElementById("bidModal");
    if (modal) {
      modal.style.display = "none";
    }
  }
  
  async function placeBid(event) {
    event.preventDefault();
  
    const bidAmount = Number(document.getElementById("bidAmount").value);
    const bidStartDate = document.getElementById("bidStartDate").value;
    const bidEndDate = document.getElementById("bidEndDate").value;
    const vehicleId = document.getElementById("vehicleId").value;
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const minBid = Number(document.getElementById("minBidAmount").dataset.minPrice);
  
    if (!loggedInUser) {
      alert("You must be logged in to place a bid.");
      return;
    }
    if (isNaN(bidAmount) || bidAmount <= 0) {
      alert("Please enter a valid bid amount.");
      return;
    }
    if (bidAmount < minBid) {
      alert(`Your bid must be at least Rs ${minBid}!`);
      return;
    }
  
    try {
      const sellerId = await getVehicleOwner(vehicleId);
      const bidData = {
        bid_id: crypto.randomUUID(),
        vehicle_id: vehicleId,
        bidder_id: loggedInUser.user_id,
        seller_id: sellerId,
        bid_amount: bidAmount,
        bid_status: "Active", 
        bid_date: new Date().toISOString(),
        booking_start_date: bidStartDate,
        booking_end_date: bidEndDate,
      };
  
      openDB(() => {
        const transaction = db.transaction(["bidding"], "readwrite");
        const store = transaction.objectStore("bidding");
        const addRequest = store.add(bidData);
  
        addRequest.onsuccess = () => {
          alert("Your bid has been placed successfully!");
          sendAutoMessage(bidData);
          closeBidModal();
          loadBiddingDetails(vehicleId);
        };
  
        addRequest.onerror = () => {
          alert("Error placing bid. Try again.");
        };
      });
    } catch (error) {
      console.error("Error placing bid:", error);
      alert("Error placing bid. Please try again.");
    }
  }
  
  function sendAutoMessage(bidData) {
    const currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!currentUser) return;
  
    const autoMessage = "Hi, I've placed a bid on your car. Please review my offer.";
    const messageData = {
      message_id: crypto.randomUUID(),
      sender_id: currentUser.user_id, 
      receiver_id: bidData.seller_id,  
      vehicle_id: bidData.vehicle_id,
      content: autoMessage,
      timestamp: new Date().toISOString()
    };
  
    openDB(() => {
      const tx = db.transaction(["messages"], "readwrite");
      const store = tx.objectStore("messages");
      const request = store.add(messageData);
      request.onsuccess = () => {
        console.log("Automated message sent successfully.");
      };
      request.onerror = (event) => {
        console.error("Error sending automated message:", event.target.error);
      };
    });
  }
  
  function getVehicleOwner(vehicleId) {
    return new Promise((resolve, reject) => {
      openDB(() => {
        const transaction = db.transaction(["vehicles"], "readonly");
        const store = transaction.objectStore("vehicles");
        const request = store.get(vehicleId);
  
        request.onsuccess = (event) => {
          const vehicle = event.target.result;
          if (vehicle) {
            resolve(vehicle.vehicle_owner_id);
          } else {
            reject("Seller not found!");
          }
        };
  
        request.onerror = () => reject("Error fetching vehicle owner.");
      });
    });
  }
  
  function getConfirmedBookings(vehicleId) {
    return new Promise((resolve, reject) => {
      openDB(() => {
        if (!db.objectStoreNames.contains("bookings")) {
          return reject("Bookings store not found.");
        }
        const tx = db.transaction(["bookings"], "readonly");
        const store = tx.objectStore("bookings");
        const index = store.index("vehicle_id");
        const request = index.getAll(IDBKeyRange.only(vehicleId));
        request.onsuccess = (event) => {
          const allBookings = event.target.result;
          const confirmed = allBookings.filter(booking => booking.status === "Confirmed");
          resolve(confirmed);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
  }
  
  async function initDatePickers(vehicleId) {
    try {
      const confirmedBookings = await getConfirmedBookings(vehicleId);
      const disabledRanges = confirmedBookings.map(booking => ({
        from: booking.booking_start_date,
        to: booking.booking_end_date
      }));
      console.log("Disabled date ranges:", disabledRanges);
      
      flatpickr("#bidStartDate", {
        dateFormat: "Y-m-d",
        disable: disabledRanges,
        minDate: "today"
      });
      flatpickr("#bidEndDate", {
        dateFormat: "Y-m-d",
        disable: disabledRanges,
        minDate: "today"
      });
    } catch (error) {
      console.error("Error initializing date pickers:", error);
    }
  }
  