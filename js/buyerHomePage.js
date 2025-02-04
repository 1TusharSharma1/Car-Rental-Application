document.addEventListener("DOMContentLoaded", () => {
    loadSuperCategories();
    loadLocations();
    loadAvailableCars(); 
  
    const carFilterForm = document.getElementById("carFilterForm");
    if (carFilterForm) {
      carFilterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        applyFilters();
      });
    }
  });
  
  function loadSuperCategories() {
    openDB(() => {
      const transaction = db.transaction(["superCategories"], "readonly");
      const store = transaction.objectStore("superCategories");
      const request = store.getAll();
      request.onsuccess = (event) => {
        const superCategories = event.target.result;
        const filterSuperCategory = document.getElementById("filterSuperCategory");
        filterSuperCategory.innerHTML = `<option value="">All Types</option>`;
        superCategories.forEach(category => {
          filterSuperCategory.innerHTML += `<option value="${category.supercategory_id}">${category.superCategory_name}</option>`;
        });
      };
    });
  }
  
  document.getElementById("filterSuperCategory").addEventListener("change", () => {
    const selectedSuperCategory = document.getElementById("filterSuperCategory").value;
    loadCategories(selectedSuperCategory);
  });
  
  function loadCategories(superCategoryId) {
    openDB(() => {
      const transaction = db.transaction(["categories"], "readonly");
      const store = transaction.objectStore("categories");
      const index = store.index("supercategory_id");
      const request = index.getAll(superCategoryId);
      request.onsuccess = (event) => {
        const categories = event.target.result;
        const filterCategory = document.getElementById("filterCategory");
        filterCategory.innerHTML = `<option value="">All Categories</option>`;
        categories.forEach(category => {
          filterCategory.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
        });
      };
    });
  }
  
  function loadLocations() {
    openDB(() => {
      const transaction = db.transaction(["vehicles"], "readonly");
      const store = transaction.objectStore("vehicles");
      // Using getAll from the vehicles store
      const request = store.getAll();
      request.onsuccess = (event) => {
        const vehicles = event.target.result;
        const filterLocation = document.getElementById("filterLocation");
        // Get unique locations from the vehicles array
        const uniqueLocations = [...new Set(vehicles.map(car => car.location))];
        filterLocation.innerHTML = `<option value="">All Locations</option>`;
        uniqueLocations.forEach(location => {
          filterLocation.innerHTML += `<option value="${location}">${location}</option>`;
        });
      };
      request.onerror = () => {
        console.error("Error fetching vehicles for locations.");
      };
    });
  }
  
  function loadAvailableCars(filters = {}) {
    openDB(() => {
      const transaction = db.transaction(["vehicles"], "readonly");
      const store = transaction.objectStore("vehicles");
      const request = store.getAll();
      request.onsuccess = (event) => {
        let cars = event.target.result;
        const carContainer = document.getElementById("carContainer");
        carContainer.innerHTML = "";
        if (cars.length === 0) {
          carContainer.innerHTML = "<p>No cars available at the moment.</p>";
          return;
        }
        // Apply filters
        if (filters.superCategory) {
          cars = cars.filter(car => car.supercategory_id === filters.superCategory);
        }
        if (filters.category) {
          cars = cars.filter(car => car.category_id === filters.category);
        }
        if (filters.location) {
          cars = cars.filter(car => car.location === filters.location);
        }
        if (filters.minPrice != null) {
          cars = cars.filter(car => car.minimum_rental_price >= filters.minPrice);
        }
        if (filters.maxPrice != null) {
          cars = cars.filter(car => car.minimum_rental_price <= filters.maxPrice);
        }
        if (filters.availability) {
          cars = cars.filter(car => car.availability === filters.availability);
        }
        // Sort cars
        if (filters.sortBy === "priceLowHigh") {
          cars.sort((a, b) => a.minimum_rental_price - b.minimum_rental_price);
        } else if (filters.sortBy === "priceHighLow") {
          cars.sort((a, b) => b.minimum_rental_price - a.minimum_rental_price);
        } else if (filters.sortBy === "newest") {
          // Assume newer cars have a more recent uploaded_at date
          cars.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        }
        // Display cars
        cars.forEach((car) => {
          const carCard = document.createElement("div");
          carCard.classList.add("car-card");
          carCard.dataset.id = car.vehicle_id;
          const images = JSON.parse(car.images_URL);
          const imageSrc = (images && images.length > 0)
            ? images[0]
            : "default-car.jpg";
          carCard.innerHTML = `
            <img src="${imageSrc}" alt="${car.vehicle_model}" class="car-card__image">
            <div class="car-card__content">
              <h3 class="car-card__title">${car.vehicle_model}</h3>
              <p class="car-card__price">Rs ${car.minimum_rental_price}/day</p>
              <p class="car-card__location">📍 ${car.location}</p>
              <p class="car-card__features">${car.features}</p>
              <button class="btn btn--secondary view-details">View Details</button>
            </div>
          `;
          carContainer.appendChild(carCard);
        });
        document.querySelectorAll(".view-details").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const carId = e.target.closest(".car-card").dataset.id;
            window.location.href = `carDetails.html?carId=${carId}`;
          });
        });
      };
      request.onerror = () => {
        console.error("Error fetching cars from IndexedDB.");
      };
    });
  }
  
  function applyFilters() {
    const filters = {
      superCategory: document.getElementById("filterSuperCategory").value,
      category: document.getElementById("filterCategory").value,
      location: document.getElementById("filterLocation").value,
      minPrice: document.getElementById("filterMinPrice").value ? Number(document.getElementById("filterMinPrice").value) : null,
      maxPrice: document.getElementById("filterMaxPrice").value ? Number(document.getElementById("filterMaxPrice").value) : null,
      availability: document.getElementById("filterAvailability").value,
      sortBy: document.getElementById("sortBy").value
    };
    loadAvailableCars(filters);
  }
  