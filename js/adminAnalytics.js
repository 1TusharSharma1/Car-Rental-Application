document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!user || !Array.isArray(user.user_role) || !user.user_role.includes("admin")) {
      window.location.href = "login.html";
      return;
    }
  
    loadAnalyticsData();
    loadRecentBookings();
    drawVehiclesOverTimeChart();
    drawBidVsRentalChart();
    drawUserRolesChart();
    drawBidToBookingConversionChart();
    drawTopBookedCarsChart();
    drawConvosVsBookingsChart();
    displayAvgBookingDuration();
    displayAvgBidToBookingTime();
    displayBidAcceptTime();
    displayBidRejectionRate();
    loadTopSellers();
  });
  
  function loadAnalyticsData() {
    analyticsUtils.loadTotalUsers(count => window.totalUsers = count);
    analyticsUtils.loadTotalVehicles(count => window.totalVehicles = count);
    analyticsUtils.loadTotalBookings(count => window.totalBookings = count);
    analyticsUtils.loadTotalBids(count => window.totalBids = count);
    analyticsUtils.loadTotalMessages(count => window.totalMessages = count);
  }
  
  function loadRecentBookings() {
    analyticsUtils.getCachedData("bookings").then((bookings) => {
      const tbody = document.querySelector("#recentBookingsTable tbody");
      tbody.innerHTML = "";
      if (!bookings || bookings.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>No bookings found.</td></tr>";
        return;
      }
      bookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
      bookings.slice(0, 10).forEach((booking) => {
        Promise.all([
          analyticsUtils.getVehicleDetails(booking.vehicle_id),
          analyticsUtils.getUserDetails(booking.renter_id),
          analyticsUtils.getUserDetails(booking.seller_id)
        ]).then(([vehicle, renter, seller]) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${booking.booking_id}</td>
            <td>${vehicle ? vehicle.vehicle_model : booking.vehicle_id}</td>
            <td>${renter ? renter.username : booking.renter_id}</td>
            <td>${seller ? seller.username : booking.seller_id}</td>
            <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
          `;
          tbody.appendChild(tr);
        });
      });
    });
  }
  
  function drawVehiclesOverTimeChart() {
    analyticsUtils.getCachedData("vehicles").then((vehicles) => {
      const counts = {};
      vehicles.forEach(v => {
        const date = new Date(v.uploaded_at);
        const key = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      const labels = Object.keys(counts).sort();
      const data = labels.map(label => counts[label]);
      const ctx = document.getElementById("vehiclesOverTimeChart").getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: "Vehicles Listed",
            data: data,
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.2)",
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });
    });
  }
  
  function drawBidVsRentalChart() {
    Promise.all([
      analyticsUtils.getCachedData("vehicles"),
      analyticsUtils.getCachedData("bidding")
    ]).then(([vehicles, bids]) => {
      const rentalPrices = vehicles.map(v => v.minimum_rental_price);
      const avgBids = vehicles.map(v => {
        const vBids = bids.filter(b => b.vehicle_id === v.vehicle_id);
        return vBids.length > 0 ? vBids.reduce((sum, b) => sum + b.bid_amount, 0) / vBids.length : 0;
      });
      const ctx = document.getElementById("bidVsRentalChart").getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: vehicles.map(v => v.vehicle_model),
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
  
  function drawUserRolesChart() {
    analyticsUtils.getCachedData("users").then((users) => {
      const roleCounts = { buyer: 0, seller: 0 };
      users.forEach(u => {
        if (Array.isArray(u.user_role)) {
          u.user_role.forEach(role => {
            if (role === "buyer" || role === "seller") {
              roleCounts[role] = (roleCounts[role] || 0) + 1;
            }
          });
        }
      });
      const ctx = document.getElementById("userRolesChart").getContext("2d");
      new Chart(ctx, {
        type: "pie",
        data: {
          labels: Object.keys(roleCounts),
          datasets: [{
            data: Object.values(roleCounts),
            backgroundColor: ["#3498db", "#2ecc71"]
          }]
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    });
  }
  
  function drawBidToBookingConversionChart() {
    Promise.all([
      analyticsUtils.getCachedData("bidding"),
      analyticsUtils.getCachedData("bookings")
    ]).then(([bids, bookings]) => {
      const conversionRate = bids.length > 0 ? (bookings.length / bids.length) * 100 : 0;
      const ctx = document.getElementById("bidToBookingChart").getContext("2d");
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
              text: `Bid-to-Booking Conversion Rate: ${conversionRate.toFixed(1)}%`
            }
          }
        }
      });
    });
  }
  
  function drawTopBookedCarsChart() {
    analyticsUtils.getCachedData("bookings").then((bookings) => {
      const counts = {};
      bookings.forEach(b => {
        counts[b.vehicle_id] = (counts[b.vehicle_id] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const labels = [];
      const data = [];
      Promise.all(sorted.map(item => {
        return analyticsUtils.getVehicleDetails(item[0]).then(v => {
          labels.push(v ? v.vehicle_model : item[0]);
          data.push(item[1]);
        });
      })).then(() => {
        const ctx = document.getElementById("topBookedCarsChart").getContext("2d");
        new Chart(ctx, {
          type: "pie",
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ["#e67e22", "#e74c3c", "#f1c40f"]
            }]
          },
          options: { responsive: true, plugins: { legend: { position: "bottom" } } }
        });
      });
    });
  }
  
  function drawConvosVsBookingsChart() {
    Promise.all([
      analyticsUtils.getCachedData("conversations"),
      analyticsUtils.getCachedData("bookings")
    ]).then(([convs, bookings]) => {
      const ratio = bookings.length > 0 ? (convs.length / bookings.length) * 100 : 0;
      const ctx = document.getElementById("convosVsBookingsChart").getContext("2d");
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Conversations", "Bookings"],
          datasets: [{
            data: [convs.length, bookings.length],
            backgroundColor: ["#8e44ad", "#3498db"]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            title: {
              display: true,
              text: `Convos vs. Bookings: ${ratio.toFixed(1)}%`
            }
          }
        }
      });
    });
  }
  
  function displayAvgBookingDuration() {
    analyticsUtils.getCachedData("bookings").then((bookings) => {
      const durations = bookings.map(b => {
        if (b.booking_start_date && b.booking_end_date) {
          return (new Date(b.booking_end_date) - new Date(b.booking_start_date)) / (1000 * 60 * 60 * 24);
        }
        return 0;
      });
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      document.getElementById("avgBookingDuration").innerText = Math.round(avgDuration);
    });
  }
  
  function displayAvgBidToBookingTime() {
    Promise.all([
      analyticsUtils.getCachedData("bidding"),
      analyticsUtils.getCachedData("bookings")
    ]).then(([bids, bookings]) => {
      const timeDiffs = [];
      bookings.forEach(booking => {
        const bid = bids.find(b => b.bid_id === booking.bid_id);
        if (bid && booking.booking_start_date && bid.bid_date) {
          const diffDays = (new Date(booking.booking_start_date) - new Date(bid.bid_date)) / (1000 * 60 * 60 * 24);
          timeDiffs.push(diffDays);
        }
      });
      const avgTime = timeDiffs.length > 0 ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length : 0;
      document.getElementById("avgBidToBookingTime").innerText = Math.round(avgTime);
    });
  }
  
  function displayBidAcceptTime() {
    Promise.all([
      analyticsUtils.getCachedData("bidding"),
      analyticsUtils.getCachedData("bookings")
    ]).then(([bids, bookings]) => {
      const timeDiffs = [];
      bookings.forEach(booking => {
        const bid = bids.find(b => b.bid_id === booking.bid_id);
        if (bid && booking.booking_date && bid.bid_date) {
          const diffHours = (new Date(booking.booking_date) - new Date(bid.bid_date)) / (1000 * 60 * 60);
          timeDiffs.push(diffHours);
        }
      });
      const avgHours = timeDiffs.length > 0 ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length : 0;
      document.getElementById("bidAcceptTime").innerText = Math.round(avgHours);
    });
  }
  
  function displayBidRejectionRate() {
    analyticsUtils.getCachedData("bidding").then((bids) => {
      const rejected = bids.filter(b => b.bid_status === "Rejected").length;
      const rate = bids.length > 0 ? (rejected / bids.length) * 100 : 0;
      document.getElementById("bidRejectionRate").innerText = Math.round(rate); 
    });
  }
  
  function loadTopSellers() {
    analyticsUtils.getCachedData("bookings").then((bookings) => {
      const sellerCounts = {};
      bookings.forEach(b => {
        if (b.seller_id) {
          sellerCounts[b.seller_id] = (sellerCounts[b.seller_id] || 0) + 1;
        }
      });
      const sortedSellers = Object.entries(sellerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const container = document.getElementById("topSellersList");
      container.innerHTML = "";
      sortedSellers.forEach(([sellerId, count]) => {
        analyticsUtils.getUserDetails(sellerId).then(user => {
          const sellerName = user ? user.username : sellerId;
          const sellerCard = document.createElement("div");
          sellerCard.className = "seller-card";
          sellerCard.innerHTML = `<h3>${sellerName}</h3><p>${count} bookings</p>`;
          sellerCard.addEventListener("click", () => {
            window.location.href = "sellerAnalytics.html?sellerId=" + encodeURIComponent(sellerId);
          });
          container.appendChild(sellerCard);
        });
      });
    });
  }
  