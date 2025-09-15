package com.eventsqr.scanner;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class GuestListManager {
    private static final String PREF_NAME = "EventsQR_GuestList";
    private static final String GUESTS_KEY = "guests";
    private static final String EVENT_NAME_KEY = "event_name";
    
    private Context context;
    private SharedPreferences prefs;
    private Gson gson;
    private List<Guest> guests;
    
    public GuestListManager(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        this.gson = new Gson();
        this.guests = new ArrayList<>();
        loadGuests();
    }
    
    public void importGuestsFromCSV(String csvContent, String eventName) {
        guests.clear();
        String[] lines = csvContent.split("\n");
        
        // Skip header row
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!line.isEmpty()) {
                String[] parts = line.split(",");
                if (parts.length >= 2) {
                    String name = parts[0].trim().replace("\"", "");
                    int guestCount = Integer.parseInt(parts[1].trim());
                    String email = parts.length > 2 ? parts[2].trim().replace("\"", "") : "";
                    
                    // Generate ID from name and guest count
                    String id = generateId(name, guestCount);
                    guests.add(new Guest(id, name, guestCount, email));
                }
            }
        }
        
        saveGuests();
        saveEventName(eventName);
    }
    
    private String generateId(String name, int guestCount) {
        return (name + guestCount).hashCode() + "_" + System.currentTimeMillis() / 1000;
    }
    
    public void saveGuests() {
        String json = gson.toJson(guests);
        prefs.edit().putString(GUESTS_KEY, json).apply();
    }
    
    public void loadGuests() {
        String json = prefs.getString(GUESTS_KEY, "[]");
        Type type = new TypeToken<List<Guest>>(){}.getType();
        guests = gson.fromJson(json, type);
        if (guests == null) {
            guests = new ArrayList<>();
        }
    }
    
    public void saveEventName(String eventName) {
        prefs.edit().putString(EVENT_NAME_KEY, eventName).apply();
    }
    
    public String getEventName() {
        return prefs.getString(EVENT_NAME_KEY, "Event");
    }
    
    public List<Guest> getGuests() {
        return new ArrayList<>(guests);
    }
    
    public Guest findGuestById(String id) {
        for (Guest guest : guests) {
            if (guest.getId().equals(id)) {
                return guest;
            }
        }
        return null;
    }
    
    public Guest findGuestByNameAndCount(String name, int guestCount) {
        for (Guest guest : guests) {
            if (guest.getName().equalsIgnoreCase(name) && guest.getGuestCount() == guestCount) {
                return guest;
            }
        }
        return null;
    }
    
    public boolean checkInGuest(String id) {
        Guest guest = findGuestById(id);
        if (guest != null && !guest.isCheckedIn()) {
            guest.checkIn();
            saveGuests();
            return true;
        }
        return false;
    }
    
    public boolean checkInGuestByData(String name, int guestCount) {
        Guest guest = findGuestByNameAndCount(name, guestCount);
        if (guest != null && !guest.isCheckedIn()) {
            guest.checkIn();
            saveGuests();
            return true;
        }
        return false;
    }
    
    public int getTotalGuests() {
        return guests.size();
    }
    
    public int getCheckedInCount() {
        int count = 0;
        for (Guest guest : guests) {
            if (guest.isCheckedIn()) count++;
        }
        return count;
    }
    
    public int getTotalGuestCount() {
        int count = 0;
        for (Guest guest : guests) {
            count += guest.getGuestCount();
        }
        return count;
    }
    
    public int getCheckedInGuestCount() {
        int count = 0;
        for (Guest guest : guests) {
            if (guest.isCheckedIn()) {
                count += guest.getGuestCount();
            }
        }
        return count;
    }
    
    public void clearAllData() {
        guests.clear();
        prefs.edit().clear().apply();
    }
    
    public String exportCheckInResults() {
        StringBuilder csv = new StringBuilder();
        csv.append("Name,Guests,Email,Checked In,Check In Time\n");
        
        for (Guest guest : guests) {
            csv.append("\"").append(guest.getName()).append("\",");
            csv.append(guest.getGuestCount()).append(",");
            csv.append("\"").append(guest.getEmail() != null ? guest.getEmail() : "").append("\",");
            csv.append(guest.isCheckedIn() ? "Yes" : "No").append(",");
            if (guest.isCheckedIn()) {
                csv.append(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date(guest.getCheckInTime())));
            }
            csv.append("\n");
        }
        
        return csv.toString();
    }
}