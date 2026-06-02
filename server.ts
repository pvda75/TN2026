import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Create folder for local images to act as a local storage server
  const localStorageDir = path.join(process.cwd(), "local_storage");
  const imagesDir = path.join(localStorageDir, "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // API endpoint so the client can detect if this server has local storage capabilities
  app.get("/api/check-local", (req, res) => {
    res.json({
      runningLocally: true,
      storagePath: imagesDir,
    });
  });

  // API upload base64 to local disk instead of Firebase Storage
  app.post("/api/upload-local", async (req, res) => {
    try {
      const { filename, base64, examName, className } = req.body;
      if (!filename || !base64) {
        return res.status(400).json({ error: "Missing filename or base64" });
      }

      // Remove base64 data pattern prefix if present (e.g. data:image/jpeg;base64,)
      let base64Data = base64;
      if (base64.indexOf(",") !== -1) {
        base64Data = base64.split(",")[1];
      }

      // Clean up exam name and class name to make safe directory names (Vietnamese accents are fine, but path traversal symbols must be eliminated)
      const sanitizedExamName = examName 
        ? examName.replace(/[\/\?\<\>\:\*\|\"\\]/g, "_").trim() 
        : "";

      const sanitizedClassName = className 
        ? className.replace(/[\/\?\<\>\:\*\|\"\\]/g, "_").trim() 
        : "";

      const safeFilename = path.basename(filename);
      let targetFolder = localStorageDir;
      let relativeUrl = "/local_storage";

      if (sanitizedExamName && sanitizedClassName) {
        targetFolder = path.join(localStorageDir, sanitizedExamName, sanitizedClassName);
        relativeUrl = `/local_storage/${encodeURIComponent(sanitizedExamName)}/${encodeURIComponent(sanitizedClassName)}/${safeFilename}`;
      } else if (sanitizedExamName) {
        targetFolder = path.join(localStorageDir, sanitizedExamName);
        relativeUrl = `/local_storage/${encodeURIComponent(sanitizedExamName)}/${safeFilename}`;
      } else if (sanitizedClassName) {
        targetFolder = path.join(localStorageDir, "unknown_exam", sanitizedClassName);
        relativeUrl = `/local_storage/unknown_exam/${encodeURIComponent(sanitizedClassName)}/${safeFilename}`;
      } else {
        targetFolder = imagesDir;
        relativeUrl = `/local_storage/images/${safeFilename}`;
      }

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const filePath = path.join(targetFolder, safeFilename);
      await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));

      res.json({
        success: true,
        url: relativeUrl,
        filename: safeFilename,
      });
    } catch (error: any) {
      console.error("Local upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve the local storage folder statically
  app.use("/local_storage", express.static(localStorageDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
