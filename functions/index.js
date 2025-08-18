const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const cors = require("cors");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getStorage } = require("firebase-admin/storage");

// Initialize Firebase Admin
initializeApp();

// Firebase Storage bucket
const bucket = getStorage().bucket();

const corsOptions = {
  origin: [
    "https://mdelaneycastle.github.io",
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

      const { uid, displayName, password } = req.body;

      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Update user
      const auth = getAuth();
      const updateData = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (password) updateData.password = password;

      const userRecord = await auth.updateUser(uid, updateData);

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

module.exports = {
  uploadToGallery,
  deleteFromGallery,
  listUsersHttp,
  createUserHttp,
  updateUserHttp,
  deleteUserHttp,
  healthCheck
};