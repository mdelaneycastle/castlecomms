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
  healthCheck
};