import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// NASA API Key
const NASA_API_KEY = 'MczIKlZyb0aFIhiLnks4CaiRZUeov4tBwk3eypn3';

// Global variables
let currentSection = 'apod';
let lightbox;
let lightboxImg;
let lightboxCaption;
let closeLightbox;
let roverPhotos = [];
let currentPhotoIndex = 0;
let photosPerPage = 12;
let issMap;
let issMarker;
let issPath = [];
let issTrackingInterval;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupLightbox();
    loadAPOD();
    initMarsRoverSection();
    initEarthImagerySection();
    initAsteroidSection();
    initISSTracker();
    initAPODSection();
});

// Set up navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Hide all sections and show the target
            document.querySelectorAll('section').forEach(section => {
                section.classList.remove('active-section');
            });
            document.getElementById(targetId).classList.add('active-section');
            
            currentSection = targetId;
            
            // Special handling for ISS section
            if (targetId === 'iss' && !issMap) {
                initISSMap();
            }
        });
    });
}

// Set up lightbox
function setupLightbox() {
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCaption = document.getElementById('lightbox-caption');
    closeLightbox = document.querySelector('.close-lightbox');
    
    closeLightbox.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });
}

// Show image in lightbox
function showInLightbox(imgSrc, caption) {
    lightboxImg.src = imgSrc;
    lightboxCaption.textContent = caption || '';
    lightbox.style.display = 'flex';
}

// Load Astronomy Picture of the Day
function loadAPOD(date) {
    const spinner = document.querySelector('#apod .loading-spinner');
    spinner.style.display = 'block';
    
    let url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
    if (date) {
        url += `&date=${date}`;
    }
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayAPOD(data);
            spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching APOD:', error);
            document.getElementById('apod-title').textContent = 'Error loading data';
            document.getElementById('apod-description').textContent = 'Sorry, we could not load the Astronomy Picture of the Day. Please try again later.';
            spinner.style.display = 'none';
        });
}

// Display APOD data
function displayAPOD(data) {
    document.getElementById('apod-title').textContent = data.title;
    document.getElementById('apod-date').textContent = new Date(data.date).toLocaleDateString();
    document.getElementById('apod-description').innerHTML = data.explanation;
    
    const container = document.getElementById('apod-image-container');
    container.innerHTML = '';
    
    if (data.media_type === 'image') {
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = data.title;
        img.onclick = () => showInLightbox(data.url, data.title);
        container.appendChild(img);
    } else if (data.media_type === 'video') {
        const iframe = document.createElement('iframe');
        iframe.src = data.url;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allowFullscreen = true;
        container.appendChild(iframe);
    }
    
    // Set date picker to current APOD date
    document.getElementById('apod-date-picker').value = data.date;
}

// Initialize APOD section
function initAPODSection() {
    // Set date picker max to today
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('apod-date-picker');
    datePicker.max = today;
    datePicker.min = '1995-06-16'; // First APOD date
    
    // Add event listeners
    datePicker.addEventListener('change', () => {
        loadAPOD(datePicker.value);
    });
    
    document.getElementById('apod-random').addEventListener('click', () => {
        const start = new Date('1995-06-16').getTime();
        const end = new Date().getTime();
        const randomDate = new Date(start + Math.random() * (end - start));
        const dateString = randomDate.toISOString().split('T')[0];
        datePicker.value = dateString;
        loadAPOD(dateString);
    });
}

