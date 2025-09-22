const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const cors = require("cors");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Initialize Firebase Admin
initializeApp();

// Firebase Storage bucket
const bucket = getStorage().bucket();

const corsOptions = {
  origin: [
    "https://mdelaneycastle.github.io",
    "https://castle-comms.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

const corsHandler = cors(corsOptions);

// Firebase Storage utilities
function generateUniqueFilename(originalName, uploaderName) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const fileExtension = path.extname(originalName);
  const baseName = path.basename(originalName, fileExtension);
  return `gallery/${uploaderName}_${timestamp}_${baseName}${fileExtension}`;
}

/**
 * Upload file to Firebase Storage and save metadata to Firebase Database
 */
const uploadToGallery = onRequest(
  { 
    region: "europe-west1", 
    memory: "1GiB", 
    timeoutSeconds: 300
  },
  async (req, res) => {
    // Handle CORS
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }

      try {
        logger.info('Upload request received');

        // Use busboy directly for better control with Cloud Functions v2
        const Busboy = require('busboy');
        const contentType = req.headers['content-type'] || '';
        const busboy = Busboy({ 
          headers: { 'content-type': contentType },
          limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
          }
        });
        
        let fileBuffer = null;
        let fileInfo = null;
        let formFields = {};

        busboy.on('file', (fieldname, file, info) => {
          if (fieldname !== 'file') {
            file.resume(); // Ignore non-file fields
            return;
          }
          fileInfo = info;
          const chunks = [];
          file.on('data', (chunk) => chunks.push(chunk));
          file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        busboy.on('field', (fieldname, value) => {
          formFields[fieldname] = value;
        });

        busboy.on('finish', async () => {
          try {
            if (!fileBuffer || !fileInfo) {
              return res.status(400).json({ 
                success: false, 
                error: "No file uploaded" 
              });
            }

            const { uploadedBy, uploaderName } = formFields;
            if (!uploadedBy || !uploaderName) {
              return res.status(400).json({ 
                success: false, 
                error: "uploadedBy and uploaderName are required" 
              });
            }

            logger.info(`Processing upload: ${fileInfo.filename}, size: ${fileBuffer.length}`);

            // Generate unique filename for Firebase Storage
            const uniqueFilename = generateUniqueFilename(fileInfo.filename, uploaderName);
            logger.info(`Uploading to Firebase Storage as: ${uniqueFilename}`);

            // Upload to Firebase Storage
            const file = bucket.file(uniqueFilename);
            const stream = file.createWriteStream({
              metadata: {
                contentType: fileInfo.mimeType,
                metadata: {
                  uploadedBy: uploadedBy,
                  uploaderName: uploaderName,
                  originalName: fileInfo.filename
                }
              },
              public: true // Make file publicly accessible
            });

            // Upload file as a promise
            await new Promise((resolve, reject) => {
              stream.on('error', reject);
              stream.on('finish', resolve);
              stream.end(fileBuffer);
            });

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFilename}`;
            logger.info(`File uploaded to Firebase Storage: ${publicUrl}`);

            // Save metadata to Firebase Database
            const db = getDatabase();
            const imageRef = db.ref('gallery-images').push();
            const imageData = {
              originalName: fileInfo.filename,
              filename: uniqueFilename,
              storageUrl: publicUrl,
              uploadDate: new Date().toISOString(),
              uploadedBy: uploadedBy,
              uploaderName: uploaderName,
              fileSize: fileBuffer.length,
              mimeType: fileInfo.mimeType,
              bestPractice: false
            };

            await imageRef.set(imageData);
            logger.info(`Metadata saved to Firebase Database with key: ${imageRef.key}`);

            res.status(200).json({
              success: true,
              message: "File uploaded successfully to Firebase Storage",
              firebaseKey: imageRef.key,
              filename: uniqueFilename,
              storageUrl: publicUrl
            });

          } catch (error) {
            logger.error("Upload processing failed:", error);
            res.status(500).json({ 
              success: false, 
              error: "Upload failed", 
              message: error.message 
            });
          }
        });

        busboy.on('error', (error) => {
          logger.error("Busboy error:", error);
          res.status(500).json({ 
            success: false, 
            error: "Form parsing failed", 
            message: error.message 
          });
        });

        // IMPORTANT for Cloud Functions v2: Use req.rawBody instead of req.pipe(busboy)
        busboy.end(req.rawBody);

      } catch (error) {
        logger.error("Upload failed:", error);
        res.status(500).json({ 
          success: false, 
          error: "Upload failed", 
          message: error.message 
        });
      }
    });
  }
);

/**
 * Delete file from Firebase Storage and Firebase Database
 */
const deleteFromGallery = onRequest(
  { 
    region: "europe-west1"
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }

      try {
        logger.info('Delete request received:', req.body);
        
        const { filename, firebaseKey } = req.body || {};

        if (!filename || !firebaseKey) {
          return res.status(400).json({ 
            success: false, 
            error: "filename and firebaseKey are required" 
          });
        }

        // Delete from Firebase Storage
        try {
          const file = bucket.file(filename);
          await file.delete();
          logger.info(`File deleted from Firebase Storage: ${filename}`);
        } catch (storageError) {
          if (storageError.code === 404) {
            logger.warn(`File not found in Storage: ${filename} - continuing with database deletion`);
          } else {
            throw storageError;
          }
        }

        // Delete from Firebase Database
        const db = getDatabase();
        await db.ref(`gallery-images/${firebaseKey}`).remove();
        logger.info(`Metadata deleted from Firebase Database: ${firebaseKey}`);

        res.status(200).json({ 
          success: true, 
          message: "File deleted successfully from Firebase Storage and Database" 
        });

      } catch (error) {
        logger.error("Delete failed:", error);
        res.status(500).json({ 
          success: false, 
          error: "Delete failed", 
          message: error.message 
        });
      }
    });
  }
);

/**
 * List all users (authenticated users get basic info, admins get full details)
 */
const listUsersHttp = onRequest({ region: "europe-west1" }, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      // Verify authentication (all authenticated users can access)
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const token = authorization.split('Bearer ')[1];
      const { getAuth } = require("firebase-admin/auth");
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Check if user is admin for full details
      const isAdmin = !!decodedToken.admin;

      // List users
      const auth = getAuth();
      const listUsersResult = await auth.listUsers(1000);
      
      // Return different data based on user role
      const users = listUsersResult.users.map(user => {
        const basicInfo = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        };

        // Admins get additional details
        if (isAdmin) {
          return {
            ...basicInfo,
            disabled: user.disabled,
            emailVerified: user.emailVerified,
            customClaims: user.customClaims
          };
        }

        // Regular users only get basic info for app functionality
        return basicInfo;
      });

      logger.info(`Listed ${users.length} users for ${isAdmin ? 'admin' : 'user'} ${decodedToken.uid}`);

      res.status(200).json({
        success: true,
        users: users
      });

    } catch (error) {
      logger.error("List users failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list users",
        message: error.message
      });
    }
  });
});

/**
 * Create new user (admin only)
 */
const createUserHttp = onRequest({ region: "europe-west1" }, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      // Verify admin authentication
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const token = authorization.split('Bearer ')[1];
      const { getAuth } = require("firebase-admin/auth");
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Check if user is admin
      if (!decodedToken.admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email, password, displayName, admin, communicationsAdmin } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Create user
      const auth = getAuth();
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName || null
      });

      // Set custom claims if specified
      const customClaims = {};
      if (admin) customClaims.admin = true;
      if (communicationsAdmin) customClaims.communicationsAdmin = true;

      if (Object.keys(customClaims).length > 0) {
        await auth.setCustomUserClaims(userRecord.uid, customClaims);
      }

      // Also save user data to Realtime Database for profile info
      const db = getDatabase();
      await db.ref(`users/${userRecord.uid}`).set({
        email: email,
        name: displayName || email.split('@')[0],
        displayName: displayName || null,
        role: admin ? 'Admin' : 'User',
        createdAt: new Date().toISOString()
      });

      logger.info(`User created successfully: ${userRecord.uid} by admin ${decodedToken.uid}`);

      res.status(200).json({
        success: true,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      });

    } catch (error) {
      logger.error("Create user failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create user",
        message: error.message
      });
    }
  });
});

/**
 * Update user (admin only)
 */
const updateUserHttp = onRequest({ region: "europe-west1" }, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      // Verify admin authentication
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const token = authorization.split('Bearer ')[1];
      const { getAuth } = require("firebase-admin/auth");
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Check if user is admin
      if (!decodedToken.admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { uid, displayName, password, customClaims } = req.body;

      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Update user
      const auth = getAuth();
      const updateData = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (password) updateData.password = password;

      const userRecord = await auth.updateUser(uid, updateData);

      // Update custom claims if provided
      if (customClaims !== undefined) {
        await auth.setCustomUserClaims(uid, customClaims);
        logger.info(`Custom claims updated for ${uid}:`, customClaims);
      }

      // Update Realtime Database if displayName changed
      if (displayName !== undefined) {
        const db = getDatabase();
        await db.ref(`users/${uid}`).update({
          name: displayName,
          displayName: displayName
        });
      }

      logger.info(`User updated successfully: ${uid} by admin ${decodedToken.uid}`);

      res.status(200).json({
        success: true,
        uid: userRecord.uid,
        displayName: userRecord.displayName
      });

    } catch (error) {
      logger.error("Update user failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user",
        message: error.message
      });
    }
  });
});

/**
 * Delete user HTTP endpoint (Admin only)
 */
const deleteUserHttp = onRequest({ region: "europe-west1" }, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
      // Verify admin authentication
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const idToken = authorization.substring(7);
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Check if user has admin privileges
      if (!decodedToken.admin) {
        return res.status(403).json({ 
          error: "Admin privileges required",
          message: "Only users with admin privileges can delete users"
        });
      }

      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ 
          error: "Missing required field: uid" 
        });
      }

      // Don't allow deleting self
      if (uid === decodedToken.uid) {
        return res.status(400).json({
          error: "Cannot delete your own account"
        });
      }

      // Delete the user
      await admin.auth().deleteUser(uid);
      
      logger.info(`User deleted successfully by admin ${decodedToken.email}: ${uid}`);
      
      res.json({
        success: true,
        message: "User deleted successfully",
        deletedUid: uid
      });

    } catch (error) {
      logger.error("Delete user failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
        message: error.message
      });
    }
  });
});

/**
 * Health check endpoint
 */
const healthCheck = onRequest({ region: "europe-west1" }, (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Castle Comms Gallery Functions" 
  });
});

/**
 * Automatic push notification sender for new chat messages
 * Triggers when a new document is created in the chat-messages collection
 */
const sendMessageNotification = onDocumentCreated(
  { 
    document: "chat-messages/{messageId}",
    region: "europe-west1" 
  },
  async (event) => {
    try {
      const messageData = event.data.data();
      const messageId = event.params.messageId;
      
      logger.info(`New message detected: ${messageId}`, messageData);

      // Get the chat details to find participants
      const firestore = getFirestore();
      const chatDoc = await firestore.collection('chats').doc(messageData.chatId).get();
      
      if (!chatDoc.exists) {
        logger.error(`Chat not found: ${messageData.chatId}`);
        return;
      }

      const chatData = chatDoc.data();
      const participants = chatData.participants || [];
      
      // Find recipients (all participants except the sender)
      const recipients = participants.filter(email => email !== messageData.senderEmail);
      
      if (recipients.length === 0) {
        logger.info('No recipients to notify');
        return;
      }

      logger.info(`Found ${recipients.length} recipients to notify:`, recipients);

      // Get FCM tokens for all recipients from Realtime Database
      const database = getDatabase();
      const messaging = getMessaging();
      const tokens = [];

      for (const recipientEmail of recipients) {
        try {
          // Clean email if it contains mailto:
          let cleanEmail = recipientEmail;
          if (cleanEmail && cleanEmail.startsWith('mailto:')) {
            cleanEmail = cleanEmail.replace('mailto:', '');
            logger.info(`🧹 Cleaned recipient email from mailto: ${cleanEmail}`);
          }
          
          // Find user by email to get their UID
          const { getAuth } = require("firebase-admin/auth");
          const auth = getAuth();
          const userRecord = await auth.getUserByEmail(cleanEmail);
          
          // Get their FCM tokens from the database
          const tokensSnapshot = await database.ref(`users/${userRecord.uid}/fcmTokens`).once('value');
          const userTokens = tokensSnapshot.val();
          
          if (userTokens) {
            // Add all valid tokens for this user
            Object.keys(userTokens).forEach(tokenKey => {
              if (userTokens[tokenKey].token) {
                tokens.push({
                  token: userTokens[tokenKey].token,
                  recipientEmail: recipientEmail,
                  recipientUid: userRecord.uid
                });
              }
            });
          }
        } catch (error) {
          logger.warn(`Could not get tokens for ${recipientEmail}:`, error.message);
        }
      }

      if (tokens.length === 0) {
        logger.info('No FCM tokens found for recipients');
        return;
      }

      logger.info(`Found ${tokens.length} FCM tokens to send notifications to`);

      // Prepare notification payload
      const notificationTitle = `New message from ${messageData.senderName}`;
      const notificationBody = messageData.message.length > 100 
        ? messageData.message.substring(0, 97) + '...'
        : messageData.message;

      const payload = {
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          chatId: messageData.chatId,
          chatName: chatData.name || 'Chat',
          messageId: messageId,
          senderEmail: messageData.senderEmail,
          senderName: messageData.senderName,
          timestamp: messageData.timestamp ? messageData.timestamp.toDate().toISOString() : new Date().toISOString(),
          url: '/messages.html'
        },
        android: {
          notification: {
            color: '#6264a7',
            sound: 'default'
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          },
          headers: {
            'apns-priority': '10'
          }
        },
        webpush: {
          headers: {
            'Urgency': 'high'
          },
          notification: {
            icon: '/icon.png',
            badge: '/icon.png',
            requireInteraction: true,
            tag: `chat-${messageData.chatId}`,
            actions: [
              {
                action: 'open',
                title: 'Open Chat',
                icon: '/icon.png'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          },
          fcmOptions: {
            link: '/messages.html'
          }
        }
      };

      // Send notifications to all tokens
      const messages = tokens.map(tokenData => ({
        ...payload,
        token: tokenData.token
      }));

      const response = await messaging.sendEach(messages);
      
      logger.info(`Notification batch sent. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);

      // Log any failed tokens (they might be invalid/expired)
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            logger.warn(`Failed to send to token ${tokens[idx].recipientEmail}: ${resp.error?.message}`);
            
            // Remove invalid tokens from database
            if (resp.error?.code === 'messaging/registration-token-not-registered' || 
                resp.error?.code === 'messaging/invalid-registration-token') {
              
              database.ref(`users/${tokens[idx].recipientUid}/fcmTokens/${tokens[idx].token}`)
                .remove()
                .then(() => logger.info(`Removed invalid token for ${tokens[idx].recipientEmail}`))
                .catch(err => logger.warn(`Failed to remove invalid token: ${err.message}`));
            }
          }
        });
      }

      logger.info(`Notification processing completed for message ${messageId}`);

    } catch (error) {
      logger.error('Error sending message notification:', error);
    }
  }
);

