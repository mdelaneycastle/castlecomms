import { onRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import cors from "cors";
import multiparty from "multiparty";
import { google } from "googleapis";
import fs from "fs";
import os from "os";
import path from "path";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Initialize Firebase Admin
initializeApp();

const DRIVE_SA_JSON = defineSecret("DRIVE_SA_JSON");
const DRIVE_FOLDER_ID = "1FGhH16oogIvS3hy_sACyyxfKScfq6v_G"; // Your Google Drive folder ID

const corsHandler = cors({ 
  origin: [
    "https://mdelaneycastle.github.io",
    "http://localhost:3000", // for testing
    "http://127.0.0.1:3000"  // for testing
  ]
});

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
export const uploadToGallery = onRequest(
  { 
    secrets: [DRIVE_SA_JSON], 
    region: "europe-west1", 
    memory: "1GiB", 
    timeoutSeconds: 300,
    cors: true
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
      }

      let tmpFilePath, filename, mimetype, originalFilename;
      let uploadedBy, uploaderName;

      try {
        // Parse multipart/form-data with multiparty
        logger.info('Starting multipart form parsing...');
        
        const form = new multiparty.Form({
          maxFilesSize: 10 * 1024 * 1024, // 10MB limit
          uploadDir: os.tmpdir()
        });

        const { fields, files } = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
          });
        });
        
        logger.info('Multipart form parsing completed');
        
        // Get form fields
        uploadedBy = fields.uploadedBy?.[0];
        uploaderName = fields.uploaderName?.[0];
        
        // Get uploaded file
        const fileArray = files.file;
        if (!fileArray || fileArray.length === 0) {
          throw new Error("No file received");
        }
        
        const uploadedFile = fileArray[0];
        originalFilename = uploadedFile.originalFilename;
        mimetype = uploadedFile.headers['content-type'];
        tmpFilePath = uploadedFile.path;
        
        // Generate filename with timestamp (like your current system)
        const now = new Date();
        const timestamp = now.toISOString()
          .replace(/[-:]/g, '')
          .replace(/\..+/, '')
          .replace('T', '');
        
        const extension = originalFilename.split('.').pop();
        filename = `upload${timestamp}.${extension}`;

        logger.info(`Uploading file: ${filename} (original: ${originalFilename})`);
        logger.info(`File details - Size: ${fs.statSync(tmpFilePath).size} bytes, MIME: ${mimetype}`);

        // Initialize Google Drive client
        logger.info('Initializing Google Drive client...');
        const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());
        logger.info('Google Drive client initialized successfully');

        // Upload to Google Drive
        const fileMetadata = {
          name: filename,
          parents: [DRIVE_FOLDER_ID],
        };

        const media = {
          mimeType: mimetype || "application/octet-stream",
          body: fs.createReadStream(tmpFilePath),
        };

        logger.info('Starting Google Drive upload...');
        const createResp = await drive.files.create({
          requestBody: fileMetadata,
          media,
          fields: "id, name, size, mimeType, webViewLink, webContentLink",
          supportsAllDrives: true,
        });
        logger.info('Google Drive upload completed');

        const fileId = createResp.data.id;
        logger.info(`File uploaded to Drive with ID: ${fileId}`);

        // Make the file publicly viewable
        logger.info('Setting file permissions...');
        await drive.permissions.create({
          fileId,
          requestBody: { 
            role: "reader", 
            type: "anyone" 
          },
          supportsAllDrives: true,
        });
        logger.info(`File permissions set to public for: ${fileId}`);

        // Save metadata to Firebase Realtime Database
        logger.info('Saving metadata to Firebase...');
        const db = getDatabase();
        const imageData = {
          filename: filename,
          originalName: originalFilename,
          uploadDate: new Date().toISOString(),
          uploadedBy: uploadedBy || 'unknown',
          uploaderName: uploaderName || 'Unknown User',
          bestPractice: false,
          fileSize: parseInt(createResp.data.size) || 0,
          mimeType: mimetype,
          driveFileId: fileId,
          webViewLink: createResp.data.webViewLink,
          webContentLink: createResp.data.webContentLink
        };

        const firebaseKey = filename.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '_');
        await db.ref(`gallery-images/${firebaseKey}`).set(imageData);

        logger.info(`Metadata saved to Firebase for: ${firebaseKey}`);

        // Return success response
        res.status(200).json({
          success: true,
          id: fileId,
          filename: filename,
          originalName: originalFilename,
          size: createResp.data.size,
          mimeType: mimetype,
          webViewLink: createResp.data.webViewLink,
          webContentLink: createResp.data.webContentLink,
          firebaseKey: firebaseKey
        });

      } catch (error) {
        logger.error("Upload failed:", error);
        res.status(500).json({ 
          success: false, 
          error: "Upload failed", 
          message: error.message 
        });
      } finally {
        // Clean up temporary file
        if (tmpFilePath && fs.existsSync(tmpFilePath)) {
          fs.unlinkSync(tmpFilePath);
        }
      }
    });
  }
);

/**
 * Delete file from Google Drive (callable function with auth)
 */
export const deleteFromGallery = onCall(
  { 
    secrets: [DRIVE_SA_JSON], 
    region: "europe-west1" 
  },
  async (request) => {
    const { fileId, firebaseKey } = request.data;

    if (!fileId || !firebaseKey) {
      throw new Error("fileId and firebaseKey are required");
    }

    try {
      // Initialize Google Drive client
      const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());

      // Try to delete from Google Drive (handle case where file doesn't exist)
      try {
        await drive.files.delete({
          fileId: fileId,
          supportsAllDrives: true
        });
        logger.info(`File deleted from Drive: ${fileId}`);
      } catch (driveError) {
        // If file doesn't exist in Drive, log but continue
        if (driveError.code === 404) {
          logger.warn(`File not found in Drive: ${fileId} - continuing with Firebase deletion`);
        } else {
          throw driveError; // Re-throw other Drive errors
        }
      }

      // Delete from Firebase
      const db = getDatabase();
      await db.ref(`gallery-images/${firebaseKey}`).remove();

      logger.info(`Metadata deleted from Firebase: ${firebaseKey}`);

      return { 
        success: true, 
        message: "File deleted successfully from both Google Drive and Firebase" 
      };

    } catch (error) {
      logger.error("Delete failed:", error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
);

/**
 * Health check endpoint
 */
export const healthCheck = onRequest({ region: "europe-west1" }, (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Castle Comms Gallery Functions" 
  });
});