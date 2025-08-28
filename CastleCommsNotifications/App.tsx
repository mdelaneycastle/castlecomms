import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';

const App = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Show intro for 3 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    // Initialize Firebase messaging
    initializeFirebaseMessaging();

    return () => clearTimeout(timer);
  }, []);

  const initializeFirebaseMessaging = async () => {
    try {
      // We'll add Firebase messaging here after installing the packages
      console.log('Firebase messaging will be initialized here');
    } catch (error) {
      console.error('Firebase messaging initialization error:', error);
    }
  };

  const openWebsite = () => {
    Linking.openURL('https://castle-comms.web.app');
  };

  const copyTokenToClipboard = () => {
    if (fcmToken) {
      Alert.alert('FCM Token', fcmToken, [
        { text: 'OK' }
      ]);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.introContainer}>
        <StatusBar backgroundColor="#6264a7" barStyle="light-content" />
        <View style={styles.introContent}>
          <Text style={styles.introGif}>🏰</Text>
          <Text style={styles.introText}>Castle Communications</Text>
          <Text style={styles.introSubtext}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#6264a7" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>🏰</Text>
        <Text style={styles.title}>Castle Comms</Text>
        <Text style={styles.subtitle}>Notification Receiver</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>🔔 Notification Status</Text>
          <Text style={styles.statusText}>
            {fcmToken ? '✅ Ready to receive notifications' : '⏳ Setting up notifications...'}
          </Text>
        </View>

        <TouchableOpacity style={styles.websiteButton} onPress={openWebsite}>
          <Text style={styles.websiteButtonText}>🌐 Open Castle Comms Website</Text>
        </TouchableOpacity>

        {fcmToken && (
          <TouchableOpacity style={styles.tokenButton} onPress={copyTokenToClipboard}>
            <Text style={styles.tokenButtonText}>📋 View FCM Token</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Castle Fine Art Ltd</Text>
        <Text style={styles.footerSubtext}>Internal Communications App</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  introContainer: {
    flex: 1,
    backgroundColor: '#6264a7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  introContent: {
    alignItems: 'center',
  },
  introGif: {
    fontSize: 120,
    marginBottom: 20,
  },
  introText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  introSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6264a7',
    padding: 30,
    alignItems: 'center',
    paddingTop: 50,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#28a745',
  },
  websiteButton: {
    backgroundColor: '#6264a7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  websiteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  tokenButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});

export default App;