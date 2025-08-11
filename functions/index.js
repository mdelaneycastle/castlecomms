const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const multer = require('multer');
const express = require('express');

// Initialize Firebase Admin
initializeApp();

const DRIVE_SA_JSON = defineSecret("DRIVE_SA_JSON");
const DRIVE_FOLDER_ID = "1FGhH16oogIvS3hy_sACyyxfKScfq6v_G";

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

function getDriveClientFromSecret(jsonString) {
  const creds = JSON.parse(jsonString);
  const jwt = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ["https://www.googleapis.com/auth/drive.file"]
  );
  return google.drive({ version: "v3", auth: jwt });
}

/**
 * Upload file to Google Drive and save metadata to Firebase
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const uploadToGallery = onRequest(
  { 
    secrets: [DRIVE_SA_JSON], 
    region: "europe-west1", 
    memory: "1GiB", 
    timeoutSeconds: 300
  },
  (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }

      // Use multer middleware
      upload.single('file')(req, res, async (err) => {
        if (err) {
          logger.error('Multer error:', err);
          return res.status(400).json({ 
            success: false, 
            error: "File upload error", 
            message: err.message 
          });
        }

        try {
          logger.info('Upload request received');
          
          if (!req.file) {
            return res.status(400).json({ 
              success: false, 
              error: "No file uploaded" 
            });
          }

          const { uploadedBy, uploaderName } = req.body;
          if (!uploadedBy || !uploaderName) {
            return res.status(400).json({ 
              success: false, 
              error: "uploadedBy and uploaderName are required" 
            });
          }

          logger.info(`Processing upload: ${req.file.originalname}, size: ${req.file.size}`);

          // Get Google Drive client
          const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());

          // Generate unique filename with timestamp
          const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
          const fileExtension = path.extname(req.file.originalname);
          const uniqueFilename = `${uploaderName}${timestamp}${fileExtension}`;

          // Upload to Google Drive
          const driveResponse = await drive.files.create({
            requestBody: {
              name: uniqueFilename,
              parents: [DRIVE_FOLDER_ID]
            },
            media: {
              mimeType: req.file.mimetype,
              body: require('stream').Readable.from(req.file.buffer)
            }
          });

          const fileId = driveResponse.data.id;
          logger.info(`File uploaded to Drive with ID: ${fileId}`);

          // Make file publicly viewable
          await drive.permissions.create({
            fileId: fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });

          // Get file metadata for webContentLink
          const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: 'id,name,webContentLink,webViewLink,thumbnailLink'
          });

          // Save metadata to Firebase
          const db = getDatabase();
          const imageRef = db.ref('gallery-images').push();
          const imageData = {
            originalName: req.file.originalname,
            filename: uniqueFilename,
            driveFileId: fileId,
            webContentLink: fileMetadata.data.webContentLink,
            webViewLink: fileMetadata.data.webViewLink,
            thumbnailLink: fileMetadata.data.thumbnailLink,
            uploadDate: new Date().toISOString(),
            uploadedBy: uploadedBy,
            uploaderName: uploaderName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            bestPractice: false
          };

          await imageRef.set(imageData);
          logger.info(`Metadata saved to Firebase with key: ${imageRef.key}`);

          res.status(200).json({
            success: true,
            message: "File uploaded successfully to Google Drive and metadata saved to Firebase",
            fileId: fileId,
            firebaseKey: imageRef.key,
            filename: uniqueFilename,
            webContentLink: fileMetadata.data.webContentLink
          });

        } catch (error) {
          logger.error("Upload failed:", error);
          res.status(500).json({ 
            success: false, 
            error: "Upload failed", 
            message: error.message 
          });
        }
      });
    });
  }
);

/**
 * Delete file from Google Drive and Firebase
 */
const deleteFromGallery = onRequest(
  { 
    secrets: [DRIVE_SA_JSON], 
    region: "europe-west1"
  },
  (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }

      try {
        const { data } = req.body || {};
        const { fileId, firebaseKey } = data || {};

        if (!fileId || !firebaseKey) {
          return res.status(400).json({ 
            success: false, 
            error: "fileId and firebaseKey are required" 
          });
        }

        const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());

        // Try to delete from Google Drive (handle case where file doesn't exist)
        try {
          await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true
          });
          logger.info(`File deleted from Drive: ${fileId}`);
        } catch (driveError) {
          if (driveError.code === 404) {
            logger.warn(`File not found in Drive: ${fileId} - continuing with Firebase deletion`);
          } else {
            throw driveError;
          }
        }

        // Delete from Firebase
        const db = getDatabase();
        await db.ref(`gallery-images/${firebaseKey}`).remove();
        logger.info(`Metadata deleted from Firebase: ${firebaseKey}`);

        res.status(200).json({ 
          success: true, 
          message: "File deleted successfully from both Google Drive and Firebase" 
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