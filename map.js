const map = L.map('map', { maxBoundsViscosity: 1.0 }).setView([20, 0], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  minZoom: 2,
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
  noWrap: true
}).addTo(map);

const southWest = L.latLng(-90, -180);
const northEast = L.latLng(90, 400);
const bounds = L.latLngBounds(southWest, northEast);
map.setMaxBounds(bounds);

const visitedStorageKey = 'coupleMapVisitedPlaces';
const wishlistStorageKey = 'coupleMapWishlistPlaces';

let visitedPlaces = [];
let wishlistPlaces = [];

let editingPlace = null; // { category: 'visited'|'wishlist', index: number } or null

function loadPlaces() {
  const visitedData = localStorage.getItem(visitedStorageKey);
  const wishlistData = localStorage.getItem(wishlistStorageKey);
  if (visitedData) {
    visitedPlaces = JSON.parse(visitedData);
  } else {
    visitedPlaces = [
      {
        name: "Paris, France",
        coords: [48.8566, 2.3522],
        date: { day: "", month: "", year: "" },
        photo: ""
      },
      {
        name: "New York, USA",
        coords: [40.7128, -74.006],
        date: { day: "", month: "", year: "" },
        photo: ""
      }
    ];
  }
  if (wishlistData) {
    wishlistPlaces = JSON.parse(wishlistData);
  } else {
    wishlistPlaces = [
      {
        name: "Tokyo, Japan",
        coords: [35.6762, 139.6503],
        date: { day: "", month: "", year: "" },
        photo: ""
      },
      {
        name: "Sydney, Australia",
        coords: [-33.8688, 151.2093],
        date: { day: "", month: "", year: "" },
        photo: ""
      }
    ];
  }
}

let visitedMarkers = [];
let wishlistMarkers = [];

function clearMarkers(markers) {
  markers.forEach(marker => map.removeLayer(marker));
  markers.length = 0;
}

function getOrdinalSuffix(day) {
  const d = parseInt(day);
  if (isNaN(d)) return "";
  if (d > 3 && d < 21) return "th";
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function monthNumberToName(monthNum) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const m = parseInt(monthNum);
  if (isNaN(m) || m < 1 || m > 12) return "";
  return months[m - 1];
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  const day = dateObj.day ? dateObj.day : "";
  const suffix = getOrdinalSuffix(day);
  const month = dateObj.month ? monthNumberToName(dateObj.month) : "";
  const year = dateObj.year ? dateObj.year : "";
  if (day && month && year) {
    return `${day}${suffix} ${month} ${year}`;
  } else if (month && year) {
    return `${month} ${year}`;
  } else if (year) {
    return year;
  }
  return "";
}

function dateObjToDate(dateObj) {
  if (!dateObj) return null;
  const day = parseInt(dateObj.day) || 1;
  const month = (parseInt(dateObj.month) || 1) - 1; // JS months 0-11
  const year = parseInt(dateObj.year) || 1970;
  return new Date(year, month, day);
}

function addPlaceMarkers(places, markerColor, markersArray) {
  places.forEach(place => {
    const marker = L.marker(place.coords, {
      icon: L.icon({
        iconUrl: markerColor,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
      })
    }).addTo(map);
    marker.bindPopup(`<b>${place.name}</b><br>${formatDate(place.date)}<br>${place.photo ? `<img src="${place.photo}" alt="${place.name}" style="width:100px; border-radius:5px;">` : ''}`);
    markersArray.push(marker);
  });
}

function createEditButton(category, index) {
  const btn = document.createElement('button');
  btn.textContent = 'Edit';
  btn.style.marginLeft = '10px';
  btn.addEventListener('click', () => {
    loadPlaceIntoForm(category, index);
  });
  return btn;
}

function createRemoveButton(category, index) {
  const btn = document.createElement('button');
  btn.textContent = 'Remove';
  btn.style.marginLeft = '10px';
  btn.style.color = 'red';
  btn.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove this place?')) {
      if (category === 'visited') {
        visitedPlaces.splice(index, 1);
      } else if (category === 'wishlist') {
        wishlistPlaces.splice(index, 1);
      }
      savePlaces();
      updateMapAndPlaces();
    }
  });
  return btn;
}

