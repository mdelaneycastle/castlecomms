import SwiftUI
import UserNotifications
import FirebaseCore
import FirebaseMessaging

@main
struct CastleCommsApp: App {
    
    init() {
        FirebaseApp.configure()
        setupNotifications()
    }
    
    var body: some Scene {
        WindowGroup {
            CastleCommsContentView()
        }
    }
    
    func setupNotifications() {
        Messaging.messaging().delegate = AppMessagingDelegate.shared
        UNUserNotificationCenter.current().delegate = AppNotificationDelegate.shared
    }
}

struct CastleCommsContentView: View {
    @State private var showingSplash = true
    @State private var fcmToken: String = ""
    @State private var notificationStatus = "⏳ Setting up notifications..."
    
    var body: some View {
        if showingSplash {
            SplashView()
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        withAnimation {
                            showingSplash = false
                        }
                    }
                }
        } else {
            MainView(fcmToken: $fcmToken, notificationStatus: $notificationStatus)
                .onAppear {
                    requestNotificationPermission()
                }
        }
    }
    
    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                
                Messaging.messaging().token { token, error in
                    if let error = error {
                        print("Error fetching FCM token: \(error)")
                    } else if let token = token {
                        DispatchQueue.main.async {
                            self.fcmToken = token
                            self.notificationStatus = "✅ Ready to receive notifications"
                        }
                        print("FCM token: \(token)")
                        // TODO: Send this token to your Firebase database
                    }
                }
            } else {
                DispatchQueue.main.async {
                    self.notificationStatus = "❌ Notifications disabled"
                }
            }
        }
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color(red: 0.38, green: 0.39, blue: 0.65) // #6264a7
                .ignoresSafeArea()
            
            VStack {
                Text("🏰")
                    .font(.system(size: 120))
                    .padding(.bottom, 20)
                
                Text("Castle Communications")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.bottom, 10)
                
                Text("Loading...")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
    }
}

struct MainView: View {
    @Binding var fcmToken: String
    @Binding var notificationStatus: String
    @State private var showingTokenAlert = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack {
                Text("🏰")
                    .font(.system(size: 60))
                    .padding(.bottom, 10)
                
                Text("Castle Comms")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.bottom, 5)
                
                Text("Notification Receiver")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 30)
            .padding(.top, 20)
            .background(Color(red: 0.38, green: 0.39, blue: 0.65))
            
            // Content
            VStack(spacing: 20) {
                // Status Card
                VStack(alignment: .leading, spacing: 10) {
                    Text("🔔 Notification Status")
                        .font(.headline)
                        .fontWeight(.bold)
                    
                    Text(notificationStatus)
                        .font(.body)
                        .foregroundColor(.green)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                
                // Website Button
                Button(action: openWebsite) {
                    HStack {
                        Text("🌐 Open Castle Comms Website")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(15)
                    .background(Color(red: 0.38, green: 0.39, blue: 0.65))
                    .cornerRadius(10)
                }
                
                // FCM Token Button (only show if token exists)
                if !fcmToken.isEmpty {
                    Button(action: { showingTokenAlert = true }) {
                        HStack {
                            Text("📋 View FCM Token")
                                .font(.body)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(15)
                        .background(Color.green)
                        .cornerRadius(10)
                    }
                    .alert("FCM Token", isPresented: $showingTokenAlert) {
                        Button("OK", role: .cancel) { }
                    } message: {
                        Text(fcmToken)
                    }
                }
                
                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.97, green: 0.97, blue: 0.98))
            
            // Footer
            VStack {
                Text("Castle Fine Art Ltd")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text("Internal Communications App")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 5)
            }
            .padding(20)
            .background(Color.white)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.gray.opacity(0.3)),
                alignment: .top
            )
        }
        .ignoresSafeArea(.container, edges: .bottom)
    }
    
    func openWebsite() {
        if let url = URL(string: "https://castle-comms.web.app") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Firebase Messaging Delegate
class AppMessagingDelegate: NSObject, ObservableObject {
    static let shared = AppMessagingDelegate()
}

extension AppMessagingDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("Firebase registration token: \(String(describing: fcmToken))")
        // TODO: Send token to your server
    }
}

// MARK: - Notification Delegate
class AppNotificationDelegate: NSObject, ObservableObject {
    static let shared = AppNotificationDelegate()
}

extension AppNotificationDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap - open website
        if let url = URL(string: "https://castle-comms.web.app") {
            UIApplication.shared.open(url)
        }
        completionHandler()
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.alert, .badge, .sound])
    }
}