document.addEventListener('DOMContentLoaded', function() {
    openDB(() => {
        console.log("Database initialized in index.js");
        loadCars();
    });

    document.querySelector("button").addEventListener("click", function() {
        document.querySelector('.carousel-section').scrollIntoView({ behavior: 'smooth' });
    });

    function loadCars() {
        const transaction = db.transaction(["cars"], "readonly");
        const store = transaction.objectStore("cars");
        const request = store.getAll();

        request.onsuccess = (event) => {
            const cars = event.target.result;
            const track = document.getElementById("track1");
            track.innerHTML = ""; 

            cars.forEach((car) => {
                let div = document.createElement("div");
                div.classList.add("carousel-item");
                div.innerHTML = `<img src="${car.image}" alt="${car.model}">`;
                div.addEventListener("click", function() {
                    sessionStorage.setItem("selectedCar", JSON.stringify(car));
                    document.location.href = './dashboard.html';
                });
                track.appendChild(div);
            });
        };
    }
});