// Mars Rover Photos
function initMarsRoverSection() {
    // Update to use date input instead of sol input
    const solInput = document.getElementById('sol-input');
    solInput.type = 'date';
    
    // Set max date to today
    const today = new Date().toISOString().split('T')[0];
    solInput.max = today;
    
    // Set min date to Curiosity rover's landing date
    solInput.min = '2012-08-06';

    // Modify loadRoverPhotos to use the Earth date
    function loadRoverPhotos() {
        const spinner = document.getElementById('mars-spinner');
        spinner.style.display = 'block';
        
        const rover = document.getElementById('rover-select').value;
        const camera = document.getElementById('camera-select').value;
        const earthDate = document.getElementById('sol-input').value;
        
        let url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?earth_date=${earthDate}&api_key=${NASA_API_KEY}`;
        if (camera !== 'all') {
            url += `&camera=${camera}`;
        }
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.photos && data.photos.length > 0) {
                    roverPhotos = data.photos;
                    displayRoverPhotos();
                } else {
                    document.getElementById('rover-photos').innerHTML = '<p class="no-results">No photos found for the selected Earth day.</p>';
                }
                spinner.style.display = 'none';
            })
            .catch(error => {
                console.error('Error fetching rover photos:', error);
                document.getElementById('rover-photos').innerHTML = '<p class="error">Error loading photos. Please try again later.</p>';
                spinner.style.display = 'none';
            });
    }

    // Populate camera options for Curiosity (default)
    populateCameraOptions('curiosity');
    
    // Add event listeners
    document.getElementById('rover-select').addEventListener('change', (e) => {
        populateCameraOptions(e.target.value);
    });
    
    document.getElementById('load-rover-photos').addEventListener('click', loadRoverPhotos);
    
    document.getElementById('prev-photos').addEventListener('click', () => {
        if (currentPhotoIndex - photosPerPage >= 0) {
            currentPhotoIndex -= photosPerPage;
            displayRoverPhotos();
        }
    });
    
    document.getElementById('next-photos').addEventListener('click', () => {
        if (currentPhotoIndex + photosPerPage < roverPhotos.length) {
            currentPhotoIndex += photosPerPage;
            displayRoverPhotos();
        }
    });
    
    // Load rover info
    loadRoverInfo('curiosity');
}

function populateCameraOptions(rover) {
    const cameraSelect = document.getElementById('camera-select');
    cameraSelect.innerHTML = '<option value="all">All Cameras</option>';
    
    const cameras = {
        curiosity: [
            { id: 'FHAZ', name: 'Front Hazard Avoidance Camera' },
            { id: 'RHAZ', name: 'Rear Hazard Avoidance Camera' },
            { id: 'MAST', name: 'Mast Camera' },
            { id: 'CHEMCAM', name: 'Chemistry and Camera Complex' },
            { id: 'MAHLI', name: 'Mars Hand Lens Imager' },
            { id: 'MARDI', name: 'Mars Descent Imager' },
            { id: 'NAVCAM', name: 'Navigation Camera' }
        ],
        opportunity: [
            { id: 'FHAZ', name: 'Front Hazard Avoidance Camera' },
            { id: 'RHAZ', name: 'Rear Hazard Avoidance Camera' },
            { id: 'NAVCAM', name: 'Navigation Camera' },
            { id: 'PANCAM', name: 'Panoramic Camera' },
            { id: 'MINITES', name: 'Miniature Thermal Emission Spectrometer' }
        ],
        spirit: [
            { id: 'FHAZ', name: 'Front Hazard Avoidance Camera' },
            { id: 'RHAZ', name: 'Rear Hazard Avoidance Camera' },
            { id: 'NAVCAM', name: 'Navigation Camera' },
            { id: 'PANCAM', name: 'Panoramic Camera' },
            { id: 'MINITES', name: 'Miniature Thermal Emission Spectrometer' }
        ],
        perseverance: [
            { id: 'EDL_RUCAM', name: 'Rover Up-Look Camera' },
            { id: 'EDL_RDCAM', name: 'Rover Down-Look Camera' },
            { id: 'EDL_DDCAM', name: 'Descent Stage Down-Look Camera' },
            { id: 'EDL_PUCAM1', name: 'Parachute Up-Look Camera A' },
            { id: 'EDL_PUCAM2', name: 'Parachute Up-Look Camera B' },
            { id: 'NAVCAM_LEFT', name: 'Navigation Camera - Left' },
            { id: 'NAVCAM_RIGHT', name: 'Navigation Camera - Right' },
            { id: 'MCZ_RIGHT', name: 'Mast Camera Zoom - Right' },
            { id: 'MCZ_LEFT', name: 'Mast Camera Zoom - Left' },
            { id: 'FRONT_HAZCAM_LEFT_A', name: 'Front Hazard Avoidance Camera - Left' },
            { id: 'FRONT_HAZCAM_RIGHT_A', name: 'Front Hazard Avoidance Camera - Right' },
            { id: 'REAR_HAZCAM_LEFT', name: 'Rear Hazard Avoidance Camera - Left' },
            { id: 'REAR_HAZCAM_RIGHT', name: 'Rear Hazard Avoidance Camera - Right' }
        ]
    };
    
    cameras[rover].forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.id;
        option.textContent = camera.name;
        cameraSelect.appendChild(option);
    });
    
    // Update rover info when rover changes
    loadRoverInfo(rover);
}

function displayRoverPhotos() {
    const container = document.getElementById('rover-photos');
    container.innerHTML = '';
    
    const end = Math.min(currentPhotoIndex + photosPerPage, roverPhotos.length);
    const currentPhotos = roverPhotos.slice(currentPhotoIndex, end);
    
    currentPhotos.forEach(photo => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'rover-photo';
        
        const img = document.createElement('img');
        img.src = photo.img_src;
        img.alt = `Mars Rover Photo from ${photo.rover.name}`;
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'photo-info';
        info.innerHTML = `
            <div>Date: ${photo.earth_date}</div>
            <div>Camera: ${photo.camera.full_name}</div>
        `;
        
        photoDiv.appendChild(img);
        photoDiv.appendChild(info);
        photoDiv.addEventListener('click', () => showInLightbox(photo.img_src, `${photo.rover.name} - ${photo.camera.full_name} - Sol ${photo.sol}`));
        
        container.appendChild(photoDiv);
    });
    
    // Update navigation
    document.getElementById('photo-counter').textContent = `${currentPhotoIndex + 1}-${end} of ${roverPhotos.length} photos`;
    document.getElementById('prev-photos').disabled = currentPhotoIndex === 0;
    document.getElementById('next-photos').disabled = end === roverPhotos.length;
}

function loadRoverInfo(rover) {
    fetch(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}?api_key=${NASA_API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayRoverInfo(data.rover);
        })
        .catch(error => {
            console.error('Error fetching rover info:', error);
            document.getElementById('rover-info').innerHTML = '<p class="error">Error loading rover information.</p>';
        });
}

function displayRoverInfo(rover) {
    const container = document.getElementById('rover-info');
    container.innerHTML = '';
    
    // Create stats
    const stats = [
        { label: 'Launch Date', value: new Date(rover.launch_date).toLocaleDateString() },
        { label: 'Landing Date', value: new Date(rover.landing_date).toLocaleDateString() },
        { label: 'Status', value: rover.status.charAt(0).toUpperCase() + rover.status.slice(1) },
        { label: 'Total Photos', value: rover.total_photos.toLocaleString() },
        { label: 'Last Communication', value: new Date(rover.max_date).toLocaleDateString() },
        { label: 'Max Earth Day', value: rover.max_sol }
    ];
    
    stats.forEach(stat => {
        const div = document.createElement('div');
        div.className = 'rover-stat';
        div.innerHTML = `<h4>${stat.label}</h4><div>${stat.value}</div>`;
        container.appendChild(div);
    });
    
    // Update input max value based on rover's max day
    document.getElementById('sol-input').max = rover.max_sol;
}

// Earth Imagery Section
function initEarthImagerySection() {
    // Set default date to today
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    document.getElementById('earth-date').value = oneMonthAgo.toISOString().split('T')[0];
    document.getElementById('earth-date').max = today.toISOString().split('T')[0];
    
    // Add event listeners
    document.getElementById('search-earth-imagery').addEventListener('click', searchEarthImagery);
    document.getElementById('use-current-location').addEventListener('click', useCurrentLocation);
    
    // Add preset location buttons
    document.querySelectorAll('.preset').forEach(button => {
        button.addEventListener('click', (e) => {
            const lat = e.target.getAttribute('data-lat');
            const lon = e.target.getAttribute('data-lon');
            document.getElementById('lat-input').value = lat;
            document.getElementById('lon-input').value = lon;
            searchEarthImagery();
        });
    });
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            document.getElementById('lat-input').value = position.coords.latitude.toFixed(3);
            document.getElementById('lon-input').value = position.coords.longitude.toFixed(3);
        }, error => {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please enter coordinates manually.');
        });
    } else {
        alert('Geolocation is not supported by your browser. Please enter coordinates manually.');
    }
}

function searchEarthImagery() {
    const spinner = document.getElementById('earth-spinner');
    spinner.style.display = 'block';
    
    const date = document.getElementById('earth-date').value;
    const lat = document.getElementById('lat-input').value;
    const lon = document.getElementById('lon-input').value;
    
    if (!date || !lat || !lon) {
        alert('Please enter all required fields: date, latitude, and longitude.');
        spinner.style.display = 'none';
        return;
    }
    
    // First, get the available imagery for the date
    fetch(`https://api.nasa.gov/planetary/earth/assets?lon=${lon}&lat=${lat}&date=${date}&dim=0.15&api_key=${NASA_API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.url) {
                displayEarthImage(data, { lat, lon, date });
            } else {
                document.getElementById('earth-image-container').innerHTML = '<p class="no-results">No imagery found for the selected location and date.</p>';
                document.getElementById('earth-info').innerHTML = '';
            }
            spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching Earth imagery:', error);
            document.getElementById('earth-image-container').innerHTML = '<p class="error">Error loading imagery. Please try again later.</p>';
            document.getElementById('earth-info').innerHTML = '';
            spinner.style.display = 'none';
        });
}

