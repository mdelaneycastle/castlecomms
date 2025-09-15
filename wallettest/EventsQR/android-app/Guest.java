package com.eventsqr.scanner;

public class Guest {
    private String id;
    private String name;
    private int guestCount;
    private String email;
    private boolean checkedIn;
    private long checkInTime;
    
    public Guest() {}
    
    public Guest(String id, String name, int guestCount, String email) {
        this.id = id;
        this.name = name;
        this.guestCount = guestCount;
        this.email = email;
        this.checkedIn = false;
        this.checkInTime = 0;
    }
    
    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public int getGuestCount() { return guestCount; }
    public String getEmail() { return email; }
    public boolean isCheckedIn() { return checkedIn; }
    public long getCheckInTime() { return checkInTime; }
    
    // Setters
    public void setId(String id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setGuestCount(int guestCount) { this.guestCount = guestCount; }
    public void setEmail(String email) { this.email = email; }
    public void setCheckedIn(boolean checkedIn) { this.checkedIn = checkedIn; }
    public void setCheckInTime(long checkInTime) { this.checkInTime = checkInTime; }
    
    public void checkIn() {
        this.checkedIn = true;
        this.checkInTime = System.currentTimeMillis();
    }
}