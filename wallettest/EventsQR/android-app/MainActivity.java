package com.eventsqr.scanner;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends AppCompatActivity {
    private static final int CAMERA_PERMISSION_REQUEST = 100;
    private static final int FILE_IMPORT_REQUEST = 200;
    
    private GuestListManager guestListManager;
    private BottomNavigationView bottomNavigation;
    private ScannerFragment scannerFragment;
    private GuestListFragment guestListFragment;
    private StatsFragment statsFragment;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        guestListManager = new GuestListManager(this);
        
        bottomNavigation = findViewById(R.id.bottom_navigation);
        
        // Initialize fragments
        scannerFragment = new ScannerFragment();
        guestListFragment = new GuestListFragment();
        statsFragment = new StatsFragment();
        
        // Pass guest list manager to fragments
        Bundle bundle = new Bundle();
        scannerFragment.setArguments(bundle);
        guestListFragment.setArguments(bundle);
        statsFragment.setArguments(bundle);
        
        // Set up bottom navigation
        bottomNavigation.setOnNavigationItemSelectedListener(item -> {
            Fragment selectedFragment = null;
            switch (item.getItemId()) {
                case R.id.nav_scan:
                    selectedFragment = scannerFragment;
                    break;
                case R.id.nav_guests:
                    selectedFragment = guestListFragment;
                    break;
                case R.id.nav_stats:
                    selectedFragment = statsFragment;
                    break;
            }
            
            if (selectedFragment != null) {
                FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
                transaction.replace(R.id.fragment_container, selectedFragment);
                transaction.commit();
                return true;
            }
            return false;
        });
        
        // Start with scanner fragment
        bottomNavigation.setSelectedItemId(R.id.nav_scan);
        
        // Check camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        }
    }
    
    public GuestListManager getGuestListManager() {
        return guestListManager;
    }
    
    public void importGuestList() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("text/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, "Select CSV File"), FILE_IMPORT_REQUEST);
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_IMPORT_REQUEST && resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) {
                Uri uri = data.getData();
                try {
                    InputStream inputStream = getContentResolver().openInputStream(uri);
                    BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
                    StringBuilder csvContent = new StringBuilder();
                    String line;
                    
                    while ((line = reader.readLine()) != null) {
                        csvContent.append(line).append("\n");
                    }
                    
                    reader.close();
                    
                    // Import the guest list
                    String fileName = uri.getLastPathSegment();
                    String eventName = fileName != null ? fileName.replace(".csv", "") : "Event";
                    guestListManager.importGuestsFromCSV(csvContent.toString(), eventName);
                    
                    Toast.makeText(this, "Imported " + guestListManager.getTotalGuests() + " guests", Toast.LENGTH_LONG).show();
                    
                    // Refresh fragments
                    refreshFragments();
                    
                } catch (Exception e) {
                    Toast.makeText(this, "Error importing file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        }
    }
    
    private void refreshFragments() {
        if (guestListFragment != null) {
            guestListFragment.refreshGuestList();
        }
        if (statsFragment != null) {
            statsFragment.refreshStats();
        }
        if (scannerFragment != null) {
            scannerFragment.refreshStatus();
        }
    }
    
    public void refreshAllFragments() {
        refreshFragments();
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                         @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted, scanner fragment will handle initialization
            } else {
                Toast.makeText(this, "Camera permission is required to scan QR codes", 
                              Toast.LENGTH_LONG).show();
            }
        }
    }
}