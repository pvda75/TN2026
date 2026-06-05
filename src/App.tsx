/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import localforage from "localforage";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  writeBatch,
  terminate,
  setLogLevel,
  disableNetwork,
  query,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db, uploadBase64ToStorage, deleteImageFromStorage } from "./firebase";
import * as XLSX from "xlsx";
import {
  Camera,
  FileImage,
  Settings,
  CheckCircle,
  Upload,
  Menu,
  Users,
  Plus,
  Save,
  BookOpen,
  Key,
  ListChecks,
  Target,
  History,
  Edit3,
  LogOut,
  BarChart3,
  Folder,
  AlertTriangle,
  CloudUpload,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { processOMR, OMRConfig } from "./services/omrService";
import {
  calculateScore,
  ExamAnswers,
  ExamStructure,
  ExamSession,
  DEFAULT_STRUCTURES,
  createEmptyAnswers,
} from "./lib/grading";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import Calibration from "./components/Calibration";

const DEFAULT_MATH_KEY: ExamAnswers = {
  part1: ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D"],
  part2: [
    { questionNumber: 1, answers: ["Đ", "S", "Đ", "S"] },
    { questionNumber: 2, answers: ["S", "Đ", "S", "Đ"] },
    { questionNumber: 3, answers: ["Đ", "Đ", "S", "S"] },
    { questionNumber: 4, answers: ["S", "S", "Đ", "Đ"] },
  ],
  part3: [
    { questionNumber: 1, answer: "1.2" },
    { questionNumber: 2, answer: "-3" },
    { questionNumber: 3, answer: "15" },
    { questionNumber: 4, answer: "0" },
    { questionNumber: 5, answer: "4" },
    { questionNumber: 6, answer: "10" },
  ],
};

const DEFAULT_SCIENCE_KEY: ExamAnswers = {
  part1: [
    "A",
    "B",
    "C",
    "D",
    "A",
    "B",
    "C",
    "D",
    "A",
    "B",
    "C",
    "D",
    "A",
    "B",
    "C",
    "D",
    "A",
    "B",
  ],
  part2: [
    { questionNumber: 1, answers: ["Đ", "S", "Đ", "S"] },
    { questionNumber: 2, answers: ["S", "Đ", "S", "Đ"] },
    { questionNumber: 3, answers: ["Đ", "Đ", "S", "S"] },
    { questionNumber: 4, answers: ["S", "S", "Đ", "Đ"] },
  ],
  part3: [
    { questionNumber: 1, answer: "12" },
    { questionNumber: 2, answer: "34" },
    { questionNumber: 3, answer: "56" },
    { questionNumber: 4, answer: "78" },
    { questionNumber: 5, answer: "90" },
    { questionNumber: 6, answer: "100" },
  ],
};

const DEFAULT_SOCIAL_KEY: ExamAnswers = {
  part1: Array(24).fill("A"),
  part2: [
    { questionNumber: 1, answers: ["Đ", "S", "Đ", "S"] },
    { questionNumber: 2, answers: ["S", "Đ", "S", "Đ"] },
    { questionNumber: 3, answers: ["Đ", "Đ", "S", "S"] },
    { questionNumber: 4, answers: ["S", "S", "Đ", "Đ"] },
  ],
  part3: [],
};

const DEFAULT_LANG_KEY: ExamAnswers = {
  part1: Array(40).fill("A"),
  part2: [],
  part3: [],
};

const DEFAULT_OMR_CONFIG: OMRConfig = {
  paperWidth: 800,
  paperHeight: 1131, // A4 ratio
  regions: {
    studentId: {
      x: 456,
      y: 220,
      w: 220,
      h: 150,
      cols: 8,
      rows: 10,
      type: "single",
    },
    examCode: {
      x: 670,
      y: 220,
      w: 96,
      h: 150,
      cols: 4,
      rows: 10,
      type: "single",
    },
    studentName: {
      x: 110,
      y: 285,
      w: 310,
      h: 45,
      cols: 25,
      rows: 1,
      type: "text",
    },
    part1: [
      { x: 110, y: 400, w: 130, h: 150, cols: 4, rows: 10, type: "single" },
      { x: 300, y: 400, w: 130, h: 150, cols: 4, rows: 10, type: "single" },
      { x: 490, y: 400, w: 130, h: 150, cols: 4, rows: 10, type: "single" },
      { x: 680, y: 400, w: 130, h: 150, cols: 4, rows: 10, type: "single" },
    ],
    part2: [
      { x: 110, y: 560, w: 130, h: 80, cols: 4, rows: 4, type: "truefalse" },
      { x: 300, y: 560, w: 130, h: 80, cols: 4, rows: 4, type: "truefalse" },
      { x: 490, y: 560, w: 130, h: 80, cols: 4, rows: 4, type: "truefalse" },
      { x: 680, y: 560, w: 130, h: 80, cols: 4, rows: 4, type: "truefalse" },
    ],
    part3: [
      { x: 110, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
      { x: 200, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
      { x: 290, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
      { x: 380, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
      { x: 470, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
      { x: 560, y: 760, w: 60, h: 160, cols: 5, rows: 11, type: "text" },
    ],
  },
};

const getDefaultKey = (structureId: string, structures: ExamStructure[]) => {
  const structure = structures.find((s) => s.id === structureId);
  if (structure) {
    return createEmptyAnswers(structure);
  }
  return createEmptyAnswers(DEFAULT_STRUCTURES[0]);
};

const stripDataUrls = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    if (val.startsWith("data:") && val.length > 100000) {
      return "";
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(stripDataUrls);
  }
  if (typeof val === "object") {
    const res: any = {};
    for (const k of Object.keys(val)) {
      res[k] = stripDataUrls(val[k]);
    }
    return res;
  }
  return val;
};

const compressImage = (input: string | File | Blob, maxWidth = 720, maxHeight = 960): Promise<string> => {
  return new Promise((resolve) => {
    if (!input) {
      resolve("");
      return;
    }

    // Fast path: if the input is already a string and is a compressed data url, resolve instantly to prevent redundant work
    if (typeof input === "string") {
      if (!input.startsWith("data:") && !input.startsWith("http") && !input.startsWith("blob:")) {
        resolve(input);
        return;
      }
      if (input.startsWith("data:image/jpeg;base64,") && maxWidth === 720 && maxHeight === 960) {
        resolve(input);
        return;
      }
    }

    const compressWithCanvas = (source: HTMLImageElement | ImageBitmap, originalWidth: number, originalHeight: number, revokeUrl?: string) => {
      try {
        let width = originalWidth;
        let height = originalHeight;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        // 1. OffscreenCanvas (extremely fast async processing on modern Chromium browsers)
        if (typeof OffscreenCanvas !== "undefined") {
          const offscreen = new OffscreenCanvas(width, height);
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(source, 0, 0, width, height);
            offscreen.convertToBlob({ type: "image/jpeg", quality: 0.42 }).then((blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (revokeUrl) URL.revokeObjectURL(revokeUrl);
                if (source instanceof ImageBitmap) {
                  try {
                    source.close();
                  } catch (e) {}
                }
                resolve(reader.result as string || "");
              };
              reader.readAsDataURL(blob);
            }).catch(() => {
              fallbackCanvas(source, width, height, revokeUrl);
            });
            return;
          }
        }

        fallbackCanvas(source, width, height, revokeUrl);
      } catch (err) {
        console.error("Compression processing error:", err);
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        if (source instanceof ImageBitmap) {
          try { source.close(); } catch (e) {}
        }
        resolve(typeof input === "string" ? input : "");
      }
    };

    const fallbackCanvas = (source: HTMLImageElement | ImageBitmap, width: number, height: number, revokeUrl?: string) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(source, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.42);
          if (revokeUrl) URL.revokeObjectURL(revokeUrl);
          if (source instanceof ImageBitmap) {
            try { source.close(); } catch (e) {}
          }
          resolve(compressedBase64);
        } else {
          if (revokeUrl) URL.revokeObjectURL(revokeUrl);
          if (source instanceof ImageBitmap) {
            try { source.close(); } catch (e) {}
          }
          resolve(typeof input === "string" ? input : "");
        }
      } catch (e) {
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        if (source instanceof ImageBitmap) {
          try { source.close(); } catch (e) {}
        }
        resolve(typeof input === "string" ? input : "");
      }
    };

    // 2. createImageBitmap (Hardware-accelerated non-blocking decoding on Chrome)
    if (typeof window !== "undefined" && typeof window.createImageBitmap === "function" && (input instanceof File || input instanceof Blob)) {
      window.createImageBitmap(input)
        .then((bitmap) => {
          compressWithCanvas(bitmap, bitmap.width, bitmap.height);
        })
        .catch((err) => {
          console.warn("createImageBitmap fallback to standard loader:", err);
          slowPath();
        });
      return;
    }

    const slowPath = () => {
      let srcUrl = "";
      let isBlobUrl = false;

      if (input instanceof File || input instanceof Blob) {
        srcUrl = URL.createObjectURL(input);
        isBlobUrl = true;
      } else if (typeof input === "string") {
        srcUrl = input;
      } else {
        resolve("");
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        compressWithCanvas(img, img.width, img.height, isBlobUrl ? srcUrl : undefined);
      };
      img.onerror = () => {
        if (isBlobUrl) {
          URL.revokeObjectURL(srcUrl);
        }
        resolve(typeof input === "string" ? input : "");
      };
      img.src = srcUrl;
    };

    slowPath();
  });
};

export interface ScannedImage {
  id: string;
  src: string;
  status: "pending" | "processing" | "scanned" | "done" | "error";
  selected: boolean;
  result?: any;
  rawAnswers?: any;
  processedDataUrl?: string;
  warpedDataUrl?: string;
  errorMsg?: string;
  examName?: string;
  classId?: string;
  customConfig?: OMRConfig;
  firebaseImageUrl?: string;
}

let firestoreQuotaExceeded = false;
const quotaExceededListeners = new Set<(val: boolean) => void>();

const isQuotaError = (error: any) => {
  if (!error) return false;
  const code = error.code || "";
  const message = error.message || "";
  return (
    code === "resource-exhausted" ||
    code.includes("quota") ||
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("resource-exhausted") ||
    message.toLowerCase().includes("resource_exhausted") ||
    message.toLowerCase().includes("quota limit exceeded") ||
    message.toLowerCase().includes("exceeded third-party")
  );
};

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
};

try {
  const quotaExceededUntil = localStorage.getItem(
    "firestoreQuotaExceededUntil",
  );
  if (quotaExceededUntil && parseInt(quotaExceededUntil) > Date.now()) {
    firestoreQuotaExceeded = true;
    setLogLevel("silent");
    disableNetwork(db).catch(() => {});
    terminate(db).catch(() => {});
  }
} catch (e) {}

const setQuotaExceeded = () => {
  if (!firestoreQuotaExceeded) {
    firestoreQuotaExceeded = true;
    try {
      setLogLevel("silent");
    } catch {}
    disableNetwork(db).catch(() => {});
    terminate(db).catch(() => {});
    try {
      localStorage.setItem(
        "firestoreQuotaExceededUntil",
        (Date.now() + 24 * 60 * 60 * 1000).toString(),
      );
    } catch (e) {}
    quotaExceededListeners.forEach((listener) => {
      try {
        listener(true);
      } catch (err) {}
    });
  }
};

const sessionCacheMemory: Record<string, string> = {};

interface CachedImageProps {
  src: string;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  onError?: () => void;
  key?: string | number;
  fallbackSrc?: string;
}

const imageMemoryCache: Record<string, string> = {};

const isLocalEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000" ||
    window.location.origin.includes("localhost") ||
    window.location.origin.includes("127.0.0.1")
  );
};

const resolveLocalUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("data:")) return pathOrUrl;
  
  const idx = pathOrUrl.indexOf("/local_storage/");
  if (idx !== -1) {
    const relativePath = pathOrUrl.substring(idx);
    const serverUrl = localStorage.getItem("local_server_url") || (isLocalEnvironment() ? window.location.origin : "http://localhost:3000");
    return `${serverUrl.replace(/\/$/, "")}${relativePath}`;
  }
  return pathOrUrl;
};

const sanitizeFolderName = (name: string): string => {
  if (!name) return "";
  return name.replace(/[\/\?\<\>\:\*\|\"\\]/g, "_").trim();
};

const getLocalServerConstructedUrl = (item: any): string => {
  if (!item || !item.id) return "";
  const originalExam = item.examName || "unknown_exam";
  const originalClass = item.className || item.classId || "unknown_class";
  const sessionFolder = item.sessionId || "unknown_session";
  const rawPath = `scans/${originalExam}/${sessionFolder}/${item.id}.jpg`;
  const sanitizedFilename = rawPath.replace(/[^a-zA-Z0-9_\.]/g, "_");
  
  const examFolder = sanitizeFolderName(originalExam);
  const classFolder = sanitizeFolderName(originalClass);
  const serverUrl = localStorage.getItem("local_server_url") || (isLocalEnvironment() ? window.location.origin : "http://localhost:3000");
  return `${serverUrl.replace(/\/$/, "")}/local_storage/${encodeURIComponent(examFolder)}/${encodeURIComponent(classFolder)}/${encodeURIComponent(sanitizedFilename)}`;
};

const getCachedUrlSync = (src: string): string => {
  if (!src) return "";
  const resolvedSrc = resolveLocalUrl(src);
  if (
    resolvedSrc.startsWith("data:") || 
    resolvedSrc.startsWith("blob:") || 
    resolvedSrc.startsWith("http://") || 
    resolvedSrc.startsWith("https://") || 
    resolvedSrc.indexOf("/local_storage/") !== -1
  ) {
    return resolvedSrc;
  }
  return imageMemoryCache[resolvedSrc] || "";
};

const CachedImage = ({ src, className, alt, onLoad, onError, fallbackSrc }: CachedImageProps) => {
  const initialUrl = getCachedUrlSync(src);
  const [displaySrc, setDisplaySrc] = useState<string>(initialUrl);
  const [loaded, setLoaded] = useState<boolean>(!!initialUrl);
  const [hasError, setHasError] = useState<boolean>(false);
  const [triedFallback, setTriedFallback] = useState<boolean>(false);

  useEffect(() => {
    setTriedFallback(false);
    if (!src) {
      setDisplaySrc("");
      setLoaded(false);
      setHasError(false);
      return;
    }

    const currentCached = getCachedUrlSync(src);
    if (currentCached) {
      setDisplaySrc(currentCached);
      setLoaded(true);
      setHasError(false);
      return;
    }

    // Needs async load
    setDisplaySrc("");
    setLoaded(false);
    setHasError(false);

    let isMounted = true;
    const cacheKey = "img_cache_" + src;

    const loadCachedOrFetch = async () => {
      try {
        // 1. Try localforage
        const cachedBlob = await localforage.getItem<Blob>(cacheKey);
        if (cachedBlob && isMounted) {
          const localUrl = URL.createObjectURL(cachedBlob);
          imageMemoryCache[src] = localUrl;
          if (isMounted) {
            setDisplaySrc(localUrl);
            setLoaded(true);
          }
          onLoad?.();
          return;
        }

        // 2. Fetch remote
        let currentUrlToFetch = src;
        let response;
        try {
          response = await fetch(currentUrlToFetch, { referrerPolicy: "no-referrer" });
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          const contentType = response.headers.get("content-type") || "";
          if (contentType && !contentType.includes("image/")) {
            throw new Error("HTTP response content-type is " + contentType + ", expected image/*");
          }
        } catch (fetchErr) {
          // If primary URL failed and we have a fallback, try to fetch fallback URL
          if (fallbackSrc && fallbackSrc !== src) {
            console.warn("Primary fetch failed, trying fallbackSrc:", fallbackSrc, fetchErr);
            currentUrlToFetch = fallbackSrc;
            response = await fetch(currentUrlToFetch, { referrerPolicy: "no-referrer" });
            if (!response.ok) {
              throw new Error("HTTP error " + response.status + " on fallback");
            }
            const contentType = response.headers.get("content-type") || "";
            if (contentType && !contentType.includes("image/")) {
              throw new Error("HTTP fallback response content-type is " + contentType + ", expected image/*");
            }
          } else {
            throw fetchErr;
          }
        }

        const blob = await response.blob();

        try {
          await localforage.setItem(cacheKey, blob);
        } catch (e) {
          console.warn("Failed to write to localforage cache", e);
        }

        if (isMounted) {
          const localUrl = URL.createObjectURL(blob);
          imageMemoryCache[src] = localUrl;
          setDisplaySrc(localUrl);
          setLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load and cache image:", err);
        if (isMounted) {
          setDisplaySrc(fallbackSrc || src);
          // Set loaded to true as we're passing standard URL fallback to img element
          setLoaded(true);
        }
        onError?.();
      }
    };

    loadCachedOrFetch();

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc]);

  if (!src) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-1 text-center">
        <span className="text-[10px] text-slate-400 font-medium">Không có ảnh</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
      {!loaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-slate-50 z-10">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-1"></div>
          <span className="text-[9px] text-slate-400">Đang tải...</span>
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-red-50 text-red-500 text-[10px] z-10">
          <span>Lỗi tải ảnh</span>
        </div>
      ) : null}
      <img
        src={displaySrc || src}
        referrerPolicy="no-referrer"
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        alt={alt || "Scanned image"}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          if (fallbackSrc && !triedFallback && (displaySrc || src) !== fallbackSrc) {
            setTriedFallback(true);
            setDisplaySrc(fallbackSrc);
            setLoaded(false);
          } else {
            setHasError(true);
            onError?.();
          }
        }}
      />
    </div>
  );
};

interface QueueImageCardProps {
  img: any;
  activeUploadingIds: string[];
  setImages: React.Dispatch<React.SetStateAction<any[]>>;
  setEditingImageConfigId: (id: string | null) => void;
  addDeletedImageId: (id: string) => void;
}

