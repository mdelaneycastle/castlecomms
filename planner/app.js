// Global variables
let calendar;
let isAdminMode = false;
let currentView = 'calendar';
let currentFilters = {
    types: ['event', 'release', 'exhibition', 'preview', 'launch'],
    artist: '',
    gallery: '',
    search: ''
};

// DOM elements
const adminBtn = document.getElementById('adminBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const viewContainers = document.querySelectorAll('.view-container');
const artistFilter = document.getElementById('artistFilter');
const galleryFilter = document.getElementById('galleryFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const createNewItemBtn = document.getElementById('createNewItemBtn');
const searchInput = document.getElementById('searchInput');

// Modal elements
const typeSelectionModal = document.getElementById('typeSelectionModal');
const eventModal = document.getElementById('eventModal');
const simpleItemModal = document.getElementById('simpleItemModal');
const importModal = document.getElementById('importModal');
const eventDetailsModal = document.getElementById('eventDetailsModal');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await loadCategories(); // Load categories first from Supabase
    renderDynamicCategories(); // Render all category-dependent UI
    await Promise.all([loadGalleries(), loadArtists()]);
    await loadEventsFromDatabase();
    initializeFilters();
    initializeCalendar();
    initializeEventHandlers();
    renderListView();
    updateAnalytics();
});

// Initialize filters
function initializeFilters() {
    // Populate artist filter
    artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        artistFilter.appendChild(option);
    });

    // Populate gallery filter
    galleries.forEach(gallery => {
        const option = document.createElement('option');
        option.value = gallery;
        option.textContent = gallery;
        galleryFilter.appendChild(option);
    });

    // Populate event form selectors
    populateFormSelectors();
}

// Populate form selectors
function populateFormSelectors() {
    const eventGallerySelect = document.getElementById('eventGallery');

    // Clear existing options
    eventGallerySelect.innerHTML = '<option value="">Select Gallery</option>';

    // Populate artist datalists
    populateArtistDatalist('artistList');
    populateArtistDatalist('simpleArtistList');

    // Add gallery options
    galleries.forEach(gallery => {
        const option = document.createElement('option');
        option.value = gallery;
        option.textContent = gallery;
        eventGallerySelect.appendChild(option);
    });
}

// Populate artist datalist with all known artists
function populateArtistDatalist(datalistId) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;

    datalist.innerHTML = '';

    // Get all unique artists (from predefined list + any from events)
    const allArtists = getAllArtists();

    allArtists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        datalist.appendChild(option);
    });
}

// Get all unique artists from predefined list and events
function getAllArtists() {
    const eventArtists = eventsData.map(e => e.artist).filter(a => a);
    const allArtists = [...new Set([...artists, ...eventArtists])];
    return allArtists.sort();
}

// Initialize calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: getCalendarEvents(),
        eventClick: function(info) {
            showEventDetails(info.event.id);
        },
        height: 700,
        eventDisplay: 'block',
        dayMaxEvents: 3,
        displayEventTime: false
    });
    
    calendar.render();
}

// Get events formatted for calendar
function getCalendarEvents() {
    const filtered = filterEvents(currentFilters);
    return filtered.map(event => {
        let start = event.date;
        let end = event.date;

        if (!event.allDay && event.startTime) {
            start = `${event.date}T${event.startTime}`;
            end = `${event.date}T${event.endTime || event.startTime}`;
        }

        // Create title based on type
        let displayTitle;
        if (event.type === 'event') {
            displayTitle = `${event.artist} - ${event.gallery}`;
        } else {
            // For releases, exhibitions, previews, launches - show title only (title usually includes artist name)
            displayTitle = event.title || event.artist;
        }

        return {
            id: event.id,
            title: displayTitle,
            start: start,
            end: end,
            allDay: event.allDay !== false,
            backgroundColor: eventTypeColors[event.type],
            borderColor: eventTypeColors[event.type],
            textColor: getTextColor(event.type)
        };
    });
}

// Get appropriate text color for event type
function getTextColor(eventType) {
    if (eventCategories[eventType]) {
        return eventCategories[eventType].textColor;
    }
    return '#333';
}

// Render all dynamic category UI elements
function renderDynamicCategories() {
    renderEventTypeFilters();
    renderTypeSelectionCards();
    renderEventTypeOptions();
    applyDynamicCategoryStyles();
}

// Render event type filter checkboxes in sidebar
function renderEventTypeFilters() {
    const container = document.getElementById('eventTypesFilter');
    if (!container) return;

    container.innerHTML = '';
    Object.values(eventCategories).forEach(cat => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const desc = cat.description && cat.description !== cat.name ? cat.description : '';
        if (desc) label.setAttribute('data-description', desc);
        label.innerHTML = `
            <input type="checkbox" value="${cat.id}" checked>
            <span class="badge ${cat.id}">${cat.name}</span>
            ${desc ? '<i class="fas fa-circle-info key-info-icon" aria-hidden="true"></i>' : ''}
        `;
        container.appendChild(label);
    });

    // Re-attach event listeners
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateTypeFilter);
    });

    // Update currentFilters.types
    currentFilters.types = Object.keys(eventCategories);
}

// Render type selection cards in modal
function renderTypeSelectionCards() {
    const container = document.getElementById('typeSelectionCards');
    if (!container) return;

    container.innerHTML = '';
    Object.values(eventCategories).forEach(cat => {
        const button = document.createElement('button');
        button.className = 'type-card';
        button.dataset.type = cat.id;
        button.innerHTML = `
            <i class="fas ${cat.icon}"></i>
            <h3>${cat.name}</h3>
            <p>${cat.description}</p>
        `;
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            closeModals();
            if (type === 'event') {
                showAddEventModal();
            } else {
                showSimpleItemModal(type);
            }
        });
        container.appendChild(button);
    });
}