/**
 * Cloud Function to create a new client user
 * Only admins can call this function
 */
const createClient = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        // Check authentication
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split('Bearer ')[1];
        const { getAuth } = require("firebase-admin/auth");
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(token);

        // Check if user is admin
        if (!decodedToken.admin) {
          return res.status(403).json({ error: 'Admin privileges required to create clients' });
        }

        const { clientId, clientName, clientEmail, password } = req.body;

        // Validate input
        if (!clientId || !clientName || !clientEmail || !password) {
          return res.status(400).json({ error: 'Missing required fields: clientId, clientName, clientEmail, password' });
        }

        // Validate client ID format (6 digits)
        if (!/^\d{6}$/.test(clientId)) {
          return res.status(400).json({ error: 'Client ID must be exactly 6 digits' });
        }

        // Validate email format
        if (!clientEmail.includes('@')) {
          return res.status(400).json({ error: 'Invalid email address' });
        }

        const database = getDatabase();

        // Check if client ID already exists in the mapping
        const existingClientSnapshot = await database.ref(`clientIdMapping/${clientId}`).once('value');
        if (existingClientSnapshot.exists()) {
          return res.status(409).json({ error: `Client ID ${clientId} already exists` });
        }

        // DO NOT create Firebase Auth user - clients should not have main site access
        // Instead, create a client-only record with hashed password for client portal
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        // Generate a unique client UID (not Firebase Auth UID)
        const clientUid = `client_${clientId}_${Date.now()}`;

        // Create client data for client portal only
        const clientData = {
          clientId: clientId,
          name: clientName,
          email: clientEmail,
          hashedPassword: hashedPassword,
          role: 'client_portal_only',
          createdDate: new Date().toISOString(),
          createdBy: decodedToken.uid,
          canAccessMainSite: false
        };

        // Store client data using client UID (not Firebase Auth UID)
        await database.ref(`clientPortalUsers/${clientUid}`).set(clientData);

        // Create mapping from clientId to client UID
        await database.ref(`clientIdMapping/${clientId}`).set({
          clientUid: clientUid,
          email: clientEmail,
          name: clientName,
          createdDate: new Date().toISOString(),
          isClientPortalOnly: true
        });

        logger.info(`Client portal user created: ${clientName} (${clientEmail}) with Client UID: ${clientUid}`);

        res.json({
          success: true,
          clientUid: clientUid,
          clientId: clientId,
          message: `Client portal access created for ${clientName} - NO main site access`
        });

      } catch (error) {
        logger.error('Error creating client:', error);

        // Generic error for client portal creation
        res.status(500).json({ error: 'Failed to create client portal access: ' + error.message });
      }
    });
  }
);

