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
import com.journeyapps.barcodescanner.BarcodeCallback;
import com.journeyapps.barcodescanner.BarcodeResult;
import com.journeyapps.barcodescanner.DecoratedBarcodeView;
import com.journeyapps.barcodescanner.DefaultDecoderFactory;
import com.google.zxing.BarcodeFormat;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.Locale;

public class ScannerFragment extends Fragment {
    private DecoratedBarcodeView barcodeView;
    private TextView statusText;
    private TextView eventInfo;
    private TextView checkedInCount;
    private Button importButton;
    private Button exportButton;
    private GuestListManager guestListManager;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_scanner, container, false);
    }
    
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        guestListManager = ((MainActivity) getActivity()).getGuestListManager();
        
        barcodeView = view.findViewById(R.id.barcode_scanner);
        statusText = view.findViewById(R.id.status_text);
        eventInfo = view.findViewById(R.id.event_info);
        checkedInCount = view.findViewById(R.id.checked_in_count);
        importButton = view.findViewById(R.id.import_button);
        exportButton = view.findViewById(R.id.export_button);
        
        // Set up QR scanner
        Collection<BarcodeFormat> formats = Arrays.asList(BarcodeFormat.QR_CODE);
        barcodeView.getBarcodeView().setDecoderFactory(new DefaultDecoderFactory(formats));
        barcodeView.setStatusText("Point camera at QR code to check in guests");
        
        initializeScanner();
        refreshStatus();
        
        importButton.setOnClickListener(v -> ((MainActivity) getActivity()).importGuestList());
        
        exportButton.setOnClickListener(v -> exportCheckInResults());
    }
    
    private void initializeScanner() {
        barcodeView.decodeContinuous(new BarcodeCallback() {
            @Override
            public void barcodeResult(BarcodeResult result) {
                if (result.getText() != null) {
                    handleQRCodeScan(result.getText());
                }
            }
        });
    }
    
    private void handleQRCodeScan(String qrData) {
        try {
            String name = "";
            int guests = 0;
            String id = "";
            
            // Try pipe-separated format first (our new format)
            if (qrData.contains("|")) {
                String[] parts = qrData.split("\\|");
                if (parts.length >= 3) {
                    id = parts[0];
                    name = parts[1];
                    guests = Integer.parseInt(parts[2]);
                } else {
                    throw new Exception("Invalid pipe format");
                }
            } else {
                // Try JSON format as fallback
                JSONObject data = new JSONObject(qrData);
                if (data.has("id")) {
                    id = data.getString("id");
                }
                name = data.getString("name");
                guests = data.getInt("guests");
            }
            
            // Try to check in by ID first, then by name and guest count
            Guest guest = null;
            boolean checkedIn = false;
            
            if (!id.isEmpty()) {
                guest = guestListManager.findGuestById(id);
                if (guest != null) {
                    checkedIn = guestListManager.checkInGuest(id);
                }
            }
            
            // Fallback to name and guest count
            if (guest == null) {
                guest = guestListManager.findGuestByNameAndCount(name, guests);
                if (guest != null) {
                    checkedIn = guestListManager.checkInGuestByData(name, guests);
                }
            }
            
            if (guest == null) {
                showStatus("❌ Guest not found in list: " + name, false);
                return;
            }
            
            if (guest.isCheckedIn() && !checkedIn) {
                showStatus("⚠️ " + name + " already checked in!", false);
                return;
            }
            
            if (checkedIn) {
                String checkInTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());
                showStatus("✅ " + name + " (" + guests + " guests) checked in at " + checkInTime, true);
                refreshStatus();
                ((MainActivity) getActivity()).refreshAllFragments();
            } else {
                showStatus("❌ Failed to check in " + name, false);
            }
            
        } catch (Exception e) {
            showStatus("❌ Invalid QR Code: " + e.getMessage(), false);
        }
    }
    
    private void showStatus(String message, boolean success) {
        statusText.setText(message);
        statusText.setTextColor(success ? 
            getResources().getColor(android.R.color.holo_green_dark) : 
            getResources().getColor(android.R.color.holo_red_dark));
        
        Toast.makeText(getContext(), message, Toast.LENGTH_SHORT).show();
    }
    
    public void refreshStatus() {
        if (guestListManager != null) {
            String eventName = guestListManager.getEventName();
            int totalGuests = guestListManager.getTotalGuests();
            int checkedIn = guestListManager.getCheckedInCount();
            int totalGuestCount = guestListManager.getTotalGuestCount();
            int checkedInGuestCount = guestListManager.getCheckedInGuestCount();
            
            eventInfo.setText("Event: " + eventName + " (" + totalGuests + " entries)");
            checkedInCount.setText("Checked In: " + checkedIn + "/" + totalGuests + 
                    " (" + checkedInGuestCount + "/" + totalGuestCount + " guests)");
        }
    }
    
    private void exportCheckInResults() {
        if (guestListManager.getTotalGuests() == 0) {
            Toast.makeText(getContext(), "No guest data to export", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // In a real app, you'd save this to external storage or share it
        String csvData = guestListManager.exportCheckInResults();
        
        // For now, just show a summary
        Toast.makeText(getContext(), "Export ready: " + guestListManager.getCheckedInCount() + 
                " checked in of " + guestListManager.getTotalGuests() + " total", Toast.LENGTH_LONG).show();
    }
    
    @Override
    public void onResume() {
        super.onResume();
        if (barcodeView != null) {
            barcodeView.resume();
        }
    }
    
    @Override
    public void onPause() {
        super.onPause();
        if (barcodeView != null) {
            barcodeView.pause();
        }
    }
}