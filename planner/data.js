// Artists data
const artists = [
    'Billy Connolly', 'Billy Schenck', 'Bisaillon Brothers', 'Bob Barker', 'Bob Dylan',
    'Boy George', 'Dan Lane', 'Disney Vintage', 'Dr. Seuss', 'Duncan McAfee',
    'Eve Arnold', 'Gary James McQueen', 'Graceland', 'Graceland London', 'Hanna-Barbera',
    'James Francis Gill', 'James McQueen', 'John Myatt', 'Jon Jones', 'Johnny Depp',
    'Joseph Jones', 'Lawrence Coulson', 'Lorenzo Quinn', 'Marco Olivier', 'Marvel',
    'Multiple Artists', 'Nic Joly', 'Nigel Humphries', 'Paolo Ferrara', 'Pascale Taurua', 'Paul Corfield', 'Paul Kenton',
    'Paulo Ferreira', 'Peter Smith', 'Raphael Mazzucco', 'Rich Simmons',
    'Richard Hambleton', 'Richard Rowan', 'Robert Bailey', 'Robert Oxley',
    'Romero Britto', 'Ron English', 'Ronnie Wood', 'Scarlett Raven', 'Shazia',
    'Steve Winterburn', 'Various Artists', 'Whatshisname'
];

// Galleries data
const galleries = [
    'Birmingham - ICC', 'Birmingham - Mailbox', 'Cheltenham', 'Derby', 'Leamington Spa',
    'Milton Keynes', 'Nottingham', 'Stamford', 'Stratford-upon-Avon', 'Chester',
    'Harrogate', 'Leeds', 'Manchester', 'Newcastle', 'Sheffield Meadowhall', 'York',
    'London Covent Garden', 'London South Molton Street', 'London St Christopher\'s Place',
    'Bath', 'Brighton', 'Bristol', 'Cambridge', 'Canterbury', 'Exeter', 'Guildford',
    'Kent - Bluewater', 'Marlow', 'Norwich', 'Oxford', 'Reading', 'Tunbridge Wells',
    'Winchester', 'Windsor', 'Edinburgh', 'Glasgow', 'Cardiff'
];

// Event type colors
const eventTypeColors = {
    'event': '#d4b5ff',
    'release': '#b8e6b8',
    'exhibition': '#a8d8ea',
    'preview': '#fff2a8',
    'launch': '#a8c8ff',
    'product': '#ffb8b8',
    'promotion': '#ffd4a8'
};

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
