import React, { useState, useEffect, useRef } from "react";
import { Upload, Save, Maximize, Target, FileImage, Download, FileUp } from "lucide-react";
import { OMRConfig } from "../services/omrService";

const DEFAULT_CONFIG: OMRConfig = {
  paperWidth: 800,
  paperHeight: 1131,
  regions: {
    studentId: {
      x: 456,
      y: 150,
      w: 220,
      h: 220,
      cols: 8,
      rows: 10,
      type: "single",
    },
    examCode: {
      x: 670,
      y: 150,
      w: 96,
      h: 220,
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
      { x: 130, y: 580, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 320, y: 580, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 510, y: 580, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 700, y: 580, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 130, y: 650, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 320, y: 650, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 510, y: 650, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
      { x: 700, y: 650, w: 90, h: 60, cols: 2, rows: 4, type: "multiple" },
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

export default function Calibration({
  onSave,
  onCancel,
  initialConfig,
  customImageSrc,
}: {
  onSave: (cfg: OMRConfig) => void;
  onCancel?: () => void;
  initialConfig: OMRConfig | null;
  customImageSrc?: string;
}) {
  const [templateImg, setTemplateImg] = useState<string | null>(
    customImageSrc || null,
  );
  const [config, setConfig] = useState<OMRConfig>(
    initialConfig || DEFAULT_CONFIG,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "omr_calibration_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
          try {
             const parsed = JSON.parse(e.target?.result as string);
             if (parsed && typeof parsed === 'object' && parsed.regions) {
                 setConfig(parsed);
                 alert("Đã nhập cấu hình toạ độ thành công!");
             } else {
                 alert("File cấu hình không hợp lệ.");
             }
          } catch (err) {
             alert("Lỗi khi đọc file cấu hình.");
          }
       };
       reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!customImageSrc) {
      let savedImg = null;
      try {
        savedImg = localStorage.getItem("omr_template_calibration_img");
      } catch (e) {}
      if (savedImg) setTemplateImg(savedImg);
    }
  }, [customImageSrc]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setTemplateImg(base64);
      try {
        localStorage.setItem("omr_template_calibration_img", base64);
      } catch (err) {
        console.warn("Could not save image to localstorage due to size");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateRegion = (
    path: string,
    field: "x" | "y" | "w" | "h" | "cols" | "rows",
    value: number,
  ) => {
    const newConfig = JSON.parse(JSON.stringify(config)) as OMRConfig;

    const parts = path.split(".");
    if (parts[0] === "studentId") {
      if (newConfig.regions.studentId)
        newConfig.regions.studentId[field] = value;
    } else if (parts[0] === "examCode") {
      if (newConfig.regions.examCode) newConfig.regions.examCode[field] = value;
    } else if (parts[0] === "studentName") {
      if (newConfig.regions.studentName)
        newConfig.regions.studentName[field] = value;
    } else if (parts[0].startsWith("part")) {
      const partArray = (newConfig.regions as any)[parts[0]];
      const idx = parseInt(parts[1], 10);
      if (partArray && partArray[idx]) {
        partArray[idx][field] = value;
      }
    }
    setConfig(newConfig);
  };

  const renderRegion = (
    region: any,
    path: string,
    color: string,
    label: string,
  ) => {
    if (!region) return null;
    return (
      <div
        key={path}
        className="absolute border-2 border-dashed group hover:z-50"
        style={{
          left: `${(region.x / config.paperWidth) * 100}%`,
          top: `${(region.y / config.paperHeight) * 100}%`,
          width: `${(region.w / config.paperWidth) * 100}%`,
          height: `${(region.h / config.paperHeight) * 100}%`,
          borderColor: color,
          backgroundColor: `${color}33`,
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-50 flex flex-col">
          {Array.from({ length: region.rows }).map((_, r) => (
            <div key={r} className="flex-1 flex w-full">
              {Array.from({ length: region.cols }).map((_, c) => (
                <div
                  key={c}
                  className="flex-1 flex items-center justify-center border"
                  style={{ borderColor: `${color}66` }}
                >
                  {region.type === "text" ? (
                    <div
                      className="rounded-sm"
                      style={{
                        width: "80%",
                        height: "80%",
                        minHeight: "4px",
                        border: `1px solid ${color}`,
                      }}
                    ></div>
                  ) : (
                    <div
                      className="rounded-full"
                      style={{
                        width: "70%",
                        height: "70%",
                        minHeight: "4px",
                        border: `1px solid ${color}`,
                      }}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="absolute -top-6 left-0 bg-white border border-slate-300 rounded shadow-sm text-xs px-1 whitespace-nowrap text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold">
          {label}
          <div className="flex gap-1 mt-1 p-1 bg-slate-50 flex-col">
            <label className="flex items-center justify-between gap-1">
              X:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.x}
                onChange={(e) =>
                  handleUpdateRegion(path, "x", parseInt(e.target.value))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              Y:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.y}
                onChange={(e) =>
                  handleUpdateRegion(path, "y", parseInt(e.target.value))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              W:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.w}
                onChange={(e) =>
                  handleUpdateRegion(path, "w", parseInt(e.target.value))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              H:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.h}
                onChange={(e) =>
                  handleUpdateRegion(path, "h", parseInt(e.target.value))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              Cols:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.cols}
                onChange={(e) =>
                  handleUpdateRegion(path, "cols", parseInt(e.target.value))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-1">
              Rows:{" "}
              <input
                type="number"
                className="w-12 border p-0.5"
                value={region.rows}
                onChange={(e) =>
                  handleUpdateRegion(path, "rows", parseInt(e.target.value))
                }
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-amber-50">
        <div className="flex gap-3 text-amber-800 text-sm">
          <div className="text-xl">⚠️</div>
          <div>
            <strong className="font-bold">LƯU Ý QUAN TRỌNG:</strong> Khi kéo các
            khung SBD, Mã Đề và khung Trắc Nghiệm, bạn phải{" "}
            <strong>kéo khung CHỈ BAO TRỌN 10 HÀNG Ô TRÒN CHỨA ĐÁP ÁN</strong>.
            Tuyệt đối KHÔNG được kéo khung trùm lên phần chữ "SBD", "Mã Đề" hoặc
            phần viết tay bên trên!
          </div>
        </div>
      </div>
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />{" "}
            {customImageSrc
              ? "Căn chỉnh ảnh hiện tại"
              : "Căn chỉnh Mẫu (Calibration)"}
          </h2>
          <p className="text-sm text-slate-500">
            {customImageSrc
              ? "Điều chỉnh toạ độ khung quét OMR cho riêng ảnh này."
              : "Tải lên một mẫu phiếu chuẩn vuông vắn (thường là PDF hoặc đã canh lề 800x1131) để tinh chỉnh toạ độ khung."}
          </p>
          <p className="text-xs text-red-600 font-semibold mt-1">
            Lưu ý: Đối với Mã Đề và SBD, chỉ được vẽ khung bao quanh phần{" "}
            <u className="underline">những ô tròn có thể tô</u> (0-9). Tuyệt đối
            không bao gồm viền và các ô viết tay ở bảng đó vào trong khung.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          {!customImageSrc && (
            <>
              <button
                onClick={() =>
                  setConfig({
                    paperWidth: 800,
                    paperHeight: 1131,
                    regions: {
                      studentId: {
                        x: 456,
                        y: 150,
                        w: 220,
                        h: 220,
                        cols: 8,
                        rows: 10,
                        type: "single",
                      },
                      examCode: {
                        x: 670,
                        y: 150,
                        w: 96,
                        h: 220,
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
                        {
                          x: 110,
                          y: 400,
                          w: 130,
                          h: 150,
                          cols: 4,
                          rows: 10,
                          type: "single",
                        },
                        {
                          x: 300,
                          y: 400,
                          w: 130,
                          h: 150,
                          cols: 4,
                          rows: 10,
                          type: "single",
                        },
                        {
                          x: 490,
                          y: 400,
                          w: 130,
                          h: 150,
                          cols: 4,
                          rows: 10,
                          type: "single",
                        },
                        {
                          x: 680,
                          y: 400,
                          w: 130,
                          h: 150,
                          cols: 4,
                          rows: 10,
                          type: "single",
                        },
                      ],
                      part2: [
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
                          x: 320,
                          y: 580,
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
                          x: 700,
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
                          y: 650,
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
                          y: 650,
                          w: 90,
                          h: 60,
                          cols: 2,
                          rows: 4,
                          type: "multiple",
                        },
                      ],
                      part3: [
                        {
                          x: 110,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                        {
                          x: 200,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                        {
                          x: 290,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                        {
                          x: 380,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                        {
                          x: 470,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                        {
                          x: 560,
                          y: 760,
                          w: 60,
                          h: 160,
                          cols: 5,
                          rows: 11,
                          type: "text",
                        },
                      ],
                    },
                  })
                }
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition shadow-sm text-sm"
              >
                Nội dung Mặc định
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm text-sm"
              >
                <Upload className="w-4 h-4" /> Tải Mẫu Mới
              </button>
              <input type="file" ref={importRef} accept=".json" className="hidden" onChange={handleImportConfig} />
              <button
                onClick={() => importRef.current?.click()}
                className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                title="Nhập cấu hình (.json)"
              >
                <FileUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportConfig}
                className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                title="Xuất cấu hình (.json)"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Hủy
            </button>
          )}
          <button
            onClick={() => onSave(config)}
            className="bg-indigo-600 border border-transparent text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />{" "}
            {customImageSrc ? "Lưu chỉnh sửa ảnh này" : "Lưu cấu hình"}
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-2">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <h3 className="font-semibold mb-2">Hướng dẫn</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Tải lên ảnh phiếu mẫu chuẩn.</li>
              <li>
                Dùng màn hình bên phải: Rà chuột vào các khung màu để làm hiện
                hộp thoại chỉnh X, Y, W, H.
              </li>
              <li>
                Khung đỏ: Số báo danh, Khung xanh lam: Mã đề, Khung màu khác:
                Các phần thi.
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
            <h3 className="font-semibold text-blue-800 text-sm mb-2 flex justify-between items-center">
              <span>Độ nhạy nhận diện vết tô</span>
              <span className="bg-blue-100 text-blue-800 px-2 rounded-full text-xs">
                {config.sensitivity ?? 50}
              </span>
            </h3>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
              value={config.sensitivity ?? 50}
              onChange={(e) =>
                setConfig({ ...config, sensitivity: parseInt(e.target.value) })
              }
            />
            <div className="flex justify-between text-[10px] text-blue-600 font-medium px-1 mt-1">
              <span>Khắt khe (Nét liền/đậm)</span>
              <span>Thường</span>
              <span>Nhạy (Mờ/bóng)</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-2">
              Nếu nhận dạng <b>bị thiếu</b> (không nhận được ô đã tô mờ), hãy
              kéo về mốc Nhạy.
              <br />
              Nếu nhận dạng <b>bị dư</b> (nhận cả mép chì tẩy xoá), hãy kéo về
              mốc Khắt khe.
            </p>
          </div>

          <h3 className="font-semibold text-slate-800 mt-4 border-b pb-2 text-sm mt-6">
            Điều chỉnh nhanh khung vuông
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Nếu hệ thống nhận sai cột/sai dòng, đó là do toạ độ W (chiều rộng)
            hoặc X (vị trí) chưa khớp. Hãy chỉnh W và X cho đến khi khung khớp
            vừa vặn vòng tròn.
            <br />
            <span className="text-red-600 font-bold">
              Lưu ý: Đối với Số báo danh và Mã đề, KHUNG CHỈ BAO GỒM CÁC Ô TRÒN
              TỪ 0 ĐẾN 9, bỏ qua hàng ô vuông trống ở trên cùng.
            </span>
          </p>
          {["studentId", "examCode", "studentName"].map((k) => (
            <div
              key={k}
              className="mt-2 text-xs border border-slate-200 p-2 rounded bg-slate-50"
            >
              <span className="font-bold text-slate-700 capitalize">{k}</span>
              <div className="grid grid-cols-6 gap-1 mt-1">
                <input
                  type="number"
                  placeholder="X"
                  value={(config.regions as any)[k]?.x || 0}
                  onChange={(e) =>
                    handleUpdateRegion(k, "x", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="X"
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={(config.regions as any)[k]?.y || 0}
                  onChange={(e) =>
                    handleUpdateRegion(k, "y", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="Y"
                />
                <input
                  type="number"
                  placeholder="W"
                  value={(config.regions as any)[k]?.w || 0}
                  onChange={(e) =>
                    handleUpdateRegion(k, "w", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="Width"
                />
                <input
                  type="number"
                  placeholder="H"
                  value={(config.regions as any)[k]?.h || 0}
                  onChange={(e) =>
                    handleUpdateRegion(k, "h", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="Height"
                />
                <input
                  type="number"
                  placeholder="Cols"
                  value={(config.regions as any)[k]?.cols || 1}
                  onChange={(e) =>
                    handleUpdateRegion(k, "cols", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="Columns"
                />
                <input
                  type="number"
                  placeholder="Rows"
                  value={(config.regions as any)[k]?.rows || 1}
                  onChange={(e) =>
                    handleUpdateRegion(k, "rows", parseInt(e.target.value))
                  }
                  className="border p-1 w-full rounded"
                  title="Rows"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3 bg-slate-100 rounded-lg p-4 flex justify-center border border-slate-200 relative overflow-hidden">
          <div
            ref={containerRef}
            className="bg-white shadow-xl relative"
            style={{
              width: "100%",
              maxWidth: "600px",
              aspectRatio: `${config.paperWidth} / ${config.paperHeight}`,
            }}
          >
            {templateImg ? (
              <img
                src={templateImg}
                alt="Template"
                className="w-full h-full object-fill absolute inset-0"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <FileImage className="w-12 h-12 mb-2 opacity-50" />
                <span>Chưa có ảnh mẫu</span>
              </div>
            )}

            {/* Render regions */}
            {renderRegion(
              config.regions.studentId,
              "studentId",
              "#ef4444",
              "Số báo danh",
            )}
            {renderRegion(
              config.regions.examCode,
              "examCode",
              "#3b82f6",
              "Mã đề",
            )}
            {renderRegion(
              config.regions.studentName,
              "studentName",
              "#eab308",
              "Họ và tên",
            )}

            {config.regions.part1?.map((b, i) =>
              renderRegion(b, `part1.${i}`, "#10b981", `P1_B${i}`),
            )}
            {config.regions.part2?.map((b, i) =>
              renderRegion(b, `part2.${i}`, "#8b5cf6", `P2_B${i}`),
            )}
            {config.regions.part3?.map((b, i) =>
              renderRegion(b, `part3.${i}`, "#ec4899", `P3_B${i}`),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
