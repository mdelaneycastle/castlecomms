import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import cors from "cors";
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
const DRIVE_FOLDER_ID = "1FGhH16oogIvS3hy_sACyyxfKScfq6v_G";

const corsHandler = cors({ 
  origin: [
    "https://mdelaneycastle.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
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

      try {
        logger.info('Upload request received');
        
        // Simple body parsing for test
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          logger.info('Request body received, size:', body.length);
          
          // For now, return a simple response to test the connection
          res.status(200).json({
            success: true,
            message: "Upload endpoint is working, multipart parsing in progress...",
            bodySize: body.length
          });
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
  }
);

/**
 * Delete file from Google Drive and Firebase
 */
export const deleteFromGallery = onRequest(
  { 
    secrets: [DRIVE_SA_JSON], 
    region: "europe-west1",
    cors: true
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
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
export const healthCheck = onRequest({ region: "europe-west1" }, (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Castle Comms Gallery Functions" 
  });
});