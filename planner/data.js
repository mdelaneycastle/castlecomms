// Artists and galleries are loaded from Supabase at boot — arrays of names (strings).
// The DB enforces uniqueness on name, so we read/update/delete by name (no id juggling needed in the UI).
let artists = [];
let galleries = [];

// Default event categories configuration
const defaultCategories = {
    'launch': {
        id: 'launch',
        name: 'Campaign Launch',
        description: 'Major artist campaign launch',
        icon: 'fa-rocket',
        bgColor: '#a8c8ff',
        textColor: '#1e3a8a'
    },
    'release': {
        id: 'release',
        name: 'Digital Launch',
        description: 'Digital release with date and title',
        icon: 'fa-compact-disc',
        bgColor: '#b8e6b8',
        textColor: '#1e5631'
    },
    'exhibition': {
        id: 'exhibition',
        name: 'Digital Originals Program',
        description: 'Digital originals program event',
        icon: 'fa-palette',
        bgColor: '#a8d8ea',
        textColor: '#1e3a8a'
    },
    'preview': {
        id: 'preview',
        name: 'New Artist',
        description: 'New artist introduction',
        icon: 'fa-eye',
        bgColor: '#fff2a8',
        textColor: '#7c5500'
    },
    'event': {
        id: 'event',
        name: 'Staff Training / Sales',
        description: 'Training event or sales period',
        icon: 'fa-calendar-day',
        bgColor: '#d4b5ff',
        textColor: '#4a2c7a'
    }
};

// Dynamic categories (loaded from Supabase or defaults)
let eventCategories = {};

// Helper to convert DB row to JS object
function categoryFromDb(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        bgColor: row.bg_color,
        textColor: row.text_color
    };
}

// Helper to convert JS object to DB row
function categoryToDb(cat) {
    return {
        id: cat.id,
        name: cat.name,
        description: cat.description || cat.name,
        icon: cat.icon || 'fa-tag',
        bg_color: cat.bgColor,
        text_color: cat.textColor
    };
}

// Load categories from Supabase (with fallback to defaults)
async function loadCategories() {
    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            eventCategories = {};
            data.forEach(row => {
                const cat = categoryFromDb(row);
                eventCategories[cat.id] = cat;
            });
        } else {
            // No categories in DB, use defaults
            eventCategories = { ...defaultCategories };
        }
    } catch (error) {
        console.error('Error loading categories from database:', error);
        // Fallback to defaults on error
        eventCategories = { ...defaultCategories };
    }
    return eventCategories;
}

// Add a new category to Supabase
async function addCategory(id, name, description, icon, bgColor, textColor) {
    if (eventCategories[id]) {
        return { success: false, error: 'Category ID already exists' };
    }

    const newCat = {
        id,
        name,
        description: description || name,
        icon: icon || 'fa-tag',
        bgColor,
        textColor
    };

    try {
        const { error } = await supabaseClient
            .from('categories')
            .insert(categoryToDb(newCat));

        if (error) throw error;

        eventCategories[id] = newCat;
        return { success: true };
    } catch (error) {
        console.error('Error adding category:', error);
        return { success: false, error: error.message };
    }
}

