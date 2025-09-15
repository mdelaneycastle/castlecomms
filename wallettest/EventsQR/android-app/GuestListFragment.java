package com.eventsqr.scanner;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class GuestListFragment extends Fragment {
    private RecyclerView recyclerView;
    private TextView emptyView;
    private Button importButton;
    private GuestListManager guestListManager;
    private GuestListAdapter adapter;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_guest_list, container, false);
    }
    
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        guestListManager = ((MainActivity) getActivity()).getGuestListManager();
        
        recyclerView = view.findViewById(R.id.recycler_view);
        emptyView = view.findViewById(R.id.empty_view);
        importButton = view.findViewById(R.id.import_button);
        
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        
        importButton.setOnClickListener(v -> ((MainActivity) getActivity()).importGuestList());
        
        refreshGuestList();
    }
    
    public void refreshGuestList() {
        if (guestListManager == null) return;
        
        List<Guest> guests = guestListManager.getGuests();
        
        if (guests.isEmpty()) {
            recyclerView.setVisibility(View.GONE);
            emptyView.setVisibility(View.VISIBLE);
        } else {
            recyclerView.setVisibility(View.VISIBLE);
            emptyView.setVisibility(View.GONE);
            
            if (adapter == null) {
                adapter = new GuestListAdapter(guests);
                recyclerView.setAdapter(adapter);
            } else {
                adapter.updateGuests(guests);
            }
        }
    }
    
    private static class GuestListAdapter extends RecyclerView.Adapter<GuestViewHolder> {
        private List<Guest> guests;
        
        GuestListAdapter(List<Guest> guests) {
            this.guests = guests;
        }
        
        void updateGuests(List<Guest> newGuests) {
            this.guests = newGuests;
            notifyDataSetChanged();
        }
        
        @NonNull
        @Override
        public GuestViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_guest, parent, false);
            return new GuestViewHolder(view);
        }
        
        @Override
        public void onBindViewHolder(@NonNull GuestViewHolder holder, int position) {
            holder.bind(guests.get(position));
        }
        
        @Override
        public int getItemCount() {
            return guests.size();
        }
    }
    
    private static class GuestViewHolder extends RecyclerView.ViewHolder {
        private TextView nameText;
        private TextView guestsText;
        private TextView emailText;
        private TextView statusText;
        private TextView checkInTimeText;
        private View statusIndicator;
        
        GuestViewHolder(@NonNull View itemView) {
            super(itemView);
            nameText = itemView.findViewById(R.id.guest_name);
            guestsText = itemView.findViewById(R.id.guest_count);
            emailText = itemView.findViewById(R.id.guest_email);
            statusText = itemView.findViewById(R.id.status_text);
            checkInTimeText = itemView.findViewById(R.id.checkin_time);
            statusIndicator = itemView.findViewById(R.id.status_indicator);
        }
        
        void bind(Guest guest) {
            nameText.setText(guest.getName());
            guestsText.setText(guest.getGuestCount() + " guest" + (guest.getGuestCount() != 1 ? "s" : ""));
            
            if (guest.getEmail() != null && !guest.getEmail().isEmpty()) {
                emailText.setText(guest.getEmail());
                emailText.setVisibility(View.VISIBLE);
            } else {
                emailText.setVisibility(View.GONE);
            }
            
            if (guest.isCheckedIn()) {
                statusText.setText("✓ Checked In");
                statusText.setTextColor(itemView.getContext().getResources().getColor(android.R.color.holo_green_dark));
                statusIndicator.setBackgroundColor(itemView.getContext().getResources().getColor(android.R.color.holo_green_light));
                
                String timeStr = new SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                        .format(new Date(guest.getCheckInTime()));
                checkInTimeText.setText("at " + timeStr);
                checkInTimeText.setVisibility(View.VISIBLE);
            } else {
                statusText.setText("Pending");
                statusText.setTextColor(itemView.getContext().getResources().getColor(android.R.color.darker_gray));
                statusIndicator.setBackgroundColor(itemView.getContext().getResources().getColor(android.R.color.darker_gray));
                checkInTimeText.setVisibility(View.GONE);
            }
        }
    }
}