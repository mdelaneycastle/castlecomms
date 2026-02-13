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
    loadCategories(); // Load categories first
    renderDynamicCategories(); // Render all category-dependent UI
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
        height: 'auto',
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
            // For releases, exhibitions, previews, launches - show title
            displayTitle = event.title ? `${event.artist} - ${event.title}` : event.artist;
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
        label.innerHTML = `
            <input type="checkbox" value="${cat.id}" checked>
            <span class="badge ${cat.id}">${cat.name}</span>
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
        title.textContent = event.title ? `${event.artist} - ${event.title}` : event.artist;
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

    if (editBtn) editBtn.onclick = () => editEvent(eventId);
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
    const eventData = {
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        allDay: allDay,
        startTime: allDay ? null : document.getElementById('startTime').value,
        endTime: allDay ? null : document.getElementById('endTime').value,
        artist: document.getElementById('eventArtist').value,
        gallery: document.getElementById('eventGallery').value,
        status: document.getElementById('eventStatus').value,
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

    const itemData = {
        type: document.getElementById('simpleItemType').value,
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

    // Check if editing
    const editId = e.target.getAttribute('data-edit-id');
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
        item.innerHTML = `
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
        `;
        container.appendChild(item);
    });
}

// Handle saving category changes
function handleSaveCategory(categoryId) {
    if (!isAdminMode) return;

    const item = document.querySelector(`.category-item[data-category-id="${categoryId}"]`);
    if (!item) return;

    const nameInput = item.querySelector('input[data-field="name"]');
    const bgColorInput = item.querySelector('input[data-field="bgColor"]');
    const textColorInput = item.querySelector('input[data-field="textColor"]');

    const updates = {
        name: nameInput.value.trim(),
        bgColor: bgColorInput.value,
        textColor: textColorInput.value
    };

    if (!updates.name) {
        alert('Category name cannot be empty');
        return;
    }

    const result = updateCategory(categoryId, updates);
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
function handleDeleteCategory(categoryId) {
    if (!isAdminMode) return;

    const cat = eventCategories[categoryId];
    if (!cat) return;

    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
        return;
    }

    const result = deleteCategory(categoryId);
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
function handleAddCategory() {
    if (!isAdminMode) return;

    const idInput = document.getElementById('newCategoryId');
    const nameInput = document.getElementById('newCategoryName');
    const bgColorInput = document.getElementById('newCategoryBgColor');
    const textColorInput = document.getElementById('newCategoryTextColor');

    const id = idInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const name = nameInput.value.trim();
    const bgColor = bgColorInput.value;
    const textColor = textColorInput.value;

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

    const result = addCategory(id, name, name, 'fa-tag', bgColor, textColor);
    if (result.success) {
        // Clear inputs
        idInput.value = '';
        nameInput.value = '';
        bgColorInput.value = '#a8d8ea';
        textColorInput.value = '#1e3a8a';

        // Refresh UI
        renderDynamicCategories();
        renderCategoryList();
        updateCalendar();
        renderListView();
    } else {
        alert('Failed to add category: ' + result.error);
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