/**
 * EMERGENCY: Delete Firebase Auth user (for clients who shouldn't have main site access)
 */
const deleteFirebaseAuthUser = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        // Check authentication
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split('Bearer ')[1];
        const { getAuth } = require("firebase-admin/auth");
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(token);

        // Check if user is admin
        if (!decodedToken.admin) {
          return res.status(403).json({ error: 'Admin privileges required' });
        }

        const { uid } = req.body;

        if (!uid) {
          return res.status(400).json({ error: 'Missing UID' });
        }

        // Delete the Firebase Auth user
        await auth.deleteUser(uid);

        logger.info(`EMERGENCY: Deleted Firebase Auth user with UID: ${uid}`);

        res.json({
          success: true,
          message: `Deleted Firebase Auth user ${uid}`
        });

      } catch (error) {
        logger.error('Error deleting Firebase Auth user:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
      }
    });
  }
);

// Fetch Shopify Sitemap Data
exports.fetchSitemapData = onRequest(
  { cors: corsOptions },
  async (req, res) => {
    try {
      // Verify admin authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.split('Bearer ')[1];
      const { getAuth } = require("firebase-admin/auth");
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      if (!decodedToken.admin) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'Sitemap URL required' });
      }

      // Fetch the sitemap XML using axios
      const axios = require('axios');
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Castle-Comms-Bot/1.0'
        }
      });

      const xmlText = response.data;

      // Parse XML using cheerio
      const cheerio = require('cheerio');
      const $ = cheerio.load(xmlText, {
        xmlMode: true,
        decodeEntities: false
      });

      const products = [];

      // Process each URL element
      $('url').each((index, element) => {
        try {
          const $url = $(element);
          const loc = $url.find('loc').text();

          if (!loc || !loc.includes('/products/')) {
            return; // continue
          }

          const $imageElement = $url.find('image\\:image').first();
          if ($imageElement.length === 0) {
            return; // continue
          }

          const imageUrl = $imageElement.find('image\\:loc').text();
          const imageTitle = $imageElement.find('image\\:title').text();
          const imageCaption = $imageElement.find('image\\:caption').text();

          if (!imageUrl || !imageTitle) {
            return; // continue
          }

          const productSlug = loc.split('/products/')[1];
          const artistName = extractArtistName(imageTitle, imageCaption, productSlug);

          products.push({
            url: loc,
            imageUrl: imageUrl,
            title: imageTitle,
            caption: imageCaption || '',
            productSlug: productSlug,
            artistName: artistName,
            searchText: `${imageTitle} ${imageCaption} ${productSlug} ${artistName}`.toLowerCase()
          });
        } catch (parseError) {
          logger.warn('Error parsing product:', parseError);
        }
      });

      logger.info(`Parsed ${products.length} products from sitemap: ${url}`);

      res.json({
        success: true,
        products: products,
        count: products.length
      });

    } catch (error) {
      logger.error('Error fetching sitemap:', error);
      res.status(500).json({ error: 'Failed to fetch sitemap: ' + error.message });
    }
  }
);

function extractArtistName(title, caption, slug) {
  const sources = [title, caption, slug].filter(Boolean);

  for (const source of sources) {
    const patterns = [
      /^([A-Za-z\s]+?)(?:\s-\s|$)/,
      /^by\s+([A-Za-z\s]+)/i,
      /([A-Za-z]+\s[A-Za-z]+)/
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  const slugParts = slug.split('-');
  if (slugParts.length >= 2) {
    return slugParts.slice(0, 2).join(' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return 'Unknown Artist';
}

// Import scraping functions
const { scrapeArtworkData, scrapeArtworkHttp } = require('./scrapeArtwork');

module.exports = {
  uploadToGallery,
  deleteFromGallery,
  listUsersHttp,
  createUserHttp,
  updateUserHttp,
  deleteUserHttp,
  healthCheck,
  sendMessageNotification,
  scrapeArtworkData,
  scrapeArtworkHttp,
  createClient,
  deleteFirebaseAuthUser
};