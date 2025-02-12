document.addEventListener("DOMContentLoaded", () => {
  let sellerId;
  const urlParams = new URLSearchParams(window.location.search);
  sellerId = urlParams.get("sellerId");

  let seenByAdmin = false;
  if (sellerId) {
    seenByAdmin = true;
  }

  const loggedInSeller = JSON.parse(sessionStorage.getItem("loggedInUser"));
  let showAddCar = !seenByAdmin;
  if (!sellerId) {
    if (
      !loggedInSeller ||
      !Array.isArray(loggedInSeller.user_role) ||
      !loggedInSeller.user_role.includes("seller")
    ) {
      window.location.href = "login.html";
      return;
    }
    sellerId = loggedInSeller.user_id;
  }
  window.sellerId = sellerId;

  if (seenByAdmin) {
    const nav = document.querySelector(".nav");
    if (nav) nav.style.display = "none";
    const navToggle = document.querySelector(".nav-toggle");
    if (navToggle) navToggle.style.display = "none";

    const headerProfile = document.querySelector(".header__profile");
    if (headerProfile) {
      headerProfile.innerHTML = `<button id="logoutBtn" class="btn btn--danger">Back</button>`;
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => (window.location.href = "login.html"));
    }
  }


  let currentAvailabilityFilter = document.getElementById("availabilityCheckbox").checked
    ? "Available"
    : "Unavailable";
  document.getElementById("availabilityCheckbox").addEventListener("change", (e) => {
    currentAvailabilityFilter = e.target.checked ? "Available" : "Unavailable";
    loadSellerListings();
  });

  if (!showAddCar) {
    const addCarBtn = document.getElementById("addCarBtn");
    if (addCarBtn) addCarBtn.style.display = "none";
  }

  const addCarBtn = document.getElementById("addCarBtn");
  const addCarModal = document.getElementById("addCarModal");
  const addCarForm = document.getElementById("addCarForm");
  const closeBtn = document.querySelector(".close-btn");
  const superCategorySelect = document.getElementById("superCategory");
  const categorySelect = document.getElementById("category");
  const categoryRow = document.getElementById("categoryRow");
  const otherCategoryWrapper = document.getElementById("otherCategoryWrapper");
  const otherCategoryInput = document.getElementById("otherCategoryInput");
  const otherSuperCategoryWrapper = document.getElementById("otherSuperCategoryWrapper");
  const otherSuperCategoryInput = document.getElementById("otherSuperCategoryInput");

  if (showAddCar) {
    addCarBtn.addEventListener("click", () => {
      addCarModal.style.display = "flex";
      loadSuperCategories();
    });
    closeBtn.addEventListener("click", closeModal);
  }
  if (categoryRow) {
    categoryRow.style.display = "none";
  }
  loadSellerListings();

  function closeModal() {
    addCarModal.style.display = "none";
    addCarForm.reset();
    otherSuperCategoryWrapper.style.display = "none";
    otherCategoryWrapper.style.display = "none";
    if (categoryRow) {
      categoryRow.style.display = "none";
    }
  }

  function loadSuperCategories() {
    if (!superCategorySelect) return;
    openDB(() => {
      const tx = db.transaction(["superCategories"], "readonly");
      const store = tx.objectStore("superCategories");
      store.getAll().onsuccess = (event) => {
        const superCats = event.target.result;
        superCategorySelect.innerHTML = `<option value="">Select Super Category</option>`;
        superCats.forEach((sc) => {
          superCategorySelect.innerHTML += `<option value="${sc.supercategory_id}">${sc.superCategory_name}</option>`;
        });
        superCategorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  superCategorySelect.addEventListener("change", () => {
    if (superCategorySelect.value) {
      if (categoryRow) categoryRow.style.display = "block";
    } else {
      if (categoryRow) categoryRow.style.display = "none";
    }
    categorySelect.innerHTML = `<option value="">Select Category</option>`;
    if (superCategorySelect.value === "Other") {
      otherSuperCategoryWrapper.style.display = "block";
      otherCategoryWrapper.style.display = "block";
      categorySelect.innerHTML = `<option value="Other">Enter Your Category</option>`;
    } else {
      otherSuperCategoryWrapper.style.display = "none";
      loadCategories(superCategorySelect.value);
    }
  });

  function loadCategories(supercategory_id) {
    if (!categorySelect) return;
    openDB(() => {
      const tx = db.transaction(["categories"], "readonly");
      const store = tx.objectStore("categories");
      const index = store.index("supercategory_id");
      index.getAll(supercategory_id).onsuccess = (event) => {
        const cats = event.target.result;
        categorySelect.innerHTML = `<option value="">Select Category</option>`;
        cats.forEach((cat) => {
          categorySelect.innerHTML += `<option value="${cat.category_id}">${cat.category_name}</option>`;
        });
        categorySelect.innerHTML += `<option value="Other">Other</option>`;
      };
    });
  }

  categorySelect.addEventListener("change", () => {
    if (categorySelect.value === "Other") {
      otherCategoryWrapper.style.display = "block";
    } else {
      otherCategoryWrapper.style.display = "none";
    }
  });

  document.getElementById("addFeatureBtn").addEventListener("click", () => {
    const featureInput = document.getElementById("featureInput");
    const feature = featureInput.value.trim();
    if (!feature) return;
    const featuresList = document.getElementById("featuresList");
    const featureItem = document.createElement("div");
    featureItem.className = "feature-item";
    featureItem.innerText = feature;
    featuresList.appendChild(featureItem);
    const hiddenFeatures = document.getElementById("features");
    hiddenFeatures.value = hiddenFeatures.value ? hiddenFeatures.value + "," + feature : feature;
    featureInput.value = "";
  });

  addCarForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newCategory = otherCategoryInput.value.trim();
    let supercategoryId = superCategorySelect.value;
    let categoryId = categorySelect.value;
    const vehicleOwner = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (!vehicleOwner) {
      alert("Please log in first.");
      return;
    }
    if (supercategoryId === "Other") {
      supercategoryId = await saveNewSuperCategory(otherSuperCategoryInput.value.trim());
    }
    if (categoryId === "Other" && newCategory.length > 0) {
      categoryId = await saveNewCategory(newCategory, supercategoryId);
    }
    saveImages().then((imageURLs) => {
      const vehicleData = {
        vehicle_id: crypto.randomUUID(),
        vehicle_owner_id: vehicleOwner.user_id,
        vehicle_owner_name: vehicleOwner.username,
        vehicle_model: document.getElementById("vehicleModel").value.trim(),
        vehicle_number: document.getElementById("vehicleNumber").value.trim(),
        minimum_rental_price: Number(document.getElementById("minPrice").value),
        availability: "Available",
        location: document.getElementById("location").value.trim(),
        features: document.getElementById("features").value.trim(),
        images_URL: imageURLs,
        uploaded_at: new Date().toISOString(),
        category_id: categoryId,
        supercategory_id: supercategoryId,
      };
      saveVehicle(vehicleData);
      closeModal();
      loadSellerListings();
      window.location.reload();
    });
  });


  function saveNewSuperCategory(name) {
    return new Promise((resolve) => {
      const supercategoryId = crypto.randomUUID();
      openDB(() => {
        const tx = db.transaction(["superCategories"], "readwrite");
        const store = tx.objectStore("superCategories");
        store.add({ supercategory_id: supercategoryId, superCategory_name: name }).onsuccess = () => {
          resolve(supercategoryId);
        };
      });
    });
  }


  function saveNewCategory(catName, superCatId) {
    return new Promise((resolve) => {
      const categoryId = crypto.randomUUID();
      openDB(() => {
        const tx = db.transaction(["categories"], "readwrite");
        const store = tx.objectStore("categories");
        store.add({ category_id: categoryId, category_name: catName, supercategory_id: superCatId }).onsuccess = () => {
          alert(`New category "${catName}" added successfully!`);
          resolve(categoryId);
        };
      });
    });
  }


  function saveVehicle(vehicleData) {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readwrite");
      const store = tx.objectStore("vehicles");
      store.add(vehicleData);
    });
  }


  function saveImages() {
    const files = document.getElementById("imageUpload").files;
    let imageArray = [];
    if (!files || files.length === 0) {
      return Promise.resolve(JSON.stringify([]));
    }
    let promises = [];
    for (let i = 0; i < files.length; i++) {
      promises.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = function (event) {
            imageArray.push(event.target.result);
            resolve();
          };
          reader.onerror = function (err) {
            reject(err);
          };
          reader.readAsDataURL(files[i]);
        })
      );
    }
    return Promise.all(promises).then(() => JSON.stringify(imageArray));
  }


  function loadSellerListings() {
    openDB(() => {
      const tx = db.transaction(["vehicles"], "readonly");
      const store = tx.objectStore("vehicles");
      const index = store.index("vehicle_owner_id");
      index.getAll(window.sellerId).onsuccess = (event) => {
        const listings = event.target.result;
        displayListings(listings);
      };
    });
  }


  function displayListings(listings) {
    const carContainer = document.getElementById("carContainer");
    carContainer.innerHTML = "";

    let filteredListings = listings.filter(
      (vehicle) => vehicle.availability === currentAvailabilityFilter
    );
    if (!filteredListings || filteredListings.length === 0) {
      carContainer.innerHTML = "<p>No listings found!</p>";
      return;
    }
    filteredListings.forEach((vehicle) => {
      const carCard = document.createElement("div");
      carCard.classList.add("car-card");
      let images = [];
      try {
        images = JSON.parse(vehicle.images_URL);
      } catch (err) {
        images = [];
      }
      let imageSrc = images && images.length > 0 ? images[0] : "https://via.placeholder.com/250";

      let buttonHTML = "";
      if (vehicle.availability === "Available") {
        buttonHTML = `<button class="btn " onclick="deleteListing('${vehicle.vehicle_id}')">De-list</button>`;
      } else {
        buttonHTML = `<button class="btn " onclick="listAgain('${vehicle.vehicle_id}')">List Again</button>`;
      }
      carCard.innerHTML = `
        <img src="${imageSrc}" alt="Car Image">
        <h3>${vehicle.vehicle_model}</h3>
        <p>Price: Rs ${vehicle.minimum_rental_price} /day</p>
        <p>Location: ${vehicle.location}</p>
        <p>Availability: <strong>${vehicle.availability}</strong></p>
        ${buttonHTML}
      `;
      carContainer.appendChild(carCard);
    });
  }


  function deleteListing(vehicleId) {
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;
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
        alert("Listing deleted successfully!");
        loadSellerListings();
      };
      tx.onerror = (err) => {
        console.error("Error deleting listing:", err);
        alert("Could not delete listing. Try again.");
      };
    });
  }
  window.deleteListing = deleteListing;


  function listAgain(vehicleId) {
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
        alert("Listing has been re-listed successfully!");
        loadSellerListings();
      };
      tx.onerror = (err) => {
        console.error("Error listing again:", err);
        alert("Could not list the car again. Try again.");
      };
    });
  }
  window.listAgain = listAgain;
});