function populatePlacesSection(places, containerId, category) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // Separate places with dates and without dates
  const placesWithDates = [];
  const placesWithoutDates = [];

  places.forEach(place => {
    const hasDate = place.date && (place.date.day || place.date.month || place.date.year);
    if (hasDate) {
      placesWithDates.push(place);
    } else {
      placesWithoutDates.push(place);
    }
  });

  // Sort places with dates by date ascending
  placesWithDates.sort((a, b) => {
    const dateA = dateObjToDate(a.date);
    const dateB = dateObjToDate(b.date);
    return dateA - dateB;
  });

  // Sort places without dates alphabetically by name
  placesWithoutDates.sort((a, b) => a.name.localeCompare(b.name));

  // Concatenate the two lists: dated places first, then undated
  const sortedPlaces = placesWithDates.concat(placesWithoutDates);

  sortedPlaces.forEach((place, sortedIndex) => {
    const placeDiv = document.createElement('div');
    placeDiv.className = 'place';
    placeDiv.innerHTML = `
      <div class="text-content">
        <h3>${place.name}</h3>
        <p>${formatDate(place.date)}</p>
      </div>
${place.photo && place.photo.trim().length > 0 && place.photo !== 'data:,' ? `<img src="${place.photo}" alt="${place.name}" />` : ''}
    `;
    // Find the original index of this place in the original places array
    const originalIndex = places.findIndex(p => p === place);
    const editBtn = createEditButton(category, originalIndex);
    const removeBtn = createRemoveButton(category, originalIndex);

    // Remove margin-left styles from buttons
    editBtn.style.marginLeft = '';
    removeBtn.style.marginLeft = '';

    // Create a container div for buttons to stack vertically
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.appendChild(editBtn);
    buttonGroup.appendChild(removeBtn);

    placeDiv.appendChild(buttonGroup);
    container.appendChild(placeDiv);
  });
}

