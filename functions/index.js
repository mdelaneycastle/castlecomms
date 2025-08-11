// functions/src/index.ts (ESM)

import express from "express";
import multer from "multer";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { google } from "googleapis";
import fs from "fs";
import os from "os";
import path from "path";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// --- Firebase Admin ---
initializeApp();

// --- Secrets & Config ---
const DRIVE_SA_JSON = defineSecret("DRIVE_SA_JSON");
const DRIVE_FOLDER_ID = "1FGhH16oogIvS3hy_sACyyxfKScfq6v_G"; // your Drive folder

// --- Allowed Origins for CORS ---
const ALLOWED_ORIGINS = new Set([
  "https://mdelaneycastle.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

// --- Helpers ---
function getDriveClientFromSecret(jsonString: string) {
  const creds = JSON.parse(jsonString);
  const jwt = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ["https://www.googleapis.com/auth/drive.file"] // manage files the SA creates
  );
  return google.drive({ version: "v3", auth: jwt });
}

function setCors(res: any, reqOrigin?: string) {
  const origin = reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin"); // caching correctness
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "content-type, authorization");
}

// =======================================================================
// UPLOAD: Express + Multer (memory) -> Google Drive -> Realtime DB
// =======================================================================

const uploadApp = express();

// CORS (single layer)
uploadApp.use((req, res, next) => {
  setCors(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Multer memory storage, 10MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

uploadApp.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file provided" });
    }

    const { buffer, mimetype, originalname } = req.file;
    const { uploadedBy = "unknown", uploaderName = "Unknown User" } =
      (req.body as any) || {};

    // Filename like your convention
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "");
    const ext = (originalname.split(".").pop() || "bin").toLowerCase();
    const filename = `upload${timestamp}.${ext}`;

    logger.info(
      `Uploading: ${filename} (orig: ${originalname}) size=${buffer.length} mime=${mimetype}`
    );

    // Drive client from secret
    const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());

    // Use a temp file to stream to Drive
    const tmpPath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tmpPath, buffer);

    const createResp = await drive.files.create({
      requestBody: { name: filename, parents: [DRIVE_FOLDER_ID] },
      media: { mimeType: mimetype || "application/octet-stream", body: fs.createReadStream(tmpPath) },
      fields: "id,name,size,mimeType,webViewLink,webContentLink",
      supportsAllDrives: true,
    });

    // Clean up temp file early
    try { fs.unlinkSync(tmpPath); } catch {}

    const fileId = createResp.data.id!;
    logger.info(`Drive upload OK id=${fileId}`);

    // Public permission
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    // Save metadata to Realtime DB
    const db = getDatabase();
    const imageData = {
      filename,
      originalName: originalname,
      uploadDate: new Date().toISOString(),
      uploadedBy,
      uploaderName,
      bestPractice: false,
      fileSize: parseInt(createResp.data.size || "0", 10),
      mimeType: mimetype,
      driveFileId: fileId,
      webViewLink: createResp.data.webViewLink,
      webContentLink: createResp.data.webContentLink,
    };

    const firebaseKey = filename
      .replace(/\./g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "_");

    await db.ref(`gallery-images/${firebaseKey}`).set(imageData);

    return res.json({
      success: true,
      id: fileId,
      filename,
      originalName: originalname,
      size: createResp.data.size,
      mimeType: mimetype,
      webViewLink: createResp.data.webViewLink,
      webContentLink: createResp.data.webContentLink,
      firebaseKey,
    });
  } catch (err: any) {
    logger.error("Upload failed:", err);
    return res
      .status(500)
      .json({ success: false, error: "Upload failed", message: err.message });
  }
});

uploadApp.all("*", (req, res) => {
  setCors(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return res.status(405).json({ error: "Method not allowed. Use POST." });
});

export const uploadToGallery = onRequest(
  {
    region: "europe-west1",
    memory: "1GiB",
    timeoutSeconds: 300,
    cors: false, // we handle CORS in express above
    secrets: [DRIVE_SA_JSON],
  },
  uploadApp
);

// =======================================================================
// DELETE: Express (JSON body) -> delete from Drive + Realtime DB
// =======================================================================

const deleteApp = express();

// CORS
deleteApp.use((req, res, next) => {
  setCors(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// JSON body
deleteApp.use(express.json());

deleteApp.post("/", async (req, res) => {
  try {
    const { data } = req.body || {};
    const fileId = data?.fileId;
    const firebaseKey = data?.firebaseKey;

    if (!fileId || !firebaseKey) {
      return res
        .status(400)
        .json({ success: false, error: "fileId and firebaseKey are required" });
    }

    const drive = getDriveClientFromSecret(DRIVE_SA_JSON.value());

    // Try to delete in Drive, ignore 404
    try {
      await drive.files.delete({ fileId, supportsAllDrives: true });
      logger.info(`Drive deleted: ${fileId}`);
    } catch (e: any) {
      if (e?.code === 404) {
        logger.warn(`Drive file not found: ${fileId} (continuing)`);
      } else {
        throw e;
      }
    }

    // Delete metadata in DB
    const db = getDatabase();
    await db.ref(`gallery-images/${firebaseKey}`).remove();

    return res.json({
      success: true,
      message: "File deleted successfully from both Google Drive and Firebase",
    });
  } catch (err: any) {
    logger.error("Delete failed:", err);
    return res
      .status(500)
      .json({ success: false, error: "Delete failed", message: err.message });
  }
});

deleteApp.all("*", (req, res) => {
  setCors(res, req.headers.origin as string | undefined);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return res.status(405).json({ error: "Method not allowed. Use POST." });
});

export const deleteFromGallery = onRequest(
  {
    region: "europe-west1",
    cors: false,
    secrets: [DRIVE_SA_JSON],
  },
  deleteApp
);

// =======================================================================
// HEALTH CHECK (simple, no CORS needed)
// =======================================================================
export const healthCheck = onRequest({ region: "europe-west1" }, (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Castle Comms Gallery Functions",
  });
});