// Render event type options in form select
function renderEventTypeOptions() {
    const select = document.getElementById('eventType');
    if (!select) return;

    select.innerHTML = '';
    Object.values(eventCategories).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

// Apply dynamic CSS for category badges
function applyDynamicCategoryStyles() {
    // Remove old dynamic styles
    let styleEl = document.getElementById('dynamic-category-styles');
    if (styleEl) {
        styleEl.remove();
    }

    // Create new style element
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-category-styles';

    let css = '';
    Object.values(eventCategories).forEach(cat => {
        css += `.badge.${cat.id} { background: ${cat.bgColor}; color: ${cat.textColor}; }\n`;
    });

    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

// Get type labels for list view
function getTypeLabels() {
    const labels = {};
    Object.values(eventCategories).forEach(cat => {
        labels[cat.id] = cat.name;
    });
    return labels;
}

// Get type display names
function getTypeDisplayNames() {
    return getTypeLabels();
}

// Initialize event handlers
function initializeEventHandlers() {
    // Admin mode toggle
    adminBtn.addEventListener('click', toggleAdminMode);

    // Tab navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Filter handlers (event type checkboxes are handled in renderEventTypeFilters)
    artistFilter.addEventListener('change', updateFilters);
    galleryFilter.addEventListener('change', updateFilters);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    searchInput.addEventListener('input', debounce(updateFilters, 300));

    // Admin controls
    if (createNewItemBtn) createNewItemBtn.addEventListener('click', showTypeSelectionModal);

    // Manage categories button (admin only)
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if (manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', showCategoryModal);

    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', handleAddCategory);

    // Manage galleries / artists (admin only)
    const manageGalleriesBtn = document.getElementById('manageGalleriesBtn');
    if (manageGalleriesBtn) manageGalleriesBtn.addEventListener('click', showGalleryModal);
    const manageArtistsBtn = document.getElementById('manageArtistsBtn');
    if (manageArtistsBtn) manageArtistsBtn.addEventListener('click', showArtistModal);

    const addGalleryBtn = document.getElementById('addGalleryBtn');
    if (addGalleryBtn) addGalleryBtn.addEventListener('click', handleAddGallery);
    const addArtistBtn = document.getElementById('addArtistBtn');
    if (addArtistBtn) addArtistBtn.addEventListener('click', handleAddArtist);

    // Type selection cards
    document.querySelectorAll('.type-card').forEach(card => {
        card.addEventListener('click', function() {
            const type = this.dataset.type;
            closeModals();
            if (type === 'event') {
                showAddEventModal();
            } else {
                showSimpleItemModal(type);
            }
        });
    });

    // Modal handlers
    initializeModalHandlers();
    
    // All day checkbox handler
    document.getElementById('allDay').addEventListener('change', toggleTimeFields);

    // Calendar sync handlers
    document.getElementById('downloadICS').addEventListener('click', handleDownloadICS);
    document.getElementById('copySubscribeURL').addEventListener('click', handleCopySubscribeURL);

    // Print handlers
    initializePrintHandlers();
}

// Toggle time fields
function toggleTimeFields() {
    const allDayCheckbox = document.getElementById('allDay');
    const timeFields = document.getElementById('timeFields');
    
    if (allDayCheckbox.checked) {
        timeFields.classList.add('hidden');
    } else {
        timeFields.classList.remove('hidden');
    }
}

// Toggle admin mode
function toggleAdminMode() {
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
        isAdminMode = !isAdminMode;
        document.body.classList.toggle('admin-mode', isAdminMode);
        adminBtn.classList.toggle('active', isAdminMode);
        adminBtn.innerHTML = isAdminMode 
            ? '<i class="fas fa-unlock"></i> Admin Mode' 
            : '<i class="fas fa-lock"></i> Admin Mode';
    } else if (password !== null) {
        alert('Incorrect password');
    }
}

// Switch view
function switchView(view) {
    currentView = view;
    
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update view containers
    viewContainers.forEach(container => {
        container.classList.toggle('active', container.id === view + 'View');
    });

    // Update specific views
    if (view === 'calendar') {
        updateCalendar();
    } else if (view === 'list') {
        renderListView();
    } else if (view === 'analytics') {
        updateAnalytics();
    }
}

// Update type filter
function updateTypeFilter() {
    const checkboxes = document.querySelectorAll('#eventTypesFilter input[type="checkbox"]');
    currentFilters.types = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    updateFilters();
}

// Update filters
function updateFilters() {
    currentFilters.artist = artistFilter.value;
    currentFilters.gallery = galleryFilter.value;
    currentFilters.search = searchInput.value;

    updateCalendar();
    renderListView();
}

// Clear all filters
function clearAllFilters() {
    // Reset type checkboxes
    const checkboxes = document.querySelectorAll('#eventTypesFilter input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    currentFilters.types = Object.keys(eventCategories);

    // Reset select filters
    artistFilter.value = '';
    galleryFilter.value = '';
    searchInput.value = '';
    
    currentFilters.artist = '';
    currentFilters.gallery = '';
    currentFilters.search = '';

    updateFilters();
}

// Update calendar
function updateCalendar() {
    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(getCalendarEvents());
    }
}

// Render list view
function renderListView() {
    const container = document.getElementById('listViewContent');
    const eventCount = document.getElementById('eventCount');

    const filtered = filterEvents(currentFilters);

    // Update event count
    eventCount.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

    // Sort by date
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by type (dynamically based on categories)
    const grouped = {};
    Object.keys(eventCategories).forEach(typeId => {
        grouped[typeId] = [];
    });

    filtered.forEach(item => {
        if (grouped[item.type]) {
            grouped[item.type].push(item);
        } else {
            // Handle events with unknown types
            if (!grouped['other']) grouped['other'] = [];
            grouped['other'].push(item);
        }
    });

    const typeLabels = getTypeLabels();

    // Render separate tables for each type
    let html = '';

    Object.keys(grouped).forEach(type => {
        const items = grouped[type];
        if (items.length === 0) return;

        html += `<div class="table-section">
            <h3 class="table-section-title">${typeLabels[type]} (${items.length})</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Artist</th>`;

        // Add type-specific columns
        if (type === 'event') {
            html += `
                            <th>Gallery</th>
                            <th>Status</th>
                            <th>Equipment</th>`;
        } else {
            html += `
                            <th>Title</th>
                            <th>Notes</th>`;
        }

        html += `
                            <th class="admin-only hidden">Actions</th>
                        </tr>
                    </thead>
                    <tbody>`;

        items.forEach(item => {
            html += `
                        <tr onclick="showEventDetails('${item.id}')" style="cursor: pointer;">
                            <td>${formatDate(item.date)}</td>
                            <td>${item.artist}</td>`;

            if (type === 'event') {
                html += `
                            <td>${item.gallery || '-'}</td>
                            <td><span class="status-${item.status}">${item.status}</span></td>
                            <td>${renderEquipmentIcons(item.equipment)}</td>`;
            } else {
                html += `
                            <td>${item.title || '-'}</td>
                            <td>${item.description ? (item.description.substring(0, 50) + (item.description.length > 50 ? '...' : '')) : '-'}</td>`;
            }

            html += `
                            <td class="admin-only">
                                <button class="action-btn edit" onclick="event.stopPropagation(); editEvent('${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="event.stopPropagation(); deleteEvent('${item.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    container.innerHTML = html || '<div style="text-align: center; padding: 3rem; color: #6c757d;">No items to display</div>';
}

// Render equipment icons
function renderEquipmentIcons(equipment) {
    if (!equipment) return '';
    
    const icons = [];
    if (equipment.tv) icons.push('<i class="fas fa-tv" title="TV/Display"></i>');
    if (equipment.microphones) icons.push('<i class="fas fa-microphone" title="Microphones"></i>');
    if (equipment.lighting) icons.push('<i class="fas fa-lightbulb" title="Custom Lighting"></i>');
    if (equipment.stage) icons.push('<i class="fas fa-podium" title="Stage"></i>');
    if (equipment.other) icons.push('<i class="fas fa-tools" title="Other Equipment"></i>');
    
    return icons.join(' ');
}

// Show event details
function showEventDetails(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventDetailsModal');
    const title = document.getElementById('detailsTitle');
    const content = document.getElementById('eventDetailsContent');

    // Set title based on type
    if (event.type === 'event') {
        title.textContent = `${event.artist} - ${event.gallery}`;
    } else {
        title.textContent = event.title || event.artist;
    }

    const typeDisplayNames = getTypeDisplayNames();

    let detailsHTML = `
        <div style="padding: 2rem;">
            <div style="display: grid; gap: 1rem;">
                <div><strong>Type:</strong> <span class="badge ${event.type}">${typeDisplayNames[event.type] || event.type}</span></div>
                <div><strong>Date:</strong> ${formatDate(event.date)}</div>
                <div><strong>Artist:</strong> ${event.artist}</div>`;

    // Type-specific fields
    if (event.type === 'event') {
        if (event.gallery) {
            detailsHTML += `<div><strong>Gallery:</strong> ${event.gallery}</div>`;
        }
        detailsHTML += `<div><strong>Status:</strong> <span class="status-${event.status}">${event.status}</span></div>`;
        if (!event.allDay && event.startTime && event.endTime) {
            detailsHTML += `<div><strong>Time:</strong> ${event.startTime} - ${event.endTime}</div>`;
        }
        if (event.description) {
            detailsHTML += `<div><strong>Description:</strong> ${event.description}</div>`;
        }
        if (event.equipment) {
            const equipmentList = renderEquipmentList(event.equipment);
            if (equipmentList !== 'None required') {
                detailsHTML += `<div><strong>Equipment:</strong> ${equipmentList}</div>`;
            }
        }
    } else {
        // For releases, exhibitions, previews, launches
        if (event.title) {
            detailsHTML += `<div><strong>Title:</strong> ${event.title}</div>`;
        }
        if (event.description) {
            detailsHTML += `<div><strong>Notes:</strong> ${event.description}</div>`;
        }
    }

    detailsHTML += `
            </div>
        </div>
    `;

    content.innerHTML = detailsHTML;

    // Set up admin buttons
    const editBtn = document.getElementById('editEventBtn');
    const deleteBtn = document.getElementById('deleteEventBtn');

    if (editBtn) editBtn.onclick = () => {
        modal.classList.add('hidden'); // Close details modal first
        editEvent(eventId);
    };
    if (deleteBtn) deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this item?')) {
            deleteEvent(eventId);
            modal.classList.add('hidden');
        }
    };

    modal.classList.remove('hidden');
}

// Render equipment list
function renderEquipmentList(equipment) {
    const items = [];
    if (equipment.tv) items.push('TV/Display');
    if (equipment.microphones) items.push('Microphones');
    if (equipment.lighting) items.push('Custom Lighting');
    if (equipment.stage) items.push('Stage');
    if (equipment.other) items.push(equipment.other);
    
    return items.length > 0 ? items.join(', ') : 'None required';
}

// Show type selection modal
function showTypeSelectionModal() {
    if (!isAdminMode) return;
    typeSelectionModal.classList.remove('hidden');
}

// Show simple item modal
function showSimpleItemModal(type, defaultDate = '') {
    if (!isAdminMode) return;

    const modal = simpleItemModal;
    const form = document.getElementById('simpleItemForm');
    const title = document.getElementById('simpleModalTitle');

    // Set title based on type
    const typeNames = getTypeLabels();
    title.textContent = `Add New ${typeNames[type] || type}`;

    form.reset();
    document.getElementById('simpleItemType').value = type;

    if (defaultDate) {
        document.getElementById('simpleItemDate').value = defaultDate;
    }

    // Populate artist datalist
    populateArtistDatalist('simpleArtistList');

    // Hide type selector for new items (type is already chosen)
    const typeGroup = document.getElementById('simpleItemTypeGroup');
    if (typeGroup) {
        typeGroup.style.display = 'none';
    }

    // Clear any edit state
    form.removeAttribute('data-edit-id');

    modal.classList.remove('hidden');
    document.getElementById('simpleItemDate').focus();
}

// Show add event modal
function showAddEventModal(defaultDate = '') {
    if (!isAdminMode) return;

    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const title = document.getElementById('modalTitle');

    title.textContent = 'Add New Event';
    form.reset();

    if (defaultDate) {
        document.getElementById('eventDate').value = defaultDate;
    }

    // Reset form to defaults
    document.getElementById('allDay').checked = true;
    toggleTimeFields();

    // Clear any edit state
    form.removeAttribute('data-edit-id');

    modal.classList.remove('hidden');
    document.getElementById('eventType').focus();
}

// Edit event
function editEvent(eventId) {
    if (!isAdminMode) return;

    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    // Determine which modal to show based on type
    if (event.type === 'event') {
        // Use full event modal
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        const title = document.getElementById('modalTitle');

        title.textContent = 'Edit Event';

        // Populate form
        document.getElementById('eventType').value = event.type;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('allDay').checked = event.allDay !== false;
        document.getElementById('startTime').value = event.startTime || '09:00';
        document.getElementById('endTime').value = event.endTime || '17:00';
        document.getElementById('eventArtist').value = event.artist;
        document.getElementById('eventGallery').value = event.gallery;
        document.getElementById('eventStatus').value = event.status;
        document.getElementById('eventDescription').value = event.description || '';

        // Show/hide time fields based on allDay
        toggleTimeFields();

        if (event.equipment) {
            document.getElementById('equipTV').checked = event.equipment.tv || false;
            document.getElementById('equipMic').checked = event.equipment.microphones || false;
            document.getElementById('equipLighting').checked = event.equipment.lighting || false;
            document.getElementById('equipStage').checked = event.equipment.stage || false;
            document.getElementById('equipOther').value = event.equipment.other || '';
        }

        // Set edit mode
        form.setAttribute('data-edit-id', eventId);

        modal.classList.remove('hidden');
    } else {
        // Use simple item modal for release, exhibition, preview, launch
        const modal = simpleItemModal;
        const form = document.getElementById('simpleItemForm');
        const title = document.getElementById('simpleModalTitle');

        const typeNames = getTypeLabels();
        title.textContent = `Edit ${typeNames[event.type] || event.type}`;

        // Populate artist datalist
        populateArtistDatalist('simpleArtistList');

        // Show and populate type selector for editing
        const typeGroup = document.getElementById('simpleItemTypeGroup');
        const typeSelect = document.getElementById('simpleItemTypeSelect');
        if (typeGroup && typeSelect) {
            typeGroup.style.display = 'block';
            // Populate with all categories except 'event' (which uses the full form)
            typeSelect.innerHTML = '';
            Object.values(eventCategories).forEach(cat => {
                if (cat.id !== 'event') {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    typeSelect.appendChild(option);
                }
            });
            typeSelect.value = event.type;
        }

        // Populate form
        document.getElementById('simpleItemType').value = event.type;
        document.getElementById('simpleItemDate').value = event.date;
        document.getElementById('simpleItemArtist').value = event.artist;
        document.getElementById('simpleItemTitle').value = event.title || '';
        document.getElementById('simpleItemNotes').value = event.description || '';

        // Set edit mode
        form.setAttribute('data-edit-id', eventId);

        modal.classList.remove('hidden');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!isAdminMode) return;

    const result = await deleteEventFromDatabase(eventId);
    if (result.success) {
        eventsData = eventsData.filter(e => e.id !== eventId);
        updateCalendar();
        renderListView();
        updateAnalytics();
    } else {
        alert('Failed to delete event: ' + result.error);
    }
}

// Show import modal
function showImportModal() {
    if (!isAdminMode) return;

    const modal = document.getElementById('importModal');
    const textarea = document.getElementById('importData');
    
    textarea.value = '';
    modal.classList.remove('hidden');
    textarea.focus();
}

// Update analytics
function updateAnalytics() {
    const stats = getEventStats();

    // Only update elements if they exist
    const totalEvents = document.getElementById('totalEvents');
    const upcomingEvents = document.getElementById('upcomingEvents');
    const totalArtists = document.getElementById('totalArtists');
    const activeGalleries = document.getElementById('activeGalleries');

    if (totalEvents) totalEvents.textContent = stats.total;
    if (upcomingEvents) upcomingEvents.textContent = stats.upcoming;
    if (totalArtists) totalArtists.textContent = stats.artists;
    if (activeGalleries) activeGalleries.textContent = stats.galleries;

    // Update charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        updateCharts();
    }
}

// Global chart instances
let typeChart = null;
let galleryChart = null;

// Update charts
function updateCharts() {
    const typeData = getEventsByType();
    const galleryData = getEventsByGallery();

    // Type chart
    const typeCtx = document.getElementById('typeChart');
    if (typeCtx) {
        // Destroy existing chart if it exists
        if (typeChart) {
            typeChart.destroy();
        }
        
        typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeData),
                datasets: [{
                    data: Object.values(typeData),
                    backgroundColor: Object.keys(typeData).map(type => eventTypeColors[type])
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Gallery chart
    const galleryCtx = document.getElementById('galleryChart');
    if (galleryCtx) {
        // Destroy existing chart if it exists
        if (galleryChart) {
            galleryChart.destroy();
        }
        
        galleryChart = new Chart(galleryCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(galleryData),
                datasets: [{
                    label: 'Events',
                    data: Object.values(galleryData),
                    backgroundColor: '#2c3e50'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Initialize modal handlers
function initializeModalHandlers() {
    // Event form submission
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);

    // Simple item form submission
    document.getElementById('simpleItemForm').addEventListener('submit', handleSimpleItemSubmit);

    // Close modal handlers
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });
}

// Handle event form submission
async function handleEventSubmit(e) {
    e.preventDefault();

    if (!isAdminMode) return;

    const formData = new FormData(e.target);
    const allDay = document.getElementById('allDay').checked;
    const type = document.getElementById('eventType').value;
    const artist = document.getElementById('eventArtist').value;
    const gallery = document.getElementById('eventGallery').value;
    const eventData = {
        type: type,
        date: document.getElementById('eventDate').value,
        allDay: allDay,
        startTime: allDay ? null : document.getElementById('startTime').value,
        endTime: allDay ? null : document.getElementById('endTime').value,
        artist: artist,
        gallery: gallery,
        status: document.getElementById('eventStatus').value,
        title: type === 'event' ? `${artist} - ${gallery}` : artist,
        description: document.getElementById('eventDescription').value || null,
        equipment: {
            tv: document.getElementById('equipTV').checked,
            microphones: document.getElementById('equipMic').checked,
            lighting: document.getElementById('equipLighting').checked,
            stage: document.getElementById('equipStage').checked,
            other: document.getElementById('equipOther').value || null
        }
    };

    // Validate
    const errors = validateEvent(eventData);
    if (errors.length > 0) {
        alert('Please fix the following errors:\n' + errors.join('\n'));
        return;
    }

    // Check if editing
    const editId = e.target.getAttribute('data-edit-id');
    if (editId) {
        // Update existing event
        eventData.id = editId;
    } else {
        // Add new event
        eventData.id = generateId();
    }

    const result = await saveEventToDatabase(eventData);
    if (result.success) {
        // Update local data
        if (editId) {
            const index = eventsData.findIndex(e => e.id === editId);
            if (index !== -1) {
                eventsData[index] = eventData;
            }
        } else {
            eventsData.push(eventData);
        }

        updateCalendar();
        renderListView();
        updateAnalytics();

        // Refresh artist datalists to include any new artists
        populateArtistDatalist('artistList');
        populateArtistDatalist('simpleArtistList');

        // Reset form and close modal
        e.target.reset();
        e.target.removeAttribute('data-edit-id');
        closeModals();
    } else {
        alert('Failed to save event: ' + result.error);
    }
}

// Handle simple item form submission
async function handleSimpleItemSubmit(e) {
    e.preventDefault();

    if (!isAdminMode) return;

    // Check if editing - use the type selector if visible
    const editId = e.target.getAttribute('data-edit-id');
    const typeGroup = document.getElementById('simpleItemTypeGroup');
    const typeSelect = document.getElementById('simpleItemTypeSelect');

    // Use type selector value when editing, hidden input when creating new
    let itemType;
    if (editId && typeGroup && typeGroup.style.display !== 'none' && typeSelect) {
        itemType = typeSelect.value;
    } else {
        itemType = document.getElementById('simpleItemType').value;
    }

    const itemData = {
        type: itemType,
        date: document.getElementById('simpleItemDate').value,
        artist: document.getElementById('simpleItemArtist').value,
        title: document.getElementById('simpleItemTitle').value,
        description: document.getElementById('simpleItemNotes').value || null,
        allDay: true,
        startTime: null,
        endTime: null,
        gallery: null,
        status: 'planned',
        equipment: null
    };

    // Validate
    const errors = validateEvent(itemData);
    if (errors.length > 0) {
        alert('Please fix the following errors:\n' + errors.join('\n'));
        return;
    }

    // Set ID (editId already declared above)
    if (editId) {
        // Update existing item
        itemData.id = editId;
    } else {
        // Add new item
        itemData.id = generateId();
    }

    const result = await saveEventToDatabase(itemData);
    if (result.success) {
        // Update local data
        if (editId) {
            const index = eventsData.findIndex(e => e.id === editId);
            if (index !== -1) {
                eventsData[index] = itemData;
            }
        } else {
            eventsData.push(itemData);
        }

        updateCalendar();
        renderListView();
        updateAnalytics();

        // Refresh artist datalists to include any new artists
        populateArtistDatalist('artistList');
        populateArtistDatalist('simpleArtistList');

        // Reset form and close modal
        e.target.reset();
        e.target.removeAttribute('data-edit-id');

        // Hide type selector
        const typeGroupReset = document.getElementById('simpleItemTypeGroup');
        if (typeGroupReset) {
            typeGroupReset.style.display = 'none';
        }

        closeModals();
    } else {
        alert('Failed to save item: ' + result.error);
    }
}

// Handle import
async function handleImport() {
    const data = document.getElementById('importData').value;
    if (!data.trim()) {
        alert('Please enter JSON data or select a file');
        return;
    }

    const result = await importEventsData(data);
    if (result.success) {
        alert(`Successfully imported ${result.imported} events${result.errors > 0 ? `. ${result.errors} events had errors.` : ''}`);
        updateCalendar();
        renderListView();
        updateAnalytics();
        closeModals();
    } else {
        alert(`Import failed: ${result.error}`);
    }
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('importData').value = e.target.result;
    };
    reader.readAsText(file);
}

// Close modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle ICS download
function handleDownloadICS() {
    downloadICSFile();
    alert('Calendar file downloaded! Import this file into Outlook, Google Calendar, or Apple Calendar.');
}

// Show category management modal (admin only)
function showCategoryModal() {
    if (!isAdminMode) return;

    const modal = document.getElementById('categoryModal');
    renderCategoryList();
    modal.classList.remove('hidden');
}

// Render category list in modal
function renderCategoryList() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    container.innerHTML = '';

    Object.values(eventCategories).forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.dataset.categoryId = cat.id;
        const descVal = cat.description && cat.description !== cat.name ? cat.description : '';
        item.innerHTML = `
            <div class="category-row">
                <div class="category-preview">
                    <span class="badge ${cat.id}">${cat.name}</span>
                </div>
                <div class="category-info">
                    <span class="category-id">${cat.id}</span>
                    <input type="text" class="category-name-input" value="${cat.name}" data-field="name">
                </div>
                <div class="category-colors">
                    <div class="color-picker-group">
                        <label>BG</label>
                        <input type="color" value="${cat.bgColor}" data-field="bgColor" title="Background Color">
                    </div>
                    <div class="color-picker-group">
                        <label>Text</label>
                        <input type="color" value="${cat.textColor}" data-field="textColor" title="Text Color">
                    </div>
                </div>
                <div class="category-actions">
                    <button class="btn-icon save" onclick="handleSaveCategory('${cat.id}')" title="Save Changes">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon delete" onclick="handleDeleteCategory('${cat.id}')" title="Delete Category">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <textarea class="category-description-input" data-field="description" rows="3" placeholder="Description shown as a tooltip on the calendar key (optional)">${descVal}</textarea>
        `;
        container.appendChild(item);
    });
}

// Handle saving category changes
async function handleSaveCategory(categoryId) {
    if (!isAdminMode) return;

    const item = document.querySelector(`.category-item[data-category-id="${categoryId}"]`);
    if (!item) return;

    const nameInput = item.querySelector('input[data-field="name"]');
    const bgColorInput = item.querySelector('input[data-field="bgColor"]');
    const textColorInput = item.querySelector('input[data-field="textColor"]');
    const descriptionInput = item.querySelector('textarea[data-field="description"]');

    const updates = {
        name: nameInput.value.trim(),
        bgColor: bgColorInput.value,
        textColor: textColorInput.value,
        description: descriptionInput ? descriptionInput.value.trim() : ''
    };

    if (!updates.name) {
        alert('Category name cannot be empty');
        return;
    }

    const result = await updateCategory(categoryId, updates);
    if (result.success) {
        renderDynamicCategories();
        renderCategoryList();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to update category: ' + result.error);
    }
}

// Handle deleting a category
async function handleDeleteCategory(categoryId) {
    if (!isAdminMode) return;

    const cat = eventCategories[categoryId];
    if (!cat) return;

    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
        return;
    }

    const result = await deleteCategory(categoryId);
    if (result.success) {
        renderDynamicCategories();
        renderCategoryList();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to delete category: ' + result.error);
    }
}

// Handle adding a new category
async function handleAddCategory() {
    if (!isAdminMode) return;

    const idInput = document.getElementById('newCategoryId');
    const nameInput = document.getElementById('newCategoryName');
    const bgColorInput = document.getElementById('newCategoryBgColor');
    const textColorInput = document.getElementById('newCategoryTextColor');
    const descInput = document.getElementById('newCategoryDescription');

    const id = idInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const name = nameInput.value.trim();
    const bgColor = bgColorInput.value;
    const textColor = textColorInput.value;
    const description = (descInput && descInput.value.trim()) || name;

    if (!id) {
        alert('Please enter a category ID');
        idInput.focus();
        return;
    }

    if (!name) {
        alert('Please enter a category name');
        nameInput.focus();
        return;
    }

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
        alert('Category ID can only contain lowercase letters, numbers, and hyphens');
        idInput.focus();
        return;
    }

    const result = await addCategory(id, name, description, 'fa-tag', bgColor, textColor);
    if (result.success) {
        // Clear inputs
        idInput.value = '';
        nameInput.value = '';
        bgColorInput.value = '#a8d8ea';
        textColorInput.value = '#1e3a8a';
        if (descInput) descInput.value = '';

        // Refresh UI
        renderDynamicCategories();
        renderCategoryList();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to add category: ' + result.error);
    }
}

// ============================================================
// Galleries / Artists admin — generic list manager
// ============================================================

// After galleries change: refresh sidebar filter + event form select
function refreshGalleryUI() {
    const galleryFilterEl = document.getElementById('galleryFilter');
    if (galleryFilterEl) {
        const current = galleryFilterEl.value;
        galleryFilterEl.innerHTML = '<option value="">All Galleries</option>';
        galleries.forEach(g => {
            const o = document.createElement('option');
            o.value = g; o.textContent = g;
            galleryFilterEl.appendChild(o);
        });
        if (galleries.includes(current)) galleryFilterEl.value = current;
    }

    const eventGallerySelect = document.getElementById('eventGallery');
    if (eventGallerySelect) {
        const current = eventGallerySelect.value;
        eventGallerySelect.innerHTML = '<option value="">Select Gallery</option>';
        galleries.forEach(g => {
            const o = document.createElement('option');
            o.value = g; o.textContent = g;
            eventGallerySelect.appendChild(o);
        });
        if (galleries.includes(current)) eventGallerySelect.value = current;
    }
}

// After artists change: refresh sidebar filter + datalists
function refreshArtistUI() {
    const artistFilterEl = document.getElementById('artistFilter');
    if (artistFilterEl) {
        const current = artistFilterEl.value;
        artistFilterEl.innerHTML = '<option value="">All Artists</option>';
        artists.forEach(a => {
            const o = document.createElement('option');
            o.value = a; o.textContent = a;
            artistFilterEl.appendChild(o);
        });
        if (artists.includes(current)) artistFilterEl.value = current;
    }
    populateArtistDatalist('artistList');
    populateArtistDatalist('simpleArtistList');
}

// --- Galleries ---
function showGalleryModal() {
    if (!isAdminMode) return;
    renderGalleryList();
    document.getElementById('galleryModal').classList.remove('hidden');
}

function renderGalleryList() {
    const container = document.getElementById('galleryList');
    if (!container) return;
    container.innerHTML = '';
    if (!galleries.length) {
        container.innerHTML = '<div class="empty-state">No galleries yet. Add one below.</div>';
        return;
    }
    galleries.forEach(name => {
        const item = document.createElement('div');
        item.className = 'simple-list-item';
        item.dataset.name = name;
        item.innerHTML = `
            <input type="text" class="simple-name-input" value="${escapeAttr(name)}">
            <div class="simple-actions">
                <button class="btn-icon save" title="Save Changes"><i class="fas fa-check"></i></button>
                <button class="btn-icon delete" title="Delete Gallery"><i class="fas fa-trash"></i></button>
            </div>
        `;
        item.querySelector('.btn-icon.save').addEventListener('click', () => handleSaveGallery(name, item));
        item.querySelector('.btn-icon.delete').addEventListener('click', () => handleDeleteGallery(name));
        container.appendChild(item);
    });
}

async function handleSaveGallery(oldName, itemEl) {
    if (!isAdminMode) return;
    const newName = itemEl.querySelector('.simple-name-input').value.trim();
    if (!newName) { alert('Gallery name cannot be empty'); return; }
    const result = await updateGallery(oldName, newName);
    if (result.success) {
        renderGalleryList();
        refreshGalleryUI();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to update gallery: ' + result.error);
    }
}

async function handleDeleteGallery(name) {
    if (!isAdminMode) return;
    if (!confirm(`Delete gallery "${name}"?`)) return;
    const result = await deleteGallery(name);
    if (result.success) {
        renderGalleryList();
        refreshGalleryUI();
    } else {
        alert('Failed to delete gallery: ' + result.error);
    }
}

async function handleAddGallery() {
    if (!isAdminMode) return;
    const input = document.getElementById('newGalleryName');
    const name = input.value.trim();
    if (!name) { alert('Please enter a gallery name'); input.focus(); return; }
    const result = await addGallery(name);
    if (result.success) {
        input.value = '';
        renderGalleryList();
        refreshGalleryUI();
    } else {
        alert('Failed to add gallery: ' + result.error);
    }
}

// --- Artists ---
function showArtistModal() {
    if (!isAdminMode) return;
    renderArtistList();
    document.getElementById('artistModal').classList.remove('hidden');
}

function renderArtistList() {
    const container = document.getElementById('artistList2');
    if (!container) return;
    container.innerHTML = '';
    if (!artists.length) {
        container.innerHTML = '<div class="empty-state">No artists yet. Add one below.</div>';
        return;
    }
    artists.forEach(name => {
        const item = document.createElement('div');
        item.className = 'simple-list-item';
        item.dataset.name = name;
        item.innerHTML = `
            <input type="text" class="simple-name-input" value="${escapeAttr(name)}">
            <div class="simple-actions">
                <button class="btn-icon save" title="Save Changes"><i class="fas fa-check"></i></button>
                <button class="btn-icon delete" title="Delete Artist"><i class="fas fa-trash"></i></button>
            </div>
        `;
        item.querySelector('.btn-icon.save').addEventListener('click', () => handleSaveArtist(name, item));
        item.querySelector('.btn-icon.delete').addEventListener('click', () => handleDeleteArtist(name));
        container.appendChild(item);
    });
}

async function handleSaveArtist(oldName, itemEl) {
    if (!isAdminMode) return;
    const newName = itemEl.querySelector('.simple-name-input').value.trim();
    if (!newName) { alert('Artist name cannot be empty'); return; }
    const result = await updateArtist(oldName, newName);
    if (result.success) {
        renderArtistList();
        refreshArtistUI();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to update artist: ' + result.error);
    }
}

async function handleDeleteArtist(name) {
    if (!isAdminMode) return;
    if (!confirm(`Delete artist "${name}"?`)) return;
    const result = await deleteArtist(name);
    if (result.success) {
        renderArtistList();
        refreshArtistUI();
    } else {
        alert('Failed to delete artist: ' + result.error);
    }
}

async function handleAddArtist() {
    if (!isAdminMode) return;
    const input = document.getElementById('newArtistName');
    const name = input.value.trim();
    if (!name) { alert('Please enter an artist name'); input.focus(); return; }
    const result = await addArtist(name);
    if (result.success) {
        input.value = '';
        renderArtistList();
        refreshArtistUI();
    } else {
        alert('Failed to add artist: ' + result.error);
    }
}

function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Print Calendar functionality
function showPrintModal() {
    const modal = document.getElementById('printModal');

    // Set default dates (today + 3 months)
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    document.getElementById('printStartDate').value = today.toISOString().split('T')[0];
    document.getElementById('printEndDate').value = threeMonthsLater.toISOString().split('T')[0];

    modal.classList.remove('hidden');
}

function initializePrintHandlers() {
    // Print button in sidebar
    const printBtn = document.getElementById('printCalendarBtn');
    if (printBtn) {
        printBtn.addEventListener('click', showPrintModal);
    }

    // Toggle custom date range
    const radioButtons = document.querySelectorAll('input[name="printRange"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            if (this.value === 'custom') {
                customRange.classList.remove('hidden');
            } else {
                customRange.classList.add('hidden');
            }
        });
    });

    // Generate print button
    const generateBtn = document.getElementById('generatePrintBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generatePrintView);
    }
}

function generatePrintView() {
    // Get date range
    let startDate, endDate;
    const rangeType = document.querySelector('input[name="printRange"]:checked').value;

    if (rangeType === '3months') {
        startDate = new Date();
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
    } else {
        startDate = new Date(document.getElementById('printStartDate').value);
        endDate = new Date(document.getElementById('printEndDate').value);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Please select valid dates');
        return;
    }

    if (startDate > endDate) {
        alert('Start date must be before end date');
        return;
    }

    // Filter events by date range
    const filteredEvents = eventsData.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startDate && eventDate <= endDate;
    });

    // Sort by date
    filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate calendar HTML
    const printHTML = generatePrintHTML(filteredEvents, startDate, endDate);

    // Create print preview
    showPrintPreview(printHTML);

    // Close the modal
    closeModals();
}

function generatePrintHTML(events, startDate, endDate) {
    // Generate calendar grid view - one month per page
    let html = '<div class="print-content">';

    // Get all months in range
    const months = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= endMonth) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }

    // Group events by date for quick lookup
    const eventsByDate = {};
    events.forEach(event => {
        const dateKey = event.date;
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });

    // Generate each month
    months.forEach((monthDate, monthIndex) => {
        html += generateMonthCalendar(monthDate, eventsByDate, monthIndex < months.length - 1);
    });

    html += '</div>';
    return html;
}

function generateMonthCalendar(monthDate, eventsByDate, addPageBreak) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    let html = `
        <div class="print-calendar-page${addPageBreak ? ' page-break' : ''}">
            <h2 class="print-month-title">${monthName}</h2>
            <table class="print-calendar-grid">
                <thead>
                    <tr>
                        <th>Monday</th>
                        <th>Tuesday</th>
                        <th>Wednesday</th>
                        <th>Thursday</th>
                        <th>Friday</th>
                        <th>Saturday</th>
                        <th>Sunday</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let dayCount = 1;
    let weekHTML = '<tr>';

    // Empty cells before first day
    for (let i = 0; i < adjustedStartDay; i++) {
        weekHTML += '<td class="print-calendar-cell empty"></td>';
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
        const currentDayOfWeek = (adjustedStartDay + day - 1) % 7;

        // Start new row on Monday
        if (currentDayOfWeek === 0 && day > 1) {
            weekHTML += '</tr><tr>';
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = eventsByDate[dateStr] || [];

        weekHTML += `<td class="print-calendar-cell">`;
        weekHTML += `<div class="print-day-number">${day}</div>`;
        weekHTML += `<div class="print-day-events">`;

        dayEvents.forEach(event => {
            const cat = eventCategories[event.type] || { name: event.type, bgColor: '#ccc', textColor: '#333' };
            const displayText = event.type === 'event'
                ? `${event.artist} - ${event.gallery || ''}`
                : (event.title || event.artist);

            weekHTML += `<div class="print-calendar-event" style="background: ${cat.bgColor}; color: ${cat.textColor};">${displayText}</div>`;
        });

        weekHTML += `</div></td>`;
    }

    // Empty cells after last day
    const lastDayOfWeek = (adjustedStartDay + totalDays - 1) % 7;
    for (let i = lastDayOfWeek + 1; i < 7; i++) {
        weekHTML += '<td class="print-calendar-cell empty"></td>';
    }

    weekHTML += '</tr>';
    html += weekHTML;

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

function showPrintPreview(contentHTML) {
    // Create print preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'print-preview-container';
    previewContainer.id = 'printPreview';

    previewContainer.innerHTML = `
        <div class="print-preview-header">
            <h1><i class="fas fa-print"></i> Print Preview</h1>
            <div class="print-preview-actions">
                <button class="btn-secondary" onclick="closePrintPreview()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print / Save PDF
                </button>
            </div>
        </div>
        ${contentHTML}
    `;

    document.body.appendChild(previewContainer);
}

function closePrintPreview() {
    const preview = document.getElementById('printPreview');
    if (preview) {
        preview.remove();
    }
}

// Handle copy subscribe URL
async function handleCopySubscribeURL() {
    // Extract Supabase project URL from config
    let subscribeURL = null;

    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url) {
        // Extract project ref from URL (e.g., https://abc123.supabase.co)
        const match = SUPABASE_CONFIG.url.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (match) {
            subscribeURL = `${SUPABASE_CONFIG.url}/functions/v1/calendar-feed`;
        }
    }

    let message = '';

    if (subscribeURL) {
        // If we have a Supabase URL, provide it
        message = `📅 Calendar Subscription URL:

${subscribeURL}

To subscribe in your calendar app:

OUTLOOK:
1. Right-click "Other Calendars" > "Add Calendar" > "From Internet"
2. Paste the URL above
3. Click "OK"

GOOGLE CALENDAR:
1. Settings > "Add calendar" > "From URL"
2. Paste the URL above
3. Click "Add calendar"

APPLE CALENDAR:
1. File > New Calendar Subscription
2. Paste the URL above
3. Choose update frequency (recommended: every hour)
4. Click "Subscribe"

NOTE: Make sure you've deployed the calendar-feed Edge Function first!
See CALENDAR_SYNC_SETUP.md for deployment instructions.`;
    } else {
        // Fallback instructions
        message = `To set up automatic calendar sync:

1. Download the calendar file using the "Download Calendar" button
2. Import it into your calendar app:

   OUTLOOK:
   - File > Open & Export > Import/Export
   - Choose "Import an iCalendar (.ics) or vCalendar file"
   - Select the downloaded file

   GOOGLE CALENDAR:
   - Settings > Import & Export
   - Click "Import" and select the downloaded file

   APPLE CALENDAR:
   - File > Import
   - Select the downloaded file

For automatic updates, deploy the calendar feed Edge Function.
See CALENDAR_SYNC_SETUP.md for detailed instructions.`;
    }

    try {
        await navigator.clipboard.writeText(subscribeURL || message);
        if (subscribeURL) {
            alert('✅ Subscription URL copied to clipboard!\n\nPaste this URL into your calendar app to subscribe.\n\nMake sure the Edge Function is deployed first - see CALENDAR_SYNC_SETUP.md for instructions.');
        } else {
            alert('Instructions copied to clipboard!\n\nFor automatic sync, you need to deploy the Edge Function - see CALENDAR_SYNC_SETUP.md');
        }
    } catch (err) {
        alert(message);
    }
}