// Update a category in Supabase
async function updateCategory(id, updates) {
    if (!eventCategories[id]) {
        return { success: false, error: 'Category not found' };
    }

    const updatedCat = { ...eventCategories[id], ...updates };

    try {
        const { error } = await supabaseClient
            .from('categories')
            .update({
                name: updatedCat.name,
                description: updatedCat.description,
                icon: updatedCat.icon,
                bg_color: updatedCat.bgColor,
                text_color: updatedCat.textColor,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        eventCategories[id] = updatedCat;
        return { success: true };
    } catch (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
    }
}

// Delete a category from Supabase
async function deleteCategory(id) {
    if (!eventCategories[id]) {
        return { success: false, error: 'Category not found' };
    }

    // Check if any events use this category
    const eventsUsingCategory = eventsData.filter(e => e.type === id);
    if (eventsUsingCategory.length > 0) {
        return { success: false, error: `Cannot delete: ${eventsUsingCategory.length} event(s) use this category` };
    }

    try {
        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        delete eventCategories[id];
        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// Galleries CRUD
// ============================================================
async function loadGalleries() {
    try {
        const { data, error } = await supabaseClient
            .from('galleries')
            .select('name')
            .order('name', { ascending: true });
        if (error) throw error;
        galleries = (data || []).map(r => r.name);
    } catch (error) {
        console.error('Error loading galleries:', error);
        galleries = [];
    }
    return galleries;
}

async function addGallery(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { success: false, error: 'Gallery name cannot be empty' };
    if (galleries.includes(trimmed)) return { success: false, error: 'Gallery already exists' };
    try {
        const { error } = await supabaseClient.from('galleries').insert({ name: trimmed });
        if (error) throw error;
        galleries.push(trimmed);
        galleries.sort((a, b) => a.localeCompare(b));
        return { success: true };
    } catch (error) {
        console.error('Error adding gallery:', error);
        return { success: false, error: error.message };
    }
}

async function updateGallery(oldName, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) return { success: false, error: 'Gallery name cannot be empty' };
    if (trimmed === oldName) return { success: true };
    if (galleries.includes(trimmed)) return { success: false, error: 'A gallery with that name already exists' };
    try {
        const { error } = await supabaseClient
            .from('galleries')
            .update({ name: trimmed, updated_at: new Date().toISOString() })
            .eq('name', oldName);
        if (error) throw error;

        // Cascade rename to any events that reference the old name
        const { error: eventsError } = await supabaseClient
            .from('events')
            .update({ gallery: trimmed })
            .eq('gallery', oldName);
        if (eventsError) throw eventsError;

        galleries = galleries.map(g => g === oldName ? trimmed : g).sort((a, b) => a.localeCompare(b));
        eventsData.forEach(e => { if (e.gallery === oldName) e.gallery = trimmed; });
        return { success: true };
    } catch (error) {
        console.error('Error updating gallery:', error);
        return { success: false, error: error.message };
    }
}

async function deleteGallery(name) {
    const inUse = eventsData.filter(e => e.gallery === name).length;
    if (inUse > 0) {
        return { success: false, error: `Cannot delete: ${inUse} event(s) use this gallery` };
    }
    try {
        const { error } = await supabaseClient.from('galleries').delete().eq('name', name);
        if (error) throw error;
        galleries = galleries.filter(g => g !== name);
        return { success: true };
    } catch (error) {
        console.error('Error deleting gallery:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// Artists CRUD
// ============================================================
async function loadArtists() {
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('name')
            .order('name', { ascending: true });
        if (error) throw error;
        artists = (data || []).map(r => r.name);
    } catch (error) {
        console.error('Error loading artists:', error);
        artists = [];
    }
    return artists;
}

async function addArtist(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { success: false, error: 'Artist name cannot be empty' };
    if (artists.includes(trimmed)) return { success: false, error: 'Artist already exists' };
    try {
        const { error } = await supabaseClient.from('artists').insert({ name: trimmed });
        if (error) throw error;
        artists.push(trimmed);
        artists.sort((a, b) => a.localeCompare(b));
        return { success: true };
    } catch (error) {
        console.error('Error adding artist:', error);
        return { success: false, error: error.message };
    }
}

async function updateArtist(oldName, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) return { success: false, error: 'Artist name cannot be empty' };
    if (trimmed === oldName) return { success: true };
    if (artists.includes(trimmed)) return { success: false, error: 'An artist with that name already exists' };
    try {
        const { error } = await supabaseClient
            .from('artists')
            .update({ name: trimmed, updated_at: new Date().toISOString() })
            .eq('name', oldName);
        if (error) throw error;

        const { error: eventsError } = await supabaseClient
            .from('events')
            .update({ artist_name: trimmed })
            .eq('artist_name', oldName);
        if (eventsError) throw eventsError;

        artists = artists.map(a => a === oldName ? trimmed : a).sort((a, b) => a.localeCompare(b));
        eventsData.forEach(e => { if (e.artist === oldName) e.artist = trimmed; });
        return { success: true };
    } catch (error) {
        console.error('Error updating artist:', error);
        return { success: false, error: error.message };
    }
}

async function deleteArtist(name) {
    const inUse = eventsData.filter(e => e.artist === name).length;
    if (inUse > 0) {
        return { success: false, error: `Cannot delete: ${inUse} event(s) use this artist` };
    }
    try {
        const { error } = await supabaseClient.from('artists').delete().eq('name', name);
        if (error) throw error;
        artists = artists.filter(a => a !== name);
        return { success: true };
    } catch (error) {
        console.error('Error deleting artist:', error);
        return { success: false, error: error.message };
    }
}

// Get event type colors (for backward compatibility)
function getEventTypeColors() {
    const colors = {};
    Object.keys(eventCategories).forEach(id => {
        colors[id] = eventCategories[id].bgColor;
    });
    return colors;
}

// Legacy eventTypeColors getter for compatibility
const eventTypeColors = new Proxy({}, {
    get: function(target, prop) {
        if (eventCategories[prop]) {
            return eventCategories[prop].bgColor;
        }
        return '#cccccc';
    }
});

// Event status colors
const statusColors = {
    'planned': '#007bff',
    'confirmed': '#28a745',
    'completed': '#6c757d',
    'cancelled': '#dc3545'
};

// Equipment icons
const equipmentIcons = {
    'tv': 'fa-tv',
    'microphones': 'fa-microphone',
    'lighting': 'fa-lightbulb',
    'other': 'fa-tools'
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Sample events data (initially empty - user will add their own)
let eventsData = [];

// Helper functions to convert between camelCase (JS) and snake_case (DB)
// Mapping: DB columns -> JS properties
// event_date -> date, artist_name -> artist, event_type -> type, equipment_required -> equipment
function toSnakeCase(obj) {
    return {
        id: obj.id,
        event_type: obj.type,
        event_date: obj.date,
        all_day: obj.allDay,
        start_time: obj.startTime,
        end_time: obj.endTime,
        artist_name: obj.artist,
        gallery: obj.gallery,
        status: obj.status,
        title: obj.title,
        description: obj.description,
        equipment_required: obj.equipment
    };
}

function toCamelCase(obj) {
    return {
        id: obj.id,
        type: obj.event_type,
        date: obj.event_date,
        allDay: obj.all_day,
        startTime: obj.start_time,
        endTime: obj.end_time,
        artist: obj.artist_name,
        gallery: obj.gallery,
        status: obj.status,
        title: obj.title,
        description: obj.description,
        equipment: obj.equipment_required
    };
}

// Database functions
async function saveEventToDatabase(eventData) {
    try {
        const dbData = toSnakeCase(eventData);
        const { data, error } = await supabaseClient
            .from('events')
            .upsert(dbData)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving event to database:', error);
        return { success: false, error: error.message };
    }
}

async function loadEventsFromDatabase() {
    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });

        if (error) throw error;
        eventsData = (data || []).map(toCamelCase);
        return { success: true };
    } catch (error) {
        console.error('Error loading events from database:', error);
        eventsData = [];
        return { success: false, error: error.message };
    }
}

async function deleteEventFromDatabase(eventId) {
    try {
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting event from database:', error);
        return { success: false, error: error.message };
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Date formatting functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateStr, timeStr) {
    if (!timeStr) return formatDate(dateStr);
    return `${formatDate(dateStr)} at ${timeStr}`;
}

function formatEventTime(event) {
    if (event.allDay) return formatDate(event.date);
    if (event.startTime && event.endTime) {
        return `${formatDate(event.date)} ${event.startTime} - ${event.endTime}`;
    }
    return formatDate(event.date);
}

// Event validation
function validateEvent(eventData) {
    const errors = [];

    if (!eventData.date) {
        errors.push('Date is required');
    }

    if (!eventData.artist) {
        errors.push('Artist is required');
    }

    if (!eventData.type) {
        errors.push('Type is required');
    }

    // Type-specific validation
    if (eventData.type === 'event') {
        // Events require gallery
        if (!eventData.gallery) {
            errors.push('Gallery is required for events');
        }

        // Validate times for non-all-day events
        if (!eventData.allDay && eventData.startTime && eventData.endTime) {
            if (eventData.startTime >= eventData.endTime) {
                errors.push('End time must be after start time');
            }
        }
    } else {
        // Releases, exhibitions, previews, launches require title
        if (!eventData.title || !eventData.title.trim()) {
            errors.push('Title is required');
        }
    }

    return errors;
}

// Filter events
function filterEvents(filters) {
    return eventsData.filter(event => {
        // Type filter
        if (filters.types && filters.types.length > 0 && !filters.types.includes(event.type)) {
            return false;
        }
        
        // Artist filter
        if (filters.artist && event.artist !== filters.artist) {
            return false;
        }
        
        // Gallery filter
        if (filters.gallery && event.gallery !== filters.gallery) {
            return false;
        }
        
        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const searchableText = [
                event.artist,
                event.gallery,
                event.description || '',
                event.type
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
}

// Get event statistics
function getEventStats() {
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingEvents = eventsData.filter(event => 
        new Date(event.date) >= now && new Date(event.date) <= oneWeek
    ).length;
    
    const uniqueArtists = [...new Set(eventsData.map(event => event.artist))].length;
    const activeGalleries = [...new Set(eventsData.map(event => event.gallery))].length;
    
    return {
        total: eventsData.length,
        upcoming: upcomingEvents,
        artists: uniqueArtists,
        galleries: activeGalleries
    };
}

// Get events by type for charts
function getEventsByType() {
    const typeCounts = {};
    eventsData.forEach(event => {
        typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    return typeCounts;
}

// Get events by gallery for charts
function getEventsByGallery() {
    const galleryCounts = {};
    eventsData.forEach(event => {
        galleryCounts[event.gallery] = (galleryCounts[event.gallery] || 0) + 1;
    });
    
    // Return top 10 galleries
    const sorted = Object.entries(galleryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    return Object.fromEntries(sorted);
}

// Export data
function exportEventsData() {
    const dataStr = JSON.stringify(eventsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Import data
async function importEventsData(jsonData) {
    try {
        const imported = JSON.parse(jsonData);
        if (!Array.isArray(imported)) {
            throw new Error('Data must be an array of events');
        }

        // Validate each event
        const validEvents = [];
        const errors = [];

        imported.forEach((event, index) => {
            const eventErrors = validateEvent(event);
            if (eventErrors.length === 0) {
                event.id = event.id || generateId();
                validEvents.push(event);
            } else {
                errors.push(`Event ${index + 1}: ${eventErrors.join(', ')}`);
            }
        });

        if (errors.length > 0) {
            console.warn('Some events had validation errors:', errors);
        }

        // Save all valid events to database
        for (const event of validEvents) {
            await saveEventToDatabase(event);
        }

        // Reload all events from database
        await loadEventsFromDatabase();

        return {
            success: true,
            imported: validEvents.length,
            errors: errors.length
        };
    } catch (e) {
        return {
            success: false,
            error: e.message
        };
    }
}

// Generate ICS (iCalendar) format for calendar subscription
function generateICS(events = eventsData) {
    const lines = [];

    // ICS header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Gallery Scheduling Portal//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push('X-WR-CALNAME:Gallery Events');
    lines.push('X-WR-TIMEZONE:UTC');
    lines.push('X-WR-CALDESC:Gallery scheduling events, launches, and exhibitions');

    // Add each event
    events.forEach(event => {
        const uid = `${event.id}@gallery-scheduling.local`;
        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // Format dates for ICS
        let dtstart, dtend;
        if (event.allDay) {
            // All-day events use DATE format (YYYYMMDD)
            dtstart = event.date.replace(/-/g, '');
            // End date is the next day for all-day events
            const endDate = new Date(event.date);
            endDate.setDate(endDate.getDate() + 1);
            dtend = endDate.toISOString().split('T')[0].replace(/-/g, '');
        } else {
            // Timed events use DATETIME format
            const startDateTime = `${event.date}T${event.startTime || '09:00'}:00`;
            const endDateTime = `${event.date}T${event.endTime || '17:00'}:00`;
            dtstart = new Date(startDateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            dtend = new Date(endDateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        }

        // Build event title
        let summary;
        if (event.type === 'event') {
            summary = `${event.artist} - ${event.gallery}`;
        } else {
            summary = event.title ? `${event.artist} - ${event.title}` : event.artist;
        }

        // Build description
        let description = `Type: ${event.type}\\nArtist: ${event.artist}`;
        if (event.gallery) description += `\\nGallery: ${event.gallery}`;
        if (event.title) description += `\\nTitle: ${event.title}`;
        if (event.description) description += `\\nNotes: ${event.description}`;
        if (event.status) description += `\\nStatus: ${event.status}`;

        // Add equipment info for events
        if (event.equipment) {
            const equipList = [];
            if (event.equipment.tv) equipList.push('TV/Display');
            if (event.equipment.microphones) equipList.push('Microphones');
            if (event.equipment.lighting) equipList.push('Custom Lighting');
            if (event.equipment.stage) equipList.push('Stage');
            if (event.equipment.other) equipList.push(event.equipment.other);
            if (equipList.length > 0) {
                description += `\\nEquipment: ${equipList.join(', ')}`;
            }
        }

        // Location
        const location = event.gallery || '';

        // Add event to ICS
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${now}`);
        if (event.allDay) {
            lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
            lines.push(`DTEND;VALUE=DATE:${dtend}`);
        } else {
            lines.push(`DTSTART:${dtstart}`);
            lines.push(`DTEND:${dtend}`);
        }
        lines.push(`SUMMARY:${summary}`);
        lines.push(`DESCRIPTION:${description}`);
        if (location) lines.push(`LOCATION:${location}`);
        lines.push(`STATUS:${event.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`);
        lines.push(`CATEGORIES:${event.type.toUpperCase()}`);
        lines.push('END:VEVENT');
    });

    // ICS footer
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
}

// Download ICS file
function downloadICSFile() {
    const icsContent = generateICS(eventsData);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `gallery-events-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