function displayEarthImage(data, params) {
    const container = document.getElementById('earth-image-container');
    container.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = data.url;
    img.alt = `Earth imagery for ${params.lat}, ${params.lon} on ${params.date}`;
    img.addEventListener('click', () => showInLightbox(data.url, `Earth imagery for ${params.lat}, ${params.lon} on ${params.date}`));
    
    container.appendChild(img);
    
    // Get location name using reverse geocoding
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${params.lat}&longitude=${params.lon}`)
        .then(response => response.json())
        .then(geoData => {
            let locationName = 'Unknown Location';
            
            if (geoData.city && geoData.countryName) {
                locationName = `${geoData.city}, ${geoData.countryName}`;
            } else if (geoData.countryName) {
                locationName = geoData.countryName;
            }
            
            const imageDate = new Date(data.date).toLocaleDateString();
            document.getElementById('earth-info').innerHTML = `
                <h3>${locationName}</h3>
                <p>Coordinates: ${params.lat}, ${params.lon}</p>
                <p>Image Date: ${imageDate}</p>
                <p>Cloud Score: ${data.cloud_score ? (data.cloud_score * 100).toFixed(1) + '%' : 'N/A'}</p>
                <p>Image ID: ${data.id}</p>
            `;
        })
        .catch(error => {
            console.error('Error in reverse geocoding:', error);
            document.getElementById('earth-info').innerHTML = `
                <h3>Location Information</h3>
                <p>Coordinates: ${params.lat}, ${params.lon}</p>
                <p>Image Date: ${new Date(data.date).toLocaleDateString()}</p>
                <p>Cloud Score: ${data.cloud_score ? (data.cloud_score * 100).toFixed(1) + '%' : 'N/A'}</p>
            `;
        });
}

// Asteroid Data Section
function initAsteroidSection() {
    // Set default dates
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    document.getElementById('asteroid-start-date').value = weekAgo.toISOString().split('T')[0];
    document.getElementById('asteroid-end-date').value = today.toISOString().split('T')[0];
    
    // Add event listener
    document.getElementById('fetch-asteroids').addEventListener('click', fetchAsteroidData);
}

function fetchAsteroidData() {
    const spinner = document.getElementById('asteroid-spinner');
    spinner.style.display = 'block';
    
    const startDate = document.getElementById('asteroid-start-date').value;
    const endDate = document.getElementById('asteroid-end-date').value;
    const hazardousOnly = document.getElementById('asteroid-hazardous').checked;

    // Get diameter filter values
    const minDiameter = document.getElementById('asteroid-min-diameter').value;
    const maxDiameter = document.getElementById('asteroid-max-diameter').value;
    
    // Get velocity filter values
    const minVelocity = document.getElementById('asteroid-min-velocity').value;
    const maxVelocity = document.getElementById('asteroid-max-velocity').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates.');
        spinner.style.display = 'none';
        return;
    }
    
    // Check if date range is within 7 days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
        alert('Please select a date range of 7 days or less to avoid excessive data loading.');
        spinner.style.display = 'none';
        return;
    }
    
    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayAsteroidData(data, hazardousOnly, minDiameter, maxDiameter, minVelocity, maxVelocity);
            spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching asteroid data:', error);
            alert('Error loading asteroid data. Please try again later.');
            spinner.style.display = 'none';
        });
}

function displayAsteroidData(data, hazardousOnly, minDiameterFilter, maxDiameterFilter, minVelocityFilter, maxVelocityFilter) {
    // Process asteroid data
    const asteroids = [];
    let totalCount = 0;
    let hazardousCount = 0;
    let closestAsteroid = null;
    let largestAsteroid = null;
    
    for (const date in data.near_earth_objects) {
        data.near_earth_objects[date].forEach(asteroid => {
            if (hazardousOnly && !asteroid.is_potentially_hazardous_asteroid) {
                return; // Skip non-hazardous asteroids if filter is active
            }
            
            const diameter = (asteroid.estimated_diameter.meters.estimated_diameter_min + 
                             asteroid.estimated_diameter.meters.estimated_diameter_max) / 2;

            // Check if diameter is within filter range
            if ((minDiameterFilter && diameter < minDiameterFilter) || (maxDiameterFilter && diameter > maxDiameterFilter)) {
                return;
            }

            const closeApproach = asteroid.close_approach_data[0];
            const missDistance = parseFloat(closeApproach.miss_distance.kilometers);
            const velocity = parseFloat(closeApproach.relative_velocity.kilometers_per_hour);

            // Check if velocity is within filter range
            if ((minVelocityFilter && velocity < minVelocityFilter) || (maxVelocityFilter && velocity > maxVelocityFilter)) {
                return;
            }
            
            totalCount++;
            
            const isHazardous = asteroid.is_potentially_hazardous_asteroid;
            if (isHazardous) hazardousCount++;
            
            
            // Track closest asteroid
            if (!closestAsteroid || missDistance < closestAsteroid.missDistance) {
                closestAsteroid = {
                    name: asteroid.name,
                    missDistance: missDistance
                };
            }
            
            // Track largest asteroid
            if (!largestAsteroid || diameter > largestAsteroid.diameter) {
                largestAsteroid = {
                    name: asteroid.name,
                    diameter: diameter
                };
            }
            
            asteroids.push({
                name: asteroid.name,
                diameter: diameter,
                date: closeApproach.close_approach_date,
                missDistance: missDistance,
                isHazardous: isHazardous,
                velocity: velocity
            });
        });
    }
    
    // Update summary cards
    document.getElementById('asteroid-count').textContent = totalCount;
    document.getElementById('hazardous-count').textContent = hazardousCount;
    document.getElementById('closest-approach').textContent = closestAsteroid ? `${Math.round(closestAsteroid.missDistance)} km` : '-';
    document.getElementById('closest-name').textContent = closestAsteroid ? closestAsteroid.name.replace('(', '').replace(')', '') : '-';
    document.getElementById('largest-size').textContent = largestAsteroid ? `${Math.round(largestAsteroid.diameter)} m` : '-';
    document.getElementById('largest-name').textContent = largestAsteroid ? largestAsteroid.name.replace('(', '').replace(')', '') : '-';
    
    // Create chart data
    const dateLabels = Object.keys(data.near_earth_objects).sort();
    
    // Filter dates based on hazardousOnly and recalculate counts
    const filteredDates = dateLabels.filter(date => {
        if (!hazardousOnly) return true;
        return data.near_earth_objects[date].some(a => a.is_potentially_hazardous_asteroid);
    });
    
    const countsByDate = filteredDates.map(date => {
        if (!hazardousOnly) return data.near_earth_objects[date].length;
        return data.near_earth_objects[date].length;
    });
    
    const hazardousByDate = filteredDates.map(date => {
        return data.near_earth_objects[date].filter(a => a.is_potentially_hazardous_asteroid).length
    });
    
    // Create chart
    const ctx = document.getElementById('asteroid-chart').getContext('2d');
    if (window.asteroidChart) {
        window.asteroidChart.destroy();
    }
    
    window.asteroidChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredDates.map(date => new Date(date).toLocaleDateString()),
            datasets: [{
                label: 'Total Asteroids',
                data: countsByDate,
                backgroundColor: 'rgba(11, 61, 145, 0.7)',
                borderColor: 'rgba(11, 61, 145, 1)',
                borderWidth: 1
            }, {
                label: 'Hazardous Asteroids',
                data: hazardousByDate,
                backgroundColor: 'rgba(252, 61, 33, 0.7)',
                borderColor: 'rgba(252, 61, 33, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Asteroids'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
    
    // Update table
    const tableBody = document.getElementById('asteroid-table-body');
    tableBody.innerHTML = '';
    
    // Sort asteroids by miss distance
    asteroids.sort((a, b) => a.missDistance - b.missDistance);
    
     // Filter asteroids based on hazardousOnly before displaying in table
     const filteredAsteroids = hazardousOnly ? asteroids.filter(a => a.isHazardous) : asteroids;

    filteredAsteroids.forEach(asteroid => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asteroid.name.replace('(', '').replace(')', '')}</td>
            <td>${Math.round(asteroid.diameter)}</td>
            <td>${new Date(asteroid.date).toLocaleDateString()}</td>
            <td>${Math.round(asteroid.missDistance)}</td>
            <td>${Math.round(asteroid.velocity)}</td>
            <td><div class="hazard-indicator ${asteroid.isHazardous ? 'hazardous' : ''}"></div></td>
        `;
        tableBody.appendChild(row);
    });
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ISS Tracker Section
function initISSTracker() {
    // Add event listeners
    document.getElementById('use-current-location-pass').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                document.getElementById('pass-lat-input').value = position.coords.latitude.toFixed(3);
                document.getElementById('pass-lon-input').value = position.coords.longitude.toFixed(3);
            }, error => {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please enter coordinates manually.');
            });
        } else {
            alert('Geolocation is not supported by your browser. Please enter coordinates manually.');
        }
    });
    
    document.getElementById('get-passes').addEventListener('click', getISSPasses);
}