const QueueImageCard = React.memo(({
  img,
  activeUploadingIds,
  setImages,
  setEditingImageConfigId,
  addDeletedImageId,
}: QueueImageCardProps) => {
  const isUploading = activeUploadingIds.includes(img.id);

  return (
    <div
      className={`relative border rounded-lg overflow-hidden flex flex-col bg-white shadow-sm transition-colors ${img.selected ? "border-indigo-500 font-bold bg-slate-50/50" : "border-slate-200"} ${img.status === "error" ? "border-red-300 bg-red-50/10" : ""} ${img.status === "done" ? "border-green-400" : ""}`}
    >
      <div
        className="aspect-[1/1.414] bg-slate-100 relative cursor-pointer group"
        onClick={() => {
          if (img.status === "processing") return;
          setImages((prev) =>
            prev.map((i) =>
              i.id === img.id
                ? { ...i, selected: !i.selected }
                : i,
            ),
          );
        }}
      >
        {img.src || img.firebaseImageUrl ? (
          <>
            <CachedImage
              src={resolveLocalUrl(img.firebaseImageUrl || img.src)}
              fallbackSrc={resolveLocalUrl(img.firebaseImageUrl || img.src)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1 text-center z-10 transition-all duration-200">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                <span className="text-[10px] text-white font-medium bg-indigo-600/95 px-1.5 py-0.5 rounded shadow-sm">
                  Đang gửi lên Cloud...
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-1 text-center">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2 mt-2"></div>
            <span className="text-[9px] text-slate-500 font-medium leading-normal max-w-[90%]">
              Đang đồng bộ ảnh từ máy gốc...
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center ${img.selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white/80 border-slate-300"}`}
          >
            {img.selected && (
              <CheckCircle className="w-3 h-3" />
            )}
          </div>
          {img.status === "done" && (
            <div className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
          {img.status === "scanned" && (
            <div className="w-5 h-5 bg-sky-500 text-white rounded flex items-center justify-center">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
          {img.status === "error" && (
            <div className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center text-[10px] font-bold">
              !
            </div>
          )}
        </div>
        {img.status === "processing" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {(img.errorMsg ||
        img.status === "done" ||
        img.status === "scanned") && (
        <div
          className={`text-[10px] p-2 leading-tight flex-1 flex flex-col justify-between ${img.status === "error" ? "text-red-600 bg-red-50" : img.status === "scanned" ? "text-sky-700 bg-sky-50" : "text-green-700 bg-green-50"}`}
        >
          <div>
            <div className="mb-1 font-medium">{img.errorMsg}</div>
            {img.status === "scanned" && (
              <div className="mb-1">
                Đã phân tích xong.
              </div>
            )}
            {img.status === "done" && (
              <div className="mb-1 font-medium text-slate-800">
                Đ: <span className="text-green-600 font-bold">{(img.result?.score || 0).toFixed(2)}</span> - SBD: <span className="font-bold">{img.result?.studentId}</span> - Đề: <span className="font-bold">{img.result?.examCode || "?"}</span>
              </div>
            )}
          </div>

          {(img.status === "error" ||
            img.status === "scanned") &&
            img.rawAnswers && (
              <div
                className="flex flex-wrap items-center gap-1 mt-1 border-t border-dashed border-slate-200 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold text-slate-700">
                  Mã:
                </span>
                <input
                  type="text"
                  className="border border-slate-300 rounded px-1 w-10 text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  value={img.rawAnswers.examCode || ""}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setImages((prev) =>
                      prev.map((i) =>
                        i.id === img.id
                          ? {
                              ...i,
                              status: "scanned",
                              errorMsg: undefined,
                              rawAnswers: {
                                ...(i.rawAnswers as any),
                                examCode: newCode,
                              },
                            }
                          : i,
                      ),
                    );
                  }}
                  placeholder="?"
                />
                <span className="font-semibold text-slate-700 ml-1">
                  SBD:
                </span>
                <input
                  type="text"
                  className="border border-slate-300 rounded px-1 w-20 text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  value={img.rawAnswers.studentId || ""}
                  onChange={(e) => {
                    const newStudentId = e.target.value;
                    setImages((prev) =>
                      prev.map((i) =>
                        i.id === img.id
                          ? {
                              ...i,
                              status: "scanned",
                              errorMsg: undefined,
                              rawAnswers: {
                                ...(i.rawAnswers as any),
                                studentId: newStudentId,
                              },
                            }
                          : i,
                      ),
                    );
                  }}
                  placeholder="?"
                />
              </div>
            )}
          {(img.status === "error" ||
            img.status === "scanned") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingImageConfigId(img.id);
              }}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-[10px] font-medium flex items-center gap-1 w-full p-1 rounded hover:bg-slate-200/50"
            >
              <Target className="w-3 h-3" /> Căn chỉnh khung ảnh này
            </button>
          )}
        </div>
      )}
      {img.status !== "processing" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setImages((prev) => {
              addDeletedImageId(img.id);
              return prev.filter(
                (i) => i.id !== img.id,
              );
            });
          }}
          className="absolute top-1 right-1 bg-red-400/90 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow transition-colors backdrop-blur-xs"
        >
          <span className="text-xs mb-0.5">&times;</span>
        </button>
      )}
    </div>
  );
});
QueueImageCard.displayName = "QueueImageCard";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | "STEP1_SUBJECT"
    | "STEP2_KEY"
    | "STEP3_SCAN"
    | "STEP4_RESULTS"
    | "STEP5_CALIB"
    | "STEP6_USERS"
    | "STEP7_STATS"
  >("STEP3_SCAN");

  const [quotaExceededState, setQuotaExceededState] = useState(
    firestoreQuotaExceeded,
  );

  useEffect(() => {
    const handleQuotaExceeded = (val: boolean) => {
      setQuotaExceededState(val);
    };
    quotaExceededListeners.add(handleQuotaExceeded);
    return () => {
      quotaExceededListeners.delete(handleQuotaExceeded);
    };
  }, []);

  const setSafeSessionStorage = (key: string, value: string) => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.setItem(key, value);
        delete sessionCacheMemory[key];
      }
    } catch {
      sessionCacheMemory[key] = value;
      try {
        sessionStorage.removeItem(key);
      } catch {}
      console.warn(
        "Failed to save to sessionStorage, falling back to memory",
        key,
      );
    }
  };

  const getSafeSessionStorage = (key: string) => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return sessionCacheMemory[key] || sessionStorage.getItem(key) || null;
      }
      return sessionCacheMemory[key] || null;
    } catch {
      return sessionCacheMemory[key] || null;
    }
  };

  const setSafeStorage = (key: string, value: string) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch {
      console.warn("Failed to save to localStorage", key);
    }
  };

  const getSafeStorage = (key: string, defaultValue: string | null = null) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(key) || defaultValue;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [userRole, setUserRole] = useState<"ADMIN" | "USER" | null>(() => {
    return (getSafeStorage("app_user_role") as "ADMIN" | "USER" | null) || null;
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return getSafeStorage("app_current_user_id");
  });
  const [activeQueueUserId, setActiveQueueUserId] = useState<string>(() => {
    return getSafeStorage("app_current_user_id") || "";
  });

  const [localStorageMode, setLocalStorageMode] = useState<boolean>(() => {
    return localStorage.getItem("local_storage_mode") === "true";
  });
  const [localServerUrl, setLocalServerUrl] = useState<string>(() => {
    return localStorage.getItem("local_server_url") || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  });
  const [localServerAvailable, setLocalServerAvailable] = useState<boolean>(false);

  // Auto detect local storage server capability on mount
  useEffect(() => {
    const detectLocalServer = async () => {
      try {
        const res = await fetch("/api/check-local");
        const data = await res.json();
        if (data.runningLocally) {
          setLocalServerAvailable(true);
          const currentOrigin = window.location.origin;
          setLocalServerUrl(currentOrigin);
          localStorage.setItem("local_server_url", currentOrigin);
          setLocalStorageMode(true);
          localStorage.setItem("local_storage_mode", "true");
          
          try {
            const dbRes = await fetch(`${currentOrigin}/api/local-db`);
            if (dbRes.ok) {
              const dbData = await dbRes.json();
              if (dbData.users && Array.isArray(dbData.users)) {
                setAppUsers(dbData.users);
              }
              if (dbData.structures && Array.isArray(dbData.structures)) {
                setExamStructures(dbData.structures);
              }
            }
          } catch (dbErr) {
            console.error("Failed to preload local-db:", dbErr);
          }
        }
      } catch (err) {
        try {
          const res = await fetch(`${window.location.origin}/api/check-local`);
          const data = await res.json();
          if (data.runningLocally) {
            setLocalServerAvailable(true);
            const currentOrigin = window.location.origin;
            setLocalServerUrl(currentOrigin);
            localStorage.setItem("local_server_url", currentOrigin);
            setLocalStorageMode(true);
            localStorage.setItem("local_storage_mode", "true");
            
            try {
              const dbRes = await fetch(`${currentOrigin}/api/local-db`);
              if (dbRes.ok) {
                const dbData = await dbRes.json();
                if (dbData.users && Array.isArray(dbData.users)) {
                  setAppUsers(dbData.users);
                }
                if (dbData.structures && Array.isArray(dbData.structures)) {
                  setExamStructures(dbData.structures);
                }
              }
            } catch (dbErr) {
              console.error("Failed to preload local-db:", dbErr);
            }
          }
        } catch (e) {
          setLocalServerAvailable(false);
        }
      }
    };
    detectLocalServer();
  }, []);

  const isLocalServerMode = localStorageMode || localServerAvailable || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.port === "3000" || window.location.origin.includes("localhost:3000")));

  // Safe wrapper for uploading images to either local server or firebase storage
  const uploadImageFile = async (pathStr: string, base64: string, examName?: string, className?: string): Promise<string> => {
    const t0 = performance.now();
    let localUrl = "";

    // If running in local storage mode or if local server is available, completely skip cloud upload to Firebase Storage.
    // This dramatically improves performance as requested by the user, avoids uploading huge image files, and saves bandwidth.
    if (isLocalServerMode) {
      try {
        const sanitizedFilename = pathStr.replace(/[^a-zA-Z0-9_\.]/g, "_");
        const targetUrl = `${localServerUrl.replace(/\/$/, "")}/api/upload-local`;
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: sanitizedFilename, base64, examName, className }),
        });
        if (response.ok) {
          const data = await response.json();
          localUrl = `${localServerUrl.replace(/\/$/, "")}${data.url}`;
        } else {
          console.warn(`Local upload failed with status ${response.status}`);
        }
      } catch (e) {
        console.warn("Upload to local storage failed:", e);
      }
      console.log(`Image saved locally to ${localUrl || "fallback"} (Cloud upload bypassed for speed) in ${(performance.now() - t0).toFixed(0)}ms.`);
      return localUrl || "";
    }

    // Otherwise, in standard cloud-only mode, upload directly to Firebase Storage
    let cloudUrl = "";
    try {
      cloudUrl = await uploadBase64ToStorage(pathStr, base64);
    } catch (e) {
      console.warn("Upload to Firebase Storage failed:", e);
    }
    console.log(`Image uploaded to Cloud at ${cloudUrl || "failed"} in ${(performance.now() - t0).toFixed(0)}ms.`);
    return cloudUrl || "";
  };

  useEffect(() => {
    if (currentUserId) {
      setActiveQueueUserId(currentUserId);
    } else {
      setActiveQueueUserId("");
    }
  }, [currentUserId]);

  const [appUsers, setAppUsers] = useState<any[]>(() => {
    try {
      const saved = getSafeStorage("app_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse app_users from localStorage", e);
    }
    return [
      { id: "1", username: "admin", passwordHash: "admin", role: "ADMIN" },
      { id: "2", username: "user", passwordHash: "user", role: "USER" },
    ];
  });

  useEffect(() => {
    setSafeStorage("app_users", JSON.stringify(appUsers));
    if (isLocalServerMode && isLoadedRef.current) {
      fetch(`${localServerUrl}/api/local-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: appUsers })
      }).catch(err => console.warn("Failed to sync users to local server", err));
    }
  }, [appUsers, isLocalServerMode, localServerUrl]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [showPermissionModal, setShowPermissionModal] = useState<string | null>(
    null,
  );
  const [tempAssignedClasses, setTempAssignedClasses] = useState<string[]>([]);
  const [tempAssignedExams, setTempAssignedExams] = useState<string[]>([]);
  const [tempAssignedSessions, setTempAssignedSessions] = useState<string[]>([]);
  const [tempPermissionRecognizeImage, setTempPermissionRecognizeImage] = useState<boolean>(true);
  const [tempPermissionGrade, setTempPermissionGrade] = useState<boolean>(true);
  const [tempPermissionViewResults, setTempPermissionViewResults] = useState<boolean>(true);
  const [tempPermissionEditResults, setTempPermissionEditResults] = useState<boolean>(true);
  const [tempPermissionDeleteResults, setTempPermissionDeleteResults] = useState<boolean>(true);

  useEffect(() => {
    if (showPermissionModal) {
      const user = appUsers.find((u) => u.id === showPermissionModal);
      if (user) {
        setTempAssignedClasses(user.assignedClasses || []);
        setTempAssignedExams(user.assignedExams || []);
        setTempAssignedSessions(user.assignedSessions || []);
        setTempPermissionRecognizeImage(user.permissionRecognizeImage !== false);
        setTempPermissionGrade(user.permissionGrade !== false);
        setTempPermissionViewResults(user.permissionViewResults !== false);
        setTempPermissionEditResults(user.permissionEditResults !== false);
        setTempPermissionDeleteResults(user.permissionDeleteResults !== false);
      }
    } else {
      setTempAssignedClasses([]);
      setTempAssignedExams([]);
      setTempAssignedSessions([]);
      setTempPermissionRecognizeImage(true);
      setTempPermissionGrade(true);
      setTempPermissionViewResults(true);
      setTempPermissionEditResults(true);
      setTempPermissionDeleteResults(true);
    }
  }, [showPermissionModal, appUsers]);
  const [newUserInput, setNewUserInput] = useState({
    username: "",
    password: "",
    role: "USER" as "ADMIN" | "USER",
  });
  const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
  const [resetPwdInput, setResetPwdInput] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = loginUsername.trim();
    const cleanPassword = loginPassword.trim();
    const user = appUsers.find(
      (u) => u.username === cleanUsername && u.passwordHash === cleanPassword,
    );
    if (user) {
      isLoggingOutRef.current = false;
      isLoadedRef.current = false;
      initialFetchDone.current = false;
      initialHistoryFetchDone.current = false;
      initialQueueFetchDone.current = false;
      setUserRole(user.role);
      setCurrentUserId(user.id);
      setSafeStorage("app_user_role", user.role);
      setSafeStorage("app_current_user_id", user.id);
      try {
        localStorage.removeItem("last_local_update_time");
        sessionStorage.removeItem("last_synced_globals");
      } catch (e) {}
      setActiveTab(user.role === "ADMIN" ? "STEP1_SUBJECT" : "STEP3_SCAN");
    } else {
      setLoginError("Tài khoản/Mật khẩu không chính xác.");
    }
  };

  const handleLogout = () => {
    const pendingUploadsCount = images.filter(
      (img) => img.src && img.src.startsWith("data:") && !img.firebaseImageUrl,
    ).length + scanHistory.filter(
      (item) => item.imageSrc && item.imageSrc.startsWith("data:") && !item.firebaseImageUrl
    ).length;

    if (pendingUploadsCount > 0) {
      setDialogState({
        type: "confirm",
        variant: "danger",
        message: `Đang có ${pendingUploadsCount} ảnh quét/chấm bài chưa hoàn thành tải lên Lưu trữ Đám mây (Cloud). Nếu bạn Đăng xuất (Thoát) lúc này, các file ảnh này sẽ bị trống và Tài khoản quản trị (Admin) cũng như bạn khi đăng nhập lại sẽ không thể xem được ảnh chụp bài làm. Bạn có thực sự muốn Đăng xuất ngay bây giờ không?`,
        onConfirm: () => {
          executeLogout();
        }
      });
    } else {
      executeLogout();
    }
  };

  const executeLogout = () => {
    isLoadedRef.current = false;
    isLoggingOutRef.current = true;
    initialFetchDone.current = false;
    initialHistoryFetchDone.current = false;
    initialQueueFetchDone.current = false;
    // 1. Snapshot state for background sync
    const uid = currentUserId;
    const backupUserRole = userRole;
    const backupDeletedImageIds = new Set(deletedImageIds.current);
    const backupImages = [...images].filter((img) => !backupDeletedImageIds.has(img.id));
    const backupDeletedHistoryIds = new Set(deletedHistoryIds.current);
    const backupScanHistory = [...scanHistory].filter(
      (item) => !backupDeletedHistoryIds.has(item.id) && unpushedHistoryIds.current.has(item.id)
    );
    const snapAppUsers = appUsers;
    const snapClasses = classes;
    const snapExamConfigs = examConfigs;
    const snapExamSessions = examSessions;
    const snapExamStructures = examStructures;
    const snapGlobalOMRConfig = globalOMRConfig;
    const snapGlobalOMRTemplateImage = globalOMRTemplateImage;

    const pushData = {
      appUsers: snapAppUsers,
      classes: snapClasses,
      examConfigs: snapExamConfigs,
      examStructures: snapExamStructures,
      examSessions: snapExamSessions,
      globalOMRConfig: snapGlobalOMRConfig,
      ...(snapGlobalOMRTemplateImage && !snapGlobalOMRTemplateImage.startsWith("data:")
        ? { globalOMRTemplateImage: snapGlobalOMRTemplateImage }
        : {}),
    };
    const cleanPushData = stripDataUrls(pushData);
    const currentGlobalStr = JSON.stringify(cleanPushData);
    const lastSyncedGlobal = getSafeSessionStorage("last_synced_globals");

    // 2. Clear state immediately
    setUserRole(null);
    setCurrentUserId(null);
    setSelectedHistoryIds([]);
    setSelectedResult(null);
    try {
      localStorage.removeItem("app_user_role");
      localStorage.removeItem("app_current_user_id");
      sessionStorage.clear();
      clearImageTracking();
    } catch {}
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setImages([]);
    setScanHistory([]);
    setReferenceImages([]);
    setClasses(["12A1", "12A2"]);
    setActiveClass("12A1");
    setExamSessions([{ id: "SESSION_DEFAULT", name: "Kỳ thi chung" }]);
    setActiveSessionId("SESSION_DEFAULT");
    setExamStructures(DEFAULT_STRUCTURES);
    setExamConfigs([
      {
        structureId: "MATH",
        key: DEFAULT_MATH_KEY,
        name: "TOÁN HỌC",
        code: "1001",
      },
      {
        structureId: "SOCIAL",
        key: DEFAULT_SOCIAL_KEY,
        name: "LỊCH SỬ",
        code: "1002",
      },
    ]);

    // 3. Background sync
    if (uid && (backupImages.length > 0 || backupDeletedImageIds.size > 0)) {
      const queueDocId = "scanQueue_" + (activeQueueUserId || uid);
      const safeImages = backupImages.map((img) => {
        let { isUploadingToFirebase, ...safeImg } = img as any;
        if (safeImg.src && safeImg.src.startsWith("data:")) {
          safeImg.src = "";
        }
        if (!safeImg.result) return safeImg;
        const { imageSrc, originalImageSrc, ...safeResult } = safeImg.result;
        return { ...safeImg, result: safeResult };
      });
      const cleanSafeImages = stripDataUrls(JSON.parse(JSON.stringify(safeImages)));
      if (firestoreQuotaExceeded) return;
      setDoc(
        doc(db, "globals", queueDocId),
        { images: cleanSafeImages },
        { merge: true },
      ).catch((e) => {
        console.error("Flush queue on logout error", e);
        if (isQuotaError(e)) {
          setQuotaExceeded();
        }
      });
    }

    if (uid && backupScanHistory.length > 0) {
      const batch = writeBatch(db);
      let actualChanges = 0;
      for (const item of backupScanHistory) {
        const docRef = doc(db, "scanHistory", item.id);
        const { imageSrc, originalImageSrc, isUploading, ...metadataOnly } =
          item as any;
        const metadataStr = JSON.stringify(metadataOnly);

        const cleanMetadata = stripDataUrls(JSON.parse(metadataStr));
        if (metadataOnly.timestamp instanceof Date) {
          cleanMetadata.timestamp = metadataOnly.timestamp;
        }
        batch.set(docRef, cleanMetadata, { merge: true });
        actualChanges++;

        if (actualChanges >= 490) break; // keep under batch limit
      }
      if (actualChanges > 0) {
        if (firestoreQuotaExceeded) return;
        batch.commit().catch((e) => {
          console.error("Flush history on logout error", e);
          if (isQuotaError(e)) {
            setQuotaExceeded();
          }
        });
      }
    }

    if (backupUserRole === "ADMIN" && currentGlobalStr !== lastSyncedGlobal) {
      const now = Date.now();
      try {
        localStorage.setItem("last_local_update_time", now.toString());
      } catch {}

      if (firestoreQuotaExceeded) return;
      const dataToSet = {
        ...JSON.parse(currentGlobalStr),
        updatedAt: now,
      };
      setDoc(doc(db, "globals", "appData"), dataToSet, {
        merge: true,
      }).catch((e) => {
        console.error("Flush globals on logout error", e);
        if (isQuotaError(e)) {
          setQuotaExceeded();
        }
      });
    }
  };

  const [globalOMRConfig, setGlobalOMRConfig] = useState<OMRConfig | null>(
    null,
  );
  const [globalOMRTemplateImage, setGlobalOMRTemplateImage] = useState<
    string | null
  >(() => {
    return getSafeStorage("omr_template_calibration_img") as string || null;
  });

  useEffect(() => {
    const savedConfig = getSafeStorage("omr_calibration_config");
    if (savedConfig) {
      try {
        let parsedConf = JSON.parse(savedConfig);
        // Revert back previously 6/3 fix to 8/4
        let updated = false;
        if (
          parsedConf?.regions?.studentId &&
          parsedConf.regions.studentId.cols === 6
        ) {
          parsedConf.regions.studentId.cols = 8;
          parsedConf.regions.studentId.w = 220;
          updated = true;
        }
        if (
          parsedConf?.regions?.examCode &&
          parsedConf.regions.examCode.cols === 3
        ) {
          parsedConf.regions.examCode.cols = 4;
          parsedConf.regions.examCode.w = 96;
          updated = true;
        }
        if (
          parsedConf?.regions?.part2 &&
          (parsedConf.regions.part2.length === 4 ||
            parsedConf.regions.part2.length === 2)
        ) {
          parsedConf.regions.part2 = [
            {
              x: 130,
              y: 580,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 130,
              y: 650,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 320,
              y: 580,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 320,
              y: 650,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 510,
              y: 580,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 510,
              y: 650,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 700,
              y: 580,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
            {
              x: 700,
              y: 650,
              w: 90,
              h: 60,
              cols: 2,
              rows: 4,
              type: "multiple",
            },
          ];
          updated = true;
        }
        if (updated) {
          setSafeStorage("omr_calibration_config", JSON.stringify(parsedConf));
        }
        setGlobalOMRConfig(parsedConf);
      } catch (e) {}
    }
  }, []);

  // Step 0: Exam Sessions
  const [examSessions, setExamSessions] = useState<ExamSession[]>(() => {
    const saved = getSafeStorage("autograde_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [{ id: "SESSION_DEFAULT", name: "Kỳ thi chung" }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return getSafeStorage(
      "autograde_active_session",
      "SESSION_DEFAULT",
    ) as string;
  });
  const [isEditingSessions, setIsEditingSessions] = useState(false);

  useEffect(() => {
    setSafeStorage("autograde_active_session", activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (examSessions && examSessions.length > 0) {
      const savedActive = localStorage.getItem("autograde_active_session");
      if (!savedActive || savedActive === "SESSION_DEFAULT") {
        const customSessions = examSessions.filter(
          (s) => s.id !== "SESSION_DEFAULT",
        );
        if (customSessions.length > 0) {
          setActiveSessionId(customSessions[customSessions.length - 1].id);
        }
      }
    }
  }, [examSessions]);

  // Step 1: Subjects/Structures
  const [examStructures, setExamStructures] = useState<ExamStructure[]>(() => {
    const saved = getSafeStorage("autograde_structures");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            ...s,
            part1: {
              ...s.part1,
              pointsPerQuestion:
                s.part1?.pointsPerQuestion ?? s.part1?.points ?? 0.25,
            },
            part2: {
              ...s.part2,
              points: Array.isArray(s.part2?.points)
                ? s.part2.points
                : [0.1, 0.25, 0.5, s.part2?.points ?? 1.0],
            },
            part3: {
              ...s.part3,
              pointsPerQuestion:
                s.part3?.pointsPerQuestion ?? s.part3?.points ?? 0.5,
            },
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    return DEFAULT_STRUCTURES;
  });
  const [editingStructureId, setEditingStructureId] = useState<string | null>(
    null,
  );
  const [currentStructure, setCurrentStructure] =
    useState<ExamStructure | null>(null);

  // Step 2: Keys
  const [examConfigs, setExamConfigs] = useState<
    { structureId: string; key: ExamAnswers; name: string; code: string }[]
  >(() => {
    const saved = getSafeStorage("autograde_configs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          return Object.keys(parsed).map((k) => ({ ...parsed[k], code: k }));
        }
      } catch (e) {
        console.warn("Failed to parse autograde_configs", e);
      }
    }
    return [
      {
        structureId: "MATH",
        key: DEFAULT_MATH_KEY,
        name: "TOÁN HỌC",
        code: "1001",
      },
      {
        structureId: "SOCIAL",
        key: DEFAULT_SOCIAL_KEY,
        name: "LỊCH SỬ",
        code: "1002",
      },
    ];
  });

  const [configExamCode, setConfigExamCode] = useState<string>("1003");
  const [configStructureId, setConfigStructureId] = useState<string>("MATH");
  const [configKey, setConfigKey] = useState<ExamAnswers>(DEFAULT_MATH_KEY);
  const [isCreatingNewExamCode, setIsCreatingNewExamCode] =
    useState<boolean>(false);

  // Keep examConfigs names in sync with examStructures names
  useEffect(() => {
    let changed = false;
    const nextConfigs = examConfigs.map((c) => {
      const struct = examStructures.find((s) => s.id === c.structureId);
      if (struct && struct.name !== c.name) {
        changed = true;
        return { ...c, name: struct.name };
      }
      return c;
    });
    if (changed) {
      setExamConfigs(nextConfigs);
    }
  }, [examStructures, examConfigs]);

  useEffect(() => {
    const validStructures = examStructures.filter(
      (s) =>
        s.sessionId === activeSessionId ||
        (!s.sessionId && activeSessionId === "SESSION_DEFAULT"),
    );
    if (validStructures.length > 0) {
      const isValid = validStructures.some((s) => s.id === configStructureId);
      if (!isValid) {
        setConfigStructureId(validStructures[0].id);
      }
    } else {
      if (configStructureId !== "") {
        setConfigStructureId("");
        setConfigExamCode("");
        setIsCreatingNewExamCode(false);
      }
    }
  }, [activeSessionId, examStructures, configStructureId]);

  useEffect(() => {
    if (!configStructureId) {
      setIsCreatingNewExamCode(false);
      setConfigExamCode("");
      return;
    }
    const existingConfigs = examConfigs.filter(
      (c) => c.name === getStructureLabel(configStructureId),
    );
    if (
      existingConfigs.length > 0 &&
      existingConfigs.every((c) => c.code !== configExamCode) &&
      !isCreatingNewExamCode
    ) {
      setConfigExamCode(existingConfigs[0].code);
      setConfigKey(existingConfigs[0].key);
    } else if (existingConfigs.length === 0) {
      setIsCreatingNewExamCode(true);
    }
  }, [examConfigs, configStructureId]);

  // Step 3: Scan
  const [classes, setClasses] = useState<string[]>(() => {
    try {
      const saved = getSafeStorage("autograde_classes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return ["12A1", "12A2"];
    } catch {
      return ["12A1", "12A2"];
    }
  });
  const [activeClass, setActiveClass] = useState<string>(() => {
    try {
      const saved = getSafeStorage("autograde_classes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
      return "12A1";
    } catch {
      return "12A1";
    }
  });
  const [newClassName, setNewClassName] = useState("");
  const [showClassManager, setShowClassManager] = useState(false);
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(
    null,
  );
  const [editClassName, setEditClassName] = useState("");
  const [gradeExamName, setGradeExamName] = useState<string>("TOÁN HỌC");

  const currentUserData = appUsers.find((u) => u.id === currentUserId);
  const isUserConstrained = userRole === "USER";

  const userHasRecognizeImage = !isUserConstrained || (currentUserData?.permissionRecognizeImage !== false);
  const userHasGrade = !isUserConstrained || (currentUserData?.permissionGrade !== false);
  const userHasViewResults = !isUserConstrained || (currentUserData?.permissionViewResults !== false);
  const userHasEditResults = !isUserConstrained || (currentUserData?.permissionEditResults !== false);
  const userHasDeleteResults = !isUserConstrained || (currentUserData?.permissionDeleteResults !== false);

  const allowedClasses =
    isUserConstrained && currentUserData?.assignedClasses?.length > 0
      ? currentUserData.assignedClasses
      : classes;

  const validStructureNames = examStructures
    .filter(
      (s) =>
        s.sessionId === activeSessionId ||
        (!s.sessionId && activeSessionId === "SESSION_DEFAULT"),
    )
    .map((s) => s.name);

  const allExamNamesStr = Array.from(
    new Set(examStructures.map((s) => s.name)),
  ) as string[];
  const validExamNamesStr = validStructureNames;

  const allowedExams =
    isUserConstrained && currentUserData?.assignedExams?.length > 0
      ? currentUserData.assignedExams
      : validExamNamesStr;

  const allowedSessions =
    isUserConstrained && currentUserData?.assignedSessions?.length > 0
      ? currentUserData.assignedSessions
      : examSessions.map((s) => s.id);

  useEffect(() => {
    if (userRole === "ADMIN" && activeClass === "ALL") return;
    if (allowedClasses.length > 0 && !allowedClasses.includes(activeClass)) {
      setActiveClass(allowedClasses[0]);
    }
  }, [allowedClasses.join(","), activeClass, userRole]);

  useEffect(() => {
    if (allowedExams.length > 0 && !allowedExams.includes(gradeExamName)) {
      setGradeExamName(allowedExams[0]);
    } else if (allowedExams.length === 0 && gradeExamName !== "") {
      setGradeExamName("");
    }
  }, [allowedExams.join(","), gradeExamName]);

  useEffect(() => {
    if (allowedSessions.length > 0 && !allowedSessions.includes(activeSessionId)) {
      setActiveSessionId(allowedSessions[0]);
    }
  }, [allowedSessions.join(","), activeSessionId]);

  const [images, setImages] = useState<ScannedImage[]>([]);
  const lastSyncedImagesRef = useRef<any>(null);
  const lastSyncedHistoryRef = useRef<any>(null);
  const [editingImageConfigId, setEditingImageConfigId] = useState<
    string | null
  >(null);
  const [editingResultConfigId, setEditingResultConfigId] = useState<
    string | null
  >(null);
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const stopScanningRef = useRef<boolean>(false);

  const [scannerConfig, setScannerConfig] = useState<{
    show: boolean;
    mode: "folder" | "camera";
    interval: number;
    deviceId: string;
  }>({ show: false, mode: "folder", interval: 3, deviceId: "" });
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const autoScanTimerRef = useRef<any>(null);
  const scannerDirectoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scannerConfig.show && scannerConfig.mode === "camera") {
      const mediaPromise = navigator.mediaDevices?.enumerateDevices();
      if (mediaPromise) {
        mediaPromise
          .then((devices) => {
            const videoDevices = devices.filter(
              (device) => device.kind === "videoinput",
            );
            setAvailableCameras(videoDevices);
            if (videoDevices.length > 0 && !scannerConfig.deviceId) {
              setScannerConfig((prev) => ({
                ...prev,
                deviceId: videoDevices[0].deviceId,
              }));
            }
          })
          .catch((err) => {
            console.error("Lỗi lấy danh sách camera", err);
            setAvailableCameras([]);
          });
      } else {
        setAvailableCameras([]);
      }
    } else {
      setIsAutoScanning(false);
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    }
    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, [scannerConfig.show, scannerConfig.mode]);
  const [referenceImages, setReferenceImages] = useState<
    { base64: string; mimeType: string }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageFilter, setImageFilter] = useState<"ALL" | "INCOMPLETE" | "DONE">(
    "ALL",
  );
  const [imageSearchPhrase, setImageSearchPhrase] = useState("");
  const [imageCreatorFilter, setImageCreatorFilter] = useState<string>("ALL");

  const recognizeAuthorizedUsers = React.useMemo(() => {
    return appUsers.filter((u) => u.role === "ADMIN" || u.permissionRecognizeImage !== false);
  }, [appUsers]);

  const examImages = React.useMemo(() => {
    // 1. Kiểm tra phân quyền nhận dạng của tài khoản hiện tại
    if (!userHasRecognizeImage) {
      return [];
    }

    return [...images]
      .filter((img) => {
        // Lọc theo Bài thi (gradeExamName)
        const isMatchExam = img.examName === gradeExamName;
        if (!isMatchExam) return false;

        // Lọc theo Lớp/Phòng (activeClass)
        const isMatchClass = activeClass === "ALL" || img.classId === activeClass;
        if (!isMatchClass) return false;

        // Lọc theo tài khoản đã được phân quyền Nhận dạng chấm bài
        if (userRole === "ADMIN") {
          // Đối với Admin: có thể lọc theo tài khoản cụ thể được chọn trong UI
          if (imageCreatorFilter !== "ALL") {
            return img.userId === imageCreatorFilter || (!img.userId && imageCreatorFilter === "admin");
          }
          
          // Mặc định: Chỉ hiển thị ảnh của những tài khoản được phân quyền Nhận dạng chấm bài
          if (!img.userId) return true; // Ảnh mặc định/local không có userId
          const imageOwner = appUsers.find((u) => u.id === img.userId || u.username === img.userId);
          if (imageOwner) {
            const ownerHasPermission = imageOwner.role === "ADMIN" || imageOwner.permissionRecognizeImage !== false;
            return ownerHasPermission;
          }
          return true; // Nếu không tìm thấy thông tin user cụ thể, mặc định hiển thị
        } else {
          // Đối với standard USER: chỉ cần ảnh thuộc quyền phân quyền Lớp/Phòng đó (đã qua lọc activeClass & gradeExamName rồi)
          return true;
        }
      })
      .sort((a, b) => {
        const da = parseFloat(a.id);
        const db = parseFloat(b.id);
        if (!isNaN(da) && !isNaN(db)) return da - db;
        return a.id.localeCompare(b.id);
      });
  }, [images, gradeExamName, activeClass, userHasRecognizeImage, userRole, currentUserId, appUsers, imageCreatorFilter]);

  const displayedImages = React.useMemo(() => {
    return examImages.filter((img) => {
      let matchFilter = true;
      if (imageFilter === "INCOMPLETE") matchFilter = img.status !== "done";
      if (imageFilter === "DONE") matchFilter = img.status === "done";
      if (!matchFilter) return false;

      if (imageSearchPhrase.trim()) {
        const terms = imageSearchPhrase.toLowerCase().trim().split(/\s+/);
        const studentId = (
          img.result?.studentId ||
          img.rawAnswers?.studentId ||
          ""
        ).toLowerCase();
        const examCode = (
          img.result?.examCode ||
          img.rawAnswers?.examCode ||
          ""
        ).toLowerCase();
        const className = (img.result?.className || "").toLowerCase();

        // All terms must match at least one of the fields
        for (const term of terms) {
          if (
            !studentId.includes(term) &&
            !examCode.includes(term) &&
            !className.includes(term)
          ) {
            return false;
          }
        }
      }
      return true;
    });
  }, [examImages, imageFilter, imageSearchPhrase]);

  // Step 4: Results
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [historySearchPhrase, setHistorySearchPhrase] = useState("");
  const [historyClassFilter, setHistoryClassFilter] = useState("ALL");
  const [historyExamFilter, setHistoryExamFilter] = useState("ALL");
  const [historyErrorFilter, setHistoryErrorFilter] = useState("ALL");
  const [statsExamFilter, setStatsExamFilter] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [imageZoomLevel, setImageZoomLevel] = useState<number>(0.75);

  useEffect(() => {
    if (!selectedResult) return;
    const latest = scanHistory.find((item) => item.id === selectedResult.id);
    if (latest) {
      if (
        latest.firebaseImageUrl !== selectedResult.firebaseImageUrl ||
        latest.imageSrc !== selectedResult.imageSrc ||
        latest.studentId !== selectedResult.studentId ||
        latest.examCode !== selectedResult.examCode ||
        JSON.stringify(latest.result) !== JSON.stringify(selectedResult.result)
      ) {
        setSelectedResult(latest);
      }
    }
  }, [scanHistory, selectedResult?.id]);

  const isLoadedRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  // --- FIREBASE SYNC: Globals ---
  const initialFetchDone = useRef(false);
  const initialHistoryFetchDone = useRef(false);
  const initialQueueFetchDone = useRef(false);
  useEffect(() => {
    try {
      localStorage.removeItem("last_local_update_time");
      sessionStorage.removeItem("last_synced_globals");
    } catch {}

    if (firestoreQuotaExceeded) {
      initialFetchDone.current = true;
      return () => {};
    }
    const unsub = onSnapshot(
      doc(db, "globals", "appData"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const { updatedAt, ...coreDataUnsorted } = data;

          const remoteUpdatedAt = updatedAt || 0;
          let localLastUpdateTimeVal = 0;
          try {
            localLastUpdateTimeVal = parseInt(
              localStorage.getItem("last_local_update_time") || "0",
            );
          } catch {}

          if (remoteUpdatedAt < localLastUpdateTimeVal) {
            console.log(
              "Stale snapshots ignored to protect newer local updates. Remote updatedAt:",
              remoteUpdatedAt,
              "Local lastUpdateTime:",
              localLastUpdateTimeVal,
            );
            initialFetchDone.current = true;
            return;
          }

          // Sort keys to ensure stable stringify
          const syncKeys = [
            "appUsers",
            "classes",
            "examConfigs",
            "examSessions",
            "examStructures",
            "globalOMRConfig",
            "globalOMRTemplateImage",
            "deletedHistoryIds",
            "deletedImageIds",
          ];
          const coreData: any = {};
          syncKeys.sort().forEach((k) => {
            if (coreDataUnsorted[k] !== undefined) {
              coreData[k] = coreDataUnsorted[k];
            }
          });

          setSafeSessionStorage(
            "last_synced_globals",
            JSON.stringify(coreData),
          );

          if (coreData.appUsers && Array.isArray(coreData.appUsers)) {
            setAppUsers((prev) => deepEqual(prev, coreData.appUsers) ? prev : coreData.appUsers);
          }
          if (coreData.classes && Array.isArray(coreData.classes)) {
            setClasses((prev) => deepEqual(prev, coreData.classes) ? prev : coreData.classes);
          }
          if (coreData.examConfigs && Array.isArray(coreData.examConfigs)) {
            setExamConfigs((prev) => deepEqual(prev, coreData.examConfigs) ? prev : coreData.examConfigs);
          }
          if (coreData.examStructures && Array.isArray(coreData.examStructures)) {
            setExamStructures((prev) => deepEqual(prev, coreData.examStructures) ? prev : coreData.examStructures);
          }
          if (coreData.examSessions && Array.isArray(coreData.examSessions)) {
            setExamSessions((prev) => deepEqual(prev, coreData.examSessions) ? prev : coreData.examSessions);
          }
          if (coreData.globalOMRConfig) {
            setGlobalOMRConfig((prev) => deepEqual(prev, coreData.globalOMRConfig) ? prev : coreData.globalOMRConfig);
          }
          if (coreData.globalOMRTemplateImage) {
            setGlobalOMRTemplateImage((prev) => {
              if (prev === coreData.globalOMRTemplateImage) return prev;
              setSafeStorage(
                "omr_template_calibration_img",
                coreData.globalOMRTemplateImage,
              );
              return coreData.globalOMRTemplateImage;
            });
          }
          if (coreData.deletedHistoryIds && Array.isArray(coreData.deletedHistoryIds)) {
            let changed = false;
            coreData.deletedHistoryIds.forEach((id: string) => {
              if (!deletedHistoryIds.current.has(id)) {
                deletedHistoryIds.current.add(id);
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem("deleted_history_ids", JSON.stringify(Array.from(deletedHistoryIds.current)));
            }
          }
          if (coreData.deletedImageIds && Array.isArray(coreData.deletedImageIds)) {
            let changed = false;
            coreData.deletedImageIds.forEach((id: string) => {
              if (!deletedImageIds.current.has(id)) {
                deletedImageIds.current.add(id);
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem("deleted_image_ids", JSON.stringify(Array.from(deletedImageIds.current)));
            }
          }
        }
        initialFetchDone.current = true;
      },
      (error: any) => {
        console.error("Firebase globals sync error:", error);
        if (isQuotaError(error)) {
          setQuotaExceeded();
        }
      },
    );

    return () => {
      unsub();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (firestoreQuotaExceeded || !currentUserId) {
      initialHistoryFetchDone.current = true;
      return () => {};
    }

    initialHistoryFetchDone.current = false;

    // Subscribe to scanHistory matched with activeSessionId to load data fast and save query speed
    const q = query(
      collection(db, "scanHistory"),
      where("sessionId", "==", activeSessionId || "SESSION_DEFAULT")
    );

    const unsubHistory = onSnapshot(
      q,
      (snapshot) => {
        setScanHistory((prevHistory) => {
          // Remove activeSessionId items from previous history to clear deletions/updates
          let nextHistory = prevHistory.filter(
            (p) => (p.sessionId || "SESSION_DEFAULT") !== (activeSessionId || "SESSION_DEFAULT")
          );

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (deletedHistoryIds.current.has(data.id)) return;
            if (data.timestamp?.toDate) {
              data.timestamp = data.timestamp.toDate();
            } else if (data.timestamp) {
              data.timestamp = new Date(data.timestamp);
            }
            const { imageSrc, originalImageSrc, ...metadataOnly } = data;
            setSafeSessionStorage(
              "sync_history_" + data.id,
              JSON.stringify(metadataOnly),
            );

            // Preserve local high-res image src and firebaseImageUrl if present locally
            const localItem = prevHistory.find((p) => p.id === data.id);
            if (localItem) {
              const hasUrl = data.firebaseImageUrl || localItem.firebaseImageUrl;
              if (localItem.imageSrc && !hasUrl) {
                data.imageSrc = localItem.imageSrc;
                data.originalImageSrc = localItem.originalImageSrc;
              } else {
                data.imageSrc = "";
                data.originalImageSrc = "";
              }
              if (localItem.firebaseImageUrl && !data.firebaseImageUrl) {
                data.firebaseImageUrl = localItem.firebaseImageUrl;
              }
            } else if (data.firebaseImageUrl) {
              data.imageSrc = "";
              data.originalImageSrc = "";
            }
            nextHistory.push(data);
          });

          nextHistory.sort((a, b) => {
            const tA =
              a.timestamp instanceof Date
                ? a.timestamp.getTime()
                : new Date(a.timestamp || 0).getTime();
            const tB =
              b.timestamp instanceof Date
                ? b.timestamp.getTime()
                : new Date(b.timestamp || 0).getTime();
            return tB - tA;
          });

          return nextHistory;
        });
        initialHistoryFetchDone.current = true;
      },
      (error: any) => {
        console.error("Firebase history sync error:", error);
        if (isQuotaError(error)) {
          setQuotaExceeded();
        }
      },
    );

    return () => {
      unsubHistory();
    };
  }, [activeSessionId, currentUserId]);

  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (userRole !== "ADMIN") return;

    // Create a stringified version to check for actual changes instead of references
    const syncObj: any = {
      appUsers,
      classes,
      examConfigs,
      examSessions,
      examStructures,
    };
    if (globalOMRConfig) {
      syncObj.globalOMRConfig = globalOMRConfig;
    }
    if (globalOMRTemplateImage) {
      if (!globalOMRTemplateImage.startsWith("data:") || globalOMRTemplateImage.length <= 100000) {
        syncObj.globalOMRTemplateImage = globalOMRTemplateImage;
      }
    }
    const sortedSyncObj: any = {};
    Object.keys(syncObj)
      .sort()
      .forEach((k) => {
        sortedSyncObj[k] = syncObj[k];
      });
    const currentGlobalStr = JSON.stringify(stripDataUrls(sortedSyncObj));
    const lastSyncedGlobalStr = getSafeSessionStorage("last_synced_globals");

    const isChanged = currentGlobalStr !== lastSyncedGlobalStr;
    const now = Date.now();

    if (isChanged) {
      try {
        localStorage.setItem("last_local_update_time", now.toString());
      } catch (e) {}
    }

    const timeout = setTimeout(() => {
      if (!isChanged) return; // Skip if no real data changed

      if (firestoreQuotaExceeded) return;

      const pushData: any = {
        appUsers,
        classes,
        examConfigs,
        examStructures,
        examSessions,
        updatedAt: now,
      };
      if (globalOMRConfig) pushData.globalOMRConfig = globalOMRConfig;
      if (globalOMRTemplateImage) {
        if (!globalOMRTemplateImage.startsWith("data:") || globalOMRTemplateImage.length <= 100000) {
          pushData.globalOMRTemplateImage = globalOMRTemplateImage;
        }
      }

      const cleanPushData = stripDataUrls(JSON.parse(JSON.stringify(pushData)));

      if (firestoreQuotaExceeded) return;

      setDoc(doc(db, "globals", "appData"), cleanPushData, { merge: true })
        .then(() => {
          setSafeSessionStorage("last_synced_globals", currentGlobalStr);
        })
        .catch((e: any) => {
          console.error("Firebase push error:", e);
          if (isQuotaError(e)) {
            setQuotaExceeded();
          }
        });
    }, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [
    appUsers,
    classes,
    examConfigs,
    examStructures,
    examSessions,
    globalOMRConfig,
    globalOMRTemplateImage,
    userRole,
  ]);

  useEffect(() => {
    if (!globalOMRTemplateImage || !globalOMRTemplateImage.startsWith("data:")) return;
    if (globalOMRTemplateImage.length <= 100000) return; // already in fallback form, skip upload

    let isCancelled = false;
    const uploadTemplate = async () => {
      try {
        const path = `templates/global_omr_template_${currentUserId || "default"}.jpg`;
        const url = await uploadImageFile(path, globalOMRTemplateImage);
        if (!isCancelled) {
          setGlobalOMRTemplateImage(url);
          setSafeStorage("omr_template_calibration_img", url);
        }
      } catch (e) {
        console.error("Failed to upload global OMR template image to Firebase Storage:", e);
        // Fallback: Compress the image heavily to make it under 100KB so it can sync directly via Firestore
        try {
          const compressed = await compressImage(globalOMRTemplateImage, 360, 510);
          if (!isCancelled) {
            setGlobalOMRTemplateImage(compressed);
            setSafeStorage("omr_template_calibration_img", compressed);
          }
        } catch (compressErr) {
          console.error("Failed to compress template image fallback:", compressErr);
        }
      }
    };
    uploadTemplate();
    return () => {
      isCancelled = true;
    };
  }, [globalOMRTemplateImage, currentUserId]);

  useEffect(() => {
    if (!initialHistoryFetchDone.current) return;
    const backupToFirebase = async () => {
      if (firestoreQuotaExceeded) return;
      try {
        const snapshotOfUnpushed = new Set(unpushedHistoryIds.current);
        if (snapshotOfUnpushed.size === 0) return;

        const batch = writeBatch(db);
        let count = 0;
        let actualChanges = 0;

        const itemsToSync = scanHistory.filter((h) =>
          snapshotOfUnpushed.has(h.id),
        );

        for (const item of itemsToSync) {
          const docRef = doc(db, "scanHistory", item.id);
          const { imageSrc, originalImageSrc, isUploading, ...metadataOnly } =
            item as any;
          const metadataStr = JSON.stringify(metadataOnly);

          // Parse back to remove undefined properties which Firestore rejects
          const cleanMetadata = stripDataUrls(JSON.parse(metadataStr));
          // Restore timestamp as Date if it existed natively
          if (metadataOnly.timestamp instanceof Date) {
            cleanMetadata.timestamp = metadataOnly.timestamp;
          }
          batch.set(docRef, cleanMetadata);
          setSafeSessionStorage("sync_history_" + item.id, metadataStr);
          actualChanges++;

          count++;
          if (actualChanges >= 490) break;
        }
        if (actualChanges > 0) {
          if (firestoreQuotaExceeded) return;
          await batch.commit();

          // Clear successfully pushed items
          itemsToSync.slice(0, actualChanges).forEach((item) => {
            unpushedHistoryIds.current.delete(item.id);
          });
          localStorage.setItem(
            "unpushed_history_ids",
            JSON.stringify(Array.from(unpushedHistoryIds.current)),
          );
        }
      } catch (e: any) {
        console.error("Firebase batch commit error", e);
        if (isQuotaError(e)) {
          setQuotaExceeded();
        }
      }
    };

    const timeout = setTimeout(() => {
      backupToFirebase();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [scanHistory]);

  // Reconcile images with scanHistory to revert status of corresponding images instead of deleting them when their graded result is deleted
  useEffect(() => {
    if (!initialHistoryFetchDone.current) return;
    setImages((prev) => {
      let isChanged = false;
      const next = prev.map((img) => {
        if (img.result?.id) {
          const exists = scanHistory.some((item) => item.id === img.result.id);
          if (!exists) {
            isChanged = true;
            if (img.rawAnswers) {
              return {
                ...img,
                status: "scanned",
                errorMsg: undefined,
                result: undefined,
              };
            } else {
              return {
                ...img,
                status: "pending",
                errorMsg: "Đã xóa kết quả, cần nhận dạng và chấm lại",
                result: undefined,
              };
            }
          }
        }
        return img;
      });
      return isChanged ? next : prev;
    });
  }, [scanHistory]);

  // FIREBASE SYNC: scanQueue
  useEffect(() => {
    initialQueueFetchDone.current = false;
    if (!currentUserId || firestoreQuotaExceeded) {
      initialQueueFetchDone.current = true;
      return () => {};
    }
    const finalQueueUserId = activeQueueUserId || currentUserId;
    const queueDocId = "scanQueue_" + finalQueueUserId;
    const unsubScanQueue = onSnapshot(
      doc(db, "globals", queueDocId),
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteImages = snapshot.data().images || [];
          setImages((prev) => {
            const sessionCacheStr = getSafeSessionStorage(
              "last_synced_" + queueDocId,
            );
            if (sessionCacheStr === JSON.stringify(remoteImages)) {
              return prev;
            }
             const merged = remoteImages
              .filter(
                (rmtOrig: any) => !deletedImageIds.current.has(rmtOrig.id),
              )
              .map((rmtOrig: any) => {
                const { isUploadingToFirebase, ...rmt } = rmtOrig;
                const local = prev.find((p) => p.id === rmt.id);
                if (local) {
                  const statusPriorityMap: Record<string, number> = {
                    pending: 0,
                    error: 1,
                    processing: 2,
                    scanned: 3,
                    done: 4,
                  };
                  const localPriority = statusPriorityMap[local.status] || 0;
                  const remotePriority = statusPriorityMap[rmt.status] || 0;

                  const keepLocal =
                    localPriority > remotePriority ||
                    local.status === "processing" ||
                    (local as any).isUploadingToFirebase ||
                    unpushedImageIds.current.has(rmt.id);

                  if (keepLocal) {
                    return {
                      ...rmt,
                      ...local,
                      src: local.src || rmt.src || "",
                      processedDataUrl: local.processedDataUrl || rmt.processedDataUrl || "",
                      warpedDataUrl: local.warpedDataUrl || rmt.warpedDataUrl || "",
                      result: local.result || rmt.result,
                      rawAnswers: local.rawAnswers || rmt.rawAnswers,
                      status: local.status,
                      errorMsg: local.status === "error" ? (local.errorMsg || rmt.errorMsg) : rmt.errorMsg,
                    };
                  }

                  const hasUrl = rmt.firebaseImageUrl || local.firebaseImageUrl || "";
                  return {
                    ...rmt,
                    firebaseImageUrl: hasUrl,
                    src: hasUrl ? hasUrl : (rmt.src || local.src || ""),
                    processedDataUrl: rmt.processedDataUrl || local.processedDataUrl || "",
                    warpedDataUrl: rmt.warpedDataUrl || local.warpedDataUrl || "",
                    rawAnswers: rmt.rawAnswers || local.rawAnswers,
                    result:
                      local.result || rmt.result
                        ? {
                            ...(rmt.result || {}),
                            ...(local.result || {}),
                            imageSrc: hasUrl ? hasUrl : (local.result?.imageSrc || rmt.result?.imageSrc || ""),
                            originalImageSrc: hasUrl ? "" : (local.result?.originalImageSrc || rmt.result?.originalImageSrc || ""),
                          }
                        : rmt.result,
                  };
                }
                const hasRmtUrl = rmt.firebaseImageUrl || "";
                return {
                  ...rmt,
                  src: hasRmtUrl ? hasRmtUrl : (rmt.src || ""),
                };
              });
            const localOnly = prev.filter(
              (p) =>
                !remoteImages.find((r: any) => r.id === p.id) &&
                !deletedImageIds.current.has(p.id) &&
                (currentSessionCaptureIds.current.has(p.id) ||
                  unpushedImageIds.current.has(p.id)) &&
                ((p as any).isUploadingToFirebase ||
                  p.status === "processing" ||
                  unpushedImageIds.current.has(p.id)),
            );
            const finalImages = [...merged, ...localOnly];
            // Update the cache immediately so loop terminates
            setSafeSessionStorage(
              "last_synced_" + queueDocId,
              JSON.stringify(remoteImages),
            );
            setSafeSessionStorage(
              "local_last_synced_" + queueDocId,
              JSON.stringify(finalImages),
            );
            return finalImages;
          });
        }
        initialQueueFetchDone.current = true;
      },
      (error: any) => {
        console.error("Firebase scan queue sync error:", error);
        if (isQuotaError(error)) {
          setQuotaExceeded();
        }
      },
    );

    return () => unsubScanQueue();
  }, [currentUserId, userRole, activeQueueUserId]);

  const syncQueueToFirestore = useCallback((currentImages: any[], queueUserId: string) => {
    if (firestoreQuotaExceeded) return;
    if (queueUserId && queueUserId !== currentUserId) {
      // Grader/Viewer must not overwrite uploader's scan queue
      return;
    }
    const queueDocId = "scanQueue_" + queueUserId;

    const safeImages = currentImages.map((img) => {
      let { isUploadingToFirebase, ...safeImg } = img as any;
      if (safeImg.src && safeImg.src.startsWith("data:")) {
        safeImg.src = ""; // Do not transmit large base64 strings to Firestore
      }
      if (!safeImg.result) return safeImg;
      const { imageSrc, originalImageSrc, ...safeResult } = safeImg.result;
      return { ...safeImg, result: safeResult };
    });

    const cleanSafeImages = stripDataUrls(JSON.parse(JSON.stringify(safeImages)));
    const safeImagesStr = JSON.stringify(cleanSafeImages);
    const currentStr = JSON.stringify(currentImages);

    const snapshotOfUnpushed = new Set(currentImages.map((i: any) => i.id));
    const snapshotOfDeleted = new Set(deletedImageIds.current);

    setDoc(
      doc(db, "globals", queueDocId),
      { images: cleanSafeImages },
      { merge: true },
    )
      .then(() => {
        setSafeSessionStorage("local_last_synced_" + queueDocId, currentStr); // local loop prevention
        setSafeSessionStorage("last_synced_" + queueDocId, safeImagesStr); // snapshot loop prevention

        // Remove tracking since sync succeeded
        snapshotOfUnpushed.forEach((id) =>
          unpushedImageIds.current.delete(id),
        );
        snapshotOfDeleted.forEach((id) => deletedImageIds.current.delete(id));
        localStorage.setItem(
          "unpushed_image_ids",
          JSON.stringify(Array.from(unpushedImageIds.current)),
        );
        localStorage.setItem(
          "deleted_image_ids",
          JSON.stringify(Array.from(deletedImageIds.current)),
        );
      })
      .catch((e) => {
        console.error("syncQueueToFirestore error", e);
        if (isQuotaError(e)) {
          setQuotaExceeded();
        }
      });
  }, [firestoreQuotaExceeded]);

  // background sync scan queue 'images' to storage and firestore
  useEffect(() => {
    if (!initialFetchDone.current || !initialQueueFetchDone.current) return;
    if (activeQueueUserId && activeQueueUserId !== currentUserId) {
      // Grader/Viewer must not sync or upload another user's scan queue
      return;
    }
    const finalQueueUserId = activeQueueUserId || currentUserId;
    const queueDocId = "scanQueue_" + finalQueueUserId;

    // 1. Upload base64 src to firebaseImageUrl (parallelized up to 3 for maximum speed, locked via uploadingRef)
    const itemsToUpload = images.filter(
      (img) =>
        img.src &&
        img.src.startsWith("data:") &&
        !img.firebaseImageUrl &&
        !uploadingRef.current.has(img.id),
    );
    if (itemsToUpload.length > 0) {
      // Synchronously mark them all immediately to prevent subsequent react updates from spawning new upload worker runs
      addToUploading(itemsToUpload.map((item) => item.id));

      const uploadWorker = async (item: any) => {
        try {
          const optSrc = await compressImage(item.src, 720, 960);
          const url = await uploadImageFile(`${queueDocId}/${item.id}.jpg`, optSrc, item.examName, item.className || item.classId);
          let updatedImages: any[] = [];
          setImages((prev) => {
            updatedImages = prev.map((p) =>
              p.id === item.id
                ? ({
                    ...p,
                    firebaseImageUrl: url,
                    src: url ? url : p.src,
                    processedDataUrl: url ? "" : p.processedDataUrl,
                    warpedDataUrl: url ? "" : p.warpedDataUrl,
                    result: p.result
                      ? {
                          ...p.result,
                          imageSrc: url ? "" : (p.result.imageSrc || ""),
                          originalImageSrc: url ? "" : (p.result.originalImageSrc || ""),
                        }
                      : p.result,
                  } as any)
                : p,
            );
            return updatedImages;
          });
        } catch (e) {
          console.error("Queue upload failed for " + item.id, e);
        } finally {
          removeFromUploading(item.id);
        }
      };

      const runParallelQueueUploads = async () => {
        const pool: Promise<void>[] = [];
        const maxConcurrency = 5;
        for (const item of itemsToUpload) {
          const promise = uploadWorker(item).then(() => {
            const idx = pool.indexOf(promise);
            if (idx !== -1) {
              pool.splice(idx, 1);
            }
          });
          pool.push(promise);
          if (pool.length >= maxConcurrency) {
            await Promise.race(pool);
          }
        }
        await Promise.all(pool);
      };
      runParallelQueueUploads();
    }

    // 2. Sync metadata to Firestore
    const timeout = setTimeout(() => {
      if (firestoreQuotaExceeded) return;

      const currentStr = JSON.stringify(images);
      const localCacheStr = getSafeSessionStorage(
        "local_last_synced_" + queueDocId,
      );
      if (currentStr === localCacheStr) return;

      const safeImages = images.map((img) => {
        let { isUploadingToFirebase, ...safeImg } = img as any;
        if (safeImg.src && safeImg.src.startsWith("data:")) {
          safeImg.src = ""; // Do not transmit large base64 strings to Firestore
        }
        if (!safeImg.result) return safeImg;
        const { imageSrc, originalImageSrc, ...safeResult } = safeImg.result;
        return { ...safeImg, result: safeResult };
      });

      const cleanSafeImages = stripDataUrls(JSON.parse(JSON.stringify(safeImages)));
      const safeImagesStr = JSON.stringify(cleanSafeImages);

      const snapshotOfUnpushed = new Set(images.map((i: any) => i.id));
      const snapshotOfDeleted = new Set(deletedImageIds.current);

      if (firestoreQuotaExceeded) return;
      setDoc(
        doc(db, "globals", queueDocId),
        { images: cleanSafeImages },
        { merge: true },
      )
        .then(() => {
          setSafeSessionStorage("local_last_synced_" + queueDocId, currentStr); // local loop prevention
          setSafeSessionStorage("last_synced_" + queueDocId, safeImagesStr); // snapshot loop prevention

          // Remove tracking since sync succeeded
          snapshotOfUnpushed.forEach((id) =>
            unpushedImageIds.current.delete(id),
          );
          snapshotOfDeleted.forEach((id) => deletedImageIds.current.delete(id));
          localStorage.setItem(
            "unpushed_image_ids",
            JSON.stringify(Array.from(unpushedImageIds.current)),
          );
          localStorage.setItem(
            "deleted_image_ids",
            JSON.stringify(Array.from(deletedImageIds.current)),
          );
        })
        .catch((e) => {
          console.error(e);
          if (isQuotaError(e)) {
            setQuotaExceeded();
          }
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [images, currentUserId, userRole, activeQueueUserId]);

  // background sync images to storage
  useEffect(() => {
    if (!currentUserId) return;

    const itemsToUpload = scanHistory.filter(
      (item: any) =>
        item.imageSrc &&
        !item.firebaseImageUrl &&
        !uploadingRef.current.has(item.id),
    );
    if (itemsToUpload.length === 0) return;

    // Synchronously track them immediately in uploadingRef to prevent subsequent react updates from scheduling duplicate uploads
    addToUploading(itemsToUpload.map((item) => item.id));

    const uploadWorker = async (item: any) => {
      try {
        const optSrc = await compressImage(item.imageSrc, 720, 960);
        const path = `scans/${item.examName || "unknown_exam"}/${item.sessionId || "unknown_session"}/${item.id}.jpg`;
        const url = await uploadImageFile(path, optSrc, item.examName, item.className || item.classId);

        // Update local state history
        setScanHistory((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, firebaseImageUrl: url } : p,
          ),
        );

        // Also update selectedResult if it is the currently viewed item so it renders immediately
        setSelectedResult((prev: any) => {
          if (prev && prev.id === item.id) {
            return { ...prev, firebaseImageUrl: url };
          }
          return prev;
        });

        // Immediately persist to Firestore Doc directly bypassing general backups
        const docRef = doc(db, "scanHistory", item.id);
        const { imageSrc, originalImageSrc, isUploading, ...metadataOnly } =
          item as any;
        metadataOnly.firebaseImageUrl = url; // Set the URL explicitly

        const cleanMetadata = stripDataUrls(JSON.parse(JSON.stringify(metadataOnly)));
        if (item.timestamp) {
          cleanMetadata.timestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
        }

        await setDoc(docRef, cleanMetadata, { merge: true });

        unpushedHistoryIds.current.delete(item.id);
        localStorage.setItem(
          "unpushed_history_ids",
          JSON.stringify(Array.from(unpushedHistoryIds.current)),
        );
      } catch (e) {
        console.error("Storage upload failed for " + item.id, e);
      } finally {
        removeFromUploading(item.id);
      }
    };

    const runParallelUploads = async () => {
      const pool: Promise<void>[] = [];
      const maxConcurrency = 5;
      for (const item of itemsToUpload) {
        const promise = uploadWorker(item).then(() => {
          const idx = pool.indexOf(promise);
          if (idx !== -1) {
            pool.splice(idx, 1);
          }
        });
        pool.push(promise);
        if (pool.length >= maxConcurrency) {
          await Promise.race(pool);
        }
      }
      await Promise.all(pool);
    };

    // Don't overwhelm the thread but run quickly on changes
    const timeout = setTimeout(() => {
      runParallelUploads();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [scanHistory, currentUserId]);
  // --------------------------------

  // Load initial data from localforage / local central database
  useEffect(() => {
    if (!currentUserId) {
      setImages([]);
      setScanHistory([]);
      isLoadedRef.current = true;
      return () => {};
    }
    let isMounted = true;
    isLoadedRef.current = false;
    const loadData = async () => {
      try {
        const storedHistoryIds = localStorage.getItem("deleted_history_ids");
        if (storedHistoryIds) {
          const parsed = JSON.parse(storedHistoryIds);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => deletedHistoryIds.current.add(id));
          }
        }
        const storedImageIds = localStorage.getItem("deleted_image_ids");
        if (storedImageIds) {
          const parsed = JSON.parse(storedImageIds);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => deletedImageIds.current.add(id));
          }
        }
      } catch (err) {
        console.warn("Pre-loading deleted IDs failed in loadData:", err);
      }

      try {
        if (isLocalServerMode) {
          try {
            const res = await fetch(`${localServerUrl}/api/local-db`);
            if (res.ok) {
              const dbData = await res.json();
              if (isMounted) {
                if (dbData.deletedHistoryIds && Array.isArray(dbData.deletedHistoryIds)) {
                  let changed = false;
                  dbData.deletedHistoryIds.forEach((id: string) => {
                    if (!deletedHistoryIds.current.has(id)) {
                      deletedHistoryIds.current.add(id);
                      changed = true;
                    }
                  });
                  if (changed) {
                    localStorage.setItem(
                      "deleted_history_ids",
                      JSON.stringify(Array.from(deletedHistoryIds.current)),
                    );
                  }
                }
                if (dbData.deletedImageIds && Array.isArray(dbData.deletedImageIds)) {
                  let changed = false;
                  dbData.deletedImageIds.forEach((id: string) => {
                    if (!deletedImageIds.current.has(id)) {
                      deletedImageIds.current.add(id);
                      changed = true;
                    }
                  });
                  if (changed) {
                    localStorage.setItem(
                      "deleted_image_ids",
                      JSON.stringify(Array.from(deletedImageIds.current)),
                    );
                  }
                }
                if (dbData.users && Array.isArray(dbData.users)) {
                  setAppUsers(dbData.users);
                }
                if (dbData.structures && Array.isArray(dbData.structures)) {
                  setExamStructures(dbData.structures);
                }
                if (dbData.history && Array.isArray(dbData.history)) {
                  const parsedHistory = dbData.history.map((item: any) => {
                    let totalScore = item.score || 0;
                    let p1Score = 0;
                    let p2Score = 0;
                    let p3Score = 0;
                    const details = item.resultDetails?.resultDetails || item.resultDetails || {};
                    if (details.part1) {
                      details.part1.forEach((q: any) => {
                        if (q.isCorrect && !q.points) q.points = 0.25;
                        p1Score += q.points || 0;
                      });
                    }
                    if (details.part2) {
                      details.part2.forEach((q: any) => {
                        p2Score += q.points || 0;
                      });
                    }
                    if (details.part3) {
                      details.part3.forEach((q: any) => {
                        if (q.isCorrect && !q.points) q.points = 0.5;
                        p3Score += q.points || 0;
                      });
                    }
                    const cleaned = { ...item };
                    if (cleaned.firebaseImageUrl) {
                      cleaned.imageSrc = "";
                      cleaned.originalImageSrc = "";
                      if (cleaned.result) {
                        cleaned.result = { ...cleaned.result, imageSrc: "", originalImageSrc: "" };
                      }
                    }
                    return {
                      ...cleaned,
                      score: p1Score + p2Score + p3Score,
                      resultDetails: details,
                      timestamp: cleaned.timestamp ? new Date(cleaned.timestamp) : new Date(0),
                    };
                  });
                  // Filter by role: Admin sees everything, standard user sees their own + items uploaded by admins
                  const filteredHistory = parsedHistory.filter((item: any) => {
                    if (deletedHistoryIds.current.has(item.id)) return false;
                    if (userRole === "ADMIN") return true;
                    const usersList = dbData.users || appUsers;
                    const currentUser = usersList.find((u: any) => u.id === currentUserId || u.username === currentUserId);
                    if (!currentUser) return !item.userId || item.userId === currentUserId;
                    
                    const assignedClasses = currentUser.assignedClasses || [];
                    const assignedExams = currentUser.assignedExams || [];
                    const assignedSessions = currentUser.assignedSessions || [];
                    
                    if (assignedClasses.length > 0) {
                      if (!item.className || !assignedClasses.includes(item.className)) return false;
                    }
                    if (assignedExams.length > 0) {
                      if (!item.examName || !assignedExams.includes(item.examName)) return false;
                    }
                    if (assignedSessions.length > 0) {
                      const itemSessionId = item.sessionId || "SESSION_DEFAULT";
                      if (!assignedSessions.includes(itemSessionId)) return false;
                    }
                    return true;
                  });
                  lastSyncedHistoryRef.current = filteredHistory;
                  setScanHistory(filteredHistory);
                }
                if (dbData.images && Array.isArray(dbData.images)) {
                  // Filter by role: Admin sees everything, standard user sees their own + assigned class/exam images
                  const filteredImages = dbData.images.filter((img: any) => {
                    if (userRole === "ADMIN") return true;
                    const targetQueueUserId = activeQueueUserId || currentUserId || "";
                    const imgUserId = img.userId || "";
                    if (imgUserId && targetQueueUserId && imgUserId !== targetQueueUserId) return false;
                    if (!imgUserId && targetQueueUserId && targetQueueUserId !== currentUserId) return false;
                    const usersList = dbData.users || appUsers;
                    const currentUser = usersList.find((u: any) => u.id === currentUserId || u.username === currentUserId);
                    if (!currentUser) return !img.userId || img.userId === currentUserId;
                    
                    // Người dùng thường được đổi tên/SBD cho ảnh do chính mình tải lên mà không bị biến mất
                    if (img.userId === currentUserId) return true;
                    
                    const assignedClasses = currentUser.assignedClasses || [];
                    const assignedExams = currentUser.assignedExams || [];
                    
                    if (assignedClasses.length > 0) {
                      if (!img.classId || !assignedClasses.includes(img.classId)) return false;
                    }
                    if (assignedExams.length > 0) {
                      if (!img.examName || !assignedExams.includes(img.examName)) return false;
                    }
                    return true;
                  });
                  lastSyncedImagesRef.current = filteredImages;
                  setImages(filteredImages);
                }
                if (dbData.omrConfig) {
                  setGlobalOMRConfig(dbData.omrConfig);
                }
                initialHistoryFetchDone.current = true;
                initialQueueFetchDone.current = true;
                isLoadedRef.current = true;
                return;
              }
            }
          } catch (e) {
            console.warn("Failed to fetch from local server during loadData, falling back to localforage", e);
          }
        }

        const savedHistory =
          await localforage.getItem<any[]>(`autograde_history_${currentUserId}`);
        if (isMounted && savedHistory && Array.isArray(savedHistory)) {
          const parsed = savedHistory.map((item: any) => {
            let totalScore = item.score || 0;
            let p1Score = 0;
            let p2Score = 0;
            let p3Score = 0;
            const details =
              item.resultDetails?.resultDetails || item.resultDetails || {};
            if (details.part1) {
              details.part1.forEach((q: any) => {
                if (q.isCorrect && !q.points) q.points = 0.25;
                p1Score += q.points || 0;
              });
            }
            if (details.part2) {
              details.part2.forEach((q: any) => {
                p2Score += q.points || 0;
              });
            }
            if (details.part3) {
              details.part3.forEach((q: any) => {
                if (q.isCorrect && !q.points) q.points = 0.5;
                p3Score += q.points || 0;
              });
            }
            const cleaned = { ...item };
            if (cleaned.firebaseImageUrl) {
              cleaned.imageSrc = "";
              cleaned.originalImageSrc = "";
              if (cleaned.result) {
                cleaned.result = { ...cleaned.result, imageSrc: "", originalImageSrc: "" };
              }
            }
            return {
              ...cleaned,
              score: p1Score + p2Score + p3Score,
              resultDetails: details,
              timestamp: cleaned.timestamp ? new Date(cleaned.timestamp) : new Date(),
            };
          }).filter((item: any) => !deletedHistoryIds.current.has(item.id));
          setScanHistory((prev) => {
            if (
              prev.length > 0 &&
              prev.some(
                (p) =>
                  p.firebaseImageUrl ||
                  (p.timestamp && p.timestamp instanceof Date),
              )
            ) {
              // merge carefully: for items in parsed that have large imageSrc missing in remote, keep them
              const merged = [...prev];
              for (const p of parsed) {
                const idx = merged.findIndex((m) => m.id === p.id);
                if (idx === -1) {
                  if (unpushedHistoryIds.current.has(p.id)) {
                    merged.push(p);
                  }
                } else if (p.imageSrc && !merged[idx].imageSrc) {
                  merged[idx] = {
                    ...merged[idx],
                    imageSrc: p.imageSrc,
                    originalImageSrc: p.originalImageSrc,
                  };
                }
              }
              merged.sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              );
              return merged;
            }
            return parsed.sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
            );
          });
        }

        const savedImages =
          await localforage.getItem<ScannedImage[]>(`autograde_images_${currentUserId}`);
        if (isMounted && savedImages && Array.isArray(savedImages)) {
          const cleanedSavedImages = savedImages.map((s) => {
            if (s.firebaseImageUrl) {
              const copy = { ...s };
              copy.src = "";
              copy.processedDataUrl = "";
              copy.warpedDataUrl = "";
              if (copy.result) {
                copy.result = { ...copy.result, imageSrc: "", originalImageSrc: "" };
              }
              return copy as ScannedImage;
            }
            return s;
          });

          setImages((prev) => {
            if (activeQueueUserId && activeQueueUserId !== currentUserId) {
              return prev;
            }
            // If online and we already have active items from Firestore, trust them as the source of truth
            if (initialQueueFetchDone.current && prev.length > 0) {
              return prev.map((p) => {
                const s = cleanedSavedImages.find((item) => item.id === p.id);
                if (s) {
                  return {
                    ...p,
                    src: p.src || s.src,
                    processedDataUrl: p.processedDataUrl || s.processedDataUrl,
                    warpedDataUrl: p.warpedDataUrl || s.warpedDataUrl,
                    result: p.result && s.result
                      ? {
                          ...p.result,
                          imageSrc: p.result.imageSrc || s.result.imageSrc,
                          originalImageSrc: p.result.originalImageSrc || s.result.originalImageSrc,
                        }
                      : p.result || s.result,
                  };
                }
                return p;
              });
            }

            if (prev.length === 0) {
              return cleanedSavedImages;
            }

            // Merge logic if some are already present but we are not fully synced yet
            const merged = [...prev];
            for (const s of cleanedSavedImages) {
              const idx = merged.findIndex((m) => m.id === s.id);
              if (idx === -1) {
                // Only merge item if it is newly captured or offline-unsynced on this device
                if (s.status === "pending" || s.status === "processing" || unpushedImageIds.current.has(s.id)) {
                  merged.push(s);
                }
              } else {
                merged[idx] = {
                  ...merged[idx],
                  src: merged[idx].src || s.src,
                  processedDataUrl: merged[idx].processedDataUrl || s.processedDataUrl,
                  warpedDataUrl: merged[idx].warpedDataUrl || s.warpedDataUrl,
                };
                if (s.result) {
                  if (merged[idx].result) {
                    merged[idx].result = {
                      ...merged[idx].result,
                      imageSrc: merged[idx].result.imageSrc || s.result.imageSrc,
                      originalImageSrc: merged[idx].result.originalImageSrc || s.result.originalImageSrc,
                    };
                  } else {
                    merged[idx].result = s.result;
                  }
                }
              }
            }
            return merged;
          });
        }
      } catch (e) {
        console.error("Failed to load data from localforage", e);
      } finally {
        if (isMounted) {
          initialHistoryFetchDone.current = true;
          initialQueueFetchDone.current = true;
          isLoadedRef.current = true;
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, isLocalServerMode, localServerUrl]);

  const [dialogState, setDialogState] = useState<{
    type: "alert" | "confirm" | "prompt";
    message: string;
    defaultValue?: string;
    onConfirm?: (val?: string) => void;
    variant?: "danger" | "warning" | "success";
  } | null>(null);

  useEffect(() => {
    setSafeStorage("autograde_sessions", JSON.stringify(examSessions));
  }, [examSessions]);

  useEffect(() => {
    setSafeStorage("autograde_structures", JSON.stringify(examStructures));
    if (isLocalServerMode && isLoadedRef.current) {
      fetch(`${localServerUrl}/api/local-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structures: examStructures })
      }).catch(err => console.warn("Failed to sync structures to local server", err));
    }
  }, [examStructures, isLocalServerMode, localServerUrl]);

  useEffect(() => {
    setSafeStorage("autograde_configs", JSON.stringify(examConfigs));
  }, [examConfigs]);

  useEffect(() => {
    setSafeStorage("autograde_classes", JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    if (globalOMRConfig) {
      setSafeStorage("omr_calibration_config", JSON.stringify(globalOMRConfig));
      if (isLocalServerMode && isLoadedRef.current) {
        fetch(`${localServerUrl}/api/local-db`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ omrConfig: globalOMRConfig })
        }).catch(err => console.warn("Failed to sync omrConfig to local server", err));
      }
    }
  }, [globalOMRConfig, isLocalServerMode, localServerUrl]);

  useEffect(() => {
    if (!isLoadedRef.current || isLoggingOutRef.current || !currentUserId) return;
    const timeout = setTimeout(() => {
      try {
        localforage.setItem(`autograde_history_${currentUserId}`, scanHistory);
        if (isLocalServerMode) {
          const historyWithOwner = scanHistory.map((item: any) => ({
            ...item,
            userId: item.userId || currentUserId
          }));

          // Kiểm tra xem dữ liệu hiện tại có khác biệt thực sự so với dữ liệu vừa được sync từ server về không
          const currentStr = JSON.stringify(historyWithOwner.map(p => ({
            ...p,
            timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp
          })));
          const lastSyncedStr = lastSyncedHistoryRef.current
            ? JSON.stringify(lastSyncedHistoryRef.current.map((p: any) => ({
                ...p,
                userId: p.userId || currentUserId,
                timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp
              })))
            : "";

          if (currentStr !== lastSyncedStr) {
            fetch(`${localServerUrl}/api/local-db`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ history: historyWithOwner, userId: currentUserId })
            })
            .then(res => {
              if (res.ok) {
                lastSyncedHistoryRef.current = historyWithOwner;
              }
            })
            .catch(err => console.warn("Failed to sync history to local server", err));
          }
        }
      } catch (err) {
        console.error("Failed to save history:", err);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [scanHistory, currentUserId, isLocalServerMode, localServerUrl]);

  useEffect(() => {
    if (!isLoadedRef.current || isLoggingOutRef.current || !currentUserId) return;
    if (activeQueueUserId && activeQueueUserId !== currentUserId) return;
    const timeout = setTimeout(() => {
      try {
        localforage.setItem(`autograde_images_${currentUserId}`, images);
        if (isLocalServerMode) {
          const imagesWithOwner = images.map((img: any) => ({
            ...img,
            userId: img.userId || currentUserId
          }));

          // Kiểm tra xem dữ liệu hiện tại có khác biệt thực sự so với dữ liệu vừa được sync từ server về không
          const currentStr = JSON.stringify(imagesWithOwner);
          const lastSyncedStr = lastSyncedImagesRef.current
            ? JSON.stringify(lastSyncedImagesRef.current.map((img: any) => ({
                ...img,
                userId: img.userId || currentUserId
              })))
            : "";

          const currentDeletedIds = Array.from(deletedImageIds.current);

          if (currentStr !== lastSyncedStr || currentDeletedIds.length > 0) {
            fetch(`${localServerUrl}/api/local-db`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                images: imagesWithOwner, 
                deletedImageIds: currentDeletedIds,
                userId: currentUserId 
              })
            })
            .then(res => {
              if (res.ok) {
                lastSyncedImagesRef.current = imagesWithOwner;
                currentDeletedIds.forEach(id => deletedImageIds.current.delete(id));
                localStorage.setItem(
                  "deleted_image_ids",
                  JSON.stringify(Array.from(deletedImageIds.current)),
                );
              }
            })
            .catch(err => console.error("Failed to save images:", err));
          }
        }
      } catch (err) {
        console.error("Failed to save images:", err);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [images, currentUserId, activeQueueUserId, isLocalServerMode, localServerUrl]);

  useEffect(() => {
    if (!isLocalServerMode || !currentUserId || !isLoadedRef.current) return () => {};

    const pollLocalServer = async () => {
      try {
        const res = await fetch(`${localServerUrl}/api/local-db`);
        if (res.ok) {
          const dbData = await res.json();
          if (dbData.deletedHistoryIds && Array.isArray(dbData.deletedHistoryIds)) {
            let changed = false;
            dbData.deletedHistoryIds.forEach((id: string) => {
              if (!deletedHistoryIds.current.has(id)) {
                deletedHistoryIds.current.add(id);
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(
                "deleted_history_ids",
                JSON.stringify(Array.from(deletedHistoryIds.current)),
              );
            }
          }
          if (dbData.deletedImageIds && Array.isArray(dbData.deletedImageIds)) {
            let changed = false;
            dbData.deletedImageIds.forEach((id: string) => {
              if (!deletedImageIds.current.has(id)) {
                deletedImageIds.current.add(id);
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(
                "deleted_image_ids",
                JSON.stringify(Array.from(deletedImageIds.current)),
              );
            }
          }
          // Update users if changed
          if (dbData.users && Array.isArray(dbData.users)) {
            setAppUsers((prev) => JSON.stringify(prev) === JSON.stringify(dbData.users) ? prev : dbData.users);
          }
          // Update structures if changed
          if (dbData.structures && Array.isArray(dbData.structures)) {
            setExamStructures((prev) => JSON.stringify(prev) === JSON.stringify(dbData.structures) ? prev : dbData.structures);
          }
          // Update history if changed
          if (dbData.history && Array.isArray(dbData.history)) {
            const parsedHistory = dbData.history.map((item: any) => {
              let totalScore = item.score || 0;
              let p1Score = 0;
              let p2Score = 0;
              let p3Score = 0;
              const details = item.resultDetails?.resultDetails || item.resultDetails || {};
              if (details.part1) {
                details.part1.forEach((q: any) => {
                  if (q.isCorrect && !q.points) q.points = 0.25;
                  p1Score += q.points || 0;
                });
              }
              if (details.part2) {
                details.part2.forEach((q: any) => {
                  p2Score += q.points || 0;
                });
              }
              if (details.part3) {
                details.part3.forEach((q: any) => {
                  if (q.isCorrect && !q.points) q.points = 0.5;
                  p3Score += q.points || 0;
                });
              }
              const cleaned = { ...item };
              if (cleaned.firebaseImageUrl) {
                cleaned.imageSrc = "";
                cleaned.originalImageSrc = "";
                if (cleaned.result) {
                  cleaned.result = { ...cleaned.result, imageSrc: "", originalImageSrc: "" };
                }
              }
              return {
                ...cleaned,
                score: p1Score + p2Score + p3Score,
                resultDetails: details,
                timestamp: cleaned.timestamp ? new Date(cleaned.timestamp) : new Date(0),
              };
            });
            const filteredHistory = parsedHistory.filter((item: any) => {
              if (deletedHistoryIds.current.has(item.id)) return false;
              if (userRole === "ADMIN") return true;
              const usersList = dbData.users || appUsers;
              const currentUser = usersList.find((u: any) => u.id === currentUserId || u.username === currentUserId);
              if (!currentUser) return !item.userId || item.userId === currentUserId;
              
              const assignedClasses = currentUser.assignedClasses || [];
              const assignedExams = currentUser.assignedExams || [];
              const assignedSessions = currentUser.assignedSessions || [];
              
              if (assignedClasses.length > 0) {
                if (!item.className || !assignedClasses.includes(item.className)) return false;
              }
              if (assignedExams.length > 0) {
                if (!item.examName || !assignedExams.includes(item.examName)) return false;
              }
              if (assignedSessions.length > 0) {
                const itemSessionId = item.sessionId || "SESSION_DEFAULT";
                if (!assignedSessions.includes(itemSessionId)) return false;
              }
              return true;
            });
            setScanHistory((prev) => {
              const prevStr = JSON.stringify(prev.map(p => ({ ...p, timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp })));
              const dbStr = JSON.stringify(filteredHistory.map(p => ({ ...p, timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp })));
              if (prevStr === dbStr) return prev;
              lastSyncedHistoryRef.current = filteredHistory;
              return filteredHistory;
            });
          }
          // Update images if changed
          if (dbData.images && Array.isArray(dbData.images)) {
            const filteredImages = dbData.images.filter((img: any) => {
              if (userRole === "ADMIN") return true;
              const targetQueueUserId = activeQueueUserId || currentUserId || "";
              const imgUserId = img.userId || "";
              if (imgUserId && targetQueueUserId && imgUserId !== targetQueueUserId) return false;
              if (!imgUserId && targetQueueUserId && targetQueueUserId !== currentUserId) return false;
              const usersList = dbData.users || appUsers;
              const currentUser = usersList.find((u: any) => u.id === currentUserId || u.username === currentUserId);
              if (!currentUser) return !img.userId || img.userId === currentUserId;
              
              // Người dùng thường được giữ bài của mình tự tải lên không bị ẩn đi
              if (img.userId === currentUserId) return true;
              
              const assignedClasses = currentUser.assignedClasses || [];
              const assignedExams = currentUser.assignedExams || [];
              
              if (assignedClasses.length > 0) {
                if (!img.classId || !assignedClasses.includes(img.classId)) return false;
              }
              if (assignedExams.length > 0) {
                if (!img.examName || !assignedExams.includes(img.examName)) return false;
              }
              return true;
            });
            setImages((prev) => {
              const statusPriorityMap: Record<string, number> = {
                pending: 0,
                error: 1,
                processing: 2,
                scanned: 3,
                done: 4,
              };

              const merged = filteredImages.map((rmt: any) => {
                const local = prev.find((p) => p.id === rmt.id);
                if (local) {
                  const localPriority = statusPriorityMap[local.status] || 0;
                  const remotePriority = statusPriorityMap[rmt.status] || 0;

                  const keepLocal =
                    localPriority > remotePriority ||
                    local.status === "processing" ||
                    (local as any).isUploadingToFirebase ||
                    unpushedImageIds.current.has(rmt.id);

                  if (keepLocal) {
                    return {
                      ...rmt,
                      ...local,
                      src: local.src || rmt.src || "",
                      processedDataUrl: local.processedDataUrl || rmt.processedDataUrl || "",
                      warpedDataUrl: local.warpedDataUrl || rmt.warpedDataUrl || "",
                      result: local.result || rmt.result,
                      rawAnswers: local.rawAnswers || rmt.rawAnswers,
                      status: local.status,
                      errorMsg: local.status === "error" ? (local.errorMsg || rmt.errorMsg) : rmt.errorMsg,
                    };
                  } else {
                    const hasUrl = rmt.firebaseImageUrl || local.firebaseImageUrl || "";
                    return {
                      ...rmt,
                      firebaseImageUrl: hasUrl,
                      src: hasUrl ? hasUrl : (rmt.src || local.src || ""),
                      processedDataUrl: rmt.processedDataUrl || local.processedDataUrl || "",
                      warpedDataUrl: rmt.warpedDataUrl || local.warpedDataUrl || "",
                      rawAnswers: rmt.rawAnswers || local.rawAnswers,
                      result: rmt.result || local.result
                        ? {
                            ...(rmt.result || {}),
                            ...(local.result || {}),
                            imageSrc: hasUrl ? hasUrl : (local.result?.imageSrc || rmt.result?.imageSrc || ""),
                            originalImageSrc: hasUrl ? "" : (local.result?.originalImageSrc || rmt.result?.originalImageSrc || ""),
                          }
                        : rmt.result,
                    };
                  }
                }
                return rmt;
              });

              // Keep local-only images
              const localOnly = prev.filter(
                (p) => !filteredImages.some((r: any) => r.id === p.id) && !deletedImageIds.current.has(p.id)
              );

              const finalImages = [...merged, ...localOnly];
              const prevStr = JSON.stringify(prev);
              const finalStr = JSON.stringify(finalImages);
              if (prevStr === finalStr) return prev;

              lastSyncedImagesRef.current = filteredImages;
              return finalImages;
            });
          }
          // Update global OMR config if changed
          if (dbData.omrConfig) {
            setGlobalOMRConfig((prev) => JSON.stringify(prev) === JSON.stringify(dbData.omrConfig) ? prev : dbData.omrConfig);
          }
        }
      } catch (err) {
        console.warn("Local server DB polling failed:", err);
      }
    };

    const interval = setInterval(pollLocalServer, 8000); // Poll every 8 seconds
    return () => clearInterval(interval);
  }, [isLocalServerMode, currentUserId, localServerUrl, userRole]);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const getSetFromStorage = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return new Set<string>(JSON.parse(stored));
    } catch {}
    return new Set<string>();
  };

  const deletedImageIds = useRef<Set<string>>(
    getSetFromStorage("deleted_image_ids"),
  );
  const deletedHistoryIds = useRef<Set<string>>(
    getSetFromStorage("deleted_history_ids"),
  );
  const unpushedImageIds = useRef<Set<string>>(
    getSetFromStorage("unpushed_image_ids"),
  );
  const unpushedHistoryIds = useRef<Set<string>>(
    getSetFromStorage("unpushed_history_ids"),
  );
  const currentSessionCaptureIds = useRef<Set<string>>(new Set());
  const uploadingRef = useRef<Set<string>>(new Set());
  const [activeUploadingIds, setActiveUploadingIds] = useState<string[]>([]);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});

  const addToUploading = (ids: string[]) => {
    ids.forEach((id) => uploadingRef.current.add(id));
    setActiveUploadingIds(Array.from(uploadingRef.current));
  };

  const removeFromUploading = (id: string) => {
    uploadingRef.current.delete(id);
    setActiveUploadingIds(Array.from(uploadingRef.current));
  };

  const registerCurrentSessionCaptureId = (id: string) => {
    currentSessionCaptureIds.current.add(id);
  };

  const addDeletedImageId = (id: string) => {
    deletedImageIds.current.add(id);
    localStorage.setItem(
      "deleted_image_ids",
      JSON.stringify(Array.from(deletedImageIds.current)),
    );
    if (isLocalServerMode) {
      fetch(`${localServerUrl}/api/local-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedImageIds: [id], userId: currentUserId }),
      }).catch((err) => console.warn("Failed to sync image deletion to local server:", err));
    } else if (!firestoreQuotaExceeded) {
      setDoc(
        doc(db, "globals", "appData"),
        { deletedImageIds: arrayUnion(id) },
        { merge: true }
      ).catch((err) => console.warn("Failed to sync image deletion to firestore:", err));
    }
  };

  const addDeletedHistoryId = (id: string) => {
    deletedHistoryIds.current.add(id);
    localStorage.setItem(
      "deleted_history_ids",
      JSON.stringify(Array.from(deletedHistoryIds.current)),
    );
    if (isLocalServerMode) {
      fetch(`${localServerUrl}/api/local-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedHistoryIds: [id], userId: currentUserId }),
      }).catch((err) => console.warn("Failed to sync history deletion to local server:", err));
    } else if (!firestoreQuotaExceeded) {
      setDoc(
        doc(db, "globals", "appData"),
        { deletedHistoryIds: arrayUnion(id) },
        { merge: true }
      ).catch((err) => console.warn("Failed to sync history deletion to firestore:", err));
    }
  };

  const addUnpushedImageId = (id: string) => {
    unpushedImageIds.current.add(id);
    localStorage.setItem(
      "unpushed_image_ids",
      JSON.stringify(Array.from(unpushedImageIds.current)),
    );
  };

  const addUnpushedHistoryId = (id: string) => {
    unpushedHistoryIds.current.add(id);
    localStorage.setItem(
      "unpushed_history_ids",
      JSON.stringify(Array.from(unpushedHistoryIds.current)),
    );
  };

  const clearImageTracking = () => {
    deletedImageIds.current.clear();
    deletedHistoryIds.current.clear();
    unpushedImageIds.current.clear();
    unpushedHistoryIds.current.clear();
    localStorage.removeItem("deleted_image_ids");
    localStorage.removeItem("deleted_history_ids");
    localStorage.removeItem("unpushed_image_ids");
    localStorage.removeItem("unpushed_history_ids");
  };

  const getStructureLabel = (id: string) => {
    const s = examStructures.find((struct) => struct.id === id);
    return s ? s.name : "Không xác định";
  };

  const handleConfigCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length > 4) val = val.substring(0, 4);
    setConfigExamCode(val);

    const existingConfig = examConfigs.find(
      (c) => c.code === val && c.name === getStructureLabel(configStructureId),
    );
    if (val.length === 4 && existingConfig) {
      setConfigStructureId(existingConfig.structureId);
      setConfigKey(existingConfig.key);
    } else if (val.length === 4) {
      // Reset to empty or default for new code
      setConfigKey(getDefaultKey(configStructureId, examStructures));
    }
  };

  const downloadExcelTemplate = () => {
    const s = examStructures.find((struct) => struct.id === configStructureId);
    if (!s) return;

    const data: any[] = [];
    data.push({
      Phần: "Mã đề",
      Câu: "",
      "Đáp án": configExamCode || "0001 (Sửa thành mã đề 4 chữ số)",
    });

    if (s.part1?.active) {
      for (let i = 0; i < s.part1.numQuestions; i++) {
        data.push({
          Phần: "1",
          Câu: String(i + 1),
          "Đáp án": (configKey.part1 && configKey.part1[i]) || "A",
        });
      }
    }
    if (s.part2?.active) {
      for (let i = 0; i < s.part2.numQuestions; i++) {
        const defaultAns =
          (configKey.part2 &&
            configKey.part2[i] &&
            configKey.part2[i].answers.join(",")) ||
          "Đ,S,Đ,S";
        data.push({ Phần: "2", Câu: String(i + 1), "Đáp án": defaultAns });
      }
    }
    if (s.part3?.active) {
      for (let i = 0; i < s.part3.numQuestions; i++) {
        const defaultAns =
          (configKey.part3 &&
            configKey.part3[i] &&
            configKey.part3[i].answer) ||
          "1.25";
        data.push({ Phần: "3", Câu: String(i + 1), "Đáp án": defaultAns });
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dap an");
    XLSX.writeFile(wb, `Mau_Dap_An_${s.name}.xlsx`);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let newConfigKey: ExamAnswers = {
          part1: [],
          part2: [],
          part3: [],
        };
        let newCode = "";

        data.forEach((row: any) => {
          const part = String(row["Phần"]).trim();
          const qStr = String(row["Câu"]).trim();
          const ans = String(row["Đáp án"]).trim();

          if (part.toLowerCase() === "mã đề" || part.toLowerCase() === "mã") {
            const cleanCode = ans.replace(/[^0-9]/g, "");
            if (cleanCode.length > 0) newCode = cleanCode;
          } else if (part === "1" || part === "I") {
            const qNum = parseInt(qStr) - 1;
            if (!isNaN(qNum) && qNum >= 0) {
              const char = ans.toUpperCase().charAt(0);
              const finalAns = ["A", "B", "C", "D"].includes(char) ? char : "";
              newConfigKey.part1[qNum] = finalAns;
            }
          } else if (part === "2" || part === "II") {
            const qNum = parseInt(qStr) - 1;
            if (!isNaN(qNum) && qNum >= 0) {
              const parts = ans.split(",").map((x) => {
                const xUp = x.trim().toUpperCase();
                return ["Đ", "S", "D"].includes(xUp)
                  ? xUp === "D"
                    ? "Đ"
                    : xUp
                  : "";
              });
              while (parts.length < 4) parts.push("");
              newConfigKey.part2[qNum] = {
                questionNumber: qNum + 1,
                answers: parts.slice(0, 4),
              };
            }
          } else if (part === "3" || part === "III") {
            const qNum = parseInt(qStr) - 1;
            if (!isNaN(qNum) && qNum >= 0) {
              newConfigKey.part3[qNum] = {
                questionNumber: qNum + 1,
                answer: ans,
              };
            }
          }
        });

        const s = examStructures.find(
          (struct) => struct.id === configStructureId,
        );
        if (s) {
          if (s.part1?.active) {
            for (let i = 0; i < s.part1.numQuestions; i++) {
              if (!newConfigKey.part1[i]) newConfigKey.part1[i] = "";
            }
          }
          if (s.part2?.active) {
            for (let i = 0; i < s.part2.numQuestions; i++) {
              if (!newConfigKey.part2[i])
                newConfigKey.part2[i] = {
                  questionNumber: i + 1,
                  answers: ["", "", "", ""],
                };
              while (newConfigKey.part2[i].answers.length < 4)
                newConfigKey.part2[i].answers.push("");
            }
          }
          if (s.part3?.active) {
            for (let i = 0; i < s.part3.numQuestions; i++) {
              if (!newConfigKey.part3[i])
                newConfigKey.part3[i] = { questionNumber: i + 1, answer: "" };
            }
          }
        }

        setConfigKey(newConfigKey);
        if (newCode) {
          let limitCode = newCode.slice(0, 4);
          const existingConfig = examConfigs.find(
            (c) =>
              c.code === limitCode &&
              c.name === getStructureLabel(configStructureId),
          );
          if (existingConfig) {
            setConfigExamCode(existingConfig.code);
            setIsCreatingNewExamCode(false);
          } else {
            setConfigExamCode(limitCode);
            setIsCreatingNewExamCode(true);
          }
        }

        setDialogState({
          type: "alert",
          message: "Nhập đáp án từ Excel thành công!",
        });
      } catch (err: any) {
        console.error(err);
        setDialogState({
          type: "alert",
          message: "Lỗi đọc file Excel: " + err.message,
        });
      }
    };
    if (file) reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleConfigStructureChange = (id: string) => {
    setConfigStructureId(id);
    const structName = examStructures.find((s) => s.id === id)?.name;
    const existingConfigsForId = examConfigs.filter(
      (c) => c.name === structName,
    );

    if (existingConfigsForId.length > 0) {
      const match = existingConfigsForId.find((c) => c.code === configExamCode);
      if (match) {
        setConfigKey(match.key);
      } else {
        setConfigExamCode(existingConfigsForId[0].code);
        setConfigKey(existingConfigsForId[0].key);
      }
      setIsCreatingNewExamCode(false);
    } else {
      setConfigExamCode("");
      setConfigKey(getDefaultKey(id, examStructures));
      setIsCreatingNewExamCode(true);
    }
  };

  const deleteConfig = () => {
    setDialogState({
      type: "confirm",
      message: `Chắc chắn xóa cấu hình cho mã đề ${configExamCode}?`,
      onConfirm: () => {
        setExamConfigs((prev) =>
          prev.filter(
            (c) =>
              !(
                c.code === configExamCode &&
                c.name === getStructureLabel(configStructureId)
              ),
          ),
        );
        setDialogState({
          type: "alert",
          message: "Đã xóa mã đề " + configExamCode,
        });
      },
    });
  };

  const saveConfig = () => {
    if (configExamCode.length < 4) {
      setDialogState({ type: "alert", message: "Mã đề phải có 4 chữ số" });
      return;
    }
    const finalConfigName = getStructureLabel(configStructureId);
    setExamConfigs((prev) => {
      const next = prev.filter(
        (c) => !(c.code === configExamCode && c.name === finalConfigName),
      );
      return [
        ...next,
        {
          structureId: configStructureId,
          key: configKey,
          name: finalConfigName,
          code: configExamCode,
        },
      ];
    });
    setGradeExamName(finalConfigName);
    setIsCreatingNewExamCode(false);
    setDialogState({
      type: "alert",
      message: "Đã lưu cấu hình đáp án cho mã đề " + configExamCode,
    });
  };

  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim() && !classes.includes(newClassName.trim())) {
      setClasses([...classes, newClassName.trim()]);
      setActiveClass(newClassName.trim());
      setNewClassName("");
    }
  };

  const startEditClass = (index: number) => {
    setEditingClassIndex(index);
    setEditClassName(classes[index]);
  };

  const saveEditClass = () => {
    if (editingClassIndex === null || !editClassName.trim()) return;
    if (
      editClassName.trim() !== classes[editingClassIndex] &&
      classes.includes(editClassName.trim())
    ) {
      setDialogState({ type: "alert", message: "Tên lớp đã tồn tại." });
      return;
    }

    const oldName = classes[editingClassIndex];
    const newName = editClassName.trim();

    setClasses((prev) => {
      const next = [...prev];
      next[editingClassIndex] = newName;
      return next;
    });

    setScanHistory((prev) => {
      const next = prev.map((item) => {
        if (item.className === oldName) {
          addUnpushedHistoryId(item.id);
          return { ...item, className: newName, updatedAt: Date.now() };
        }
        return item;
      });
      localforage.setItem(`autograde_history_${currentUserId}`, next);
      return next;
    });

    if (activeClass === oldName) {
      setActiveClass(newName);
    }
    setEditingClassIndex(null);
    setEditClassName("");
  };

  const deleteClass = (index: number) => {
    const classNameToDel = classes[index];
    setDialogState({
      type: "confirm",
      message: `Chắc chắn xóa lớp ${classNameToDel}?`,
      onConfirm: () => {
        setClasses((prev) => {
          const next = [...prev];
          next.splice(index, 1);
          if (activeClass === classNameToDel) {
            setActiveClass(next.length > 0 ? next[0] : "");
          }
          return next;
        });
        if (editingClassIndex === index) {
          setEditingClassIndex(null);
          setEditClassName("");
        }
      },
    });
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
       const imageBase64 = webcamRef.current.getScreenshot();
       if (imageBase64) {
         const newId = Date.now().toString() + Math.random().toString();
         addUnpushedImageId(newId);
         registerCurrentSessionCaptureId(newId);
         compressImage(imageBase64).then((compressed) => {
           setImages((prev) => [
             ...prev,
             {
               id: newId,
               src: compressed,
               selected: true,
               status: "pending",
               examName: gradeExamName,
               classId: activeClass,
               userId: currentUserId || undefined,
             },
           ]);
         }).catch(() => {
           setImages((prev) => [
             ...prev,
             {
               id: newId,
               src: imageBase64,
               selected: true,
               status: "pending",
               examName: gradeExamName,
               classId: activeClass,
               userId: currentUserId || undefined,
             },
           ]);
         });
       }
    }
  }, [webcamRef, gradeExamName, activeClass, currentUserId]);

  const toggleAutoScan = () => {
    if (isAutoScanning) {
      setIsAutoScanning(false);
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    } else {
      setIsAutoScanning(true);
      handleCapture(); // Capture immediately
      autoScanTimerRef.current = setInterval(() => {
        handleCapture();
      }, scannerConfig.interval * 1000);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole === "ADMIN") {
      alert("Tài khoản quản trị admin không có quyền tải ảnh lên.");
      return;
    }
    const files = event.target.files;
    if (files && files.length > 0) {
      setGlobalProcessing(true);
      const fileList = Array.from(files);
      const processedItems: any[] = [];

      // Process in small batches of 3 to optimize main thread CPU usage and memory
      const limit = 3;
      for (let i = 0; i < fileList.length; i += limit) {
        const chunk = fileList.slice(i, i + limit);
        await Promise.all(
          chunk.map((file: any) => {
            return new Promise<void>(async (resolve) => {
              try {
                const compressed = await compressImage(file);
                if (compressed) {
                  const newId = Date.now().toString() + Math.random().toString();
                  processedItems.push({
                    id: newId,
                    src: compressed,
                    selected: true,
                    status: "pending",
                    examName: gradeExamName,
                    classId: activeClass,
                    userId: currentUserId || undefined,
                  });
                }
              } catch (err) {
                console.error("Compression failed for file: ", err);
              } finally {
                resolve();
              }
            });
          })
        );
      }

      if (processedItems.length > 0) {
        // Safe synchronous updates
        processedItems.forEach((item) => {
          addUnpushedImageId(item.id);
          registerCurrentSessionCaptureId(item.id);
        });
        // Batch set state once to prevent multiple expensive re-renders and worker runs
        setImages((prev) => [...prev, ...processedItems]);
      }
      setGlobalProcessing(false);
    }
    // reset input so same files can be chosen again
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleReferenceUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: any) => {
        // limit to 3 reference images
        setReferenceImages((prev) => {
          if (prev.length >= 3) return prev;
          return [
            ...prev,
            { base64: "", mimeType: file.type || "image/jpeg", _file: file },
          ] as any;
        });

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          // Extract base64 part
          const base64Str = result.split(",")[1] || result;

          setReferenceImages((prev) => {
            // update the item with the actual base64
            return prev.map((img) => {
              if ((img as any)._file === file) {
                return { base64: base64Str, mimeType: img.mimeType };
              }
              return img;
            });
          });
        };
        reader.readAsDataURL(file);
      });
    }
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => [
      ...prev.slice(0, index),
      ...prev.slice(index + 1),
    ]);
  };

  const userScanHistory = scanHistory.filter((item) => {
    const itemSessionId = item.sessionId || "SESSION_DEFAULT";
    if (itemSessionId !== activeSessionId) return false;

    if (isUserConstrained) {
      const assignedClasses = currentUserData?.assignedClasses || [];
      const assignedExams = currentUserData?.assignedExams || [];
      const assignedSessions = currentUserData?.assignedSessions || [];

      if (assignedClasses.length > 0) {
        if (!item.className || !assignedClasses.includes(item.className))
          return false;
      }
      if (assignedExams.length > 0) {
        if (!item.examName || !assignedExams.includes(item.examName))
          return false;
      }
      if (assignedSessions.length > 0) {
        if (!assignedSessions.includes(itemSessionId))
          return false;
      }
    }
    return true;
  });

  const activeClassHistory = userScanHistory.filter((item) => {
    if (historyClassFilter !== "ALL" && item.className !== historyClassFilter)
      return false;
    if (
      historyExamFilter !== "ALL" &&
      item.examName &&
      item.examName !== historyExamFilter
    )
      return false;
    if (historyErrorFilter === "ERROR") {
      const isError =
        !item.studentId ||
        item.studentId === "Chưa rõ" ||
        item.studentId.includes("?") ||
        !item.examCode ||
        item.examCode === "Chưa rõ" ||
        item.examCode.includes("?");
      if (!isError) return false;
    }
    if (historyErrorFilter === "DUP_SBD") {
      const validSBD =
        item.studentId &&
        item.studentId !== "Chưa rõ" &&
        !item.studentId.includes("?");
      if (!validSBD) return false;
      const count = scanHistory.filter(
        (x) =>
          x.studentId === item.studentId &&
          x.className === item.className &&
          x.examName === item.examName,
      ).length;
      if (count <= 1) return false;
    }
    if (historyErrorFilter === "DUP_MAD") {
      const validMAD =
        item.examCode &&
        item.examCode !== "Chưa rõ" &&
        !item.examCode.includes("?");
      if (!validMAD) return false;
      const count = scanHistory.filter(
        (x) =>
          x.examCode === item.examCode &&
          x.className === item.className &&
          x.examName === item.examName,
      ).length;
      if (count <= 1) return false;
    }
    if (historySearchPhrase.trim()) {
      const terms = historySearchPhrase.toLowerCase().trim().split(/\s+/);
      const studentId = (item.studentId || "").toLowerCase();
      const examCode = (item.examCode || "").toLowerCase();
      const className = (item.className || "").toLowerCase();
      const studentName = (item.studentName || "").toLowerCase();

      for (const term of terms) {
        if (
          !studentId.includes(term) &&
          !examCode.includes(term) &&
          !className.includes(term) &&
          !studentName.includes(term)
        ) {
          return false;
        }
      }
    }
    return true;
  });

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const deleteSelectedHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userHasDeleteResults) {
      setDialogState({
        type: "alert",
        variant: "danger",
        message: "Tài khoản của bạn không có quyền Xoá kết quả chấm.",
      });
      return;
    }
    const idsToDelete = [...selectedHistoryIds];
    if (idsToDelete.length === 0) return;

    // 1. Immediately update UI and state locally
    const updatedHistory = scanHistory.filter(
      (item) => !idsToDelete.includes(item.id),
    );
    idsToDelete.forEach((id) => {
      deletedHistoryIds.current.add(id);
      unpushedHistoryIds.current.delete(id);
    });
    localStorage.setItem(
      "deleted_history_ids",
      JSON.stringify(Array.from(deletedHistoryIds.current)),
    );
    localStorage.setItem(
      "unpushed_history_ids",
      JSON.stringify(Array.from(unpushedHistoryIds.current)),
    );

    setScanHistory(updatedHistory);
    setSelectedHistoryIds([]);
    if (selectedResult && idsToDelete.includes(selectedResult.id)) {
      setSelectedResult(null);
    }

    // Immediately process updated images list to clear results and revert status
    const updatedImages = images.map((img) => {
      if (img.result && idsToDelete.includes(img.result.id)) {
        if (img.rawAnswers) {
          return {
            ...img,
            status: "scanned",
            errorMsg: undefined,
            result: undefined,
          };
        } else {
          return {
            ...img,
            status: "pending",
            errorMsg: "Đã xóa kết quả, cần nhận dạng và chấm lại",
            result: undefined,
          };
        }
      }
      return img;
    });

    setImages(updatedImages);

    // 2. Save updated history and images immediately to localforage
    try {
      await localforage.setItem(`autograde_history_${currentUserId}`, updatedHistory);
      await localforage.setItem(`autograde_images_${currentUserId}`, updatedImages);
    } catch (err) {
      console.error("Failed to save localforage history/images immediately:", err);
    }

    // 3. Sync deletions and images to local server (if local server mode)
    if (isLocalServerMode) {
      try {
        const imagesWithOwner = updatedImages.map((img: any) => ({
          ...img,
          userId: img.userId || currentUserId
        }));
        await fetch(`${localServerUrl}/api/local-db`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deletedHistoryIds: idsToDelete,
            images: imagesWithOwner,
            userId: currentUserId
          }),
        });
      } catch (err) {
        console.warn("Failed to sync history deletion and updated images to local server:", err);
      }
    }

    // 4. Update Firestore in the background (asynchronous non-blocking)
    if (!isLocalServerMode && !firestoreQuotaExceeded) {
      // background firestore deletion
      (async () => {
        try {
          const batch = writeBatch(db);
          idsToDelete.forEach((id) => {
            batch.delete(doc(db, "scanHistory", id));
          });
          await batch.commit();

          // Sync deletedHistoryIds to appData global
          await setDoc(
            doc(db, "globals", "appData"),
            { deletedHistoryIds: arrayUnion(...idsToDelete) },
            { merge: true }
          );
        } catch (e: any) {
          console.error("Failed to delete from Firebase:", e);
          if (isQuotaError(e)) {
            setQuotaExceeded();
          }
        }
      })();

      // update queue
      const targetQueueUserId = activeQueueUserId || currentUserId;
      if (targetQueueUserId) {
        const cleanImages = updatedImages.map((img: any) => {
          const { isLocalSelected, isUploadingToFirebase, ...rest } = img;
          return rest;
        });
        setDoc(
          doc(db, "globals", `scanQueue_${targetQueueUserId}`),
          { images: stripDataUrls(cleanImages), updatedAt: Date.now() },
          { merge: true }
        ).catch((err) => {
          console.error("Failed to immediate-sync scanQueue to Firestore:", err);
        });
      }
    }
  };

  const recalculateSelectedHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedHistoryIds.length === 0) return;

    const newHistory = scanHistory.map((item) => {
      if (selectedHistoryIds.includes(item.id)) {
        const detectedCode =
          item.examCode || item.studentAnswers?.examCode?.trim() || "";
        const currentConfig =
          examConfigs.find(
            (c) => c.code === detectedCode && c.name === item.examName,
          ) || examConfigs.find((c) => c.code === detectedCode);
        if (currentConfig && item.rawAnswers) {
          const currentStructure = examStructures.find(
            (s) => s.id === currentConfig.structureId,
          );
          if (currentStructure) {
            const result = calculateScore(
              item.rawAnswers,
              currentConfig.key,
              currentStructure,
            );
            return {
              ...item,
              score: result.totalScore,
              resultDetails: result.resultDetails,
              updatedAt: Date.now(),
            };
          }
        }
      }
      return item;
    });

    selectedHistoryIds.forEach((id) => addUnpushedHistoryId(id));

    setScanHistory(newHistory);
    setSelectedHistoryIds([]);
    if (selectedResult && selectedHistoryIds.includes(selectedResult.id)) {
      setSelectedResult(
        newHistory.find((i) => i.id === selectedResult.id) || null,
      );
    }
    await localforage.setItem(`autograde_history_${currentUserId}`, newHistory);
    setDialogState({ type: "alert", message: "Cập nhật lại điểm thành công!" });
  };

  const rescanSelectedHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedHistoryIds.length === 0) return;

    const itemsToRescan = scanHistory.filter((item) =>
      selectedHistoryIds.includes(item.id),
    );
    const newImages = itemsToRescan
      .filter((i) => i.imageSrc || i.firebaseImageUrl || ((isLocalServerMode || isLocalEnvironment()) && i.id))
      .map((item) => {
        const newId = Date.now().toString() + Math.random().toString();
        addUnpushedImageId(newId);
        registerCurrentSessionCaptureId(newId);
        const resolvedSrc = resolveLocalUrl(item.firebaseImageUrl || item.imageSrc) || ((isLocalServerMode || isLocalEnvironment()) ? getLocalServerConstructedUrl(item) : "");
        return {
          id: newId,
          src: resolvedSrc,
          selected: true,
          status: "pending",
          examName: gradeExamName,
          classId: activeClass,
          userId: item.userId || currentUserId || undefined,
        };
      });

    setImages((prev) => [...newImages, ...prev]);
    setActiveTab("scan");
    setSelectedHistoryIds([]);
    setDialogState({
      type: "alert",
      message: `Đã đưa ${newImages.length} ảnh sang tab Chấm Điểm để quét lại.`,
    });
  };

  const regradeSingleResultInline = async (resultId: string) => {
    const match = scanHistory.find((i) => i.id === resultId);
    if (!match) return;

    const sourceImageToProcess =
      resolveLocalUrl(match.originalImageSrc || match.imageSrc || match.firebaseImageUrl) ||
      ((isLocalServerMode || isLocalEnvironment()) ? getLocalServerConstructedUrl(match) : "");

    if (!sourceImageToProcess) return;

    setGlobalProcessing(true);
    try {
      const processedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 768;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.60));
          } else {
            resolve(sourceImageToProcess);
          }
        };
        img.src = sourceImageToProcess;
      });

      let studentAnswers;
      const canvas = document.createElement("canvas");
      const imgEl = new window.Image();
      await new Promise((res) => {
        imgEl.onload = res;
        imgEl.src = processedDataUrl;
      });
      canvas.width = imgEl.width;
      canvas.height = imgEl.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(imgEl, 0, 0);

      let baseConf = match.customConfig || globalOMRConfig || DEFAULT_OMR_CONFIG;
      const omrConfig: OMRConfig = {
        paperWidth: baseConf.paperWidth,
        paperHeight: baseConf.paperHeight,
        sensitivity: baseConf.sensitivity,
        regions: baseConf.regions,
      };

      const refs = referenceImages.filter((r) => r.base64).map((r) => r.base64);
      const calibTemplate = getSafeStorage("omr_template_calibration_img");
      if (calibTemplate && refs.length === 0) {
        if (calibTemplate.startsWith("http") || calibTemplate.startsWith("data:")) {
          refs.push(calibTemplate);
        } else {
          const calibBase64 = calibTemplate.split(",")[1] || calibTemplate;
          refs.push(calibBase64);
        }
      }

      studentAnswers = await processOMR(canvas, omrConfig, refs);

      if (studentAnswers) {
        if (studentAnswers.debugImageBase64) {
          delete studentAnswers.debugImageBase64;
        }
        const warpedImage = studentAnswers.warpedDataUrl;
        if (warpedImage) {
          delete studentAnswers.warpedDataUrl;
        }

        const detectedCode = studentAnswers?.examCode?.trim() || "";
        const currentConfig =
          examConfigs.find(
            (c) => c.name === match.examName && detectedCode === c.code,
          ) || examConfigs.find((c) => c.code === detectedCode);

        if (currentConfig) {
          const currentStructure = examStructures.find(
            (s) => s.id === currentConfig.structureId,
          );
          if (currentStructure) {
            let cleanStudentAnswers = { ...studentAnswers };
            // Merge any custom ID entered by user back in if OMR failed completely to read valid ID earlier?
            // If the user expects to fully re-recognize, it should overwrite.
            const gradeResult = calculateScore(
              cleanStudentAnswers,
              currentConfig.key,
              currentStructure,
            );

            const updatedItem = {
              ...match,
              imageSrc:
                warpedImage ||
                processedDataUrl ||
                match.imageSrc ||
                match.firebaseImageUrl,
              originalImageSrc:
                match.originalImageSrc ||
                match.imageSrc ||
                match.firebaseImageUrl,
              rawAnswers: cleanStudentAnswers,
              examCode: detectedCode,
              studentId:
                cleanStudentAnswers?.studentId?.trim() || match.studentId,
              score: gradeResult.totalScore,
              resultDetails: gradeResult.resultDetails,
              updatedAt: Date.now(),
            };

            setScanHistory((prev) => {
              addUnpushedHistoryId(resultId);
              const next = prev.map((p) =>
                p.id === resultId ? updatedItem : p,
              );
              localforage.setItem(`autograde_history_${currentUserId}`, next);
              return next;
            });

            if (selectedResult && selectedResult.id === resultId) {
              setSelectedResult(updatedItem);
            }

            setDialogState({
              type: "alert",
              message: "Đã nhận dạng và chấm lại thành công!",
            });
          } else {
            setDialogState({
              type: "alert",
              message:
                "Nhận dạng thành công nhưng không tìm thấy cấu trúc chuẩn cho mã đề " +
                detectedCode,
            });
          }
        } else {
          setDialogState({
            type: "alert",
            message: "Không tìm thấy đáp án cho mã đề " + detectedCode,
          });
        }
      } else {
        setDialogState({
          type: "alert",
          message: "Lỗi nhận dạng ảnh (có thể ảnh mờ hoặc không đúng format).",
        });
      }
    } catch (e: any) {
      setDialogState({ type: "alert", message: "Lỗi OpenCV: " + String(e) });
    } finally {
      setGlobalProcessing(false);
    }
  };

  const exportCsv = () => {
    if (activeClassHistory.length === 0) return;
    const header = "STT,SoBaoDanh,HoVaTen,Lop,MaDe,Diem,ThoiGian\n";

    const sortedHistory = [...activeClassHistory].sort((a, b) => {
      const sIdA = a.studentId || "";
      const sIdB = b.studentId || "";
      return sIdA.localeCompare(sIdB, undefined, { numeric: true });
    });

    const rows = sortedHistory
      .map((item, idx) => {
        const stt = idx + 1;
        const timeStr =
          item.timestamp instanceof Date && !isNaN(item.timestamp.getTime())
            ? item.timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();
        return `${stt},${item.studentId || ""},"",${item.className},${item.examCode || ""},${(item.score || 0).toFixed(2)},${timeStr}`;
      })
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const clsName =
      historyClassFilter === "ALL" ? "TatCaLop" : historyClassFilter;
    const examNameStr =
      historyExamFilter === "ALL"
        ? "TatCaMon"
        : historyExamFilter.replace(/\s+/g, "");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bang_Diem_${clsName}_${examNameStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDetailedCsv = () => {
    if (activeClassHistory.length === 0) return;

    // Find max questions from resultDetails
    let maxP1 = 0;
    let maxP2 = 0;
    let maxP3 = 0;

    activeClassHistory.forEach((item) => {
      if (!item.resultDetails) return;
      if (item.resultDetails.part1 && item.resultDetails.part1.length > maxP1)
        maxP1 = item.resultDetails.part1.length;
      if (item.resultDetails.part2 && item.resultDetails.part2.length > maxP2)
        maxP2 = item.resultDetails.part2.length;
      if (item.resultDetails.part3 && item.resultDetails.part3.length > maxP3)
        maxP3 = item.resultDetails.part3.length;
    });

    const headers = [
      "STT",
      "SoBaoDanh",
      "HoVaTen",
      "Lop",
      "MaDe",
      "Diem",
      "ThoiGian",
    ];

    if (maxP1 > 0) headers.push("---PHẦN 1---");
    for (let i = 1; i <= maxP1; i++) {
      headers.push(`P1_Câu${i}_HS`, `P1_Câu${i}_ĐA`);
    }

    if (maxP2 > 0) headers.push("---PHẦN 2---");
    for (let i = 1; i <= maxP2; i++) {
      ["a", "b", "c", "d"].forEach((ch) => {
        headers.push(`P2_Câu${i}${ch}_HS`, `P2_Câu${i}${ch}_ĐA`);
      });
    }

    if (maxP3 > 0) headers.push("---PHẦN 3---");
    for (let i = 1; i <= maxP3; i++) {
      headers.push(`P3_Câu${i}_HS`, `P3_Câu${i}_ĐA`);
    }

    const headerRow = headers.join(",") + "\n";

    const sortedHistory = [...activeClassHistory].sort((a, b) => {
      const sIdA = a.studentId || "";
      const sIdB = b.studentId || "";
      return sIdA.localeCompare(sIdB, undefined, { numeric: true });
    });

    const rows = sortedHistory
      .map((item, idx) => {
        const stt = idx + 1;
        const timeStr =
          item.timestamp instanceof Date && !isNaN(item.timestamp.getTime())
            ? item.timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();

        const rowData = [
          stt,
          item.studentId || "",
          "",
          item.className,
          item.examCode || "",
          (item.score || 0).toFixed(2),
          timeStr,
        ];
        const details = item.resultDetails || {
          part1: [],
          part2: [],
          part3: [],
        };

        // Part 1
        if (maxP1 > 0) rowData.push("");
        for (let i = 0; i < maxP1; i++) {
          const q = details.part1?.[i];
          rowData.push(q?.student || "", q?.key || "");
        }

        // Part 2
        if (maxP2 > 0) rowData.push("");
        for (let i = 0; i < maxP2; i++) {
          const q = details.part2?.[i];
          for (let j = 0; j < 4; j++) {
            const sub = q?.itemDetails?.[j];
            rowData.push(sub?.student || "", sub?.key || "");
          }
        }

        // Part 3
        if (maxP3 > 0) rowData.push("");
        for (let i = 0; i < maxP3; i++) {
          const q = details.part3?.[i];
          // Fix string issue with commas in answers
          const sAns = q?.student
            ? `"${String(q.student).replace(/"/g, '""')}"`
            : "";
          const kAns = q?.key ? `"${String(q.key).replace(/"/g, '""')}"` : "";
          rowData.push(sAns, kAns);
        }

        return rowData.join(",");
      })
      .join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headerRow + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const clsName =
      historyClassFilter === "ALL" ? "TatCaLop" : historyClassFilter;
    const examNameStr =
      historyExamFilter === "ALL"
        ? "TatCaMon"
        : historyExamFilter.replace(/\s+/g, "");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Chi_Tiet_Bai_Lam_${clsName}_${examNameStr}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateDrawnCanvasUrl = async (item: any): Promise<string | null> => {
    const url = item.firebaseImageUrl || item.imageSrc || "";
    let preferredUrl = resolveLocalUrl(url);
    if (!preferredUrl && item.id && (isLocalServerMode || isLocalEnvironment())) {
      preferredUrl = getLocalServerConstructedUrl(item);
    }
    if (!preferredUrl) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.src = preferredUrl;
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    } catch (err) {
      if (url && preferredUrl !== url) {
        console.warn("Local image loading failed in generateDrawnCanvasUrl, trying fallback:", url);
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      } else {
        throw err;
      }
    }

    const headerHeight = 90;
    canvas.width = img.width;
    canvas.height = img.height + headerHeight;

    // Draw white background for header
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image shifted by headerHeight
    ctx.drawImage(img, 0, headerHeight);

    // Draw header text
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px sans-serif";

    const details =
      item.resultDetails?.resultDetails || item.resultDetails || {};
    const p1Score = (details.part1 || []).reduce(
      (acc: number, cur: any) => acc + (cur.points || 0),
      0,
    );
    const p2Score = (details.part2 || []).reduce(
      (acc: number, cur: any) => acc + (cur.points || 0),
      0,
    );
    const p3Score = (details.part3 || []).reduce(
      (acc: number, cur: any) => acc + (cur.points || 0),
      0,
    );

    ctx.fillText(`SBD: ${item.studentId || ""}`, 20, 56);
    ctx.fillText(`Mã đề: ${item.examCode || ""}`, 220, 56);

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`TỔNG ĐIỂM: ${Number((item.score || 0).toFixed(2))}`, 480, 56);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#000000";

    const p1Correct = (details.part1 || []).filter(
      (q: any) => q.isCorrect,
    ).length;
    const p1Total = (details.part1 || []).length;
    const p1Str = `P1: ${p1Correct}/${p1Total} = ${Number(p1Score.toFixed(2))}`;

    const p2DetailsStr =
      (details.part2 || []).length > 0
        ? (details.part2 || []).map((q: any) => `${q.correctCount}/4`).join(";")
        : "0/0";
    const p2Str = `P2: ${p2DetailsStr} = ${Number(p2Score.toFixed(2))}`;

    const p3Correct = (details.part3 || []).filter(
      (q: any) => q.isCorrect,
    ).length;
    const p3Total = (details.part3 || []).length;
    const p3Str = `P3: ${p3Correct}/${p3Total} = ${Number(p3Score.toFixed(2))}`;

    ctx.fillText(p1Str, 20, 84);
    const p1Width = ctx.measureText(p1Str).width;
    ctx.fillText(p2Str, 20 + p1Width + 20, 84);
    const p2Width = ctx.measureText(p2Str).width;
    ctx.fillText(p3Str, 20 + p1Width + 20 + p2Width + 20, 84);

    const r = 5;
    const drawCircle = (
      cx: number,
      cy: number,
      type: "correct" | "wrong" | "missed",
    ) => {
      const shiftedCy = cy + headerHeight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, shiftedCy, r, r, 0, 0, 2 * Math.PI);
      if (type === "correct") {
        ctx.strokeStyle = "#22c55e";
        ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
      } else if (type === "wrong") {
        ctx.strokeStyle = "#ef4444";
        ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
      } else {
        ctx.strokeStyle = "#fbbf24";
        ctx.fillStyle = "rgba(251, 191, 36, 0.4)";
      }
      ctx.fill();
      ctx.stroke();
    };

    // Part 1
    item.rawAnswers?.rawPart1?.forEach((ansItem: any) => {
      const detail = item.resultDetails?.part1?.find(
        (d: any) => d.q === Number(ansItem.questionNumber),
      );
      if (!detail || !ansItem.options) return;
      const correctIndex = ["A", "B", "C", "D"].indexOf(
        String(detail.key).trim().toUpperCase(),
      );

      ansItem.options.forEach((opt: any) => {
        const isCorrectCell = opt.c === correctIndex;
        const isSelectedCell = opt.c === ansItem.selectedC;
        const isDoubleShaded =
          ansItem.selectedList &&
          ansItem.selectedList.some((s: any) => s.c === opt.c) &&
          !isSelectedCell;

        if (isSelectedCell) {
          drawCircle(opt.cx, opt.cy, detail.isCorrect ? "correct" : "wrong");
        } else if (isDoubleShaded) {
          drawCircle(opt.cx, opt.cy, "wrong");
        } else if (isCorrectCell) {
          drawCircle(opt.cx, opt.cy, "missed");
        }
      });
    });

    // Part 2
    item.rawAnswers?.rawPart2?.forEach((ansItem: any) => {
      const detail = item.resultDetails?.part2?.find(
        (d: any) => d.q === Number(ansItem.questionNumber),
      );
      if (!detail || !ansItem.items) return;

      ansItem.items.forEach((subItem: any, j: number) => {
        const itemDetail = detail.itemDetails?.[j];
        if (!itemDetail || !subItem.options) return;

        const isTrueCorrect =
          String(itemDetail.key).trim().toUpperCase() === "Đ";
        const correctIndex = isTrueCorrect ? 0 : 1;

        subItem.options.forEach((opt: any) => {
          const isCorrectCell = opt.c === correctIndex;
          const isSelectedCell = opt.c === subItem.selectedC;
          const isDoubleShaded =
            subItem.selectedList &&
            subItem.selectedList.some((s: any) => s.c === opt.c) &&
            !isSelectedCell;

          if (isSelectedCell) {
            drawCircle(
              opt.cx,
              opt.cy,
              itemDetail.isCorrect ? "correct" : "wrong",
            );
          } else if (isDoubleShaded) {
            drawCircle(opt.cx, opt.cy, "wrong");
          } else if (isCorrectCell && String(itemDetail.key).trim() !== "") {
            drawCircle(opt.cx, opt.cy, "missed");
          }
        });
      });
    });

    // Part 3
    item.rawAnswers?.rawPart3?.forEach((ansItem: any) => {
      const detail = item.resultDetails?.part3?.find(
        (d: any) => d.q === Number(ansItem.questionNumber),
      );
      if (!detail || !ansItem.items) return;

      ansItem.items.forEach((subItem: any) => {
        if (!subItem.options) return;

        subItem.options.forEach((opt: any) => {
          const isSelectedCell = opt.c === subItem.selectedC;
          const isDoubleShaded =
            subItem.selectedList &&
            subItem.selectedList.some((s: any) => s.c === opt.c) &&
            !isSelectedCell;

          if (isSelectedCell) {
            drawCircle(opt.cx, opt.cy, detail.isCorrect ? "correct" : "wrong");
          } else if (isDoubleShaded) {
            drawCircle(opt.cx, opt.cy, "wrong");
          }
        });
      });
    });

    // Student ID
    item.rawAnswers?.rawStudentId?.forEach((colItems: any, cIndex: number) => {
      const currentValStr = item.studentId || "";
      const currentDigitIndex = parseInt(currentValStr[cIndex] || "", 10);

      if (!colItems.options) return;
      colItems.options.forEach((opt: any) => {
        const isCorrectCell =
          !isNaN(currentDigitIndex) && opt.r === currentDigitIndex;
        const isSelectedCell = opt.r === colItems.selectedR;

        if (isSelectedCell) {
          drawCircle(opt.cx, opt.cy, isCorrectCell ? "correct" : "wrong");
        } else if (isCorrectCell) {
          drawCircle(opt.cx, opt.cy, "missed");
        }
      });
    });

    // Exam Code
    item.rawAnswers?.rawExamCode?.forEach((colItems: any, cIndex: number) => {
      const currentValStr = item.examCode || "";
      const currentDigitIndex = parseInt(currentValStr[cIndex] || "", 10);

      if (!colItems.options) return;
      colItems.options.forEach((opt: any) => {
        const isCorrectCell =
          !isNaN(currentDigitIndex) && opt.r === currentDigitIndex;
        const isSelectedCell = opt.r === colItems.selectedR;

        if (isSelectedCell) {
          drawCircle(opt.cx, opt.cy, isCorrectCell ? "correct" : "wrong");
        } else if (isCorrectCell) {
          drawCircle(opt.cx, opt.cy, "missed");
        }
      });
    });

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const createPdfFromItems = async (items: any[], filename: string) => {
    setGlobalProcessing(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.imageSrc && !item.firebaseImageUrl) continue;

        const imgData = await generateDrawnCanvasUrl(item);
        if (!imgData) continue;

        // We need to decode dimensions of the rendered imgData to get aspect ratio
        const dummyImg = new Image();
        dummyImg.src = imgData;
        await new Promise((r) => {
          dummyImg.onload = r;
        });

        // Calculate dimensions to fit within A4 page with margins
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 5; // 5mm margin to avoid printer cutoffs
        let renderWidth = pdfWidth - 2 * margin;
        let targetPdfHeight = (dummyImg.height * renderWidth) / dummyImg.width;

        // Scale down if it exceeds page height
        if (targetPdfHeight > pageHeight - 2 * margin) {
          const scale = (pageHeight - 2 * margin) / targetPdfHeight;
          renderWidth = renderWidth * scale;
          targetPdfHeight = targetPdfHeight * scale;
        }

        const xPos = (pdfWidth - renderWidth) / 2;
        const yPos = 2; // Pull it up to the top with a small 2mm offset

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "JPEG", xPos, yPos, renderWidth, targetPdfHeight);
      }

      pdf.save(filename);
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
    }
    setGlobalProcessing(false);
  };

  const exportSinglePdf = () => {
    if (selectedResult) {
      createPdfFromItems(
        [selectedResult],
        `Bai_Lam_${selectedResult.studentId}_${selectedResult.examCode}.pdf`,
      );
    }
  };

  const exportEditLogsPdf = async () => {
    const editedItems = scanHistory.filter(
      (h) => h.editLogs && h.editLogs.length > 0,
    );
    if (editedItems.length === 0) {
      setDialogState({
        type: "alert",
        message: "Không có dữ liệu chỉnh sửa để xuất!",
      });
      return;
    }

    setGlobalProcessing(true);
    try {
      const reportDiv = document.createElement("div");
      reportDiv.style.position = "absolute";
      reportDiv.style.left = "-9999px";
      reportDiv.style.top = "-9999px";
      reportDiv.style.width = "800px";
      reportDiv.style.padding = "40px";
      reportDiv.style.backgroundColor = "white";
      reportDiv.style.color = "black";
      reportDiv.style.fontFamily = "sans-serif";

      let html = `
        <h1 style="text-align: center; color: #DC2626; margin-bottom: 20px; font-size: 24px; text-transform: uppercase;">BÁO CÁO NHẬT KÝ CHỈNH SỬA ĐIỂM</h1>
        <p style="text-align: center; margin-bottom: 40px; color: #64748b;">Trích xuất lúc: ${new Date().toLocaleString("vi-VN")}</p>
      `;

      // Sort by recently updated based on the last log timestamp
      editedItems.sort((a, b) => {
        const lastA = new Date(
          a.editLogs[a.editLogs.length - 1]?.timestamp || Date.now(),
        ).getTime();
        const lastB = new Date(
          b.editLogs[b.editLogs.length - 1]?.timestamp || Date.now(),
        ).getTime();
        return (isNaN(lastB) ? 0 : lastB) - (isNaN(lastA) ? 0 : lastA);
      });

      const itemsByClass = editedItems.reduce(
        (acc, item) => {
          const className = item.className || "Không xác định";
          if (!acc[className]) {
            acc[className] = [];
          }
          acc[className].push(item);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      Object.keys(itemsByClass)
        .sort()
        .forEach((className) => {
          html += `
          <h2 style="color: #4338ca; margin-top: 40px; margin-bottom: 15px; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">
            Lớp/Phòng: ${className}
          </h2>
        `;

          const itemsInClass = itemsByClass[className];

          itemsInClass.forEach((item: any) => {
            html += `
            <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background-color: #f8fafc;">
              <h3 style="font-size: 15px; margin-top: 0; margin-bottom: 10px; color: #1e293b;">
                Môn: <strong>${item.examName}</strong> - SBD: <strong>${item.studentId}</strong> - Mã đề: <strong>${item.examCode}</strong>
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: white;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 25%;">Thời gian</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 25%;">Người sửa</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; width: 50%;">Nội dung chi tiết</th>
                  </tr>
                </thead>
                <tbody>
          `;

            item.editLogs.forEach((log: any) => {
              const validDate = new Date(log.timestamp || Date.now());
              const dateStr = isNaN(validDate.getTime())
                ? new Date().toLocaleString("vi-VN")
                : validDate.toLocaleString("vi-VN");
              html += `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${dateStr}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: #4338ca;">${log.user}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; color: #DC2626;">${log.action}</td>
              </tr>
            `;
            });

            html += `
                </tbody>
              </table>
            </div>
          `;
          });
        });

      reportDiv.innerHTML = html;
      document.body.appendChild(reportDiv);

      const canvas = await html2canvas(reportDiv, { scale: 2 });
      document.body.removeChild(reportDiv);

      const imgData = canvas.toDataURL("image/jpeg", 0.9);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const margin = 10;
      const renderWidth = pdfWidth - 2 * margin;
      const totalPdfHeight = (imgHeight * renderWidth) / imgWidth;

      let finalHeight = totalPdfHeight;
      let yOffset = margin;

      while (finalHeight > 0) {
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          yOffset,
          renderWidth,
          totalPdfHeight,
        );
        finalHeight -= pageHeight - 2 * margin;
        // We shift the image up by the page height bounds
        yOffset -= pageHeight - 2 * margin;

        if (finalHeight > 0) {
          pdf.addPage();
        }
      }

      pdf.save(`Nhat_Ky_Sua_Diem_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Lỗi xuất PDF nhật ký:", err);
      setDialogState({ type: "alert", message: "Có lỗi khi tạo PDF!" });
    }
    setGlobalProcessing(false);
  };

  const [isSyncingAllHistory, setIsSyncingAllHistory] = useState(false);

  const syncAllHistoryToCloud = async () => {
    if (userRole !== "ADMIN") {
      setDialogState({
        type: "alert",
        message: "Chỉ tài khoản Admin mới có quyền thực hiện chức năng này!",
      });
      return;
    }

    if (scanHistory.length === 0) {
      setDialogState({
        type: "alert",
        message: "Không có kết quả chấm thi nào để đồng bộ!",
      });
      return;
    }

    setIsSyncingAllHistory(true);
    let successCount = 0;

    try {
      const batchSize = 450;
      for (let i = 0; i < scanHistory.length; i += batchSize) {
        const chunk = scanHistory.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const docRef = doc(db, "scanHistory", item.id);
          const { imageSrc, originalImageSrc, isUploading, ...metadataOnly } = item as any;
          
          const cleanMetadata = stripDataUrls(JSON.parse(JSON.stringify(metadataOnly)));

          if (item.timestamp) {
            cleanMetadata.timestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
          }

          batch.set(docRef, cleanMetadata, { merge: true });
        }

        await batch.commit();
        successCount += chunk.length;
      }

      setDialogState({
        type: "alert",
        message: `Đồng bộ Cloud thành công! Đã tải lên ${successCount} kết quả chấm thi (không kèm ảnh thí sinh).`,
      });
    } catch (err: any) {
      console.error("Lỗi đồng bộ Cloud:", err);
      setDialogState({
        type: "alert",
        message: `Lỗi đồng bộ Cloud: ${err.message || err}`,
      });
    } finally {
      setIsSyncingAllHistory(false);
    }
  };

  const exportAllPdfs = () => {
    if (activeClassHistory.length > 0) {
      const clsName =
        historyClassFilter === "ALL" ? "TatCaLop" : historyClassFilter;
      const examNameStr =
        historyExamFilter === "ALL"
          ? "TatCaMon"
          : historyExamFilter.replace(/\s+/g, "");

      const sortedHistory = [...activeClassHistory].sort((a, b) => {
        const sIdA = a.studentId || "";
        const sIdB = b.studentId || "";
        return sIdA.localeCompare(sIdB, undefined, { numeric: true });
      });

      createPdfFromItems(
        sortedHistory,
        `Tat_Ca_Bai_Lam_${clsName}_${examNameStr}_${new Date().getTime()}.pdf`,
      );
    }
  };

  const scanSelectedImages = async () => {
    if (!userHasRecognizeImage) {
      setErrorMsg("Tài khoản của bạn không được phân quyền Nhận dạng File ảnh.");
      return;
    }
    setGlobalProcessing(true);
    setErrorMsg(null);
    stopScanningRef.current = false;

    // Scan all selected images
    const selectedImages = images.filter(
      (img) =>
        img.examName === gradeExamName &&
        (activeClass === "ALL" || img.classId === activeClass) &&
        img.selected,
    );

    const scanImage = async (image: any): Promise<void> => {
      if (stopScanningRef.current) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id && img.status === "processing"
              ? { ...img, status: "error", errorMsg: "Đã tạm ngưng" }
              : img,
          ),
        );
        return;
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, status: "processing", errorMsg: undefined }
            : img,
        ),
      );

      try {
        // Tiền xử lý ảnh (Đã bổ sung bộ chặn lỗi onerror và cảnh báo Mixed Content thông minh)
        const processedDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 720;
            const MAX_HEIGHT = 960;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, width, height);
              // Cải thiện chất lượng ảnh để AI đọc chính xác hơn (đã tối ưu hoá dung lượng)
              resolve(canvas.toDataURL("image/jpeg", 0.42));
            } else {
              resolve(image.src);
            }
          };
          img.onerror = () => {
            let detail = "Không thể đọc/nạp tập chất lượng ảnh này.";
            if (window.location.protocol === "https:" && image.src?.startsWith("http://")) {
              detail += " Trình duyệt bảo mật HTTPS đã ngăn chặn nạp tài nguyên HTTP của máy chủ cục bộ (localhost). Vui lòng đổi sang chạy ứng dụng hoàn toàn qua liên kết HTTP http://localhost:3000 hoặc dùng mạng cục bộ.";
            } else {
              detail += " Xin hãy đổi định dạng ảnh hoặc kiểm tra quyền đọc file của ổ cứng.";
            }
            reject(new Error(detail));
          };
          img.src = image.src;
        });

        const preprocessedBase64 = processedDataUrl.split(",")[1] || "";
        const mimeType =
          processedDataUrl.split(";")[0].split(":")[1] || "image/jpeg";

        let studentAnswers;

        const canvas = document.createElement("canvas");
        const imgEl = new Image();
        await new Promise<void>((res) => {
          imgEl.onload = () => res();
          imgEl.onerror = () => res(); // Không bao giờ cho phép treo luồng xử lý
          imgEl.src = processedDataUrl;
        });
        canvas.width = imgEl.width || 100;
        canvas.height = imgEl.height || 100;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(imgEl, 0, 0);

        const currentConfig = examConfigs.find((c) => c.name === gradeExamName);
        const activeStructure = currentConfig
          ? examStructures.find((s: any) => s.id === currentConfig.structureId)
          : null;
        const hasPart2 = activeStructure ? activeStructure.part2?.active : true;
        const hasPart3 = activeStructure ? activeStructure.part3?.active : true;

        // Cấu hình mẫu giả định (Cần phải map toạ độ pixel chính xác thực tế)
        let baseConf =
          image.customConfig || globalOMRConfig || DEFAULT_OMR_CONFIG;

        const omrConfig: OMRConfig = {
          paperWidth: baseConf.paperWidth,
          paperHeight: baseConf.paperHeight,
          sensitivity: baseConf.sensitivity,
          regions: {
            studentId: baseConf.regions.studentId,
            studentName: baseConf.regions.studentName,
            examCode: baseConf.regions.examCode,
            part1: baseConf.regions.part1,
            ...(hasPart2 && baseConf.regions.part2
              ? { part2: baseConf.regions.part2 }
              : {}),
            ...(hasPart3 && baseConf.regions.part3
              ? { part3: baseConf.regions.part3 }
              : {}),
          },
        };

        const refs = referenceImages
          .filter((r) => r.base64)
          .map((r) => r.base64);

        const calibTemplate = getSafeStorage("omr_template_calibration_img");
        if (calibTemplate && refs.length === 0) {
          if (calibTemplate.startsWith("http") || calibTemplate.startsWith("data:")) {
            refs.push(calibTemplate);
          } else {
            const calibBase64 = calibTemplate.split(",")[1] || calibTemplate;
            refs.push(calibBase64);
          }
        }

        studentAnswers = await processOMR(canvas, omrConfig, refs);

        if (studentAnswers) {
          let finalDataUrl = studentAnswers.warpedDataUrl || processedDataUrl;
          if (studentAnswers.debugImageBase64) {
            delete studentAnswers.debugImageBase64;
          }
          const warpedImage = studentAnswers.warpedDataUrl;
          if (warpedImage) {
            delete studentAnswers.warpedDataUrl;
          }

          if (!stopScanningRef.current) {
            setImages((prev) =>
              prev.map((img) =>
                img.id === image.id
                  ? {
                      ...img,
                      status: "scanned",
                      rawAnswers: studentAnswers,
                      processedDataUrl: finalDataUrl,
                      warpedDataUrl: warpedImage,
                    }
                  : img,
              ),
            );
          }
        } else {
          if (!stopScanningRef.current) {
            setImages((prev) =>
              prev.map((img) =>
                img.id === image.id
                  ? { ...img, status: "error", errorMsg: "Ảnh mờ/Lỗi đọc." }
                  : img,
              ),
            );
          }
        }
      } catch (err: any) {
        console.error("Lỗi nhận diện OMR:", err);
        const msg = "Lỗi thuật toán OpenCV: " + String(err?.message || err);
        if (!stopScanningRef.current) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: "error", errorMsg: msg }
                : img,
            ),
          );
        }
      }
    };

    // Chuỗi xử lý tuần tự từng hình ảnh để tránh tắc nghẽn main thread
    const MAX_CONCURRENT = 1;
    for (let i = 0; i < selectedImages.length; i += MAX_CONCURRENT) {
      if (stopScanningRef.current) break;
      const batch = selectedImages.slice(i, i + MAX_CONCURRENT);
      await Promise.all(batch.map((img) => scanImage(img)));
    }

    // Mark any remaining processing images as cancelled if stopped
    if (stopScanningRef.current) {
      setImages((prev) =>
        prev.map((img) =>
          img.status === "processing"
            ? { ...img, status: "error", errorMsg: "Đã tạm ngưng" }
            : img,
        ),
      );
    } else {
      setDialogState({
        type: "alert",
        message: `Đã hoàn tất nhận dạng ${selectedImages.length} ảnh.`,
      });
    }
    setGlobalProcessing(false);
  };

  const gradeSelectedImages = () => {
    if (!userHasGrade) {
      setErrorMsg("Tài khoản của bạn không được phân quyền Chấm bài.");
      return;
    }
    if (!gradeExamName) {
      setErrorMsg("Vui lòng tạo ít nhất 1 Bài thi / Cấu hình mã đề ở Bước 2.");
      return;
    }

    setErrorMsg(null);
    const imagesToGrade = images.filter(
      (img) =>
        img.examName === gradeExamName &&
        (activeClass === "ALL" || img.classId === activeClass) &&
        img.selected &&
        (img.status === "scanned" || img.status === "done"),
    );
    if (imagesToGrade.length === 0) return;

    const newHistoryRecords: any[] = [];
    const oldHistoryIdsToRemove = new Set<string>();

    const updatedImages = images.map((img) => {
      if (
        img.examName === gradeExamName &&
        (activeClass === "ALL" || img.classId === activeClass) &&
        img.selected &&
        (img.status === "scanned" || img.status === "done")
      ) {
        const studentAnswers = img.rawAnswers;
        // Nếu OMR / AI đọc không ra mã đề, đừng lấy gradeExamName vì đó là tên bài thi chứ không phải mã đề
        let detectedCode = studentAnswers?.examCode?.trim() || "";

        // Nếu không tìm thấy, thử tìm xem bài thi hiện tại có duy nhất 1 mã đề không, nếu có thì dùng luôn
        if (!detectedCode || detectedCode.includes("?")) {
          const availableCodes = examConfigs
            .filter((c) => c.name === gradeExamName)
            .map((c) => c.code);
          if (availableCodes.length === 1) {
            detectedCode = availableCodes[0];
          } else if (detectedCode.includes("?")) {
            // Thử tìm theo cấu trúc có sẵn
            const regex = new RegExp(
              "^" + detectedCode.replace(/\?/g, ".") + "$",
            );
            const matchedCodes = availableCodes.filter((c) => regex.test(c));
            if (matchedCodes.length === 1) {
              detectedCode = matchedCodes[0];
            }
          }
        }

        const currentConfig =
          examConfigs.find(
            (c) => c.code === detectedCode && c.name === gradeExamName,
          ) || examConfigs.find((c) => c.code === detectedCode);

        if (!detectedCode || detectedCode.includes("?")) {
          return {
            ...img,
            status: "error",
            errorMsg: `Không nhận diện được mã đề (${detectedCode}). Kiểm tra lại.`,
          };
        }

        if (!currentConfig) {
          return {
            ...img,
            status: "error",
            errorMsg: `Mã "${detectedCode}" chưa có cài đặt.`,
          };
        }

        if (currentConfig.name !== gradeExamName) {
          return {
            ...img,
            status: "error",
            errorMsg: `Mã "${detectedCode}" thuộc "${currentConfig.name}".`,
          };
        }

        const currentStructure = examStructures.find(
          (s) => s.id === currentConfig.structureId,
        );
        if (!currentStructure) {
          return { ...img, status: "error", errorMsg: "Lỗi cấu trúc môn học." };
        }

        const result = calculateScore(
          studentAnswers,
          currentConfig.key,
          currentStructure,
        );

        const existingRec = scanHistory.find(
          (p) =>
            p.studentId === studentAnswers.studentId &&
            p.className === (activeClass === "ALL" ? img.classId : activeClass) &&
            p.examName === gradeExamName &&
            (p.sessionId || "SESSION_DEFAULT") === activeSessionId,
        );
        if (existingRec && existingRec.id !== img.result?.id) {
          return {
            ...img,
            status: "error",
            errorMsg: "Trùng số báo danh nên không cho phép ghi nhận",
          };
        }

        if (img.result?.id) {
          oldHistoryIdsToRemove.add(img.result.id);
        }

        const newRecord = {
          id: Date.now().toString() + Math.random().toString(),
          studentId: studentAnswers.studentId || "Chưa rõ",
          className: activeClass === "ALL" ? (img.classId || allowedClasses[0] || "") : activeClass,
          examName: gradeExamName,
          examCode: detectedCode,
          sessionId: activeSessionId,
          score: result.totalScore,
          resultDetails: result.resultDetails,
          timestamp: new Date(),
          updatedAt: Date.now(),
          imageSrc: img.processedDataUrl,
          originalImageSrc: img.src,
          firebaseImageUrl: img.firebaseImageUrl || "",
          rawAnswers: studentAnswers,
        };
        newHistoryRecords.push(newRecord);

        return { ...img, status: "done", result: newRecord };
      }
      return img;
    });

    setImages(updatedImages);

    if (newHistoryRecords.length > 0) {
      setScanHistory((prev) => {
        const toRemove = new Set(oldHistoryIdsToRemove);
        for (const newRec of newHistoryRecords) {
          addUnpushedHistoryId(newRec.id);
          if (newRec.studentId && newRec.studentId !== "Chưa rõ") {
            const existing = prev.find(
              (p) =>
                p.studentId === newRec.studentId &&
                p.className === newRec.className &&
                p.examName === newRec.examName &&
                (p.sessionId || "SESSION_DEFAULT") === activeSessionId,
            );
            if (existing) {
              toRemove.add(existing.id);
            }
          }
        }

        if (toRemove.size > 0) {
          toRemove.forEach((id) => {
            deletedHistoryIds.current.add(id as string);
            unpushedHistoryIds.current.delete(id as string);
          });
          localStorage.setItem(
            "deleted_history_ids",
            JSON.stringify(Array.from(deletedHistoryIds.current)),
          );
          localStorage.setItem(
            "unpushed_history_ids",
            JSON.stringify(Array.from(unpushedHistoryIds.current)),
          );

          if (!firestoreQuotaExceeded) {
            try {
              const batch = writeBatch(db);
              toRemove.forEach((id) => {
                batch.delete(doc(db, "scanHistory", id as string));
              });
              batch.commit().catch((e) => {
                console.error("Firebase deletion match commit error", e);
                if (isQuotaError(e)) {
                  setQuotaExceeded();
                }
              });
            } catch (e) {
              console.error(e);
            }
          }
          if (isLocalServerMode) {
            fetch(`${localServerUrl}/api/local-db`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deletedHistoryIds: Array.from(toRemove),
                userId: currentUserId,
              }),
            }).catch((err) =>
              console.warn("Failed to sync OMR overwrite deletion to local server:", err),
            );
          }
        }

        return [
          ...newHistoryRecords,
          ...prev.filter((item) => !toRemove.has(item.id)),
        ];
      });
      setHistoryClassFilter(activeClass);
      setHistoryExamFilter(gradeExamName);
      setDialogState({
        type: "alert",
        message: `Đã hoàn tất chấm điểm ${newHistoryRecords.length} bài thi.`,
      });
    } else {
      setDialogState({
        type: "alert",
        message: "Đã chấm bài xong, nhưng không có bài nào thành công.",
      });
    }
  };

  const currentGradeConfig = examConfigs.find(
    (c) => c.name === gradeExamName,
  ) || { structureId: "MATH", key: DEFAULT_MATH_KEY, name: "TOÁN" };

  const handleUpdateRawAnswer = async (
    resultId: string,
    part: 1 | 2 | 3,
    qIndex: number,
    subIndex: number | null,
    newValueC: number,
    newValueStr: string,
  ) => {
    if (!userHasEditResults) {
      setDialogState({
        type: "alert",
        variant: "danger",
        message: "Tài khoản của bạn không có quyền Sửa kết quả chấm.",
      });
      return;
    }
    const item = scanHistory.find((i) => i.id === resultId);
    if (!item || !item.rawAnswers) return;

    let newRaw = JSON.parse(JSON.stringify(item.rawAnswers)); // deep clone
    let logMessage = "";

    if (part === 1) {
      const oldVal = newRaw.part1[qIndex] || "Trống";
      const newVal = newValueStr || "Trống";
      logMessage = `Sửa Phần I, Câu ${newRaw.rawPart1[qIndex].questionNumber}: ${oldVal} ➔ ${newVal}`;
      newRaw.rawPart1[qIndex].selectedC = newValueC;
      newRaw.part1[qIndex] = newValueStr;
    } else if (part === 2 && subIndex !== null) {
      const oldVal = newRaw.part2[qIndex]?.answers[subIndex] || "Trống";
      const newVal = newValueStr || "Trống";
      const itemOption =
        ["a", "b", "c", "d"][subIndex] || (subIndex + 1).toString();
      logMessage = `Sửa Phần II, Câu ${newRaw.rawPart2[qIndex].questionNumber} ý ${itemOption}: ${oldVal} ➔ ${newVal}`;
      newRaw.rawPart2[qIndex].items[subIndex].selectedC = newValueC;
      newRaw.part2[qIndex].answers[subIndex] = newValueStr;
    } else if (part === 3 && subIndex !== null) {
      const oldVal = newRaw.part3[qIndex]?.answer || "Trống";
      newRaw.rawPart3[qIndex].items[subIndex].selectedC = newValueC;
      let answerStr = "";
      newRaw.rawPart3[qIndex].items.forEach((sub: any) => {
        if (sub.selectedC !== -1) {
          let numRows = sub.options?.length || 10;
          if (numRows === 11) {
            answerStr +=
              sub.selectedC === 0 ? "-" : (sub.selectedC - 1).toString();
          } else {
            answerStr += sub.selectedC.toString();
          }
        }
      });
      newRaw.part3[qIndex].answer = answerStr;
      const newVal = answerStr || "Trống";
      logMessage = `Sửa Phần III, Câu ${newRaw.rawPart3[qIndex].questionNumber} (ô thứ ${subIndex + 1}): ${oldVal} ➔ ${newVal}`;
    }

    const currentConfig: any =
      examConfigs.find(
        (c) => c.name === item.examName && c.code === item.examCode,
      ) || examConfigs.find((c) => c.name === item.examName);

    if (currentConfig) {
      const structure = examStructures.find(
        (s) => s.id === currentConfig.structureId,
      );
      if (structure) {
        const gradeResult = calculateScore(
          newRaw,
          currentConfig.key,
          structure,
        );
        const currentUser = appUsers.find((u) => u.id === currentUserId);
        const editorName = currentUser
          ? currentUser.username
          : "Người chấm (Giáo viên)";
        const newLogs = item.editLogs ? [...item.editLogs] : [];
        newLogs.push({
          timestamp: new Date().toISOString(),
          user: editorName,
          action: logMessage,
        });

        const updatedItem = {
          ...item,
          rawAnswers: newRaw,
          score: gradeResult.totalScore,
          resultDetails: gradeResult.resultDetails,
          editLogs: newLogs,
          updatedAt: Date.now(),
        };

        setScanHistory((prev) => {
          addUnpushedHistoryId(resultId);
          const next = prev.map((p) => (p.id === resultId ? updatedItem : p));
          localforage.setItem(`autograde_history_${currentUserId}`, next);
          return next;
        });

        if (selectedResult && selectedResult.id === resultId) {
          setSelectedResult(updatedItem);
        }
      }
    }
  };

  const performUpdate = (
    resultId: string,
    type: "studentId" | "examCode" | "className",
    newValue: string,
    item: any,
  ) => {
    let newRaw = JSON.parse(JSON.stringify(item.rawAnswers)); // deep clone
    let logMessage = "";

    if (type === "studentId") {
      logMessage = `Sửa Số Báo Danh: ${item.studentId} ➔ ${newValue}`;
      newRaw.studentId = newValue;
    } else if (type === "className") {
      logMessage = `Sửa Lớp/Phòng: ${item.className} ➔ ${newValue}`;
      setClasses((prev) =>
        prev.includes(newValue) ? prev : [...prev, newValue],
      );
    } else {
      logMessage = `Sửa Mã Đề: ${item.examCode} ➔ ${newValue}`;
      newRaw.examCode = newValue;
    }

    let currentConfig: any = null;
    if (type === "examCode") {
      currentConfig =
        examConfigs.find(
          (c) => c.code === newValue && c.name === item.examName,
        ) || examConfigs.find((c) => c.code === newValue);
    } else {
      currentConfig =
        examConfigs.find(
          (c) => c.name === item.examName && c.code === item.examCode,
        ) || examConfigs.find((c) => c.name === item.examName);
    }

    const currentUser = appUsers.find((u) => u.id === currentUserId);
    const editorName = currentUser
      ? currentUser.username
      : "Người chấm (Giáo viên)";

    const newLogs = item.editLogs ? [...item.editLogs] : [];
    newLogs.push({
      timestamp: new Date().toISOString(),
      user: editorName,
      action: logMessage,
    });

    let updatedItem = {
      ...item,
      studentId: type === "studentId" ? newValue : item.studentId,
      examCode: type === "examCode" ? newValue : item.examCode,
      className: type === "className" ? newValue : item.className,
      rawAnswers: newRaw,
      editLogs: newLogs,
    };

    if (type === "examCode" && currentConfig) {
      const structure = examStructures.find(
        (s) => s.id === currentConfig.structureId,
      );
      if (structure) {
        const gradeResult = calculateScore(
          newRaw,
          currentConfig.key,
          structure,
        );
        updatedItem = {
          ...updatedItem,
          score: gradeResult.totalScore,
          resultDetails: gradeResult.resultDetails,
          examName: currentConfig.name,
          updatedAt: Date.now(),
        };
      }
    } else if (type === "examCode") {
      setDialogState({
        type: "alert",
        message: `Đã đổi nhưng không tìm thấy đáp án cho mã đề ${newValue}. Điểm bài thi có thể không hợp lệ.`,
      });
    }

    setScanHistory((prev) => {
      addUnpushedHistoryId(resultId);
      const next = prev.map((p) => (p.id === resultId ? updatedItem : p));
      localforage.setItem(`autograde_history_${currentUserId}`, next);
      return next;
    });

    if (selectedResult && selectedResult.id === resultId) {
      setSelectedResult(updatedItem);
    }
  };

  const handleUpdateStudentInfo = async (
    resultId: string,
    type: "studentId" | "examCode" | "className",
    newValue: string,
  ) => {
    if (!userHasEditResults) {
      setDialogState({
        type: "alert",
        variant: "danger",
        message: "Tài khoản của bạn không có quyền Sửa kết quả chấm.",
      });
      return;
    }
    if (!newValue.trim()) {
      setDialogState({
        type: "alert",
        message: "Vui lòng nhập giá trị hợp lệ.",
      });
      return;
    }
    const item = scanHistory.find((i) => i.id === resultId);
    if (!item || !item.rawAnswers) return;

    if (type === "studentId") {
      const duplicate = scanHistory.find(
        (h) =>
          h.className === item.className &&
          h.studentId === newValue &&
          h.id !== resultId &&
          (h.sessionId || "SESSION_DEFAULT") ===
            (item.sessionId || "SESSION_DEFAULT"),
      );
      if (duplicate) {
        setDialogState({
          type: "confirm",
          message: `Trùng số báo danh (${newValue}) trong cùng lớp. Bạn có chắc chắn muốn cập nhật thành số báo danh này? (Hệ thống sẽ giữ lại cả 2 bài thi)`,
          onConfirm: () => {
            performUpdate(resultId, type, newValue, item);
          },
        });
        return;
      }
    } else if (type === "className") {
      const duplicate = scanHistory.find(
        (h) =>
          h.className === newValue &&
          h.studentId === item.studentId &&
          h.id !== resultId &&
          (h.sessionId || "SESSION_DEFAULT") ===
            (item.sessionId || "SESSION_DEFAULT"),
      );
      if (duplicate) {
        setDialogState({
          type: "alert",
          message: `Số báo danh ${item.studentId} đã tồn tại trong lớp/phòng ${newValue} nên không cho phép ghi nhận!`,
        });
        return;
      }
    }
    performUpdate(resultId, type, newValue, item);
  };

  const handleEditStructure = (struct: ExamStructure) => {
    setEditingStructureId(struct.id);
    setCurrentStructure({ ...struct });
  };

  const handleCreateStructure = () => {
    const newId = "CUST_" + Date.now();
    setEditingStructureId(newId);
    setCurrentStructure({
      id: newId,
      name: "MÔN HỌC MỚI",
      sessionId: activeSessionId,
      rooms: [],
      part1: { active: true, numQuestions: 10, pointsPerQuestion: 0.25 },
      part2: { active: false, numQuestions: 0, points: [0.1, 0.25, 0.5, 1.0] },
      part3: { active: false, numQuestions: 0, pointsPerQuestion: 0.5 },
    });
  };

  const handleSaveStructure = () => {
    if (currentStructure) {
      setExamStructures((prev) => {
        const existing = prev.findIndex((s) => s.id === currentStructure.id);
        if (existing > -1) {
          const updated = [...prev];
          updated[existing] = currentStructure;
          return updated;
        } else {
          return [...prev, currentStructure];
        }
      });
      setEditingStructureId(null);
      setCurrentStructure(null);
    }
  };

  const handleDeleteStructure = (id: string) => {
    if (examStructures.length <= 1) {
      setDialogState({
        type: "alert",
        message: "Phải giữ lại ít nhất 1 môn học.",
      });
      return;
    }
    setDialogState({
      type: "confirm",
      message:
        "Chắc chắn xóa môn học này? Các mã đề dùng cấu trúc này có thể bị lỗi.",
      onConfirm: () => {
        setExamStructures((prev) => prev.filter((s) => s.id !== id));
      },
    });
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12 font-sans font-medium text-indigo-600 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none" />

        <div className="bg-white max-w-[400px] w-full p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-100 relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 -rotate-3 flex items-center justify-center mb-6">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-indigo-600">
              ĐĂNG NHẬP
            </h1>
            <p className="text-sm text-indigo-500 mt-2 text-center">
              Hệ thống chấm trắc nghiệm
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-indigo-700">
                Tên đăng nhập
              </label>
              <input
                type="text"
                autoFocus
                className="w-full border border-indigo-200 bg-indigo-50/50 rounded-xl px-4 py-3 text-sm text-indigo-700 placeholder-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-indigo-700">
                Mật khẩu
              </label>
              <input
                type="password"
                className="w-full border border-indigo-200 bg-indigo-50/50 rounded-xl px-4 py-3 text-sm text-indigo-700 placeholder-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
              />
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm py-2 px-3 rounded-lg border border-red-100 text-center font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 mt-4 outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pt-2 sm:pt-4">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col items-center justify-center sticky top-0 z-20 shadow-sm gap-4">
        {firestoreQuotaExceeded && (
          <div className="w-full bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-lg text-sm text-center shadow-sm">
            <span className="font-bold">
              Hệ thống đang tạm ngừng đồng bộ lên mây
            </span>{" "}
            do đã đạt giới hạn miễn phí của ngày hôm nay. Dữ liệu của bạn vẫn
            được <span className="font-bold">lưu an toàn trên máy này</span> và
            sẽ tự động đồng bộ khi hệ thống hồi phục.
          </div>
        )}
        <div className="flex items-center gap-3 group cursor-default">
          <div className="group-hover:animate-bounce transition-all">
            <div className="w-10 h-10 bg-red-600 rounded-xl shadow-md rotate-3 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight uppercase text-red-600 drop-shadow-sm text-center">
            HỆ THỐNG CHẤM TRẮC NGHIỆM
          </h1>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="w-full overflow-x-auto pb-1 sm:pb-0 scrollbars-hidden">
            <div className="flex gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-transform justify-start sm:justify-center min-w-max mx-auto px-1">
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("STEP5_CALIB")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP5_CALIB" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <Target className="w-4 h-4 hidden sm:block" /> Toạ độ Mẫu
                </button>
              )}

              {userRole === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("STEP7_STATS")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP7_STATS" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <BarChart3 className="w-4 h-4 hidden sm:block" /> Thống kê
                </button>
              )}

              {userRole === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("STEP6_USERS")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP6_USERS" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <Users className="w-4 h-4 hidden sm:block" /> Quản lý Users
                </button>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-blue-600 bg-white border-blue-200 hover:border-red-300 hover:text-red-700 hover:bg-red-50 hover:shadow-sm"
              >
                <LogOut className="w-4 h-4 hidden sm:block" /> Đăng xuất
              </button>

              <div className="hidden items-center gap-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 px-3 py-2 rounded-lg shadow-sm">
                <span title="Hệ thống chấm điểm sử dụng thuật toán trực tiếp bằng OpenCV (C++/WASM).">
                  ✨ Thuật toán nhận diện cục bộ (C++/WASM)
                </span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-1 sm:pb-0 scrollbars-hidden">
            <div className="flex gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-transform justify-start sm:justify-center min-w-max mx-auto px-1">
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("STEP1_SUBJECT")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP1_SUBJECT" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <BookOpen className="w-4 h-4 hidden sm:block" /> Môn học
                </button>
              )}
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("STEP2_KEY")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP2_KEY" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <Key className="w-4 h-4 hidden sm:block" /> Mã đề & Đáp án
                </button>
              )}
              <button
                onClick={() => setActiveTab("STEP3_SCAN")}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP3_SCAN" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
              >
                <Camera className="w-4 h-4 hidden sm:block" /> Chấm bài
              </button>
              {userHasViewResults && (
                <button
                  onClick={() => setActiveTab("STEP4_RESULTS")}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${activeTab === "STEP4_RESULTS" ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(59,130,246,0.3)] shadow-blue-500/30" : "text-blue-600 bg-white border-blue-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"}`}
                >
                  <ListChecks className="w-4 h-4 hidden sm:block" /> Kết quả chấm
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "STEP3_SCAN" && (
          <div className="max-w-3xl mx-auto">
            {/* Input */}
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 rounded-2xl shadow-none">
                <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-dashed border-slate-200">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-indigo-700 w-auto text-left whitespace-nowrap">
                        Kỳ thi:
                      </span>
                      <select
                        className={`border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white max-w-[200px] truncate text-red-600`}
                        value={activeSessionId}
                        onChange={(e) => setActiveSessionId(e.target.value)}
                      >
                        {examSessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600 w-auto text-left whitespace-nowrap">
                        Bài thi:
                      </span>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                        value={gradeExamName}
                        onChange={(e) => {
                          setGradeExamName(e.target.value);
                        }}
                      >
                        {allowedExams.length === 0 && (
                          <option value="">(Trống)</option>
                        )}
                        {allowedExams.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600 w-auto text-left whitespace-nowrap">
                        Lớp/Phòng:
                      </span>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                        value={activeClass}
                        onChange={(e) => setActiveClass(e.target.value)}
                      >
                        {userRole === "ADMIN" && (
                          <option value="ALL">Tất cả</option>
                        )}
                        {allowedClasses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {userRole === "ADMIN" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-600 w-auto text-left whitespace-nowrap">
                          Người nạp/chấm:
                        </span>
                        <select
                          className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-emerald-700"
                          value={imageCreatorFilter}
                          onChange={(e) => setImageCreatorFilter(e.target.value)}
                        >
                          <option value="ALL">Tất cả tài khoản được quyền</option>
                          {recognizeAuthorizedUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username} ({u.role === "ADMIN" ? "Admin" : "GV"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {!isUserConstrained && (
                        <>
                          <form onSubmit={addClass} className="flex ml-2">
                            <input
                              type="text"
                              placeholder="Thêm lớp..."
                              className="border border-slate-300 rounded-l-lg px-3 py-1.5 text-sm w-24 sm:w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              value={newClassName}
                              onChange={(e) => setNewClassName(e.target.value)}
                            />
                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-lg shadow-sm transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() =>
                              setShowClassManager(!showClassManager)
                            }
                            className={`font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors text-sm ml-2 ${showClassManager ? "bg-indigo-600 text-white shadow-indigo-500/30" : "bg-slate-200 hover:bg-slate-300 text-indigo-700 hover:text-indigo-800"}`}
                          >
                            Quản lý
                          </button>
                        </>
                      )}
                    </div>

                    {userHasGrade && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-indigo-600 w-auto text-left whitespace-nowrap">
                          Người quét:
                        </span>
                        <select
                          className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                          value={activeQueueUserId}
                          onChange={(e) => setActiveQueueUserId(e.target.value)}
                        >
                          <option value={currentUserId || ""}>Bản thân (Tôi)</option>
                          {appUsers
                            .filter((u) => u.id !== currentUserId)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username} ({u.role === "ADMIN" ? "Admin" : "User"})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {!isUserConstrained && showClassManager && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mt-2">
                      <h4 className="text-base font-bold text-indigo-700 mb-3">
                        Danh sách Lớp học
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 border border-slate-200 rounded-md p-1 bg-slate-50"
                          >
                            {editingClassIndex === idx ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  className="border border-slate-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-indigo-500 bg-white"
                                  value={editClassName}
                                  onChange={(e) =>
                                    setEditClassName(e.target.value)
                                  }
                                  autoFocus
                                />
                                <button
                                  onClick={saveEditClass}
                                  className="text-white bg-green-500 hover:bg-green-600 rounded px-2 py-1 text-xs"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => setEditingClassIndex(null)}
                                  className="text-slate-500 hover:bg-slate-200 rounded px-2 py-1 text-xs"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium px-2 py-1 text-slate-700">
                                  {c}
                                </span>
                                <button
                                  onClick={() => startEditClass(idx)}
                                  className="text-indigo-600 hover:bg-indigo-100 p-1 rounded transition-colors text-xs"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => deleteClass(idx)}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors text-xs"
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {classes.length === 0 && (
                          <span className="text-sm text-slate-500 italic">
                            Chưa có lớp nào.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {allowedExams.length === 0 ? (
                    <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-center">
                      <p className="font-bold text-lg mb-2">
                        Chưa có bài thi nào trong kỳ thi này!
                      </p>
                      <p className="text-sm">
                        Vui lòng quay lại tab <strong>Mã đề & Đáp án</strong> để
                        tạo cấu hình chấm thi trước.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-sm text-emerald-700 shadow-sm flex items-center flex-wrap gap-1">
                      <span className="italic">
                        Hệ thống sẽ tự nhận diện các mã đề thuộc bài thi này:
                      </span>
                      <span className="font-bold text-red-600 ml-1">
                        {examConfigs
                          .filter((c) => c.name === gradeExamName)
                          .map((c) => c.code)
                          .sort()
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {allowedExams.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h2 className="text-base font-bold tracking-wider flex items-center gap-2 uppercase text-blue-600">
                        <Camera className="w-5 h-5 text-blue-600" /> Quét Phiếu
                        Trả Lời
                      </h2>
                      <div className="flex gap-2">
                        <div className="text-sm px-3 py-1 rounded-md font-bold border bg-blue-50 text-blue-800 border-blue-200">
                          Bài thi:{" "}
                          <span className="font-extrabold uppercase text-red-600">
                            {gradeExamName}
                          </span>
                        </div>
                        <div className="text-sm px-3 py-1 rounded-md font-bold border flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200">
                          Lớp/Phòng:{" "}
                          <span className="font-extrabold uppercase text-red-600">
                            {activeClass}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex gap-2">
                      <div className="flex-1">
                        <p className="font-medium mb-1 text-red-600">
                          Để tăng tốc độ & độ chính xác:
                        </p>
                        <ul className="list-disc pl-5 text-blue-700 text-xs space-y-1">
                          <li>
                            Chụp ảnh <strong>đủ sáng</strong>,{" "}
                            <strong>rõ ràng 4 góc vuông đen</strong>.
                          </li>
                          <li>
                            Hệ thống đã tự tự động nén ảnh trước khi phân tích
                            để tiết kiệm dung lượng.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-none">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Bộ Lưu Trữ Ảnh Cục Bộ (Đồng bộ với Online)
                        </h3>
                        {localServerAvailable && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Đang kết nối localhost
                          </span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Chế độ lưu trữ ảnh trực tiếp tại máy tính
                            </label>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Khi bật, toàn bộ ảnh quét sẽ được lưu thẳng vào thư mục cục bộ của máy tính này (qua máy chủ Node.js) thay vì tải lên Cloud. Điều này giúp nạp ảnh <strong>tức thời (0-5ms)</strong> và không lo hết dung lượng Firebase, trong khi kết quả điểm số vẫn đồng bộ online bình thường!
                            </p>
                          </div>
                          <div className="flex items-center h-10">
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = !localStorageMode;
                                setLocalStorageMode(newVal);
                                localStorage.setItem("local_storage_mode", newVal ? "true" : "false");
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                localStorageMode ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  localStorageMode ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {localStorageMode && (
                          <div className="pt-3 border-t border-slate-100 space-y-3">
                            {window.location.protocol === "https:" && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-relaxed">
                                <strong className="text-amber-800 flex items-center gap-1.5 mb-1 text-[13px]">
                                  ⚠️ Lưu ý bảo mật Trình Duyệt (Mixed Content):
                                </strong>
                                Bạn đang mở ứng dụng thông qua liên kết online bảo mật <strong>HTTPS (Google Cloud)</strong>. Trình duyệt hiện đại sẽ chặn kết xuất dữ liệu cục bộ <strong>HTTP (localhost/127.0.0.1)</strong> vì lý do bảo mật.
                                <div className="mt-1.5 font-semibold text-indigo-700">
                                  👉 Để sử dụng lưu trữ cục bộ: Bạn hãy khởi chạy file <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Chay_May_Chu_Cham_Bai.bat</code> trên máy tính, sau đó truy cập trực tiếp địa chỉ <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-900 font-bold">http://localhost:3000</a> hoặc <a href="http://127.0.0.1:3000" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-900 font-bold">http://127.0.0.1:3000</a> trên trình duyệt.
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                              <div className="flex-1">
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                  Địa chỉ Máy chủ Lưu ảnh cục bộ (IP):
                                </label>
                                <input
                                  type="text"
                                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                  placeholder="http://localhost:3000"
                                  value={localServerUrl}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalServerUrl(val);
                                    localStorage.setItem("local_server_url", val);
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const pingUrl = `${localServerUrl.replace(/\/$/, "")}/api/check-local`;
                                    const res = await fetch(pingUrl);
                                    const data = await res.json();
                                    if (data.runningLocally) {
                                      alert("Đã kết nối thành công với Máy chủ cục bộ!\nThư mục lưu trữ: " + data.storagePath);
                                    } else {
                                      alert("Đã nhận được phản hồi nhưng máy chủ không có chức năng lưu trữ cục bộ.");
                                    }
                                  } catch (err) {
                                    alert("Không thể kết nối đến Máy chủ tại: " + localServerUrl + "\nHãy kiểm tra xem:\n1. Bạn đã chạy tập tin Chay_May_Chu_Cham_Bai.bat chưa?\n2. Bạn có đang mở web bằng địa chỉ http://localhost:3000 không?\n(Nếu dùng link online HTTPS, trình duyệt sẽ tự đông ngăn kết nối đến HTTP ở máy cục bộ vì lý do bảo mật)");
                                  }
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors whitespace-nowrap border border-indigo-200"
                              >
                                Kiểm tra kết nối
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!scannerConfig.show && (
                      userRole === "ADMIN" ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-medium text-center mb-4">
                          ⚠️ Tài khoản Quản trị (Admin) không có quyền tải tập tin ảnh lên hệ thống.
                        </div>
                      ) : userHasRecognizeImage ? (
                        <div className="border border-solid border-slate-200 rounded-lg bg-slate-50/50 p-6 text-center rounded-2xl mb-4 flex flex-col sm:flex-row justify-center gap-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
                          >
                            Tải File ảnh lên (Nhiều ảnh)
                          </button>
                          <button
                            onClick={() =>
                              setScannerConfig((prev) => ({
                                ...prev,
                                show: true,
                              }))
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" /> Quét ảnh (Từ máy Scan /
                            Soi bài)
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                          />
                          <input
                            type="file"
                            ref={cameraInputRef}
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileUpload}
                          />
                          <input
                            type="file"
                            ref={scannerDirectoryInputRef}
                            className="hidden"
                            //@ts-ignore
                            webkitdirectory="true"
                            directory="true"
                            multiple
                            onChange={handleFileUpload}
                          />
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-medium text-center mb-4">
                          ⚠️ Tài khoản của bạn không được phân quyền Nhận dạng File ảnh.
                        </div>
                      )
                    )}

                    {scannerConfig.show && (
                      <div className="border border-solid border-slate-200 rounded-lg bg-white p-6 shadow-sm mb-4">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                          Cài đặt nạp ảnh Quét
                        </h3>

                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                              Chế độ nạp ảnh
                            </label>
                            <select
                              className="border border-slate-300 rounded-md p-2 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={scannerConfig.mode}
                              onChange={(e) =>
                                setScannerConfig((prev) => ({
                                  ...prev,
                                  mode: e.target.value as any,
                                }))
                              }
                            >
                              <option value="folder">
                                Máy Scan ADF (Quét từ thư mục)
                              </option>
                              <option value="camera">
                                Máy soi vật thể / Camera
                              </option>
                            </select>
                          </div>

                          {scannerConfig.mode === "folder" && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm mb-2">
                              <strong>
                                Khuyên dùng cho máy Scan chuyên dụng:
                              </strong>{" "}
                              Trình duyệt web không thể điều khiển trực tiếp máy
                              Scan phần cứng. <br />
                              Để quét nhiều tờ giấy cùng lúc, vui lòng sử dụng
                              phần mềm của máy Scan (VD: HP Scan) để quét các
                              bài làm của học sinh ra một{" "}
                              <strong>Thư mục (Folder)</strong>. Sau đó chọn Thư
                              mục đó tại đây hệ thống sẽ nạp toàn bộ ảnh.
                            </div>
                          )}

                          {scannerConfig.mode === "camera" && (
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                  <label className="text-sm font-semibold text-slate-700">
                                    Chọn Camera
                                  </label>
                                  <select
                                    className="border border-slate-300 rounded-md p-2 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={scannerConfig.deviceId}
                                    onChange={(e) =>
                                      setScannerConfig((prev) => ({
                                        ...prev,
                                        deviceId: e.target.value,
                                      }))
                                    }
                                  >
                                    {availableCameras.map((cam) => (
                                      <option
                                        key={cam.deviceId}
                                        value={cam.deviceId}
                                      >
                                        {cam.label ||
                                          `Camera ${cam.deviceId.substring(0, 5)}...`}
                                      </option>
                                    ))}
                                    {availableCameras.length === 0 && (
                                      <option value="">
                                        Không tìm thấy Camera
                                      </option>
                                    )}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-2 w-full sm:w-32">
                                  <label className="text-sm font-semibold text-slate-700">
                                    Auto-capture (s)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    className="border border-slate-300 rounded-md p-2 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={scannerConfig.interval}
                                    onChange={(e) =>
                                      setScannerConfig((prev) => ({
                                        ...prev,
                                        interval: parseInt(e.target.value) || 3,
                                      }))
                                    }
                                  />
                                </div>
                              </div>

                              <div className="aspect-[3/4] sm:aspect-video bg-black border border-slate-200 rounded-lg overflow-hidden relative">
                                {/* @ts-ignore */}
                                <Webcam
                                  audio={false}
                                  ref={webcamRef}
                                  screenshotFormat="image/jpeg"
                                  forceScreenshotSourceSize={true}
                                  videoConstraints={{
                                    deviceId: scannerConfig.deviceId
                                      ? { exact: scannerConfig.deviceId }
                                      : undefined,
                                    facingMode: "environment",
                                    width: { ideal: 1920 },
                                    height: { ideal: 1080 },
                                  }}
                                  className="absolute inset-0 w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between mt-4">
                            <button
                              onClick={() =>
                                setScannerConfig((prev) => ({
                                  ...prev,
                                  show: false,
                                }))
                              }
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                            >
                              Đóng
                            </button>

                            {scannerConfig.mode === "folder" ? (
                              <button
                                onClick={() =>
                                  scannerDirectoryInputRef.current?.click()
                                }
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" /> Chọn Thư mục
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCapture}
                                  disabled={isAutoScanning}
                                  className="px-4 py-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
                                >
                                  Chụp 1 ảnh
                                </button>
                                <button
                                  onClick={toggleAutoScan}
                                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 ${isAutoScanning ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
                                >
                                  {isAutoScanning ? (
                                    <>Dừng Auto-capture</>
                                  ) : (
                                    <>
                                      <Camera className="w-4 h-4" /> Bắt đầu
                                      Auto-capture
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {examImages.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="text-sm font-medium text-slate-800 shrink-0">
                              Ảnh: {displayedImages.length} /{" "}
                              {examImages.length}
                            </div>
                            <select
                              className="text-xs border-slate-300 rounded-md shadow-sm py-1 pl-2 pr-8 shrink-0"
                              value={imageFilter}
                              onChange={(e) =>
                                setImageFilter(
                                  e.target.value as
                                    | "ALL"
                                    | "INCOMPLETE"
                                    | "DONE",
                                )
                              }
                            >
                              <option value="ALL">Hiển thị Tất cả</option>
                              <option value="INCOMPLETE">
                                ⚠️ Ảnh bị Lỗi / Cần nhận dạng lại
                              </option>
                              <option value="DONE">✅ Đã chấm hoàn tất</option>
                            </select>
                            <input
                              type="text"
                              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                              placeholder="Tìm SBD, mã đề..."
                              value={imageSearchPhrase}
                              onChange={(e) =>
                                setImageSearchPhrase(e.target.value)
                              }
                            />
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                setImages((prev) =>
                                  prev.map((img) =>
                                    displayedImages.some((d) => d.id === img.id)
                                      ? { ...img, selected: true }
                                      : img,
                                  ),
                                )
                              }
                              className="text-xs text-indigo-600 font-medium px-2 py-1 hover:bg-indigo-50 rounded border border-indigo-200 bg-white"
                            >
                              Chọn tất cả đang hiển thị
                            </button>
                            <button
                              onClick={() =>
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.examName === gradeExamName &&
                                    (activeClass === "ALL" || img.classId === activeClass)
                                      ? { ...img, selected: false }
                                      : img,
                                  ),
                                )
                              }
                              className="text-xs text-slate-600 font-medium px-2 py-1 hover:bg-slate-100 rounded border border-slate-200 bg-white"
                            >
                              Bỏ chọn tất cả
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {displayedImages.map((img) => (
                            <QueueImageCard
                              key={img.id}
                              img={img}
                              activeUploadingIds={activeUploadingIds}
                              setImages={setImages}
                              setEditingImageConfigId={setEditingImageConfigId}
                              addDeletedImageId={addDeletedImageId}
                            />
                          ))}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-200">
                          <button
                            onClick={() => {
                              const removedIds: string[] = [];
                              const remaining = images.filter((img) => {
                                const matched = img.examName === gradeExamName &&
                                  (activeClass === "ALL" || img.classId === activeClass);
                                if (matched) {
                                  removedIds.push(img.id);
                                }
                                return !matched;
                              });

                              if (removedIds.length > 0) {
                                removedIds.forEach((id) => {
                                  deletedImageIds.current.add(id);
                                });
                                localStorage.setItem(
                                  "deleted_image_ids",
                                  JSON.stringify(Array.from(deletedImageIds.current)),
                                );

                                if (isLocalServerMode) {
                                  fetch(`${localServerUrl}/api/local-db`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      deletedImageIds: removedIds,
                                      userId: currentUserId,
                                    }),
                                  }).catch((err) =>
                                    console.warn("Failed to sync images deletion to local server:", err),
                                  );
                                } else if (!firestoreQuotaExceeded) {
                                  setDoc(
                                    doc(db, "globals", "appData"),
                                    { deletedImageIds: arrayUnion(...removedIds) },
                                    { merge: true }
                                  ).catch((err) =>
                                    console.warn("Failed to sync images deletion to Firestore:", err),
                                  );
                                }
                              }

                              setImages(remaining);
                            }}
                            disabled={globalProcessing}
                            className="bg-white hover:bg-red-50 text-red-600 font-medium py-2 px-4 border border-red-200 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50"
                          >
                            Xóa tất cả ảnh
                          </button>

                          <div className="flex gap-2">
                            {!globalProcessing ? (
                              <button
                                onClick={scanSelectedImages}
                                disabled={
                                  displayedImages.filter((i) => i.selected)
                                    .length === 0
                                }
                                className="bg-sky-600 text-white px-5 py-2.5 font-medium rounded-lg shadow-sm hover:bg-sky-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                              >
                                NHẬN DẠNG ►
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  stopScanningRef.current = true;
                                  setGlobalProcessing(false);
                                  setImages((prev) =>
                                    prev.map((img) =>
                                      img.status === "processing"
                                        ? {
                                            ...img,
                                            status: "error",
                                            errorMsg: "Đã tạm ngưng",
                                          }
                                        : img,
                                    ),
                                  );
                                }}
                                className="bg-red-500 text-white px-5 py-2.5 font-medium rounded-lg shadow-sm hover:bg-red-600 transition flex items-center justify-center gap-2 text-sm"
                              >
                                <div className="w-4 h-4 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
                                DỪNG NHẬN DẠNG
                              </button>
                            )}

                            <button
                              onClick={gradeSelectedImages}
                              disabled={
                                globalProcessing ||
                                displayedImages.filter(
                                  (i) =>
                                    i.selected &&
                                    (i.status === "scanned" ||
                                      i.status === "done"),
                                ).length === 0
                              }
                              className="bg-indigo-600 text-white px-5 py-2.5 font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                              {`CHẤM BÀI "${gradeExamName}" ►`}
                            </button>
                          </div>
                        </div>
                        {errorMsg && (
                          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm mt-4">
                            {errorMsg}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "STEP4_RESULTS" && (
          !userHasViewResults ? (
            <div className="bg-white px-6 py-12 border border-slate-200 rounded-3xl text-center text-slate-500 shadow-sm max-w-xl mx-auto my-12 space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                <ListChecks className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tài khoản của bạn không có quyền xem kết quả chấm cho các Kỳ thi, Bài thi, Lớp/Phòng được phân quyền. Vui lòng liên hệ Admin để được hỗ trợ.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] rounded-2xl shadow-md">
            <div className="border-b border-slate-200 bg-slate-100 flex flex-col">
              <div className="flex p-3 gap-3 bg-slate-100 items-center justify-center">
                <button
                  onClick={() => setSelectedResult(null)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${!selectedResult ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgba(79,70,229,0.3)] shadow-indigo-500/30" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-sm"}`}
                >
                  <ListChecks className="w-4 h-4" />
                  Kết quả ({userScanHistory.length})
                </button>
                <button
                  disabled={!selectedResult}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${selectedResult ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-[0_4px_12px_rgba(20,184,166,0.3)] shadow-teal-500/30" : "bg-slate-100 text-slate-400 border-slate-200 opacity-70 cursor-not-allowed"}`}
                >
                  <FileImage className="w-4 h-4" />
                  Chi tiết bài làm
                </button>
              </div>

              {selectedResult && (
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 bg-white">
                  <div className="flex flex-wrap gap-4 sm:gap-6">
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-1">
                        Số Báo Danh
                      </div>
                      <div
                        className="font-semibold text-lg sm:text-xl cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1 group"
                        onClick={() => {
                          setDialogState({
                            type: "prompt",
                            message: "Nhập Số Báo Danh mới:",
                            defaultValue: selectedResult.studentId,
                            onConfirm: (val) =>
                              val &&
                              handleUpdateStudentInfo(
                                selectedResult.id,
                                "studentId",
                                val,
                              ),
                          });
                        }}
                      >
                        {selectedResult.studentId}
                        <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-1">
                        Mã Đề
                      </div>
                      <div
                        className="font-semibold text-lg sm:text-xl cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1 group"
                        onClick={() => {
                          setDialogState({
                            type: "prompt",
                            message: "Nhập Mã Đề mới:",
                            defaultValue: selectedResult.examCode || "",
                            onConfirm: (val) =>
                              val &&
                              handleUpdateStudentInfo(
                                selectedResult.id,
                                "examCode",
                                val,
                              ),
                          });
                        }}
                      >
                        {selectedResult.examCode || "Chưa rõ"}
                        <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium mb-1">
                        Lớp/Phòng
                      </div>
                      <div
                        className="font-semibold text-lg sm:text-xl cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1 group"
                        onClick={() => {
                          setDialogState({
                            type: "prompt",
                            message: "Nhập Lớp/Phòng mới:",
                            defaultValue: selectedResult.className || "",
                            onConfirm: (val) =>
                              val &&
                              handleUpdateStudentInfo(
                                selectedResult.id,
                                "className",
                                val,
                              ),
                          });
                        }}
                      >
                        {selectedResult.className || "Chưa có"}
                        <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl text-blue-600 font-semibold leading-none bg-white px-3 py-1 border border-slate-200 rounded-lg border-blue-600 shadow-md flex-shrink-0 self-start sm:self-auto">
                    {(selectedResult.score || 0).toFixed(2)}
                    <span className="text-base sm:text-lg text-slate-800 font-medium ml-1">
                      /10
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto bg-white flex flex-col relative h-[500px]">
              {!selectedResult ? (
                <div className="h-full bg-white flex flex-col">
                  {userScanHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-30 p-12">
                      <Users className="w-12 h-12 mb-4" />
                      <p className=" text-sm font-medium font-medium text-center">
                        CHUYỂN SANG TAB QUÉT ĐỂ CHẤM BÀI
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto flex flex-col">
                      <div className="flex flex-col gap-3 p-4 border-b sm:border-t-0 border-slate-200 bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-indigo-700">
                              Kỳ thi:
                            </span>
                            <select
                              className={`border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white max-w-[200px] truncate text-red-600`}
                              value={activeSessionId}
                              onChange={(e) =>
                                setActiveSessionId(e.target.value)
                              }
                            >
                              {examSessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                  {session.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600">
                              Bài thi:
                            </span>
                            <select
                              className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                              value={historyExamFilter}
                              onChange={(e) =>
                                setHistoryExamFilter(e.target.value)
                              }
                            >
                              <option value="ALL">Tất cả</option>
                              {Array.from(
                                new Set([
                                  ...(isUserConstrained
                                    ? allowedExams
                                    : validExamNamesStr),
                                  ...userScanHistory
                                    .map((h) => h.examName)
                                    .filter(Boolean),
                                ]),
                              ).map((name) => (
                                <option
                                  key={name as string}
                                  value={name as string}
                                >
                                  {name as React.ReactNode}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600">
                              Lớp/Phòng:
                            </span>
                            <select
                              className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                              value={historyClassFilter}
                              onChange={(e) =>
                                setHistoryClassFilter(e.target.value)
                              }
                            >
                              <option value="ALL">Tất cả</option>
                              {Array.from(
                                new Set([
                                  ...(isUserConstrained
                                    ? allowedClasses
                                    : classes),
                                  ...userScanHistory
                                    .map((h) => h.className)
                                    .filter(Boolean),
                                ]),
                              )
                                .filter(
                                  (cls) =>
                                    !isUserConstrained ||
                                    allowedClasses.length === 0 ||
                                    allowedClasses.includes(cls as string),
                                )
                                .map((cls) => (
                                  <option
                                    key={cls as string}
                                    value={cls as string}
                                  >
                                    {cls as React.ReactNode}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600">
                              Trạng thái:
                            </span>
                            <select
                              className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                              value={historyErrorFilter}
                              onChange={(e) =>
                                setHistoryErrorFilter(e.target.value)
                              }
                            >
                              <option value="ALL">Hiển thị Tất cả</option>
                              <option value="ERROR">
                                Chỉ bài bị lỗi SBD, Mã đề
                              </option>
                              <option value="DUP_SBD">Trùng Số báo danh</option>
                              <option value="DUP_MAD">Trùng Mã đề</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-between items-center flex-wrap gap-3">
                          <div className="flex items-center gap-3 text-xs font-semibold text-blue-600 tracking-widest flex-wrap">
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-800 transition-colors">
                              <input
                                type="checkbox"
                                className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                                checked={
                                  activeClassHistory.length > 0 &&
                                  selectedHistoryIds.length ===
                                    activeClassHistory.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedHistoryIds(
                                      activeClassHistory.map(
                                        (item: any) => item.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedHistoryIds([]);
                                  }
                                }}
                              />
                              <span className="normal-case">
                                {activeClassHistory.length > 0 &&
                                selectedHistoryIds.length ===
                                  activeClassHistory.length
                                  ? "Bỏ chọn"
                                  : "Chọn tất cả"}
                              </span>
                            </label>
                            <span className="w-px h-4 bg-slate-300"></span>
                            <span>
                              Đã hiển thị:{" "}
                              <span className="text-red-600">
                                {activeClassHistory.length} /{" "}
                                {
                                  userScanHistory.filter((h) => {
                                    if (
                                      historyClassFilter !== "ALL" &&
                                      h.className !== historyClassFilter
                                    )
                                      return false;
                                    if (
                                      historyExamFilter !== "ALL" &&
                                      h.examName !== historyExamFilter
                                    )
                                      return false;
                                    if (historyErrorFilter === "ERROR") {
                                      const isError =
                                        !h.studentId ||
                                        h.studentId === "Chưa rõ" ||
                                        h.studentId.includes("?") ||
                                        !h.examCode ||
                                        h.examCode === "Chưa rõ" ||
                                        h.examCode.includes("?");
                                      if (!isError) return false;
                                    }
                                    if (historyErrorFilter === "DUP_SBD") {
                                      const validSBD =
                                        h.studentId &&
                                        h.studentId !== "Chưa rõ" &&
                                        !h.studentId.includes("?");
                                      if (!validSBD) return false;
                                      const count = scanHistory.filter(
                                        (x) =>
                                          x.studentId === h.studentId &&
                                          x.className === h.className &&
                                          x.examName === h.examName,
                                      ).length;
                                      if (count <= 1) return false;
                                    }
                                    if (historyErrorFilter === "DUP_MAD") {
                                      const validMAD =
                                        h.examCode &&
                                        h.examCode !== "Chưa rõ" &&
                                        !h.examCode.includes("?");
                                      if (!validMAD) return false;
                                      const count = scanHistory.filter(
                                        (x) =>
                                          x.examCode === h.examCode &&
                                          x.className === h.className &&
                                          x.examName === h.examName,
                                      ).length;
                                      if (count <= 1) return false;
                                    }
                                    return true;
                                  }).length
                                }
                              </span>
                            </span>
                            {selectedHistoryIds.length > 0 && (
                              <div className="flex gap-2">
                                {selectedHistoryIds.length > 1 &&
                                  selectedHistoryIds.length !==
                                    activeClassHistory.length && (
                                    <>
                                      <button
                                        className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-1 px-2 rounded tracking-normal normal-case shadow-sm transition-colors text-xs"
                                        onClick={recalculateSelectedHistory}
                                        title="Tính điểm lại theo cài đặt đáp án hiện tại"
                                      >
                                        Cập nhật điểm
                                      </button>
                                      <button
                                        className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-1 px-2 rounded tracking-normal normal-case shadow-sm transition-colors text-xs"
                                        onClick={rescanSelectedHistory}
                                        title="Đưa ảnh sang lại tab Chấm để quét AI một lần nữa"
                                      >
                                        Quét lại AI
                                      </button>
                                    </>
                                  )}
                                <button
                                  className={`font-medium py-1 px-2 rounded tracking-normal normal-case shadow-sm transition-colors text-xs ${
                                    userHasDeleteResults
                                      ? "bg-red-500 hover:bg-red-600 text-white"
                                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                  }`}
                                  onClick={deleteSelectedHistory}
                                  title={userHasDeleteResults ? "Xoá kết quả chấm đã chọn" : "Tài khoản của bạn không có quyền Xoá kết quả chấm"}
                                >
                                  Xoá {selectedHistoryIds.length} mục
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <input
                              type="text"
                              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56 bg-white shrink-0"
                              placeholder="Tìm SBD, mã đề, hoặc tên..."
                              value={historySearchPhrase}
                              onChange={(e) =>
                                setHistorySearchPhrase(e.target.value)
                              }
                            />
                            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbars-hidden w-full">
                              <button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportAllPdfs();
                                }}
                              >
                                ↓ PDF TẤT CẢ
                              </button>
                              <button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportCsv();
                                }}
                              >
                                ↓ BẢNG ĐIỂM
                              </button>
                              <button
                                className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportDetailedCsv();
                                }}
                              >
                                ↓ BÀI LÀM CHI TIẾT
                              </button>
                              {userRole === "ADMIN" && (
                                <>
                                  <button
                                    id="sync-results-to-cloud-btn"
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-indigo-800 active:to-indigo-900 disabled:opacity-55 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      syncAllHistoryToCloud();
                                    }}
                                    disabled={isSyncingAllHistory}
                                  >
                                    <CloudUpload className={`w-3.5 h-3.5 ${isSyncingAllHistory ? "animate-bounce" : ""}`} />
                                    {isSyncingAllHistory ? "ĐANG ĐỒNG BỘ..." : "ĐỒNG BỘ CLOUD"}
                                  </button>
                                  <button
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportEditLogsPdf();
                                    }}
                                  >
                                    ↓ NHẬT KÝ CHỈNH SỬA
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y-2 divide-[#141414]">
                        {activeClassHistory.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`p-4 flex items-center justify-between hover:bg-slate-50/50 transition cursor-pointer ${selectedHistoryIds.includes(item.id) ? "bg-red-50/50" : ""}`}
                            onClick={() => setSelectedResult(item)}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="flex items-center justify-center pr-2"
                                onClick={(e) => toggleSelection(item.id, e)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedHistoryIds.includes(item.id)}
                                  readOnly
                                  className="w-5 h-5 cursor-pointer accent-red-600"
                                />
                              </div>
                              <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white  font-semibold text-xs rounded-full shadow-md">
                                {activeClassHistory.length - idx}
                              </div>
                              <div>
                                <div className="font-semibold text-lg uppercase">
                                  {item.studentId === "Chưa rõ"
                                    ? "KHÔNG NHẬN DIỆN SBD"
                                    : `SBD: ${item.studentId}`}
                                </div>
                                <div className="text-xs  text-slate-400 font-medium">
                                  LỚP {item.className} • MÃ {item.examCode} •{" "}
                                  {item.timestamp instanceof Date &&
                                  !isNaN(item.timestamp.getTime())
                                    ? item.timestamp.toLocaleTimeString()
                                    : new Date().toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="text-2xl  text-blue-600 font-semibold leading-none">
                                {(item.score || 0).toFixed(2)}
                              </div>
                              <div className="text-xs  font-semibold text-slate-400 mt-1">
                                XEM CHI TIẾT
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full">
                  <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 overflow-auto">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white bg-indigo-600 px-2 py-1.5 inline-block rounded">
                          Ảnh quét
                        </h3>
                        <button
                          onClick={() =>
                            regradeSingleResultInline(selectedResult.id)
                          }
                          className="bg-purple-600 text-white px-3 py-1.5 border border-purple-700 rounded-lg font-semibold text-xs hover:bg-purple-700 transition shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          CHẤM LẠI ẢNH
                        </button>
                        <button
                          onClick={() => setEditingResultConfigId(selectedResult.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 border border-amber-700 rounded-lg font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          CẤU HÌNH TOẠ ĐỘ
                        </button>
                        <button
                          onClick={async () => {
                            setGlobalProcessing(true);
                            const imgSrc =
                              await generateDrawnCanvasUrl(selectedResult);
                            setGlobalProcessing(false);
                            const win = window.open("", "_blank");
                            if (win && imgSrc) {
                              win.document.write(
                                "<html><head><title>In Kết Quả Gồm Ảnh</title><style>@page { size: A4; margin: 10mm; } body { font-family: sans-serif; margin: 0; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; height: 100vh; overflow: hidden; } h2, h3, p { margin: 5px 0; text-align: center; text-transform: uppercase; } img { max-width: 100%; max-height: calc(100vh - 120px); object-fit: contain; border: 2px solid #000; }</style></head><body>",
                              );
                              win.document.write(
                                `<h2>Kết quả chấm bài: SBD ${selectedResult.studentId}</h2>`,
                              );
                              win.document.write(
                                `<h3>Điểm: <span style="color:red;">${(selectedResult.score || 0).toFixed(2)}/10</span></h3>`,
                              );
                              const dateStr =
                                selectedResult.timestamp instanceof Date &&
                                !isNaN(selectedResult.timestamp.getTime())
                                  ? selectedResult.timestamp.toLocaleDateString()
                                  : new Date().toLocaleDateString();
                              win.document.write(
                                `<p>Ngày chấm: ${dateStr}</p>`,
                              );
                              win.document.write(
                                `<img src="${imgSrc}" alt="Scanned form" referrerPolicy="no-referrer" />`,
                              );
                              win.document.write("</body></html>");
                              win.document.close();
                              setTimeout(() => win.print(), 500);
                            }
                          }}
                          className="bg-indigo-600 text-white px-3 py-1.5 border border-slate-200 rounded-lg font-semibold text-xs hover:bg-gray-800 transition"
                        >
                          IN ẢNH VÀ KẾT QUẢ
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-1 px-3 text-sm rounded shadow-sm transition-colors"
                          onClick={() =>
                            setImageZoomLevel((prev) =>
                              Math.max(0.25, prev - 0.25),
                            )
                          }
                          title="Thu nhỏ"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-12 text-center text-slate-600 bg-white py-1 rounded shadow-sm border border-slate-200">
                          {Math.round(imageZoomLevel * 100)}%
                        </span>
                        <button
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-1 px-3 text-sm rounded shadow-sm transition-colors"
                          onClick={() =>
                            setImageZoomLevel((prev) =>
                              Math.min(3, prev + 0.25),
                            )
                          }
                          title="Phóng to"
                        >
                          +
                        </button>
                        <button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 text-sm rounded shadow-sm transition-colors ml-2 hidden sm:block"
                          onClick={exportSinglePdf}
                        >
                          Xuất PDF
                        </button>
                        {currentUserData?.role === "ADMIN" &&
                          (selectedResult.imageSrc ||
                            selectedResult.firebaseImageUrl ||
                            ((isLocalServerMode || isLocalEnvironment()) && selectedResult.id)) && (
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white border-red-600 font-semibold py-1.5 px-3 text-xs rounded-lg shadow-sm transition-colors ml-2"
                              onClick={() => {
                                setDialogState({
                                  type: "confirm",
                                  message:
                                    "Xóa ảnh quét khỏi máy lưu trữ và cloud (nếu có) để tiết kiệm dung lượng?",
                                  onConfirm: async () => {
                                    if (selectedResult.firebaseImageUrl) {
                                      try {
                                        // Path could be derived if needed, but it's easier to find path from URL or delete locally if we just want to save local space. Wait, deleteImageFromStorage needs the path or https URL?
                                        // Wait, deleteObject(ref(storage, url)) works in Firebase if URL is highly predictable, but wait: `ref(storage, url)` works!
                                        setGlobalProcessing(true);
                                        await deleteImageFromStorage(
                                          selectedResult.firebaseImageUrl,
                                        );
                                        setGlobalProcessing(false);
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }
                                    setScanHistory((prev) =>
                                      prev.map((item) => {
                                        if (item.id === selectedResult.id) {
                                          const {
                                            imageSrc,
                                            originalImageSrc,
                                            firebaseImageUrl,
                                            ...rest
                                          } = item;
                                          return rest;
                                        }
                                        return item;
                                      }),
                                    );
                                    setSelectedResult((prev: any) => {
                                      if (!prev) return prev;
                                      const {
                                        imageSrc,
                                        originalImageSrc,
                                        firebaseImageUrl,
                                        ...rest
                                      } = prev;
                                      return rest;
                                    });
                                  },
                                });
                              }}
                            >
                              Xóa ảnh
                            </button>
                          )}
                      </div>
                    </div>
                    {selectedResult.imageSrc ||
                    selectedResult.firebaseImageUrl ||
                    ((isLocalServerMode || isLocalEnvironment()) && selectedResult.id) ? (
                      <div className="overflow-auto w-full h-[calc(100%-60px)] bg-slate-200/50 rounded-lg border border-slate-200 flex justify-center items-start p-2">
                        <div
                          id="print-area"
                           className="relative group bg-white shadow-sm inline-block transition-all duration-200 origin-top"
                          style={{ width: `${imageZoomLevel * 100}%` }}
                        >
                          <CachedImage
                            key={selectedResult.id}
                            src={
                              resolveLocalUrl(selectedResult.firebaseImageUrl || selectedResult.imageSrc) ||
                              ((isLocalServerMode || isLocalEnvironment()) ? getLocalServerConstructedUrl(selectedResult) : "")
                            }
                            fallbackSrc={resolveLocalUrl(selectedResult.firebaseImageUrl || selectedResult.imageSrc)}
                            alt="Scanned form"
                            className="w-full h-auto object-contain block relative z-0"
                            onLoad={() => {
                              setImageLoadingStates(prev => ({ ...prev, [selectedResult.id]: false }));
                            }}
                            onError={() => {
                              setImageLoadingStates(prev => ({ ...prev, [selectedResult.id]: false }));
                            }}
                          />
                          {imageLoadingStates[selectedResult.id] !== false && (selectedResult.imageSrc || selectedResult.firebaseImageUrl || ((isLocalServerMode || isLocalEnvironment()) && selectedResult.id)) && (
                            <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-8 text-center z-10 transition-all duration-200">
                              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                              <p className="text-xs text-slate-700 font-bold mb-1 col-span-2">
                                Đang tải ảnh...
                              </p>
                              <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                                Vui lòng chờ trong giây lát để tải dữ liệu ảnh chất lượng cao.
                              </p>
                            </div>
                          )}
                          {selectedResult.rawAnswers && (
                            <div className="absolute inset-0 pointer-events-none z-10 w-full h-full">
                              {/* Render Part 1 Boxes */}
                              {selectedResult.rawAnswers.rawPart1?.map(
                                (item: any, i: number) => {
                                  const detail =
                                    selectedResult.resultDetails?.part1?.find(
                                      (d: any) =>
                                        d.q === Number(item.questionNumber),
                                    );
                                  if (!detail || !item.options) return null;

                                  const correctIndex = [
                                    "A",
                                    "B",
                                    "C",
                                    "D",
                                  ].indexOf(
                                    String(detail.key).trim().toUpperCase(),
                                  );
                                  const hasAnswer = item.selectedC !== -1;

                                  return item.options.map((opt: any) => {
                                    let colorClass = "";
                                    let isCorrectCell = opt.c === correctIndex;
                                    let isSelectedCell =
                                      opt.c === item.selectedC;

                                    if (isSelectedCell) {
                                      colorClass = detail.isCorrect
                                        ? "border-green-500 bg-green-500/40"
                                        : "border-red-500 bg-red-500/40";
                                    } else if (isCorrectCell) {
                                      colorClass =
                                        "border-amber-400 bg-amber-400/40 opacity-80";
                                    }

                                    let r = 5.5;
                                    return (
                                      <div
                                        key={`p1-${i}-${opt.c}`}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDialogState({
                                            type: "confirm",
                                            message: `Bạn có chắc chắn muốn sửa đáp án câu ${detail.q} (Phần I)?`,
                                            onConfirm: () =>
                                              handleUpdateRawAnswer(
                                                selectedResult.id,
                                                1,
                                                i,
                                                null,
                                                isSelectedCell ? -1 : opt.c,
                                                isSelectedCell
                                                  ? ""
                                                  : ["A", "B", "C", "D"][opt.c],
                                              ),
                                          });
                                        }}
                                        className={`absolute pointer-events-auto border rounded-full cursor-pointer transition-colors hover:bg-black/30 hover:border-black z-20 ${colorClass || "border-transparent"}`}
                                        title={`Sửa câu ${detail.q}`}
                                        style={{
                                          top: `${((opt.cy - r) / 1131) * 100}%`,
                                          left: `${((opt.cx - r) / 800) * 100}%`,
                                          height: `${((r * 2) / 1131) * 100}%`,
                                          width: `${((r * 2) / 800) * 100}%`,
                                        }}
                                      ></div>
                                    );
                                  });
                                },
                              )}
                              {/* Render Part 2 Boxes */}
                              {selectedResult.rawAnswers.rawPart2?.map(
                                (item: any, i: number) => {
                                  const detail =
                                    selectedResult.resultDetails?.part2?.find(
                                      (d: any) =>
                                        d.q === Number(item.questionNumber),
                                    );
                                  if (!detail || !item.items) return null;

                                  return item.items.map(
                                    (subItem: any, j: number) => {
                                      const itemDetail =
                                        detail.itemDetails?.[j];
                                      if (!itemDetail) return null;

                                      const isTrueCorrect =
                                        String(itemDetail.key)
                                          .trim()
                                          .toUpperCase() === "Đ";
                                      const correctIndex = isTrueCorrect
                                        ? 0
                                        : 1;
                                      // c === 0 is "Đ", c === 1 is "S"

                                      if (!subItem.options) return null;

                                      return subItem.options.map((opt: any) => {
                                        let colorClass = "";
                                        let isCorrectCell =
                                          opt.c === correctIndex;
                                        let isSelectedCell =
                                          opt.c === subItem.selectedC;

                                        if (isSelectedCell) {
                                          colorClass = itemDetail.isCorrect
                                            ? "border-green-500 bg-green-500/40"
                                            : "border-red-500 bg-red-500/40";
                                        } else if (
                                          isCorrectCell &&
                                          String(itemDetail.key).trim() !== ""
                                        ) {
                                          colorClass =
                                            "border-amber-400 bg-amber-400/40 opacity-80";
                                        }

                                        let r = 5.5;
                                        return (
                                          <div
                                            key={`p2-${i}-${j}-${opt.c}`}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setDialogState({
                                                type: "confirm",
                                                message: `Bạn có chắc chắn muốn sửa đáp án câu ${detail.q} ý ${itemDetail.item} (Phần II)?`,
                                                onConfirm: () =>
                                                  handleUpdateRawAnswer(
                                                    selectedResult.id,
                                                    2,
                                                    i,
                                                    j,
                                                    isSelectedCell ? -1 : opt.c,
                                                    isSelectedCell
                                                      ? ""
                                                      : ["Đ", "S"][opt.c],
                                                  ),
                                              });
                                            }}
                                            className={`absolute pointer-events-auto border rounded-full cursor-pointer transition-colors hover:bg-black/30 hover:border-black z-20 ${colorClass || "border-transparent"}`}
                                            title={`Sửa ý ${itemDetail.item} câu ${detail.q}`}
                                            style={{
                                              top: `${((opt.cy - r) / 1131) * 100}%`,
                                              left: `${((opt.cx - r) / 800) * 100}%`,
                                              height: `${((r * 2) / 1131) * 100}%`,
                                              width: `${((r * 2) / 800) * 100}%`,
                                            }}
                                          ></div>
                                        );
                                      });
                                    },
                                  );
                                },
                              )}
                              {/* Render Part 3 Boxes */}
                              {selectedResult.rawAnswers.rawPart3?.map(
                                (item: any, i: number) => {
                                  const detail =
                                    selectedResult.resultDetails?.part3?.find(
                                      (d: any) =>
                                        d.q === Number(item.questionNumber),
                                    );
                                  if (!detail || !item.items) return null;

                                  return item.items.map(
                                    (subItem: any, j: number) => {
                                      if (!subItem.options) return null;
                                      return subItem.options.map((opt: any) => {
                                        let isSelectedCell =
                                          opt.c === subItem.selectedC;
                                        let colorClass =
                                          isSelectedCell && detail.isCorrect
                                            ? "border-green-500 bg-green-500/40"
                                            : isSelectedCell &&
                                                !detail.isCorrect
                                              ? "border-red-500 bg-red-500/40"
                                              : "";
                                        let r = 5.5;
                                        return (
                                          <div
                                            key={`p3-${i}-${j}-${opt.c}`}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              let numRows =
                                                subItem.options?.length || 10;
                                              let char = "";
                                              if (numRows === 11) {
                                                char =
                                                  opt.c === 0
                                                    ? "-"
                                                    : (opt.c - 1).toString();
                                              } else {
                                                char = opt.c.toString();
                                              }
                                              setDialogState({
                                                type: "confirm",
                                                message: `Bạn có chắc chắn muốn sửa ô thứ ${j + 1} của câu ${detail.q} (Phần III)?`,
                                                onConfirm: () =>
                                                  handleUpdateRawAnswer(
                                                    selectedResult.id,
                                                    3,
                                                    i,
                                                    j,
                                                    isSelectedCell ? -1 : opt.c,
                                                    isSelectedCell ? "" : char,
                                                  ),
                                              });
                                            }}
                                            title={`Sửa ô thứ ${j + 1} câu ${detail.q}`}
                                            className={`absolute pointer-events-auto border rounded-full cursor-pointer transition-colors hover:bg-black/30 hover:border-black z-20 ${colorClass || "border-transparent"}`}
                                            style={{
                                              top: `${((opt.cy - r) / 1131) * 100}%`,
                                              left: `${((opt.cx - r) / 800) * 100}%`,
                                              height: `${((r * 2) / 1131) * 100}%`,
                                              width: `${((r * 2) / 800) * 100}%`,
                                            }}
                                          ></div>
                                        );
                                      });
                                    },
                                  );
                                },
                              )}
                              {/* Render Exam Code bubbles */}
                              {selectedResult.rawAnswers.rawExamCode?.map(
                                (colItems: any, cIndex: number) => {
                                  const currentValStr =
                                    selectedResult.examCode || "";
                                  const currentDigitStr =
                                    currentValStr[cIndex] || "";
                                  const currentDigitIndex = parseInt(
                                    currentDigitStr,
                                    10,
                                  );

                                  return colItems.options?.map((opt: any) => {
                                    let colorClass = "";
                                    const isCorrectCell =
                                      !isNaN(currentDigitIndex) &&
                                      opt.r === currentDigitIndex;
                                    const isSelectedCell =
                                      opt.r === colItems.selectedR;

                                    if (isSelectedCell) {
                                      colorClass = isCorrectCell
                                        ? "border-green-500 bg-green-500/40"
                                        : "border-red-500 bg-red-500/40";
                                    } else if (isCorrectCell) {
                                      colorClass =
                                        "border-amber-400 bg-amber-400/40 opacity-80";
                                    } else {
                                      return null;
                                    }

                                    let r = 5;
                                    return (
                                      <div
                                        key={`exam-${cIndex}-${opt.r}`}
                                        className={`absolute border-2 rounded-full ${colorClass}`}
                                        style={{
                                          top: `${((opt.cy - r) / 1131) * 100}%`,
                                          left: `${((opt.cx - r) / 800) * 100}%`,
                                          height: `${((r * 2) / 1131) * 100}%`,
                                          width: `${((r * 2) / 800) * 100}%`,
                                        }}
                                      ></div>
                                    );
                                  });
                                },
                              )}
                              {/* Render Student ID bubbles */}
                              {selectedResult.rawAnswers.rawStudentId?.map(
                                (colItems: any, cIndex: number) => {
                                  const currentValStr =
                                    selectedResult.studentId || "";
                                  const currentDigitStr =
                                    currentValStr[cIndex] || "";
                                  const currentDigitIndex = parseInt(
                                    currentDigitStr,
                                    10,
                                  );

                                  return colItems.options?.map((opt: any) => {
                                    let colorClass = "";
                                    const isCorrectCell =
                                      !isNaN(currentDigitIndex) &&
                                      opt.r === currentDigitIndex;
                                    const isSelectedCell =
                                      opt.r === colItems.selectedR;

                                    if (isSelectedCell) {
                                      colorClass = isCorrectCell
                                        ? "border-green-500 bg-green-500/40"
                                        : "border-red-500 bg-red-500/40";
                                    } else if (isCorrectCell) {
                                      colorClass =
                                        "border-amber-400 bg-amber-400/40 opacity-80";
                                    } else {
                                      return null;
                                    }

                                    let r = 5;
                                    return (
                                      <div
                                        key={`sbd-${cIndex}-${opt.r}`}
                                        className={`absolute border-2 rounded-full ${colorClass}`}
                                        style={{
                                          top: `${((opt.cy - r) / 1131) * 100}%`,
                                          left: `${((opt.cx - r) / 800) * 100}%`,
                                          height: `${((r * 2) / 1131) * 100}%`,
                                          width: `${((r * 2) / 800) * 100}%`,
                                        }}
                                      ></div>
                                    );
                                  });
                                },
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-fit flex flex-col items-center justify-center p-8 text-center bg-slate-100 border border-dashed border-slate-200 rounded-lg py-16">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs text-slate-600 font-medium mb-1">
                          Đang đồng bộ file ảnh từ thiết bị khác...
                        </p>
                        <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                          Nếu ảnh này được chấm từ một máy tính khác, xin vui lòng chờ giây lát để file ảnh hoàn thành việc đồng bộ hóa qua đám mây.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6 overflow-auto bg-white h-full relative">
                    <div className="space-y-8 pb-10">
                      {(() => {
                        const details =
                          selectedResult.resultDetails?.resultDetails ||
                          selectedResult.resultDetails ||
                          {};
                        const p1Score = (details.part1 || []).reduce(
                          (acc: number, cur: any) => acc + (cur.points || 0),
                          0,
                        );
                        const p2Score = (details.part2 || []).reduce(
                          (acc: number, cur: any) => acc + (cur.points || 0),
                          0,
                        );
                        const p3Score = (details.part3 || []).reduce(
                          (acc: number, cur: any) => acc + (cur.points || 0),
                          0,
                        );
                        return (
                          <>
                            {/* Part 1 */}
                            {details.part1 && details.part1.length > 0 && (
                              <div>
                                <h3 className=" text-xs font-medium text-white bg-indigo-600 px-2 py-0.5 mb-2 inline-block rounded">
                                  Phần I: Trắc nghiệm ({p1Score.toFixed(2)} đ)
                                </h3>
                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
                                  {details.part1?.map(
                                    (item: any, i: number) => {
                                      let status = "wrong";
                                      if (item.isCorrect) status = "correct";
                                      else if (
                                        item.student &&
                                        !["A", "B", "C", "D"].includes(
                                          String(item.student)
                                            .trim()
                                            .toUpperCase(),
                                        )
                                      )
                                        status = "invalid";

                                      let colorClasses =
                                        "border-red-500 ring-1 ring-red-500 bg-red-50 text-red-700";
                                      if (status === "correct")
                                        colorClasses =
                                          "border-green-500 ring-1 ring-green-500 bg-green-50 text-green-700";
                                      else if (status === "invalid")
                                        colorClasses =
                                          "border-yellow-500 ring-1 ring-yellow-500 bg-yellow-50 text-yellow-700";

                                      return (
                                        <div
                                          key={i}
                                          className={`p-0.5 border rounded text-center text-[9px] flex flex-col justify-center ${colorClasses}`}
                                        >
                                          <div className="font-sans font-medium text-[8px] tracking-wider mb-0.5 opacity-70">
                                            C.{item.q}
                                          </div>
                                          <div className="font-bold text-xs leading-none">
                                            {item.student || "-"}
                                          </div>
                                          {status !== "correct" && (
                                            <div className="text-[8px] font-semibold mt-0.5 opacity-80">
                                              ({item.key})
                                            </div>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Part 2 */}
                            {details.part2 && details.part2.length > 0 && (
                              <div>
                                <h3 className=" text-xs font-medium text-white bg-indigo-600 px-2 py-0.5 mb-2 inline-block mt-3 rounded">
                                  Phần II: Đúng/sai ({p2Score.toFixed(2)} đ)
                                </h3>
                                <div className="space-y-1.5">
                                  {details.part2?.map(
                                    (item: any, i: number) => (
                                      <div
                                        key={i}
                                        className="border border-slate-200 rounded bg-slate-50/50 p-1.5"
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <div className="font-medium text-[9px] uppercase text-slate-500 tracking-widest">
                                            Câu {item.q}
                                          </div>
                                          <div className="text-[9px] font-semibold px-1.5 py-0.5 bg-white border border-slate-200">
                                            +{(item.points || 0).toFixed(2)}đ{" "}
                                            <span className="text-slate-400">
                                              ({item.correctCount}/4)
                                            </span>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                          {item.itemDetails?.map(
                                            (sub: any, j: number) => {
                                              let status = "wrong";
                                              if (sub.isCorrect)
                                                status = "correct";
                                              else if (
                                                sub.student &&
                                                !["Đ", "S"].includes(
                                                  String(sub.student)
                                                    .trim()
                                                    .toUpperCase(),
                                                )
                                              )
                                                status = "invalid";

                                              let colorClasses =
                                                "border-red-500 ring-1 ring-red-500 bg-red-50 text-red-700";
                                              if (status === "correct")
                                                colorClasses =
                                                  "border-green-500 ring-1 ring-green-500 bg-green-50 text-green-700";
                                              else if (status === "invalid")
                                                colorClasses =
                                                  "border-yellow-500 ring-1 ring-yellow-500 bg-yellow-50 text-yellow-700";

                                              return (
                                                <div
                                                  key={j}
                                                  className={`p-0.5 border rounded flex flex-col justify-center items-center ${colorClasses}`}
                                                >
                                                  <span className="font-sans text-[8px] opacity-70 mb-0.5">
                                                    {sub.item})
                                                  </span>
                                                  <span className="font-bold text-xs">
                                                    {sub.student || "-"}
                                                  </span>
                                                  {status !== "correct" && (
                                                    <span
                                                      className={
                                                        "font-semibold block text-[8px] mt-0.5 opacity-80"
                                                      }
                                                    >
                                                      ({sub.key})
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Part 3 */}
                            {details.part3 && details.part3.length > 0 && (
                              <div>
                                <h3 className=" text-xs font-medium text-white bg-indigo-600 px-2 py-0.5 mb-2 inline-block mt-3 rounded">
                                  Phần III. Trả lời ngắn ({p3Score.toFixed(2)}{" "}
                                  đ)
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
                                  {details.part3?.map(
                                    (item: any, i: number) => {
                                      let status = item.isCorrect
                                        ? "correct"
                                        : "wrong";

                                      let colorClasses =
                                        "border-red-500 ring-1 ring-red-500 bg-red-50 text-red-700";
                                      if (status === "correct")
                                        colorClasses =
                                          "border-green-500 ring-1 ring-green-500 bg-green-50 text-green-700";

                                      return (
                                        <div
                                          key={i}
                                          className={`p-0.5 border rounded flex flex-col justify-center ${colorClasses}`}
                                        >
                                          <div className="font-sans font-medium text-[8px] tracking-wider mb-0.5 opacity-70">
                                            C.{item.q}
                                          </div>
                                          <div
                                            className="font-semibold truncate text-xs leading-none"
                                            title={item.student}
                                          >
                                            {item.student || "-"}
                                          </div>
                                          {status !== "correct" && (
                                            <div
                                              className="text-[8px] font-semibold mt-0.5 truncate opacity-80"
                                              title={item.key}
                                            >
                                              LK: {item.key}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {selectedResult.editLogs &&
                        selectedResult.editLogs.length > 0 && (
                          <div className="border-t border-slate-200 mt-6 pt-6">
                            <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                              <History className="w-4 h-4" /> Nhật ký sửa điểm
                            </h3>
                            <ul className="space-y-3">
                              {selectedResult.editLogs.map(
                                (log: any, idx: number) => (
                                  <li
                                    key={idx}
                                    className="text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                  >
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                      <span className="font-semibold text-slate-800">
                                        {log.user}
                                      </span>
                                      <span className="text-[10px] text-slate-500 whitespace-nowrap opacity-80 uppercase tracking-widest">
                                        {(() => {
                                          const d = new Date(
                                            log.timestamp || Date.now(),
                                          );
                                          return isNaN(d.getTime())
                                            ? new Date().toLocaleString(
                                                "vi-VN",
                                                { hour12: false },
                                              )
                                            : d.toLocaleString("vi-VN", {
                                                hour12: false,
                                              });
                                        })()}
                                      </span>
                                    </div>
                                    <div className="text-slate-600 font-medium">
                                      {log.action}
                                    </div>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )
        )}

        {activeTab === "STEP2_KEY" && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tighter text-red-600">
                  Cấu hình Mã đề & Đáp án
                </h2>
                <p className="text-slate-500  text-xs font-medium mt-2">
                  Dựa trên cấu trúc đề thi đã chọn
                </p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col min-w-[200px]">
                  <label className="text-sm font-bold text-blue-600 mb-1">
                    Tên bài thi
                  </label>
                  <select
                    className={`border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full font-bold text-red-600`}
                    value={configStructureId}
                    onChange={(e) =>
                      handleConfigStructureChange(e.target.value)
                    }
                  >
                    {examStructures.filter(
                      (s) =>
                        s.sessionId === activeSessionId ||
                        (!s.sessionId && activeSessionId === "SESSION_DEFAULT"),
                    ).length === 0 && <option value="">(Trống)</option>}
                    {examStructures
                      .filter(
                        (s) =>
                          s.sessionId === activeSessionId ||
                          (!s.sessionId &&
                            activeSessionId === "SESSION_DEFAULT"),
                      )
                      .map((struct) => (
                        <option
                          key={struct.id}
                          value={struct.id}
                          className="py-1"
                        >
                          {struct.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-bold text-blue-600 mb-1">
                    Mã đề
                  </label>
                  {!isCreatingNewExamCode ? (
                    <select
                      className={`border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow min-w-[120px] font-bold uppercase tracking-widest text-red-600`}
                      value={configExamCode}
                      disabled={!configStructureId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__NEW__") {
                          setIsCreatingNewExamCode(true);
                          setConfigExamCode("");
                          setConfigKey(
                            getDefaultKey(configStructureId, examStructures),
                          );
                        } else {
                          setConfigExamCode(val);
                          const existingConfig = examConfigs.find(
                            (c) =>
                              c.code === val &&
                              c.name === getStructureLabel(configStructureId),
                          );
                          if (existingConfig) setConfigKey(existingConfig.key);
                        }
                      }}
                    >
                      {examConfigs
                        .filter(
                          (c) =>
                            c.name === getStructureLabel(configStructureId),
                        )
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      {configStructureId && (
                        <option
                          value="__NEW__"
                          className="font-bold text-indigo-600"
                        >
                          + Thêm mới
                        </option>
                      )}
                      {!configStructureId && <option value="">(Trống)</option>}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className={`border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-24 text-center text-lg font-bold tracking-widest uppercase text-red-600`}
                        value={configExamCode}
                        onChange={handleConfigCodeChange}
                        maxLength={4}
                        autoFocus
                      />
                      <button
                        title="Hủy"
                        onClick={() => {
                          setIsCreatingNewExamCode(false);
                          const existingConfigs = examConfigs.filter(
                            (c) =>
                              c.name === getStructureLabel(configStructureId),
                          );
                          if (existingConfigs.length > 0) {
                            setConfigExamCode(existingConfigs[0].code);
                            setConfigKey(existingConfigs[0].key);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-[42px]">
                    <button
                      className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors h-full"
                      onClick={downloadExcelTemplate}
                      title="Tải mẫu Excel để điền đáp án"
                    >
                      Tải file mẫu
                    </button>
                    <label className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors cursor-pointer flex items-center h-full">
                      Nhập từ Excel
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleExcelImport}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {examStructures.find((s) => s.id === configStructureId)?.part1
                ?.active && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-white bg-blue-600 px-4 py-2 inline-block rounded-lg tracking-wider mb-4 shadow-sm">
                    Phần I: Trắc nghiệm
                  </h3>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                    {(configKey.part1 || [])
                      .slice(
                        0,
                        examStructures.find((s) => s.id === configStructureId)
                          ?.part1?.numQuestions || 0,
                      )
                      .map((ans, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center relative"
                        >
                          <span className="text-xs text-blue-600 mb-1 font-bold drop-shadow-sm">
                            Câu {idx + 1}.
                          </span>
                          <input
                            type="text"
                            maxLength={1}
                            className="w-full text-center border border-slate-300 rounded-lg p-1.5 font-medium bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-800"
                            value={ans}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              if (["A", "B", "C", "D", ""].includes(val)) {
                                const newKey = {
                                  ...configKey,
                                  part1: configKey.part1 || [],
                                };
                                newKey.part1[idx] = val;
                                setConfigKey(newKey);
                              }
                            }}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {examStructures.find((s) => s.id === configStructureId)?.part2
                ?.active && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-white bg-blue-600 px-4 py-2 inline-block rounded-lg tracking-wider mb-4 shadow-sm">
                    Phần II: Đúng/Sai
                  </h3>
                  <div className="space-y-3">
                    {Array.from({
                      length:
                        examStructures.find((s) => s.id === configStructureId)
                          ?.part2?.numQuestions || 0,
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-3 border border-slate-200 rounded-lg"
                      >
                        <span className="text-blue-600 font-bold text-xs whitespace-nowrap min-w-[50px] drop-shadow-sm">
                          Câu {i + 1}
                        </span>
                        <div className="flex gap-4">
                          {["a", "b", "c", "d"].map((item, j) => (
                            <div
                              key={item}
                              className="flex items-center gap-1 sm:gap-2"
                            >
                              <span className="text-xs font-sans font-bold text-blue-500">
                                {item})
                              </span>
                              <input
                                type="text"
                                maxLength={1}
                                className="w-10 text-center border border-slate-300 rounded-lg p-1 font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-800"
                                value={
                                  (configKey.part2 || [])[i]?.answers?.[j] || ""
                                }
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  if (
                                    ["Đ", "S", ""].includes(val) ||
                                    val === "D"
                                  ) {
                                    const actualVal = val === "D" ? "Đ" : val;
                                    const newKey = {
                                      ...configKey,
                                      part2: [...(configKey.part2 || [])],
                                    };
                                    if (!newKey.part2[i])
                                      newKey.part2[i] = {
                                        questionNumber: i + 1,
                                        answers: ["", "", "", ""],
                                      };
                                    newKey.part2[i] = {
                                      ...newKey.part2[i],
                                      answers: [
                                        ...(newKey.part2[i].answers || [
                                          "",
                                          "",
                                          "",
                                          "",
                                        ]),
                                      ],
                                    };
                                    newKey.part2[i].answers[j] = actualVal;
                                    setConfigKey(newKey);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {examStructures.find((s) => s.id === configStructureId)?.part3
                ?.active && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-white bg-blue-600 px-4 py-2 inline-block rounded-lg tracking-wider mb-4 shadow-sm">
                    Phần III: Trả lời ngắn
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({
                      length:
                        examStructures.find((s) => s.id === configStructureId)
                          ?.part3?.numQuestions || 0,
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg"
                      >
                        <span className="text-sm font-bold text-blue-600 whitespace-nowrap drop-shadow-sm">
                          Câu {i + 1}
                        </span>
                        <input
                          type="text"
                          className="w-full border-b border-dashed border-slate-200 p-1  font-semibold bg-transparent focus:outline-none focus:border-solid focus:border-blue-600 transition-colors"
                          value={(configKey.part3 || [])[i]?.answer || ""}
                          onChange={(e) => {
                            const newKey = {
                              ...configKey,
                              part3: configKey.part3 || [],
                            };
                            if (!newKey.part3[i])
                              newKey.part3[i] = {
                                questionNumber: i + 1,
                                answer: "",
                              };
                            newKey.part3[i].answer = e.target.value;
                            setConfigKey(newKey);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200 flex justify-end mt-8 gap-4">
              {examConfigs.find(
                (c) =>
                  c.code === configExamCode &&
                  c.name === getStructureLabel(configStructureId),
              ) && (
                <button
                  onClick={deleteConfig}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
                >
                  XÓA MÃ ĐỀ
                </button>
              )}
              <button
                onClick={() => {
                  if (
                    examConfigs.filter(
                      (c) => c.name === getStructureLabel(configStructureId),
                    ).length > 0
                  ) {
                    setIsCreatingNewExamCode(false);
                    const existingConfig = examConfigs.find(
                      (c) => c.name === getStructureLabel(configStructureId),
                    );
                    if (existingConfig) {
                      setConfigExamCode(existingConfig.code);
                      setConfigKey(existingConfig.key);
                    }
                  } else {
                    setActiveTab("STEP1_SUBJECT");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
              >
                HỦY BỎ
              </button>
              <button
                onClick={() => {
                  if (configStructureId) saveConfig();
                }}
                disabled={!configStructureId}
                className={`text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm ${configStructureId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 cursor-not-allowed"}`}
              >
                <Save className="w-4 h-4" />
                LƯU MÃ ĐỀ
              </button>
            </div>

            {configStructureId &&
              examConfigs.filter(
                (c) => c.name === getStructureLabel(configStructureId),
              ).length > 0 && (
                <div className="pt-8 border-t border-slate-200 mt-8">
                  <h3 className="text-lg font-semibold text-blue-600 mb-4">
                    Danh sách Mã đề đã tạo (
                    {getStructureLabel(configStructureId)})
                  </h3>
                  <div className="space-y-4">
                    {Array.from(new Set(examConfigs.map((c) => c.name)))
                      .filter(
                        (examName) =>
                          examName === getStructureLabel(configStructureId),
                      )
                      .map((examName) => (
                        <div
                          key={examName}
                          className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                        >
                          <div className="divide-y divide-slate-100 bg-white">
                            {examConfigs
                              .filter((config) => config.name === examName)
                              .sort((a, b) => a.code.localeCompare(b.code))
                              .map((config) => (
                                <div
                                  key={config.code}
                                  className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${configExamCode === config.code && getStructureLabel(configStructureId) === examName ? "bg-indigo-50/50" : ""}`}
                                >
                                  <div>
                                    <div className="font-medium text-slate-800">
                                      Mã đề:{" "}
                                      <span className="font-bold text-indigo-600 tracking-wider text-lg">
                                        {config.code}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                                      Cấu trúc:{" "}
                                      {examStructures.find(
                                        (s) => s.id === config.structureId,
                                      )?.name || config.structureId}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setConfigExamCode(config.code);
                                        setConfigStructureId(
                                          config.structureId,
                                        );
                                        setConfigKey(config.key);
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-indigo-100"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDialogState({
                                          type: "confirm",
                                          message: `Chắc chắn xóa cấu hình cho mã đề ${config.code}?`,
                                          onConfirm: () => {
                                            setExamConfigs((prev) =>
                                              prev.filter(
                                                (c) =>
                                                  c.name !== examName ||
                                                  c.code !== config.code,
                                              ),
                                            );
                                            if (
                                              configExamCode === config.code
                                            ) {
                                              setConfigExamCode("");
                                              setConfigKey(
                                                getDefaultKey(
                                                  configStructureId,
                                                  examStructures,
                                                ),
                                              );
                                            }
                                            setDialogState({
                                              type: "alert",
                                              message:
                                                "Đã xóa mã đề " + config.code,
                                            });
                                          },
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-100"
                                    >
                                      Xoá
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "STEP1_SUBJECT" && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tighter text-red-600">
                  Cấu hình Kỳ thi & Môn học
                </h2>
                <p className="text-slate-500  text-xs font-medium mt-2">
                  Một kỳ thi có thể có nhiều môn học.
                </p>
              </div>
              {!editingStructureId && (
                <button
                  onClick={handleCreateStructure}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> MÔN HỌC MỚI
                </button>
              )}
            </div>

            {!editingStructureId ? (
              <>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 relative">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1 block">
                        CHỌN KỲ THI
                      </label>
                      {isEditingSessions ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={
                              examSessions.find((s) => s.id === activeSessionId)
                                ?.name || ""
                            }
                            onChange={(e) => {
                              setExamSessions(
                                examSessions.map((s) =>
                                  s.id === activeSessionId
                                    ? { ...s, name: e.target.value }
                                    : s,
                                ),
                              );
                            }}
                            className="border border-slate-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Tên kỳ thi"
                            autoFocus
                          />
                          <button
                            onClick={() => setIsEditingSessions(false)}
                            className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                          >
                            Xong
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <select
                            className={`bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold min-w-[200px] text-red-600`}
                            value={activeSessionId}
                            onChange={(e) => {
                              if (e.target.value === "__NEW__") {
                                const newId = "SES_" + Date.now();
                                setExamSessions([
                                  ...examSessions,
                                  {
                                    id: newId,
                                    name:
                                      "Kỳ thi mới (" +
                                      new Date().toLocaleDateString() +
                                      ")",
                                  },
                                ]);
                                setActiveSessionId(newId);
                                setIsEditingSessions(true);
                              } else {
                                setActiveSessionId(e.target.value);
                              }
                            }}
                          >
                            {examSessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                            <option
                              value="__NEW__"
                              className="italic font-normal"
                            >
                              + Tạo kỳ thi mới...
                            </option>
                          </select>
                          <button
                            onClick={() => setIsEditingSessions(true)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Đổi tên"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {examStructures
                    .filter(
                      (s) =>
                        s.sessionId === activeSessionId ||
                        (!s.sessionId && activeSessionId === "SESSION_DEFAULT"),
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="border border-slate-200 rounded-lg bg-slate-50/50 p-4 flex flex-col justify-between hover:bg-slate-100 transition relative group"
                      >
                        <div>
                          <div className="font-semibold text-lg mb-2 text-indigo-700">
                            {s.name}
                          </div>

                          <div className="text-xs  text-slate-500 flex flex-col gap-1">
                            {s.part1?.active && (
                              <span>
                                PHẦN 1: {s.part1?.numQuestions} CÂU (
                                {s.part1?.pointsPerQuestion}Đ/CÂU)
                              </span>
                            )}
                            {s.part2?.active && (
                              <span>
                                PHẦN 2: {s.part2?.numQuestions} CÂU (TỐI ĐA{" "}
                                {(s.part2?.points || [])[3]}Đ/CÂU)
                              </span>
                            )}
                            {s.part3?.active && (
                              <span>
                                PHẦN 3: {s.part3?.numQuestions} CÂU (
                                {s.part3?.pointsPerQuestion}Đ/CÂU)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleEditStructure(s)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition-colors text-xs"
                          >
                            CHỈNH SỬA
                          </button>
                          <button
                            onClick={() => handleDeleteStructure(s.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition-colors text-xs"
                          >
                            XÓA
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-slate-200 mt-8">
                  <button
                    onClick={() => setActiveTab("STEP2_KEY")}
                    className="w-full bg-indigo-600 text-white border border-slate-200 rounded-lg px-6 py-4 font-semibold font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    TIẾP TỤC BƯỚC 2: TẠO MÃ ĐỀ & ĐÁP ÁN ►
                  </button>
                </div>
              </>
            ) : (
              currentStructure && (
                <div className="space-y-6 bg-slate-50/50 p-6 border border-slate-200 rounded-lg">
                  <div>
                    <label className="text-sm font-bold text-indigo-700 mb-2 block">
                      Tên cấu trúc (Môn học)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg p-3  font-semibold bg-white focus:outline-none focus:border-blue-600"
                      value={currentStructure.name}
                      onChange={(e) =>
                        setCurrentStructure({
                          ...currentStructure,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Part 1 */}
                  <div className="border border-slate-200 rounded-lg bg-white p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200">
                      <h3 className="font-bold text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block">
                        Phần I: Trắc nghiệm
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentStructure.part1.active}
                          onChange={(e) =>
                            setCurrentStructure({
                              ...currentStructure,
                              part1: {
                                ...currentStructure.part1,
                                active: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs  font-semibold">
                          Kích hoạt
                        </span>
                      </label>
                    </div>
                    {currentStructure.part1.active && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs  text-slate-500 uppercase block mb-1">
                            Số câu
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            value={currentStructure.part1.numQuestions}
                            onChange={(e) =>
                              setCurrentStructure({
                                ...currentStructure,
                                part1: {
                                  ...currentStructure.part1,
                                  numQuestions: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs  text-slate-500 uppercase block mb-1">
                            Điểm / câu
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            value={currentStructure.part1.pointsPerQuestion}
                            onChange={(e) =>
                              setCurrentStructure({
                                ...currentStructure,
                                part1: {
                                  ...currentStructure.part1,
                                  pointsPerQuestion:
                                    parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Part 2 */}
                  <div className="border border-slate-200 rounded-lg bg-white p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200">
                      <h3 className="font-bold text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block">
                        Phần II: Đúng/Sai
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentStructure.part2.active}
                          onChange={(e) =>
                            setCurrentStructure({
                              ...currentStructure,
                              part2: {
                                ...currentStructure.part2,
                                active: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs  font-semibold">
                          Kích hoạt
                        </span>
                      </label>
                    </div>
                    {currentStructure.part2.active && (
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                              Số câu (Mỗi câu 4 ý)
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                              value={currentStructure.part2.numQuestions}
                              onChange={(e) =>
                                setCurrentStructure({
                                  ...currentStructure,
                                  part2: {
                                    ...currentStructure.part2,
                                    numQuestions: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                              Điểm tối đa / câu
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                              value={
                                (currentStructure.part2.points || [])[3] || 1.0
                              }
                              onChange={(e) => {
                                const max = parseFloat(e.target.value) || 0;
                                const isEven =
                                  Math.abs(
                                    (currentStructure.part2.points?.[0] || 0) -
                                      (currentStructure.part2.points?.[3] ||
                                        1.0) *
                                        0.25,
                                  ) < 0.01;
                                setCurrentStructure({
                                  ...currentStructure,
                                  part2: {
                                    ...currentStructure.part2,
                                    points: isEven
                                      ? [0.25 * max, 0.5 * max, 0.75 * max, max]
                                      : [0.1 * max, 0.25 * max, 0.5 * max, max],
                                  },
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={
                                Math.abs(
                                  (currentStructure.part2.points?.[0] || 0) -
                                    (currentStructure.part2.points?.[3] ||
                                      1.0) *
                                      0.25,
                                ) < 0.01
                              }
                              onChange={(e) => {
                                const max =
                                  (currentStructure.part2.points || [])[3] ||
                                  1.0;
                                const isEven = e.target.checked;
                                setCurrentStructure({
                                  ...currentStructure,
                                  part2: {
                                    ...currentStructure.part2,
                                    points: isEven
                                      ? [0.25 * max, 0.5 * max, 0.75 * max, max]
                                      : [0.1 * max, 0.25 * max, 0.5 * max, max],
                                  },
                                });
                              }}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-700">
                              Chia đều điểm (Ví dụ: 0.25đ / 1 ý đúng cho câu 1
                              điểm)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Part 3 */}
                  <div className="border border-slate-200 rounded-lg bg-white p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200">
                      <h3 className="font-bold text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block">
                        Phần III: Trả lời ngắn
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentStructure.part3.active}
                          onChange={(e) =>
                            setCurrentStructure({
                              ...currentStructure,
                              part3: {
                                ...currentStructure.part3,
                                active: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs  font-semibold">
                          Kích hoạt
                        </span>
                      </label>
                    </div>
                    {currentStructure.part3.active && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs  text-slate-500 uppercase block mb-1">
                            Số câu
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            value={currentStructure.part3.numQuestions}
                            onChange={(e) =>
                              setCurrentStructure({
                                ...currentStructure,
                                part3: {
                                  ...currentStructure.part3,
                                  numQuestions: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs  text-slate-500 uppercase block mb-1">
                            Điểm / câu
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            value={currentStructure.part3.pointsPerQuestion}
                            onChange={(e) =>
                              setCurrentStructure({
                                ...currentStructure,
                                part3: {
                                  ...currentStructure.part3,
                                  pointsPerQuestion:
                                    parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      onClick={() => setEditingStructureId(null)}
                      className="px-6 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold text-xs hover:bg-slate-50/50 transition"
                    >
                      HỦY
                    </button>
                    <button
                      onClick={handleSaveStructure}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors "
                    >
                      LƯU CẤU TRÚC
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "STEP5_CALIB" && (
          <Calibration
            initialConfig={globalOMRConfig}
            onSave={(cfg) => {
              setGlobalOMRConfig(cfg);
              setSafeStorage("omr_calibration_config", JSON.stringify(cfg));
              setGlobalOMRTemplateImage(
                getSafeStorage("omr_template_calibration_img"),
              );
              setActiveTab("STEP3_SCAN");
            }}
          />
        )}

        {activeTab === "STEP6_USERS" && (
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tighter text-slate-800">
                Quản lý tài khoản người dùng
              </h2>
              <button
                className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-3 rounded-xl tracking-wide shadow-sm transition-colors text-sm flex items-center gap-1"
                onClick={() => {
                  setShowAddUserModal(true);
                  setNewUserInput({ username: "", password: "", role: "USER" });
                }}
              >
                <Plus className="w-4 h-4" /> Thêm tài khoản
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <th className="p-3 border-b border-slate-200 font-semibold rounded-tl-lg">
                      Tài khoản
                    </th>
                    <th className="p-3 border-b border-slate-200 font-semibold">
                      Quyền hạn
                    </th>
                    <th className="p-3 border-b border-slate-200 font-semibold text-right rounded-tr-lg">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appUsers.map((u, i) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-800">
                        {u.username}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${u.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {u.role === "ADMIN" ? "Quản trị" : "Người dùng"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          className="text-slate-500 hover:text-sky-600 px-2 py-1 text-xs font-semibold"
                          onClick={() => {
                            setDialogState({
                              type: "prompt",
                              message: `Nhập mật khẩu mới cho ${u.username}:`,
                              onConfirm: (newPwd) => {
                                if (newPwd) {
                                  const next = [...appUsers];
                                  next[i].passwordHash = newPwd;
                                  setAppUsers(next);
                                  setDialogState({
                                    type: "alert",
                                    message: "Đổi mật khẩu thành công!",
                                  });
                                }
                              },
                            });
                          }}
                        >
                          Đổi mật khẩu
                        </button>
                        <button
                          className="text-slate-500 hover:text-amber-600 px-2 py-1 text-xs font-semibold"
                          onClick={() => {
                            const next = [...appUsers];
                            next[i].role =
                              next[i].role === "ADMIN" ? "USER" : "ADMIN";
                            setAppUsers(next);
                          }}
                        >
                          Đổi Quyền
                        </button>
                        {u.role === "USER" && (
                          <button
                            className="text-slate-500 hover:text-indigo-600 px-2 py-1 text-xs font-semibold"
                            onClick={() => setShowPermissionModal(u.id)}
                          >
                            Phân quyền
                          </button>
                        )}
                        {u.username !== "admin" && (
                          <button
                            className="text-slate-500 hover:text-red-600 px-2 py-1 text-xs font-semibold"
                            onClick={() => {
                              setDialogState({
                                type: "confirm",
                                message: `Bạn có chắc muốn xoá tài khoản ${u.username}?`,
                                onConfirm: () => {
                                  setAppUsers(
                                    appUsers.filter((a) => a.id !== u.id),
                                  );
                                },
                              });
                            }}
                          >
                            Xoá
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "STEP7_STATS" && (
          <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4 flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-xl font-semibold tracking-tighter text-blue-600 flex items-center gap-2">
                <BarChart3 className="text-blue-600 w-6 h-6" /> Thống kê điểm
                theo bài thi
              </h2>
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-xl tracking-wide shadow-sm transition-colors text-sm flex items-center gap-2"
                onClick={() => {
                  const statsByExam = userScanHistory.reduce(
                    (acc, curr) => {
                      const name = curr.examName || "Khác";
                      if (!acc[name]) {
                        acc[name] = {
                          total: 0,
                          sum: 0,
                          max: -1,
                          min: 9999,
                          passCount: 0,
                        };
                      }
                      acc[name].total++;
                      const score = curr.score || 0;
                      acc[name].sum += score;
                      if (score > acc[name].max) acc[name].max = score;
                      if (score < acc[name].min) acc[name].min = score;
                      if (score >= 5) acc[name].passCount++;
                      return acc;
                    },
                    {} as Record<string, any>,
                  );

                  const summaryData = Object.keys(statsByExam).map((k) => {
                    const st = statsByExam[k];
                    const avg =
                      st.total > 0 ? (st.sum / st.total).toFixed(2) : "0";
                    const max = st.max === -1 ? "0" : st.max.toFixed(2);
                    const min = st.min === 9999 ? "0" : st.min.toFixed(2);
                    return {
                      "Kỳ thi":
                        examSessions.find((s) => s.id === activeSessionId)
                          ?.name || "Kỳ thi chung",
                      "Tên bài thi": k,
                      "Tổng số bài": st.total,
                      "Điểm trung bình": Number(avg),
                      "Cao nhất": Number(max),
                      "Thấp nhất": Number(min),
                      "Số lượng >= 5 điểm": st.passCount,
                    };
                  });

                  const scoreFrequencyData: any[] = [];
                  const frequency: Record<string, Record<string, number>> = {};

                  userScanHistory.forEach((item) => {
                    const name = item.examName || "Khác";
                    if (!frequency[name]) frequency[name] = {};
                    const score = (item.score || 0).toFixed(2);
                    frequency[name][score] = (frequency[name][score] || 0) + 1;
                  });

                  Object.keys(frequency).forEach((exam) => {
                    Object.keys(frequency[exam])
                      .sort((a, b) => parseFloat(a) - parseFloat(b))
                      .forEach((score) => {
                        scoreFrequencyData.push({
                          "Kỳ thi":
                            examSessions.find((s) => s.id === activeSessionId)
                              ?.name || "Kỳ thi chung",
                          "Tên bài thi": exam,
                          "Điểm số": Number(score),
                          "Số lượng": frequency[exam][score],
                        });
                      });
                  });

                  const wb = XLSX.utils.book_new();
                  const ws1 = XLSX.utils.json_to_sheet(summaryData);
                  const ws2 = XLSX.utils.json_to_sheet(scoreFrequencyData);

                  XLSX.utils.book_append_sheet(wb, ws1, "Thống kê chung");
                  XLSX.utils.book_append_sheet(wb, ws2, "Phân bố điểm");

                  XLSX.writeFile(
                    wb,
                    `Thong_Ke_Diem_${new Date().getTime()}.xlsx`,
                  );
                }}
              >
                <Save className="w-4 h-4" />
                Xuất ra Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs text-center border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên bài thi</th>
                    <th className="px-4 py-3">Tổng số bài</th>
                    <th className="px-4 py-3">Điểm TB</th>
                    <th className="px-4 py-3">Cao nhất</th>
                    <th className="px-4 py-3">Thấp nhất</th>
                    <th className="px-4 py-3">Số lượng &gt;= 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-center">
                  {(() => {
                    const statsByExam = userScanHistory.reduce(
                      (acc, curr) => {
                        const name = curr.examName || "Khác";
                        if (!acc[name]) {
                          acc[name] = {
                            total: 0,
                            sum: 0,
                            max: -1,
                            min: 9999,
                            passCount: 0,
                          };
                        }
                        acc[name].total++;
                        const score = curr.score || 0;
                        acc[name].sum += score;
                        if (score > acc[name].max) acc[name].max = score;
                        if (score < acc[name].min) acc[name].min = score;
                        if (score >= 5) acc[name].passCount++;
                        return acc;
                      },
                      {} as Record<string, any>,
                    );

                    const statsArray = Object.keys(statsByExam).map((k) => ({
                      examName: k,
                      total: statsByExam[k].total,
                      avg:
                        statsByExam[k].total > 0
                          ? (statsByExam[k].sum / statsByExam[k].total).toFixed(
                              2,
                            )
                          : 0,
                      max:
                        statsByExam[k].max === -1
                          ? 0
                          : statsByExam[k].max.toFixed(2),
                      min:
                        statsByExam[k].min === 9999
                          ? 0
                          : statsByExam[k].min.toFixed(2),
                      passCount: statsByExam[k].passCount,
                    }));

                    if (statsArray.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-slate-400 italic font-medium"
                          >
                            Chưa có dữ liệu thống kê.
                          </td>
                        </tr>
                      );
                    }

                    return statsArray.map((st, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800 text-left">
                          {st.examName}
                        </td>
                        <td className="px-4 py-3">{st.total}</td>
                        <td className="px-4 py-3 text-blue-600 font-semibold">
                          {st.avg}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">
                          {st.max}
                        </td>
                        <td className="px-4 py-3 text-red-600 font-semibold">
                          {st.min}
                        </td>
                        <td className="px-4 py-3">{st.passCount}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold tracking-tighter text-blue-600">
                  Phân bố điểm theo mức điểm
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">
                      Kỳ thi:
                    </span>
                    <select
                      className={`border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white max-w-[200px] truncate text-red-600`}
                      value={activeSessionId}
                      onChange={(e) => setActiveSessionId(e.target.value)}
                    >
                      {examSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">
                      Bài thi:
                    </span>
                    <select
                      className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-red-600"
                      value={statsExamFilter}
                      onChange={(e) => setStatsExamFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả bài thi</option>
                      {Array.from(
                        new Set(
                          userScanHistory
                            .map((h) => h.examName)
                            .filter(Boolean),
                        ),
                      ).map((name) => (
                        <option key={name as string} value={name as string}>
                          {name as React.ReactNode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 w-full h-[400px]">
                {(() => {
                  const filteredData =
                    statsExamFilter === "ALL"
                      ? userScanHistory
                      : userScanHistory.filter(
                          (h) => h.examName === statsExamFilter,
                        );

                  if (filteredData.length === 0) {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
                        Không có dữ liệu bài thi để thống kê.
                      </div>
                    );
                  }

                  const frequency: Record<string, number> = {};
                  filteredData.forEach((item) => {
                    const score = (item.score || 0).toFixed(2);
                    frequency[score] = (frequency[score] || 0) + 1;
                  });

                  const chartData = Object.keys(frequency)
                    .map((key) => ({
                      score: parseFloat(key),
                      count: frequency[key],
                      label: key,
                    }))
                    .sort((a, b) => a.score - b.score);

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E2E8F0"
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748B", fontSize: 12 }}
                          dy={10}
                          label={{
                            value: "Điểm số",
                            position: "insideBottom",
                            offset: -15,
                            fill: "#475569",
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748B", fontSize: 12 }}
                          label={{
                            value: "Số bài thi",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#475569",
                            fontSize: 14,
                            fontWeight: "500",
                            offset: 10,
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "#F1F5F9" }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow:
                              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                          }}
                          formatter={(value: number) => [
                            value + " bài",
                            "Số lượng",
                          ]}
                          labelFormatter={(label) => "Điểm: " + label}
                        />
                        <Bar
                          dataKey="count"
                          fill="#4F46E5"
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                          animationDuration={1500}
                          name="Số bài"
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-transparent px-6 py-4 flex justify-end items-center text-xs font-medium mt-auto text-slate-400">
        <div>TN2026-PVDA</div>
      </footer>

      {dialogState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className={`${
              dialogState.variant === "danger"
                ? "bg-red-600 border-b border-red-700 text-white"
                : "bg-slate-50 border-b border-slate-200 text-slate-800"
            } px-4 py-3 font-semibold text-sm flex justify-between items-center`}>
              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                {dialogState.variant === "danger" && <AlertTriangle className="w-4 h-4 text-white" />}
                {dialogState.variant === "danger"
                  ? "Không có quyền"
                  : dialogState.type === "confirm"
                    ? "XÁC NHẬN"
                    : "THÔNG BÁO"}
              </span>
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-start gap-3">
                {dialogState.variant === "danger" && (
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className={`font-sans font-medium leading-relaxed ${
                    dialogState.variant === "danger" ? "text-red-700 text-sm font-semibold" : "text-slate-800"
                  }`}>
                    {dialogState.message}
                  </p>
                </div>
              </div>

              {dialogState.type === "prompt" && (
                <input
                  type="text"
                  autoFocus
                  className="mt-4 border border-slate-300 rounded px-3 py-2 w-full outline-none focus:border-indigo-500 font-sans font-medium text-slate-800"
                  defaultValue={dialogState.defaultValue}
                  id="dialog-prompt-input"
                />
              )}
              <div className="flex justify-end mt-6 gap-3">
                {(dialogState.type === "confirm" ||
                  dialogState.type === "prompt") && (
                  <button
                    onClick={() => setDialogState(null)}
                    className="border border-slate-200 rounded-lg bg-white px-4 py-2 font-medium text-sm hover:bg-slate-50/50 transition text-slate-700"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={() => {
                    const currentDialog = dialogState;
                    setDialogState(null);
                    if (currentDialog.onConfirm) {
                      let val;
                      if (currentDialog.type === "prompt") {
                        val = (
                          document.getElementById(
                            "dialog-prompt-input",
                          ) as HTMLInputElement
                        )?.value;
                      }
                      currentDialog.onConfirm(val);
                    }
                  }}
                  className={`${
                    dialogState.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white"
                  } px-4 py-2 rounded-lg font-medium text-sm transition focus:outline-none`}
                >
                  {dialogState.type === "confirm" ||
                  dialogState.type === "prompt"
                    ? "Đồng ý"
                    : "Đóng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-800 px-4 py-3 font-semibold text-sm flex justify-between items-center">
              <span>THÊM TÀI KHOẢN MỚI</span>
            </div>
            <div className="p-6 bg-white space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  value={newUserInput.username}
                  onChange={(e) =>
                    setNewUserInput({
                      ...newUserInput,
                      username: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mật khẩu
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  value={newUserInput.password}
                  onChange={(e) =>
                    setNewUserInput({
                      ...newUserInput,
                      password: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quyền hạn
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  value={newUserInput.role}
                  onChange={(e) =>
                    setNewUserInput({
                      ...newUserInput,
                      role: e.target.value as "ADMIN" | "USER",
                    })
                  }
                >
                  <option value="USER">Người dùng</option>
                  <option value="ADMIN">Quản trị viên (Admin)</option>
                </select>
              </div>
              <div className="flex justify-end mt-6 gap-3 pt-2">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="border border-slate-200 rounded-lg bg-white px-4 py-2 font-medium text-sm hover:bg-slate-50/50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!newUserInput.username || !newUserInput.password) {
                      setDialogState({
                        type: "alert",
                        message: "Vui lòng nhập đủ tên đăng nhập và mật khẩu!",
                      });
                      return;
                    }
                    if (
                      appUsers.some((u) => u.username === newUserInput.username)
                    ) {
                      setDialogState({
                        type: "alert",
                        message: "Tên đăng nhập đã tồn tại!",
                      });
                      return;
                    }
                    const newUser = {
                      id: Math.random().toString(36).substring(2, 9),
                      username: newUserInput.username,
                      passwordHash: newUserInput.password,
                      role: newUserInput.role,
                      assignedClasses: [],
                      assignedExams: [],
                      assignedSessions: [],
                      permissionRecognizeImage: true,
                      permissionGrade: true,
                      permissionViewResults: true,
                      permissionEditResults: true,
                      permissionDeleteResults: true,
                    };
                    setAppUsers([...appUsers, newUser]);
                    setShowAddUserModal(false);
                    setDialogState({
                      type: "alert",
                      message: "Đã thêm tài khoản thành công!",
                    });
                  }}
                  className="bg-sky-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-sky-700 transition"
                >
                  Lưu tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPermissionModal &&
        (() => {
          const user = appUsers.find((u) => u.id === showPermissionModal);
          if (!user) return null;
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-indigo-600 border-b border-indigo-700 text-white px-5 py-4 font-semibold text-lg flex justify-between items-center rounded-t-2xl shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
                  <span>
                    Phân quyền hoạt động & dữ liệu:{" "}
                    <span className="underline font-bold text-yellow-300">{user.username}</span>
                  </span>
                  <button
                    onClick={() => setShowPermissionModal(null)}
                    className="text-white hover:text-slate-200 text-sm font-medium w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: DATA SCOPE PERMISSIONS */}
                    <div className="space-y-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wide flex items-center gap-1.5 text-blue-600">
                        <Folder className="w-4 h-4" /> Phạm vi truy cập dữ liệu
                      </h3>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex justify-between items-center">
                          <span>Kỳ thi được phép</span>
                          <span className="text-[10px] text-slate-400 font-normal italic">Để trống = Cho phép tất cả</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                          {examSessions.map((session) => {
                            const isAssigned = tempAssignedSessions.includes(session.id);
                            return (
                              <label key={"ses_" + session.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded transition">
                                <input
                                  type="checkbox"
                                  className="accent-indigo-600 w-4 h-4 rounded"
                                  checked={isAssigned}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempAssignedSessions([...tempAssignedSessions, session.id]);
                                    } else {
                                      setTempAssignedSessions(tempAssignedSessions.filter((x) => x !== session.id));
                                    }
                                  }}
                                />
                                <span className="truncate" title={session.name}>{session.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex justify-between items-center">
                          <span>Bài thi được phép</span>
                          <span className="text-[10px] text-slate-400 font-normal italic">Để trống = Cho phép tất cả</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                          {allExamNamesStr.map((ex) => {
                            const isAssigned = tempAssignedExams.includes(ex);
                            return (
                              <label key={"ex_" + ex} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded transition">
                                <input
                                  type="checkbox"
                                  className="accent-indigo-600 w-4 h-4 rounded"
                                  checked={isAssigned}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempAssignedExams([...tempAssignedExams, ex]);
                                    } else {
                                      setTempAssignedExams(tempAssignedExams.filter((x) => x !== ex));
                                    }
                                  }}
                                />
                                <span className="truncate" title={ex}>{ex}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex justify-between items-center">
                          <span>Lớp / Phòng thi được phép</span>
                          <span className="text-[10px] text-slate-400 font-normal italic">Để trống = Cho phép tất cả</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                          {classes.map((c) => {
                            const isAssigned = tempAssignedClasses.includes(c);
                            return (
                              <label key={"cls_" + c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded transition">
                                <input
                                  type="checkbox"
                                  className="accent-indigo-600 w-4 h-4 rounded"
                                  checked={isAssigned}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempAssignedClasses([...tempAssignedClasses, c]);
                                    } else {
                                      setTempAssignedClasses(tempAssignedClasses.filter((x) => x !== c));
                                    }
                                  }}
                                />
                                <span className="truncate" title={c}>{c}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: FUNCTIONAL PERMISSIONS */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wide flex items-center gap-1.5 text-indigo-600">
                          <CheckCircle className="w-4 h-4" /> Quyết định chức năng hoạt động
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 bg-indigo-50/50 p-2 border border-indigo-100/50 rounded-lg text-slate-600 leading-relaxed">
                          Cấu hình các quyền hạn nghiệp vụ của tài khoản này khi xử lý dữ liệu Kỳ thi, Bài thi, Lớp/Phòng được phân quyền ở cột trái.
                        </p>
                        
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4 rounded mt-0.5 flex-shrink-0"
                              checked={tempPermissionRecognizeImage}
                              onChange={(e) => setTempPermissionRecognizeImage(e.target.checked)}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">Nhận dạng File ảnh</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">Cho phép tải ảnh/quét ảnh OMR để nhận dạng và khớp mẫu.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4 rounded mt-0.5 flex-shrink-0"
                              checked={tempPermissionGrade}
                              onChange={(e) => setTempPermissionGrade(e.target.checked)}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">Chấm bài</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">Cho phép thực hiện so khớp đáp án để chấm điểm bài làm.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4 rounded mt-0.5 flex-shrink-0"
                              checked={tempPermissionViewResults}
                              onChange={(e) => setTempPermissionViewResults(e.target.checked)}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">Xem kết quả chấm</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">Cho phép truy cập tab Kết quả chấm để xem phổ điểm và danh sách bài làm.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4 rounded mt-0.5 flex-shrink-0"
                              checked={tempPermissionEditResults}
                              onChange={(e) => setTempPermissionEditResults(e.target.checked)}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">Sửa kết quả chấm</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">Cho phép sửa Số báo danh, Mã đề, và chi tiết lựa chọn đáp án các phần.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4 rounded mt-0.5 flex-shrink-0"
                              checked={tempPermissionDeleteResults}
                              onChange={(e) => setTempPermissionDeleteResults(e.target.checked)}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs sm:text-sm">Xoá kết quả chấm</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">Cho phép xoá các kết quả chấm thi trong danh sách kết quả.</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end gap-3 rounded-b-2xl shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
                  <button
                    onClick={() => setShowPermissionModal(null)}
                    className="border border-slate-300 bg-white text-slate-700 font-medium py-2 px-5 rounded-xl hover:bg-slate-50 transition text-sm hover:shadow-sm"
                  >
                    Huỷ bỏ
                  </button>
                  <button
                    onClick={() => {
                      setAppUsers((users) =>
                        users.map((u) =>
                          u.id === user.id
                            ? {
                                ...u,
                                assignedClasses: tempAssignedClasses,
                                assignedExams: tempAssignedExams,
                                assignedSessions: tempAssignedSessions,
                                permissionRecognizeImage: tempPermissionRecognizeImage,
                                permissionGrade: tempPermissionGrade,
                                permissionViewResults: tempPermissionViewResults,
                                permissionEditResults: tempPermissionEditResults,
                                permissionDeleteResults: tempPermissionDeleteResults,
                              }
                            : u,
                        ),
                      );
                      setShowPermissionModal(null);
                      setDialogState({
                        type: "alert",
                        message:
                          "Đã cập nhật phân quyền thành công cho tài khoản " +
                          user.username,
                      });
                    }}
                    className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-xl hover:bg-indigo-700 transition shadow-sm text-sm flex items-center gap-2"
                  >
                    <span>Ghi và Đóng</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {editingImageConfigId && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/80 flex items-start justify-center p-4">
          <div className="w-full max-w-7xl mt-4">
            <Calibration
              initialConfig={
                images.find((i) => i.id === editingImageConfigId)
                  ?.customConfig || globalOMRConfig
              }
              customImageSrc={
                images.find((i) => i.id === editingImageConfigId)
                  ?.warpedDataUrl ||
                images.find((i) => i.id === editingImageConfigId)?.src
              }
              onSave={(newCfg) => {
                // Update custom config for this image
                setImages((prev) =>
                  prev.map((img) => {
                    if (img.id === editingImageConfigId) {
                      return {
                        ...img,
                        customConfig: newCfg,
                        status: "pending", // trigger rescan by user or auto
                        errorMsg: undefined,
                        rawAnswers: undefined,
                      };
                    }
                    return img;
                  }),
                );
                setEditingImageConfigId(null);
                setDialogState({
                  type: "alert",
                  message:
                    "Đã lưu căn chỉnh OMR cho ảnh này. Vui lòng bấm chấm điểm/quét OMR lại.",
                });
              }}
              onCancel={() => setEditingImageConfigId(null)}
            />
          </div>
        </div>
      )}

      {editingResultConfigId && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/80 flex items-start justify-center p-4">
          <div className="w-full max-w-7xl mt-4">
            <Calibration
              initialConfig={
                scanHistory.find((i) => i.id === editingResultConfigId)
                  ?.customConfig || globalOMRConfig
              }
              customImageSrc={
                scanHistory.find((i) => i.id === editingResultConfigId)
                  ?.originalImageSrc ||
                scanHistory.find((i) => i.id === editingResultConfigId)
                  ?.imageSrc ||
                scanHistory.find((i) => i.id === editingResultConfigId)
                  ?.firebaseImageUrl
              }
              onSave={async (newCfg) => {
                setScanHistory((prev) => {
                  const next = prev.map((item) => {
                    if (item.id === editingResultConfigId) {
                      return {
                        ...item,
                        customConfig: newCfg,
                      };
                    }
                    return item;
                  });
                  localforage.setItem(`autograde_history_${currentUserId}`, next);
                  return next;
                });

                setSelectedResult((prev: any) => {
                  if (prev && prev.id === editingResultConfigId) {
                    return {
                      ...prev,
                      customConfig: newCfg,
                    };
                  }
                  return prev;
                });

                setEditingResultConfigId(null);
                setDialogState({
                  type: "confirm",
                  message: "Đã lưu toạ độ căn chỉnh tuỳ chỉnh cho ảnh này! Bạn có muốn thực hiện chấm lại điểm ngay bây giờ không?",
                  onConfirm: () => {
                    regradeSingleResultInline(editingResultConfigId);
                  },
                });
              }}
              onCancel={() => setEditingResultConfigId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
