const categories = [
  "all",
  "shop",
  "hospital",
  "pharmacy",
  "school",
  "restaurant",
  "hotel",
  "petrol_pump",
  "atm",
];

let map;
let userLocation = [28.6139, 77.2090];
let userMarker;
let placesLayer;
let routeLine;
let activeCategory = "all";

const trackingState = {
  watchId: null,
  lastLiveRefreshAt: 0,
};

function createMap() {
  map = L.map("map", { zoomControl: true }).setView(userLocation, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  placesLayer = L.layerGroup().addTo(map);

  userMarker = L.marker(userLocation)
    .addTo(map)
    .bindPopup("Your location");
}

function renderCategoryFilters() {
  const root = document.getElementById("category-filters");
  root.innerHTML = "";

  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = `chip ${activeCategory === cat ? "active" : ""}`;
    chip.textContent = cat.replace("_", " ");

    chip.onclick = () => {
      activeCategory = cat;
      renderCategoryFilters();
      loadPlaces();
    };

    root.appendChild(chip);
  });
}

async function loadPlaces() {
  const url = `/api/places?category=${activeCategory}&lat=${userLocation[0]}&lng=${userLocation[1]}`;
  const response = await fetch(url);
  const places = await response.json();

  placesLayer.clearLayers();

  const listRoot = document.getElementById("places-list");
  listRoot.innerHTML = "";

  places.forEach((place) => {
    const marker = L.circleMarker([place.latitude, place.longitude], {
      radius: 8,
      color: "#1f5dcf",
      fillColor: "#6ca8ff",
      fillOpacity: 0.85,
    }).addTo(placesLayer);

    marker.on("click", () => openPlaceModal(place));

    const card = document.createElement("article");
    card.className = "place-card";

    card.innerHTML = `
      <h3>${place.name}</h3>
      <p class="meta">${place.address}</p>
      <p class="meta">⭐ ${place.rating} • ${place.distance_km ?? "--"} km away</p>
      <button class="route-btn">Show Route</button>
    `;

    card.querySelector(".route-btn").onclick = () => {
      map.flyTo([place.latitude, place.longitude], 15, { duration: 0.8 });
      openPlaceModal(place);
      drawRoute(place);
    };

    listRoot.appendChild(card);
  });

  updateStats();
  updateTrafficIndicator();
}

