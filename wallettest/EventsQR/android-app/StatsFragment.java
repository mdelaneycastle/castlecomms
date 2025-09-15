package com.eventsqr.scanner;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

public class StatsFragment extends Fragment {
    private TextView eventNameText;
    private TextView totalGuestsText;
    private TextView checkedInGuestsText;
    private TextView totalGuestCountText;
    private TextView checkedInGuestCountText;
    private TextView percentageText;
    private Button clearAllButton;
    private Button exportButton;
    private GuestListManager guestListManager;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_stats, container, false);
    }
    
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        guestListManager = ((MainActivity) getActivity()).getGuestListManager();
        
        eventNameText = view.findViewById(R.id.event_name);
        totalGuestsText = view.findViewById(R.id.total_guests);
        checkedInGuestsText = view.findViewById(R.id.checked_in_guests);
        totalGuestCountText = view.findViewById(R.id.total_guest_count);
        checkedInGuestCountText = view.findViewById(R.id.checked_in_guest_count);
        percentageText = view.findViewById(R.id.percentage);
        clearAllButton = view.findViewById(R.id.clear_all_button);
        exportButton = view.findViewById(R.id.export_button);
        
        clearAllButton.setOnClickListener(v -> {
            guestListManager.clearAllData();
            refreshStats();
            ((MainActivity) getActivity()).refreshAllFragments();
            Toast.makeText(getContext(), "All data cleared", Toast.LENGTH_SHORT).show();
        });
        
        exportButton.setOnClickListener(v -> {
            String csvData = guestListManager.exportCheckInResults();
            // In a real app, you'd save this to external storage or share it
            Toast.makeText(getContext(), "Export data ready (CSV format)", Toast.LENGTH_LONG).show();
        });
        
        refreshStats();
    }
    
    public void refreshStats() {
        if (guestListManager == null) return;
        
        String eventName = guestListManager.getEventName();
        int totalGuests = guestListManager.getTotalGuests();
        int checkedInGuests = guestListManager.getCheckedInCount();
        int totalGuestCount = guestListManager.getTotalGuestCount();
        int checkedInGuestCount = guestListManager.getCheckedInGuestCount();
        
        eventNameText.setText(eventName);
        totalGuestsText.setText(String.valueOf(totalGuests));
        checkedInGuestsText.setText(String.valueOf(checkedInGuests));
        totalGuestCountText.setText(String.valueOf(totalGuestCount));
        checkedInGuestCountText.setText(String.valueOf(checkedInGuestCount));
        
        if (totalGuests > 0) {
            float percentage = (float) checkedInGuests / totalGuests * 100;
            percentageText.setText(String.format("%.1f%%", percentage));
        } else {
            percentageText.setText("0%");
        }
    }
}