function updateMapAndPlaces() {
  clearMarkers(visitedMarkers);
  clearMarkers(wishlistMarkers);
  addPlaceMarkers(visitedPlaces, 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png', visitedMarkers);
  addPlaceMarkers(wishlistPlaces, 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', wishlistMarkers);
  populatePlacesSection(visitedPlaces, 'visited-places', 'visited');
  populatePlacesSection(wishlistPlaces, 'wishlist-places', 'wishlist');
}

function savePlaces() {
  localStorage.setItem(visitedStorageKey, JSON.stringify(visitedPlaces));
  localStorage.setItem(wishlistStorageKey, JSON.stringify(wishlistPlaces));
}

function isValidLatLng(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  return !isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function loadPlaceIntoForm(category, index) {
  const place = category === 'visited' ? visitedPlaces[index] : wishlistPlaces[index];
  if (!place) return;
  editingPlace = { category, index };
  // Set the radio button for category
  const categoryRadios = document.getElementsByName('category');
  categoryRadios.forEach(radio => {
    radio.checked = (radio.value === category);
  });
  document.getElementById('name').value = place.name;
  document.getElementById('day').value = place.date.day || "";
  document.getElementById('month').value = place.date.month || "";
  document.getElementById('year').value = place.date.year || "";
  document.getElementById('lat').value = place.coords[0];
  document.getElementById('lng').value = place.coords[1];
  const imageControlsModal = document.getElementById('image-controls-modal');
  const imageCrop = document.getElementById('image-crop');
  const cropOverlay = document.getElementById('crop-overlay');
  const photoUploadInput = document.getElementById('photo-upload');

  if (place.photo) {
    // Show existing photo in image box as read-only
    imageCrop.src = place.photo;
    cropOverlay.style.display = 'none'; // Hide crop overlay to disable cropping
    // Disable dragging and resizing by removing event handlers
    cropOverlay.onmousedown = null;
    document.onmouseup = null;
    document.onmousemove = null;
  } else {
    // No existing photo, clear image and show crop overlay for new upload
    imageCrop.src = '';
    cropOverlay.style.display = 'none'; // Hide crop overlay initially
  }

  // Enable photo upload input to allow uploading new image to change photo
  photoUploadInput.value = ''; // Clear file input to remove file name display
  photoUploadInput.disabled = false;


  document.getElementById('submission-modal').style.display = 'flex';
  imageControlsModal.style.display = 'flex';
  const submitBtn = document.getElementById('submission-form-submit');
  if (submitBtn) {
    submitBtn.textContent = 'Save changes';
  }
}

document.getElementById('photo-upload').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const image = new Image();
    image.onload = function() {
      const imageCrop = document.getElementById('image-crop');
      const cropOverlay = document.getElementById('crop-overlay');
      const imageCropContainer = document.getElementById('image-crop-container');

      // Set the image src to original image only (do not set to cropped image here)
      imageCrop.src = dataUrl;

      // Show crop overlay
      cropOverlay.style.display = 'block';

      // Reset crop overlay size and position to default square in center
      const containerWidth = imageCropContainer.clientWidth;
      const containerHeight = imageCropContainer.clientHeight;
      const size = Math.min(containerWidth, containerHeight) * 0.8; // 80% of smaller dimension
      cropOverlay.style.width = size + 'px';
      cropOverlay.style.height = size + 'px';
      cropOverlay.style.left = ((containerWidth - size) / 2) + 'px';
      cropOverlay.style.top = ((containerHeight - size) / 2) + 'px';

      // Variables for dragging and resizing
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let cropStartLeft = 0;
      let cropStartTop = 0;

      // Variables for resizing
      let isResizing = false;
      let resizeStartX = 0;
      let resizeStartY = 0;
      let cropStartWidth = 0;
      let cropStartHeight = 0;

      // Add resize handle element
      let resizeHandle = cropOverlay.querySelector('.resize-handle');
      if (!resizeHandle) {
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        cropOverlay.appendChild(resizeHandle);
      }

      // Dragging handlers
      cropOverlay.onmousedown = function(e) {
        if (e.target === resizeHandle) {
          // Start resizing
          isResizing = true;
          resizeStartX = e.clientX;
          resizeStartY = e.clientY;
          cropStartWidth = cropOverlay.offsetWidth;
          cropStartHeight = cropOverlay.offsetHeight;
          e.preventDefault();
        } else {
          // Start dragging
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          cropStartLeft = cropOverlay.offsetLeft;
          cropStartTop = cropOverlay.offsetTop;
          e.preventDefault();
        }
      };

      document.onmouseup = function() {
        isDragging = false;
        isResizing = false;
      };

      document.onmousemove = function(e) {
        if (isDragging) {
          let newLeft = cropStartLeft + (e.clientX - dragStartX);
          let newTop = cropStartTop + (e.clientY - dragStartY);

          // Constrain within container
          newLeft = Math.max(0, Math.min(newLeft, imageCropContainer.clientWidth - cropOverlay.offsetWidth));
          newTop = Math.max(0, Math.min(newTop, imageCropContainer.clientHeight - cropOverlay.offsetHeight));

          cropOverlay.style.left = newLeft + 'px';
          cropOverlay.style.top = newTop + 'px';
        } else if (isResizing) {
          let deltaX = e.clientX - resizeStartX;
          let deltaY = e.clientY - resizeStartY;
          // Use the larger delta to maintain square aspect ratio
          let delta = Math.max(deltaX, deltaY);

          let newSize = Math.max(50, cropStartWidth + delta); // minimum size 50px
          // Constrain size to container bounds
          newSize = Math.min(newSize, imageCropContainer.clientWidth - cropOverlay.offsetLeft);
          newSize = Math.min(newSize, imageCropContainer.clientHeight - cropOverlay.offsetTop);

          cropOverlay.style.width = newSize + 'px';
          cropOverlay.style.height = newSize + 'px';
        }
      };


      // Enable crop overlay dragging and resizing on new image upload
      cropOverlay.onmousedown = function(e) {
        if (e.target === resizeHandle) {
          // Start resizing
          isResizing = true;
          resizeStartX = e.clientX;
          resizeStartY = e.clientY;
          cropStartWidth = cropOverlay.offsetWidth;
          cropStartHeight = cropOverlay.offsetHeight;
          e.preventDefault();
        } else {
          // Start dragging
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          cropStartLeft = cropOverlay.offsetLeft;
          cropStartTop = cropOverlay.offsetTop;
          e.preventDefault();
        }
      };

      document.onmouseup = function() {
        isDragging = false;
        isResizing = false;
      };

      document.onmousemove = function(e) {
        if (isDragging) {
          let newLeft = cropStartLeft + (e.clientX - dragStartX);
          let newTop = cropStartTop + (e.clientY - dragStartY);

          // Constrain within container
          newLeft = Math.max(0, Math.min(newLeft, imageCropContainer.clientWidth - cropOverlay.offsetWidth));
          newTop = Math.max(0, Math.min(newTop, imageCropContainer.clientHeight - cropOverlay.offsetHeight));

          cropOverlay.style.left = newLeft + 'px';
          cropOverlay.style.top = newTop + 'px';
        } else if (isResizing) {
          let deltaX = e.clientX - resizeStartX;
          let deltaY = e.clientY - resizeStartY;
          // Use the larger delta to maintain square aspect ratio
          let delta = Math.max(deltaX, deltaY);

          let newSize = Math.max(50, cropStartWidth + delta); // minimum size 50px
          // Constrain size to container bounds
          newSize = Math.min(newSize, imageCropContainer.clientWidth - cropOverlay.offsetLeft);
          newSize = Math.min(newSize, imageCropContainer.clientHeight - cropOverlay.offsetTop);

          cropOverlay.style.width = newSize + 'px';
          cropOverlay.style.height = newSize + 'px';
        }
      };
    };
    image.src = dataUrl;
  };
  reader.readAsDataURL(file);
});



