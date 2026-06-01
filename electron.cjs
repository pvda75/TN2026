const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow = null;
let serverProcess = null;

// Start the Express compiled backend server
function startLocalServer() {
  const serverPath = path.join(__dirname, "dist", "server.cjs");
  console.log("Starting backend server from:", serverPath);
  
  // Execute standard Node process in the background
  serverProcess = spawn("node", [serverPath], {
    env: { ...process.env, NODE_ENV: "production" },
    shell: true
  });

  serverProcess.stdout.on("data", (data) => {
    console.log(`[Server]: ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server Error]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Chấm Thi Trắc Nghiệm - Local Storage Server",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "public", "favicon.ico")
  });

  // Load the local port served by our Express server
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Kick off local server
  startLocalServer();
  
  // 2. Give the server a tiny bit to bind to 3000, then open window
  setTimeout(createWindow, 1500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Clean up background server on exit
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
