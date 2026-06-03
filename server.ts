import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
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

  const dbPath = path.join(localStorageDir, "db.json");

  // Helper to read database
  const readLocalDB = () => {
    if (!fs.existsSync(dbPath)) {
      const initial = {
        users: [
          { id: "1", username: "admin", passwordHash: "admin", role: "ADMIN" },
          { id: "2", username: "user", passwordHash: "user", role: "USER" }
        ],
        structures: [],
        history: [],
        images: [],
        omrConfig: null
      };
      try {
        fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), "utf8");
      } catch (err) {
        console.error("Failed to create initial db.json:", err);
      }
      return initial;
    }
    try {
      const data = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Failed to read/parse db.json, returning empty structure:", err);
      return { users: [], structures: [], history: [], images: [], omrConfig: null };
    }
  };

  // Helper to write database
  const writeLocalDB = (dbData: any) => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");
      return true;
    } catch (err) {
      console.error("Failed to write to db.json:", err);
      return false;
    }
  };

  // GET complete local DB
  app.get("/api/local-db", (req, res) => {
    const dbData = readLocalDB();
    res.json(dbData);
  });

  // POST or merge data into local DB
  app.post("/api/local-db", (req, res) => {
    try {
      const dbData = readLocalDB();
      const { users, structures, history, images, omrConfig, userId } = req.body;

      if (users !== undefined) dbData.users = users;
      if (structures !== undefined) dbData.structures = structures;
      if (omrConfig !== undefined) dbData.omrConfig = omrConfig;

      // Ensure arrays are initialized
      if (!Array.isArray(dbData.images)) dbData.images = [];
      if (!Array.isArray(dbData.history)) dbData.history = [];

      // Merge images safely if userId is provided
      if (images !== undefined) {
        if (userId) {
          const cleanImages = images.map((img: any) => ({ ...img, userId }));
          dbData.images = [
            ...dbData.images.filter((img: any) => !img.userId || img.userId !== userId),
            ...cleanImages
          ];
        } else {
          dbData.images = images;
        }
      }

      // Merge history safely if userId is provided
      if (history !== undefined) {
        if (userId) {
          const cleanHistory = history.map((item: any) => ({ ...item, userId }));
          dbData.history = [
            ...dbData.history.filter((item: any) => !item.userId || item.userId !== userId),
            ...cleanHistory
          ];
        } else {
          dbData.history = history;
        }
      }

      writeLocalDB(dbData);
      res.json({ success: true, db: dbData });
    } catch (err: any) {
      console.error("Error updating local-db:", err);
      res.status(500).json({ error: err.message });
    }
  });

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

  // Helper to recursively search a directory for a file matching a condition
  const findFileRecursively = (dir: string, matcher: (filename: string) => boolean): string | null => {
    if (!fs.existsSync(dir)) return null;
    try {
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findFileRecursively(fullPath, matcher);
          if (found) return found;
        } else if (matcher(file)) {
          return fullPath;
        }
      }
    } catch (e) {
      console.error("Recursive search error:", e);
    }
    return null;
  };

  // Serve local storage manually with robust decoding and automatic queue/history suffix matching fallback
  app.get("/local_storage/*", (req, res, next) => {
    try {
      // Decode the path to translate %20, %2B etc to raw folder name characters
      const relativePath = decodeURIComponent(req.path.replace(/^\/local_storage\//, ""));
      const directPath = path.join(localStorageDir, relativePath);

      if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
        return res.sendFile(directPath);
      }

      // Fallback: If requested file does not exist directly, try to locate it by suffix matching (itemId candidate)
      const filename = path.basename(relativePath);
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      const parts = basename.split("_");
      const itemIdCandidate = parts[parts.length - 1];

      if (itemIdCandidate && itemIdCandidate.length >= 5) {
        const foundPath = findFileRecursively(localStorageDir, (fname) => fname.includes(itemIdCandidate));
        if (foundPath) {
          console.log(`[Local Server] Found fallback path on local server for item ID "${itemIdCandidate}": ${foundPath}`);
          return res.sendFile(foundPath);
        }
      }
      
      // If still not found, let it fall through
      next();
    } catch (e) {
      console.error("Custom local storage serve error:", e);
      next();
    }
  });

  // Serve the local storage folder statically (as backup/fallback)
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
      if (req.path.startsWith("/local_storage/") || req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Tu dong kich hoat trinh duyet khi chay cuc bo tren Windows
    if (process.platform === "win32") {
      try {
        const targetUrl = `http://localhost:${PORT}`;
        console.log(`[Trinh duyet] Dang tu dong mo trinh duyet cho: ${targetUrl}`);

        // Buoc 1: Thu khoi chay dung lenh 'start' dang ky cua Windows cho Chrome hoac Edge (hoat dong tuyet voi tu Registry)
        exec(`start chrome "${targetUrl}"`, (errChrome) => {
          if (!errChrome) {
            console.log(`[Trinh duyet] Da mo thanh cong bang Google Chrome (App Path).`);
            return;
          }

          // Neu mo bang Chrome linh hoat gap loi thi thu Edge linh hoat
          exec(`start msedge "${targetUrl}"`, (errEdge) => {
            if (!errEdge) {
              console.log(`[Trinh duyet] Da mo thanh cong bang Microsoft Edge (App Path).`);
              return;
            }

            // Buoc 2: Neu 'start' truc tiep khong duoc (goi do moi truong), tiep tuc kiem tra bang duong dan cung
            const chromePaths = [
              path.join(process.env.ProgramFiles || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
              path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
              path.join(process.env.LocalAppData || "", "Google\\Chrome\\Application\\chrome.exe")
            ];

            const edgePaths = [
              path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
              path.join(process.env.ProgramFiles || "C:\\Program Files", "Microsoft\\Edge\\Application\\msedge.exe"),
              path.join(process.env.LocalAppData || "", "Microsoft\\Edge\\Application\\msedge.exe")
            ];

            let launched = false;

            for (const p of chromePaths) {
              if (fs.existsSync(p)) {
                console.log(`[Trinh duyet] Dang mo Google Chrome qua duong dan: ${p}`);
                exec(`"${p}" "${targetUrl}"`, (e) => {
                  if (e) console.error("Chrome secondary launch error:", e);
                });
                launched = true;
                break;
              }
            }

            if (!launched) {
              for (const p of edgePaths) {
                if (fs.existsSync(p)) {
                  console.log(`[Trinh duyet] Dang mo Microsoft Edge qua duong dan: ${p}`);
                  exec(`"${p}" "${targetUrl}"`, (e) => {
                    if (e) console.error("Edge secondary launch error:", e);
                  });
                  launched = true;
                  break;
                }
              }
            }

            // Buoc 3: Du phong cuoi cung bang cach su dung trinh duyet mac dinh cua he thong Windows
            if (!launched) {
              console.log(`[Trinh duyet] Dang mo bang trinh duyet mac dinh cua he thong...`);
              exec(`start ${targetUrl}`, (e) => {
                if (e) console.error("Default browser final fallback error:", e);
              });
            }
          });
        });
      } catch (browserError) {
        console.error("Tu dong mo trinh duyet that bai:", browserError);
      }
    }
  });
}

startServer();