// Function to visually indicate crop area by greying out outside the crop overlay on the original image
function updateCropPreviewWithOverlay() {
  const imageCrop = document.getElementById('image-crop');
  const cropOverlay = document.getElementById('crop-overlay');
  const imageCropContainer = document.getElementById('image-crop-container');

  if (!imageCrop.src) return;

  // Instead of modifying the original image element, create a separate preview canvas element for the overlay effect
  let previewCanvas = document.getElementById('crop-preview-canvas');
  if (!previewCanvas) {
    previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'crop-preview-canvas';
    previewCanvas.style.position = 'absolute';
    previewCanvas.style.top = imageCrop.offsetTop + 'px';
    previewCanvas.style.left = imageCrop.offsetLeft + 'px';
    previewCanvas.style.pointerEvents = 'none'; // allow clicks to pass through
    previewCanvas.style.borderRadius = '5px';
    imageCrop.parentElement.appendChild(previewCanvas);
  }

  const img = new Image();
  img.onload = function() {
    const displayedWidth = imageCrop.clientWidth;
    const displayedHeight = imageCrop.clientHeight;

    previewCanvas.width = displayedWidth;
    previewCanvas.height = displayedHeight;

    const ctx = previewCanvas.getContext('2d');

    // Clear previous drawing
    ctx.clearRect(0, 0, displayedWidth, displayedHeight);

    // Draw original image
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight);

    // Get crop overlay position and size
    const cropLeft = cropOverlay.offsetLeft;
    const cropTop = cropOverlay.offsetTop;
    const cropSize = cropOverlay.offsetWidth; // square

    // Draw grey overlay outside crop area
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';

    // Top area
    ctx.fillRect(0, 0, displayedWidth, cropTop);
    // Bottom area
    ctx.fillRect(0, cropTop + cropSize, displayedWidth, displayedHeight - (cropTop + cropSize));
    // Left area
    ctx.fillRect(0, cropTop, cropLeft, cropSize);
    // Right area
    ctx.fillRect(cropLeft + cropSize, cropTop, displayedWidth - (cropLeft + cropSize), cropSize);
  };
  img.src = imageCrop.src;
}

function getCroppedImageDataUrl() {
  const imageCrop = document.getElementById('image-crop');
  const cropOverlay = document.getElementById('crop-overlay');
  const imageCropContainer = document.getElementById('image-crop-container');

  if (!imageCrop.src) return '';

  const img = new Image();
  img.src = imageCrop.src;

  // Calculate scale between natural image size and displayed size
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  const displayedWidth = imageCrop.clientWidth;
  const displayedHeight = imageCrop.clientHeight;
  const scaleX = naturalWidth / displayedWidth;
  const scaleY = naturalHeight / displayedHeight;

  // Get crop overlay position and size relative to displayed image
  const cropLeft = cropOverlay.offsetLeft;
  const cropTop = cropOverlay.offsetTop;
  const cropSize = cropOverlay.offsetWidth; // square

  // Calculate crop area in natural image coordinates
  const cropX = cropLeft * scaleX;
  const cropY = cropTop * scaleY;
  const cropWidth = cropSize * scaleX;
  const cropHeight = cropSize * scaleY;

  // Create canvas for cropped image
  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');

  // Draw cropped image area
  ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  // Return data URL of cropped image
  return canvas.toDataURL('image/png');
}