function openPlaceModal(place) {
  const modal = document.getElementById("place-modal");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <img src="${place.image_url}" alt="${place.name}" style="width:100%;max-height:260px;object-fit:cover;border-radius:10px;"/>
    <h2>${place.name}</h2>
    <p>${place.description}</p>
    <p><strong>Address:</strong> ${place.address}</p>
    <p><strong>Contact:</strong> ${place.contact || "N/A"}</p>
    <p><strong>Opening hours:</strong> ${place.opening_hours || "N/A"}</p>
    <p><strong>Rating:</strong> ${place.rating || "N/A"}</p>
    <p><a href="/details/${place.id}" target="_blank">Open full details page</a></p>
    <button id="modal-route-btn">Navigate from my location</button>
  `;

  body.querySelector("#modal-route-btn").onclick = () => drawRoute(place);

  modal.classList.remove("hidden");
}

async function drawRoute(place) {
  const url = `/api/route?start_lat=${userLocation[0]}&start_lng=${userLocation[1]}&end_lat=${place.latitude}&end_lng=${place.longitude}`;
  const response = await fetch(url);
  const route = await response.json();

  if (routeLine) {
    map.removeLayer(routeLine);
  }

  routeLine = L.polyline(route.geometry, {
    color: "#00a66b",
    weight: 5,
    opacity: 0.85,
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

  const alternatives = (route.alternatives || [])
    .map(
      (a, idx) =>
        `Alt ${idx + 1}: ${a.distance_km} km / ${a.duration_min} min`
    )
    .join("<br>");

  const trafficLevel = ["Low", "Medium", "High"][
    Math.floor(Math.random() * 3)
  ];

  const wait =
    trafficLevel === "High"
      ? "8-12 min"
      : trafficLevel === "Medium"
      ? "3-7 min"
      : "0-2 min";

  routeLine
    .bindPopup(`
      <strong>Distance:</strong> ${route.distance_km} km<br>
      <strong>ETA:</strong> ${route.duration_min} mins<br>
      <strong>Source:</strong> ${route.source}<br>
      <strong>Traffic:</strong> ${trafficLevel}<br>
      <strong>Signal wait:</strong> ${wait}<br>
      ${alternatives}
    `)
    .openPopup();
}

async function updateStats() {
  const response = await fetch(
    `/api/stats?lat=${userLocation[0]}&lng=${userLocation[1]}`
  );
  const stats = await response.json();

  document.getElementById(
    "stats"
  ).textContent = `Total: ${stats.total} | Shortest: ${stats.shortest} km | Longest: ${stats.longest} km`;
}

function updateTrafficIndicator() {
  const traffic = ["Low", "Medium", "High"][
    Math.floor(Math.random() * 3)
  ];
  const crowd = ["Low", "Medium", "High"][
    Math.floor(Math.random() * 3)
  ];

  document.getElementById(
    "traffic-indicator"
  ).textContent = `Traffic: ${traffic} | Crowd: ${crowd}`;
}

function setupLocationHandlers() {
  document.getElementById("detect-location-btn").onclick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        userMarker.setLatLng(userLocation);
        map.setView(userLocation, 14, { animate: true });

        loadPlaces();
      },
      () => alert("Could not detect location.")
    );
  };

  document.getElementById("apply-manual-location-btn").onclick = () => {
    const text = document
      .getElementById("manual-location")
      .value.trim();

    const [lat, lng] = text.split(",").map(Number);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Enter valid lat,lng");
      return;
    }

    userLocation = [lat, lng];

    userMarker.setLatLng(userLocation);
    map.flyTo(userLocation, 14);

    loadPlaces();
  };

  document.getElementById("realtime-location-btn").onclick = () => {
    toggleRealtimeTracking();
  };
}

function toggleRealtimeTracking() {
  const statusEl = document.getElementById("realtime-status");
  const toggleBtn = document.getElementById("realtime-location-btn");

  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  if (trackingState.watchId !== null) {
    navigator.geolocation.clearWatch(trackingState.watchId);
    trackingState.watchId = null;

    statusEl.textContent = "Tracking: Off";
    toggleBtn.textContent = "Start Live Tracking";
    return;
  }

  statusEl.textContent = "Tracking: Starting...";
  toggleBtn.textContent = "Stop Live Tracking";

  trackingState.watchId = navigator.geolocation.watchPosition(
    (position) => {
      userLocation = [
        position.coords.latitude,
        position.coords.longitude,
      ];

      userMarker.setLatLng(userLocation);
      map.panTo(userLocation);

      const now = Date.now();

      if (now - trackingState.lastLiveRefreshAt > 3000) {
        trackingState.lastLiveRefreshAt = now;
        loadPlaces();
      }

      statusEl.textContent = `Tracking: On (${userLocation[0].toFixed(
        5
      )}, ${userLocation[1].toFixed(5)})`;
    },
    () => {
      statusEl.textContent = "Tracking Error";
      toggleBtn.textContent = "Start Live Tracking";
      trackingState.watchId = null;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  );
}

function setupModalHandlers() {
  document.getElementById("close-modal").onclick = () => {
    document
      .getElementById("place-modal")
      .classList.add("hidden");
  };
}

window.addEventListener("DOMContentLoaded", async () => {
  createMap();
  renderCategoryFilters();
  setupLocationHandlers();
  setupModalHandlers();
  await loadPlaces();
});

window.addEventListener("beforeunload", () => {
  if (trackingState.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(trackingState.watchId);
  }
});