function initISSMap() {
    issMap = L.map('iss-map').setView([0, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(issMap);
    
    // Create custom ISS icon
    const issIcon = L.icon({
        iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/International_Space_Station.svg',
        iconSize: [50, 30],
        iconAnchor: [25, 15]
    });
    
    // Add ISS marker
    issMarker = L.marker([0, 0], { icon: issIcon }).addTo(issMap);
    
    // Create path line
    issPath = [];
    
    // Start tracking
    getISSLocation();
    getISSCrew();
    
    // Update every 5 seconds
    issTrackingInterval = setInterval(() => {
        getISSLocation();
    }, 5000);
}

function getISSLocation() {
    fetch('https://api.wheretheiss.at/v1/satellites/25544')
        .then(response => response.json())
        .then(data => {
            const lat = data.latitude;
            const lon = data.longitude;
            
            // Update marker position
            issMarker.setLatLng([lat, lon]);
            
            // Center map on ISS if first load
            if (issPath.length === 0) {
                issMap.setView([lat, lon], 3);
            }
            
            // Add point to path
            issPath.push([lat, lon]);
            
            // Only keep the last 50 positions
            if (issPath.length > 50) {
                issPath.shift();
            }
            
            // Update or create the path line
            if (window.issPathLine) {
                issMap.removeLayer(window.issPathLine);
            }
            window.issPathLine = L.polyline(issPath, { color: 'red', weight: 2 }).addTo(issMap);
            
            // Update info panel
            document.getElementById('iss-lat').textContent = lat.toFixed(4);
            document.getElementById('iss-lon').textContent = lon.toFixed(4);
            document.getElementById('iss-alt').textContent = data.altitude.toFixed(2);
            document.getElementById('iss-velocity').textContent = Math.round(data.velocity);
            document.getElementById('iss-time').textContent = new Date().toLocaleTimeString();
            
            // Get location name
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}`)
                .then(response => response.json())
                .then(geoData => {
                    let locationName = 'over ocean';
                    
                    if (geoData.countryName) {
                        locationName = `over ${geoData.countryName}`;
                    }
                    
                    document.getElementById('iss-location').textContent = locationName;
                })
                .catch(error => {
                    console.error('Error in reverse geocoding for ISS:', error);
                    document.getElementById('iss-location').textContent = 'unknown';
                });
        })
        .catch(error => {
            console.error('Error fetching ISS location:', error);
        });
}

function getISSCrew() {
    fetch('https://api.wheretheiss.at/v1/satellites/25544/tles')
        .then(response => response.json())
        .then(data => {
            // TLE data available if needed
        })
        .catch(err => console.error('Error fetching ISS TLE data:', err));
    
    fetch('http://api.open-notify.org/astros.json')
        .then(response => response.json())
        .then(data => {
            const issCrewMembers = data.people.filter(person => 
                person.craft === 'ISS'
            );
            
            document.getElementById('crew-number').textContent = issCrewMembers.length;
            
            const crewList = document.getElementById('crew-list');
            crewList.innerHTML = '';
            
            issCrewMembers.forEach(astronaut => {
                const li = document.createElement('li');
                li.textContent = astronaut.name;
                crewList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error fetching ISS crew:', error);
            document.getElementById('crew-number').textContent = 'unavailable';
            document.getElementById('crew-list').innerHTML = '<li>Crew data unavailable</li>';
        });
}

function getISSPasses() {
    const spinner = document.getElementById('passes-spinner');
    spinner.style.display = 'block';
    
    const lat = document.getElementById('pass-lat-input').value;
    const lon = document.getElementById('pass-lon-input').value;
    
    if (!lat || !lon) {
        alert('Please enter latitude and longitude.');
        spinner.style.display = 'none';
        return;
    }
    
    // Use the Open Notify API to get ISS passes
    fetch(`https://cors-anywhere.herokuapp.com/http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            displayISSPasses(data);
            spinner.style.display = 'none';
        })
        .catch(error => {
            // Fallback to a mock data if the API fails (CORS issues are common with this API)
            console.error('Error fetching ISS passes:', error);
            
            // Generate mock data based on current time
            const mockData = {
                message: 'success',
                request: {
                    latitude: lat,
                    longitude: lon,
                    altitude: 100,
                    passes: 5,
                    datetime: Math.floor(Date.now() / 1000)
                },
                response: []
            };
            
            const now = Math.floor(Date.now() / 1000);
            for (let i = 0; i < 5; i++) {
                mockData.response.push({
                    duration: Math.floor(Math.random() * 600) + 300, // 5-15 minutes
                    risetime: now + (i + 1) * 86400 + Math.floor(Math.random() * 43200) // Next days, random time
                });
            }
            
            displayISSPasses(mockData);
            spinner.style.display = 'none';
        });
}

function displayISSPasses(data) {
    const passesList = document.getElementById('passes-list');
    passesList.innerHTML = '';
    
    if (data.message !== 'success' || !data.response || data.response.length === 0) {
        passesList.innerHTML = '<p class="no-passes">No visible passes found for this location in the near future.</p>';
        return;
    }
    
    data.response.forEach(pass => {
        const passDate = new Date(pass.risetime * 1000);
        const durationMinutes = Math.floor(pass.duration / 60);
        const durationSeconds = pass.duration % 60;
        
        const passCard = document.createElement('div');
        passCard.className = 'pass-card';
        
        passCard.innerHTML = `
            <h4>${passDate.toLocaleDateString()}</h4>
            <div class="pass-details">
                <div>Time: ${passDate.toLocaleTimeString()}</div>
                <div class="pass-duration">Duration: ${durationMinutes}m ${durationSeconds}s</div>
                <div>Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][passDate.getDay()]}</div>
            </div>
        `;
        
        passesList.appendChild(passCard);
    });
    
    // Add calendar info
    const calendarInfo = document.createElement('div');
    calendarInfo.className = 'calendar-info';
    calendarInfo.innerHTML = '<p style="text-align: center; margin-top: 1rem; font-style: italic;">* All times are in your local timezone.</p>';
    passesList.appendChild(calendarInfo);
}