document.getElementById('submission-form').addEventListener('submit', function(e) {
  e.preventDefault();

  // Get selected category from radio buttons
  const categoryRadios = document.getElementsByName('category');
  let category = null;
  for (let i = 0; i < categoryRadios.length; i++) {
    if (categoryRadios[i].checked) {
      category = categoryRadios[i].value;
      break;
    }
  }

  const name = document.getElementById('name').value.trim();
  const day = document.getElementById('day').value.trim();
  const month = document.getElementById('month').value.trim();
  const year = document.getElementById('year').value.trim();
  const lat = document.getElementById('lat').value.trim();
  const lng = document.getElementById('lng').value.trim();

  if (!isValidLatLng(lat, lng)) {
    alert('Please enter valid latitude and longitude values.');
    return;
  }

  let photo = '';
  // Use the checkbox with id 'remove-photo' to check if photo is removed
  const removePhotoCheckbox = document.getElementById('remove-photo');
  const imageCrop = document.getElementById('image-crop');
  const isPhotoRemoved = removePhotoCheckbox ? removePhotoCheckbox.checked : false;
  if (!isPhotoRemoved) {
    photo = getCroppedImageDataUrl();
  }

  const newPlace = {
    name,
    date: { day, month, year },
    photo,
    coords: [parseFloat(lat), parseFloat(lng)]
  };

  if (day || month || year) {
    const placeDate = dateObjToDate(newPlace.date);
    const now = new Date();

    if (category === 'visited' && placeDate >= now) {
      alert('For "Places You\'ve Been", the date must be before the current date.');
      return;
    }
    if (category === 'wishlist' && placeDate <= now) {
      alert('For "Places You Want to Go", the date must be after the current date.');
      return;
    }
  }

  if (editingPlace) {
    if (editingPlace.category === category) {
      if (category === 'visited') {
        visitedPlaces[editingPlace.index] = newPlace;
      } else if (category === 'wishlist') {
        wishlistPlaces[editingPlace.index] = newPlace;
      }
    } else {
      // Category changed, remove from old and add to new
      if (editingPlace.category === 'visited') {
        visitedPlaces.splice(editingPlace.index, 1);
        wishlistPlaces.push(newPlace);
      } else {
        wishlistPlaces.splice(editingPlace.index, 1);
        visitedPlaces.push(newPlace);
      }
    }
    editingPlace = null;
  } else {
    if (category === 'visited') {
      visitedPlaces.push(newPlace);
    } else if (category === 'wishlist') {
      wishlistPlaces.push(newPlace);
    } else {
      alert('Please select a valid category.');
      return;
    }
  }

  savePlaces();
  updateMapAndPlaces();
  this.reset();
  document.getElementById('submission-modal').style.display = 'none';
  document.getElementById('image-controls-modal').style.display = 'none';
});

document.getElementById('show-form-btn').addEventListener('click', () => {
  const modal = document.getElementById('submission-modal');
  const imageControlsModal = document.getElementById('image-controls-modal');
  modal.style.display = 'flex';
  imageControlsModal.style.display = 'flex';
  editingPlace = null;
  const form = document.getElementById('submission-form');
  form.reset();
  // Set date fields to today's date
  const today = new Date();
  form.day.value = today.getDate().toString();
  form.month.value = (today.getMonth() + 1).toString();
  form.year.value = today.getFullYear().toString();
  const imageCrop = document.getElementById('image-crop');
  // Clear image on new submission form
  imageCrop.src = '';
  const submitBtn = document.getElementById('submission-form-submit');
  if (submitBtn) {
    submitBtn.textContent = 'Add Submission';
  }
});

document.getElementById('close-modal').addEventListener('click', () => {
  const modal = document.getElementById('submission-modal');
  const imageControlsModal = document.getElementById('image-controls-modal');
  modal.style.display = 'none';
  imageControlsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  // Remove closing modal on outside click to keep popup open until X is clicked
  // const modal = document.getElementById('submission-modal');
  // const imageControlsModal = document.getElementById('image-controls-modal');
  // if (event.target === modal) {
  //   modal.style.display = 'none';
  //   imageControlsModal.style.display = 'none';
  // }
});

document.getElementById('submission-form').addEventListener('submit', function(e) {
  e.preventDefault();
  // Get selected category from radio buttons
  const categoryRadios = document.getElementsByName('category');
  let category = null;
  for (const radio of categoryRadios) {
    if (radio.checked) {
      category = radio.value;
      break;
    }
  }
  if (!category) {
    // Provide visual feedback for category selection
    const categoryRadios = document.getElementsByName('category');
    categoryRadios.forEach(radio => {
      const label = radio.parentElement;

    });
    setTimeout(() => {
      categoryRadios.forEach(radio => {
        const label = radio.parentElement;
        if (label) {
          label.style.border = '';
        }
      });
    }, 2000);
    return;
  }
  const name = document.getElementById('name').value.trim();
  const day = document.getElementById('day').value.trim();
  const month = document.getElementById('month').value.trim();
  const year = document.getElementById('year').value.trim();
  const lat = document.getElementById('lat').value.trim();
  const lng = document.getElementById('lng').value.trim();

  if (!isValidLatLng(lat, lng)) {
    alert('Please enter valid latitude and longitude values.');
    return;
  }

  let photo = '';
  // Use the checkbox with id 'remove-photo' to check if photo is removed
  const removePhotoCheckbox = document.getElementById('remove-photo');
  const imageCrop = document.getElementById('image-crop');
  const isPhotoRemoved = removePhotoCheckbox ? removePhotoCheckbox.checked : false;
  if (!isPhotoRemoved) {
    photo = imageCrop.src || '';
  }

  const newPlace = {
    name,
    date: { day, month, year },
    photo,
    coords: [parseFloat(lat), parseFloat(lng)]
  };

  if (day || month || year) {
    const placeDate = dateObjToDate(newPlace.date);
    const now = new Date();

    if (category === 'visited' && placeDate >= now) {
      alert('For "Places You\'ve Been", the date must be before the current date.');
      return;
    }
    if (category === 'wishlist' && placeDate <= now) {
      alert('For "Places You Want to Go", the date must be after the current date.');
      return;
    }
  }

  if (editingPlace) {
    if (editingPlace.category === category) {
      if (category === 'visited') {
        visitedPlaces[editingPlace.index] = newPlace;
      } else if (category === 'wishlist') {
        wishlistPlaces[editingPlace.index] = newPlace;
      }
    } else {
      // Category changed, remove from old and add to new
      if (editingPlace.category === 'visited') {
        visitedPlaces.splice(editingPlace.index, 1);
        wishlistPlaces.push(newPlace);
      } else {
        wishlistPlaces.splice(editingPlace.index, 1);
        visitedPlaces.push(newPlace);
      }
    }
    editingPlace = null;
  } else {
    if (category === 'visited') {
      visitedPlaces.push(newPlace);
    } else if (category === 'wishlist') {
      wishlistPlaces.push(newPlace);
    } else {
      alert('Please select a valid category.');
      return;
    }
  }

  savePlaces();
  updateMapAndPlaces();
  this.reset();
  document.getElementById('submission-modal').style.display = 'none';
  document.getElementById('image-controls-modal').style.display = 'none';
});

loadPlaces();
updateMapAndPlaces();


document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
  const placesDiv = document.getElementById('places');
  const toggleBtn = document.getElementById('toggle-sidebar-btn');
  const currentZoom = map.getZoom();
  const isSidebarClosed = placesDiv.classList.contains('sidebar-closed');

  if (currentZoom === 2 && !isSidebarClosed) {
    // Prevent closing sidebar when zoom is 2 and sidebar is open
    return;
  }

  placesDiv.classList.toggle('sidebar-closed');
  toggleBtn.classList.toggle('move-btn');
});

let zoomTimeoutId = null;

map.on('zoomend', () => {
  const placesDiv = document.getElementById('places');
  const toggleBtn = document.getElementById('toggle-sidebar-btn');
  const currentZoom = map.getZoom();

  // Clear any pending timeout to prevent toggle button flicker on rapid zoom changes
  if (zoomTimeoutId) {
    clearTimeout(zoomTimeoutId);
    zoomTimeoutId = null;
  }

  if (currentZoom === 2) {
    if (placesDiv.classList.contains('sidebar-closed')) {
      placesDiv.classList.remove('sidebar-closed');
    }
    // Hide toggle button and ensure it is off when zoom is 2
    toggleBtn.classList.add('hidden');
    toggleBtn.classList.remove('move-btn');
  } else if (currentZoom === 3) {
    // Close sidebar when zoom changes from 2 to 3
    if (!placesDiv.classList.contains('sidebar-closed')) {
      // Hide toggle button immediately to slide with sidebar
      toggleBtn.classList.add('hidden');
      placesDiv.classList.add('sidebar-closed');
      toggleBtn.classList.remove('move-btn');
      // Show toggle button after sidebar slide animation (900ms delay)
      zoomTimeoutId = setTimeout(() => {
        toggleBtn.classList.remove('hidden');
        zoomTimeoutId = null;
      }, 900);
    }
  } else {
    // Show toggle button when zoom is not 2 or 3
    toggleBtn.classList.remove('hidden');
  }
});



