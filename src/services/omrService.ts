export interface OMRConfig {
  paperWidth: number;
  paperHeight: number;
  sensitivity?: number; // 0-100, default: 50. Controls how dark a mark needs to be
  // Các vùng toạ độ (x, y, w, h) trên ảnh chuẩn
  regions: {
    studentId: RegionConfig;
    studentName?: RegionConfig;
    examCode: RegionConfig;
    part1: RegionConfig[];
    part2?: RegionConfig[];
    part3?: RegionConfig[];
  }
}

export interface RegionConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  type: 'single' | 'multiple' | 'text' | 'truefalse'; // single: chọn 1 ô đậm nhất, multiple: chọn nhiều ô (Đ/S)
  markers?: {x: number, y: number}[]; // Các điểm neo nhỏ của vùng
}

// Hàm khởi tạo chờ OpenCV tải xong (Hỗ trợ nhiều CDN, cơ chế nạp dự phòng và chống xoay vô hạn)
export const waitForOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 1. Kiểm tra nhanh xem OpenCV và cv.Mat đã sẵn sàng chưa
    if ((window as any).cv && (window as any).cv.Mat) {
      resolve();
      return;
    }

    const cdnUrls = [
      "https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.8.0/opencv.js",
      "https://cdn.jsdelivr.net/npm/@techstardna/opencv-js@4.8.0-release.1/opencv.js",
      "https://unpkg.com/opencv.js@4.8.0/opencv.js",
      "https://docs.opencv.org/4.8.0/opencv.js"
    ];

    let currentCdnIndex = 0;
    let scriptElement: HTMLScriptElement | null = document.querySelector('script[src*="opencv.js"]') as HTMLScriptElement;

    // Hàm thực hiện nạp script từ CDN
    const loadScript = (url: string) => {
      console.log(`[OpenCV Loader] Đang thử tải OpenCV từ CDN: ${url}`);
      
      // Nếu đã có thẻ script cũ bị lỗi/chưa xong, xoá nó để nạp lại thẻ mới sạch sẽ
      if (scriptElement && scriptElement.parentNode) {
        try {
          scriptElement.parentNode.removeChild(scriptElement);
        } catch (e) {
          console.warn("[OpenCV Loader] Không thể gỡ thẻ script cũ:", e);
        }
      }

      scriptElement = document.createElement("script");
      scriptElement.src = url;
      scriptElement.type = "text/javascript";
      scriptElement.async = true;

      scriptElement.onerror = () => {
        console.warn(`[OpenCV Loader] Tải thất bại từ nguồn: ${url}`);
        currentCdnIndex++;
        if (currentCdnIndex < cdnUrls.length) {
          loadScript(cdnUrls[currentCdnIndex]);
        } else {
          clearInterval(checkInterval);
          reject(new Error("Lỗi kết nối: Các máy chủ CDN tải OpenCV đều không phản hồi. Vui lòng kiểm tra lại mạng Internet hoặc thử lại sau!"));
        }
      };

      document.head.appendChild(scriptElement);
    };

    // Nếu trên trang chưa có thẻ script OpenCV nào, ta chủ động tạo tải từ nguồn tối ưu đầu tiên
    if (!scriptElement) {
      loadScript(cdnUrls[0]);
    } else {
      // Nếu có sẵn thẻ script nhưng chưa load được, nếu quá lâu vẫn rảnh, ta bắt đầu kích hoạt cơ chế fallback dự phòng
      // Thẻ có sẵn mặc định lấy từ index.html (đã cấu hình cdnjs trước đó)
      scriptElement.onerror = () => {
        console.warn("[OpenCV Loader] Thẻ script mặc định bị lỗi, chuyển sang nạp dự phòng...");
        currentCdnIndex = 1; // Nhảy ngay sang CDN dự phòng thứ 2
        loadScript(cdnUrls[currentCdnIndex]);
      };
    }

    // Thiết lập vòng lặp kiểm tra định kỳ xem đối tượng cv và cv.Mat đã khởi động thành công chưa (WASM setup complete)
    let elapsed = 0;
    const timeout = 30000; // Thời gian chờ tối đa 30 giây
    const checkInterval = setInterval(() => {
      elapsed += 500;
      if ((window as any).cv && (window as any).cv.Mat) {
        clearInterval(checkInterval);
        console.log(`[OpenCV Loader] OpenCV đã khởi tạo thành công và sẵn sàng để xử lý ảnh OMR.`);
        resolve();
      } else if (elapsed >= timeout) {
        clearInterval(checkInterval);
        reject(new Error("Không thể tải thư viện xử lý ảnh OpenCV (Thời gian tải quá 30 giây). Vui lòng làm mới trang (F5) hoặc kiểm tra chất lượng đường truyền mạng của bạn!"));
      }
    }, 500);
  });
};

export const processOMR = async (imageCanvas: HTMLCanvasElement, config: OMRConfig, referenceImages: string[] = []) => {
  await waitForOpenCV();
  const cv = (window as any).cv;

  let src = cv.imread(imageCanvas);
  let gray = new cv.Mat();
  let thresh = new cv.Mat();
  let blurred = new cv.Mat();
  let edged = new cv.Mat();

  // 1. Tiền xử lý: Chuyển xám, căn chỉnh độ sáng, giảm nhiễu
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // Cân bằng độ sáng (CLAHE) để xử lý ảnh không đều màu, có bóng
  let clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  clahe.apply(gray, gray);
  clahe.delete();

  // Giảm nhiễu nhẹ trước khi xử lý
  cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);

  // 2. Bước Nhận dạng vùng neo (Căn chỉnh ảnh / Warp Perspective)
  // Thử tìm các điểm neo Vuông (Corner Markers)
  cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 15);
  
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let markers = [];
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    let totalArea = src.cols * src.rows;
    let minMarkerArea = totalArea * 0.0001; // 0.01% of total area
    let maxMarkerArea = totalArea * 0.02;   // 2% of total area
    
    // Điểm neo vuông trên giấy thực tế đôi khi lớn nhỏ khác nhau
    if (area > minMarkerArea && area < maxMarkerArea) {
      let rect = cv.boundingRect(cnt);
      let rotatedRect = cv.minAreaRect(cnt);
      
      let width = rotatedRect.size.width;
      let height = rotatedRect.size.height;
      if (width > 0 && height > 0) {
          let minDim = Math.min(width, height);
          let maxDim = Math.max(width, height);
          let rotatedAspectRatio = minDim / maxDim;
          let rotatedExtent = area / (width * height);
          
          if (rotatedAspectRatio > 0.60 && rotatedExtent > 0.60) {
            markers.push({
               x: rect.x + rect.width / 2,
               y: rect.y + rect.height / 2,
               area: area,
               rect: rect
            });
          }
      }
    }
  }

  let finalPts = null;
  // Tìm 4 điểm neo ở 4 góc ngoài cùng bằng cách xét 20 ứng viên lớn nhất
  if (markers.length >= 4) {
     markers.sort((a,b) => b.area - a.area);
     let candidates = markers.slice(0, 20);
     let bestQuad = null;
     let maxQuadArea = 0;
     
     const getCorners = (pts: any[]) => {
         let tl = pts[0], tr = pts[0], bl = pts[0], br = pts[0];
         let min_sum = Infinity, max_sum = -Infinity, min_diff = Infinity, max_diff = -Infinity;
         for (let p of pts) {
             let sum = p.x + p.y;
             let diff = p.y - p.x;
             if (sum < min_sum) { min_sum = sum; tl = p; }
             if (sum > max_sum) { max_sum = sum; br = p; }
             if (diff < min_diff) { min_diff = diff; tr = p; }
             if (diff > max_diff) { max_diff = diff; bl = p; }
         }
         if (tl !== tr && tl !== bl && tl !== br && tr !== bl && tr !== br && bl !== br) {
             return [tl, tr, br, bl];
         }
         return null;
     };

     const quadArea = (pts: any[]) => {
         // shoelace formula
         let area = 0;
         for (let i = 0; i < 4; i++) {
             let j = (i + 1) % 4;
             area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
         }
         return Math.abs(area / 2);
     };
     
     for (let i = 0; i < candidates.length; i++) {
         for (let j = i + 1; j < candidates.length; j++) {
             for (let k = j + 1; k < candidates.length; k++) {
                 for (let l = k + 1; l < candidates.length; l++) {
                     let quad = [candidates[i], candidates[j], candidates[k], candidates[l]];
                     let minArea = Math.min(...quad.map(m => m.area));
                     let maxArea = Math.max(...quad.map(m => m.area));
                     if (maxArea / minArea > 5) continue; // Khu vực điểm neo phải có diện tích tương tự nhau (sai số tối đa 5 lần)
                     
                     let sorted = getCorners(quad);
                     if (sorted) {
                         let area = quadArea(sorted);
                         if (area > maxQuadArea) {
                             maxQuadArea = area;
                             bestQuad = sorted;
                         }
                     }
                 }
             }
         }
     }
     
     if (bestQuad) {
         finalPts = bestQuad;
     }
  }

  let warped = new cv.Mat();
  let colorWarped = new cv.Mat();
  let dsize = new cv.Size(config.paperWidth, config.paperHeight);

  // Mảng toạ độ đích mặc định
  let marginMarker = 35;
  let dstPts = [
    { x: marginMarker, y: marginMarker },
    { x: config.paperWidth - marginMarker, y: marginMarker },
    { x: config.paperWidth - marginMarker, y: config.paperHeight - marginMarker },
    { x: marginMarker, y: config.paperHeight - marginMarker }
  ];

  // Nếu người dùng upload ảnh mẫu (reference), dùng nó để lấy toạ độ đích chính xác
  if (referenceImages && referenceImages.length > 0) {
     try {
         const refBase64 = referenceImages[0];
         const refImgEl = document.createElement('img');
          refImgEl.crossOrigin = "anonymous";
         if (refBase64.startsWith("http://") || refBase64.startsWith("https://") || refBase64.startsWith("data:")) {
              refImgEl.src = refBase64;
          } else {
              refImgEl.src = `data:image/jpeg;base64,${refBase64}`;
          }
         await new Promise((resolve, reject) => { 
             refImgEl.onload = resolve;
             refImgEl.onerror = reject;
         });

         let refSrc = cv.imread(refImgEl);
         let refGray = new cv.Mat();
         let refThresh = new cv.Mat();
         cv.cvtColor(refSrc, refGray, cv.COLOR_RGBA2GRAY);
         
         // Sử dụng chung phương pháp với ảnh scan để đảm bảo đồng nhất
         let refClahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
         refClahe.apply(refGray, refGray);
         refClahe.delete();
         cv.GaussianBlur(refGray, refGray, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
         
         cv.adaptiveThreshold(refGray, refThresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 15);

         let refContours = new cv.MatVector();
         let refHierarchy = new cv.Mat();
         cv.findContours(refThresh, refContours, refHierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

         let refMarkers: any[] = [];
         for (let i = 0; i < refContours.size(); ++i) {
             let cnt = refContours.get(i);
             let area = cv.contourArea(cnt);
             let totalRefArea = refSrc.cols * refSrc.rows;
             let minRefMarkerArea = totalRefArea * 0.0001;
             let maxRefMarkerArea = totalRefArea * 0.02;

             if (area > minRefMarkerArea && area < maxRefMarkerArea) {
                 let rect = cv.boundingRect(cnt);
                 let rotatedRect = cv.minAreaRect(cnt);
                 let width = rotatedRect.size.width;
                 let height = rotatedRect.size.height;
                 
                 if (width > 0 && height > 0) {
                     let minDim = Math.min(width, height);
                     let maxDim = Math.max(width, height);
                     let rotatedAspectRatio = minDim / maxDim;
                     let rotatedExtent = area / (width * height);
                     if (rotatedAspectRatio > 0.60 && rotatedExtent > 0.60) {
                         refMarkers.push({
                             x: rect.x + rect.width / 2,
                             y: rect.y + rect.height / 2,
                             area: area
                         });
                     }
                 }
             }
         }
         refContours.delete(); refHierarchy.delete(); refThresh.delete(); refGray.delete();

         if (refMarkers.length >= 4) {
             refMarkers.sort((a: any, b: any) => b.area - a.area);
             let candidates = refMarkers.slice(0, 20);
             let bestQuad = null;
             let maxQuadArea = 0;

             const getCorners = (pts: any[]) => {
                 let tl = pts[0], tr = pts[0], bl = pts[0], br = pts[0];
                 let min_sum = Infinity, max_sum = -Infinity, min_diff = Infinity, max_diff = -Infinity;
                 for (let p of pts) {
                     let sum = p.x + p.y;
                     let diff = p.y - p.x;
                     if (sum < min_sum) { min_sum = sum; tl = p; }
                     if (sum > max_sum) { max_sum = sum; br = p; }
                     if (diff < min_diff) { min_diff = diff; tr = p; }
                     if (diff > max_diff) { max_diff = diff; bl = p; }
                 }
                 if (tl !== tr && tl !== bl && tl !== br && tr !== bl && tr !== br && bl !== br) {
                     return [tl, tr, br, bl];
                 }
                 return null;
             };

             const quadArea = (pts: any[]) => {
                 let area = 0;
                 for (let i = 0; i < 4; i++) {
                     let j = (i + 1) % 4;
                     area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
                 }
                 return Math.abs(area / 2);
             };

             for (let i = 0; i < candidates.length; i++) {
                 for (let j = i + 1; j < candidates.length; j++) {
                     for (let k = j + 1; k < candidates.length; k++) {
                         for (let l = k + 1; l < candidates.length; l++) {
                             let quad = [candidates[i], candidates[j], candidates[k], candidates[l]];
                             let minArea = Math.min(...quad.map(m => m.area));
                             let maxArea = Math.max(...quad.map(m => m.area));
                             if (maxArea / minArea > 5) continue;
                             
                             let sorted = getCorners(quad);
                             if (sorted) {
                                 let area = quadArea(sorted);
                                 if (area > maxQuadArea) {
                                     maxQuadArea = area;
                                     bestQuad = sorted;
                                 }
                             }
                         }
                     }
                 }
             }

             if (bestQuad) {
                 let rtl = bestQuad[0];
                 let rtr = bestQuad[1];
                 let rbr = bestQuad[2];
                 let rbl = bestQuad[3];
                 
                 // Tinh chỉnh tỷ lệ toạ độ neo của ảnh mẫu về kích thước config
                 let scaleX = config.paperWidth / refSrc.cols;
                 let scaleY = config.paperHeight / refSrc.rows;
    
                 console.log("Ref scale:", scaleX, scaleY);
    
                 dstPts = [
                     { x: rtl.x * scaleX, y: rtl.y * scaleY },
                     { x: rtr.x * scaleX, y: rtr.y * scaleY },
                     { x: rbr.x * scaleX, y: rbr.y * scaleY },
                     { x: rbl.x * scaleX, y: rbl.y * scaleY }
                 ];
             }
         }
         refSrc.delete();
     } catch (err) {
         console.warn("Could not process reference image", err);
     }
  }

  if (finalPts) {
    // Nếu tìm thấy 4 điểm neo vuông, lấy toạ độ đích (Destination Coords)
    let pt0 = finalPts[0]; // Top-Left
    let pt1 = finalPts[1]; // Top-Right
    let pt2 = finalPts[2]; // Bottom-Right
    let pt3 = finalPts[3]; // Bottom-Left

    // Dùng TÂM của các điểm neo (sẽ chính xác hơn nhiều so với việc dùng góc của boundingRect chưa xoay)
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
      pt0.x, pt0.y,
      pt1.x, pt1.y,
      pt2.x, pt2.y,
      pt3.x, pt3.y
    ]);

    let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
      dstPts[0].x, dstPts[0].y, 
      dstPts[1].x, dstPts[1].y,
      dstPts[2].x, dstPts[2].y, 
      dstPts[3].x, dstPts[3].y
    ]);

    let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
    cv.warpPerspective(gray, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    cv.warpPerspective(src, colorWarped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    srcCoords.delete(); dstCoords.delete(); M.delete();
  } else {
    // Fallback: Dùng Canny để tìm viền tờ giấy
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edged, 75, 200);

    cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let paperContour = null;
    let maxArea = 0;
    const minPaperArea = src.cols * src.rows * 0.2; // Require at least 20% of the image
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt);
      if (area > minPaperArea) { // Lọc các vùng nhỏ
        let peri = cv.arcLength(cnt, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4 && area > maxArea) {
          if (paperContour) paperContour.delete();
          paperContour = approx.clone();
          maxArea = area;
        }
        approx.delete();
      }
    }

    if (paperContour) {
      let points = [];
      for (let i = 0; i < 4; i++) {
        points.push({ x: paperContour.data32S[i * 2], y: paperContour.data32S[i * 2 + 1] });
      }
      points.sort((a, b) => a.y - b.y);
      let top = points.slice(0, 2).sort((a, b) => a.x - b.x);
      let bottom = points.slice(2, 4).sort((a, b) => a.x - b.x);
      let pFinal = [top[0], top[1], bottom[1], bottom[0]];

      let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
        pFinal[0].x, pFinal[0].y, pFinal[1].x, pFinal[1].y,
        pFinal[2].x, pFinal[2].y, pFinal[3].x, pFinal[3].y
      ]);

      let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, config.paperWidth, 0, config.paperWidth, config.paperHeight, 0, config.paperHeight
      ]);

      let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
      cv.warpPerspective(gray, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
      cv.warpPerspective(src, colorWarped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
      srcCoords.delete(); dstCoords.delete(); M.delete(); paperContour.delete();
    } else {
      cv.resize(gray, warped, dsize, 0, 0, cv.INTER_AREA);
      cv.resize(src, colorWarped, dsize, 0, 0, cv.INTER_AREA);
    }
  }

  // Chuyển warped thành ảnh nhị phân để đếm pixel
  let bwImages = new cv.Mat();
  
  // Dùng adaptive threshold với block size lớn và hằng số C=15
  cv.adaptiveThreshold(warped, bwImages, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 75, 15);
  
  // Khử nhiễu dạng hột (salt and pepper noise) rất hiệu quả cho adaptive threshold
  cv.medianBlur(bwImages, bwImages, 3);
  
  let debugImg = colorWarped.clone();

  if (finalPts) {
    let marginMarker = 35;
    cv.circle(debugImg, new cv.Point(marginMarker, marginMarker), 20, new cv.Scalar(255, 0, 0, 255), 2);
    cv.circle(debugImg, new cv.Point(config.paperWidth - marginMarker, marginMarker), 20, new cv.Scalar(255, 0, 0, 255), 2);
    cv.circle(debugImg, new cv.Point(config.paperWidth - marginMarker, config.paperHeight - marginMarker), 20, new cv.Scalar(255, 0, 0, 255), 2);
    cv.circle(debugImg, new cv.Point(marginMarker, config.paperHeight - marginMarker), 20, new cv.Scalar(255, 0, 0, 255), 2);
  }

  let results: any = {
    examCode: '',
    studentId: '',
    part1: [] as string[],
    part2: [] as any[],
    part3: [] as any[],
    rawPart1: [] as any[],
    rawPart2: [] as any[],
    rawPart3: [] as any[],
    rawStudentId: [] as any[],
    rawExamCode: [] as any[]
  };

  // TÌM NEO VUÔNG NHỎ TRONG ẢNH ĐÃ WARP TỪ bwImages
  let warpedContours = new cv.MatVector();
  let warpedHierarchy = new cv.Mat();
  cv.findContours(bwImages, warpedContours, warpedHierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let warpedMarkers: any[] = [];
  for (let i = 0; i < warpedContours.size(); ++i) {
    let cnt = warpedContours.get(i);
    let area = cv.contourArea(cnt);
    // Điểm neo nhỏ và lớn
    if (area > 30 && area < 5000) {
      let rect = cv.boundingRect(cnt);
      let aspectRatio = rect.width / rect.height;
      let extent = area / (rect.width * rect.height);
      if (aspectRatio > 0.65 && aspectRatio < 1.35 && extent > 0.6) {
        warpedMarkers.push({
           x: rect.x + rect.width / 2,
           y: rect.y + rect.height / 2,
           rect: rect
        });
        cv.rectangle(debugImg, new cv.Point(rect.x, rect.y), new cv.Point(rect.x+rect.width, rect.y+rect.height), new cv.Scalar(255, 0, 255, 255), 2);
      }
    }
  }
  warpedContours.delete(); warpedHierarchy.delete();

  // Hàm tự động tinh chỉnh toạ độ Region
  // Helper hàm đếm pixel đen trong vùng lưới (grid) 
  const readGrid = (region: RegionConfig, color: any) => {
    let rx = region.x;
    let ry = region.y;
    let rw = region.w;
    let rh = region.h;

    // Vẽ khung tổng
    cv.rectangle(debugImg, new cv.Point(rx, ry), new cv.Point(rx+rw, ry+rh), color, 2);

    let cellW = rw / region.cols;
    let cellH = rh / region.rows;

    let gridResults = [];

    for (let r = 0; r < region.rows; r++) {
      let rowResults = [];
      let cy = ry + r * cellH + cellH / 2;
      
      for (let c = 0; c < region.cols; c++) {
        let cx = rx + c * cellW + cellW / 2;
        
        let marginX = Math.round(cellW * 0.25);
        let marginY = Math.round(cellH * 0.25);
        
        let innerX = Math.round(cx - cellW / 2 + marginX);
        let innerY = Math.round(cy - cellH / 2 + marginY);
        let innerW = Math.round(cellW - 2 * marginX);
        let innerH = Math.round(cellH - 2 * marginY);

        if (innerX + innerW > bwImages.cols || innerY + innerH > bwImages.rows || innerX < 0 || innerY < 0) {
            rowResults.push({ col: c, ratio: 0, bwRatio: 0, darkness: 0, score: 0, cx, cy });
            continue;
        }

        let rect = new cv.Rect(innerX, innerY, innerW, innerH);
        let roiBw = bwImages.roi(rect);
        let roiGray = warped.roi(rect);
        
        let meanVal = cv.mean(roiGray)[0];
        let darkness = 255.0 - meanVal;
        
        let nonZero = cv.countNonZero(roiBw);
        let total = roiBw.cols * roiBw.rows;
        let bwRatio = total > 0 ? nonZero / total : 0;
        
        rowResults.push({ col: c, ratio: 0, bwRatio, darkness, cx, cy });
        roiBw.delete();
        roiGray.delete();
        
        // Output debug
        cv.rectangle(debugImg, new cv.Point(innerX, innerY), new cv.Point(innerX + innerW, innerY + innerH), new cv.Scalar(0, 255, 0, 100), 1);
        cv.putText(debugImg, darkness.toFixed(0) + "/" + (bwRatio*100).toFixed(0), new cv.Point(innerX - 5, innerY + Math.max(10, innerH / 2)), cv.FONT_HERSHEY_SIMPLEX, 0.35, new cv.Scalar(255, 0, 0, 255), 1);
      }
      gridResults.push(rowResults);
    }
    return gridResults;
  };

  // Thuật toán Đánh giá Nhóm Cục bộ (Dynamic Group Optimal Thresholding)
  // Xác định ô được tô bằng cách so sánh độ đậm tương đối thay vì dùng ngưỡng cứng (hardcoded threshold).
  const evaluateGroup = (ratios: any[]) => {
      if (ratios.length === 0) return null;
      
      let minDarkness = Math.min(...ratios.map(r => r.darkness || 0));
      
      ratios.forEach(r => {
          let normDarkness = Math.max(0, (r.darkness || 0) - minDarkness);
          let rawBw = r.bwRatio || 0;
          r.score = rawBw * 0.95 + (normDarkness / 255.0) * 0.05;
          r.ratio = r.score;
      });

      let sortedRatios = [...ratios].sort((a, b) => b.score - a.score);
      
      let maxCell = sortedRatios[0];
      let secondMaxCell = sortedRatios[1] || { score: 0, ratio: 0, bwRatio: 0, darkness: 0 };
      
      let sens = (config.sensitivity !== undefined) ? config.sensitivity : 50;
      let threshold = 0.22 - ((sens / 100) * 0.20);
      
      let sumOthers = 0;
      for (let i = 1; i < sortedRatios.length; i++) sumOthers += sortedRatios[i].score;
      let avgOthers = sortedRatios.length > 1 ? sumOthers / (sortedRatios.length - 1) : 0;
      
      let maxDiff = maxCell.score - avgOthers;
      let diffSecond = maxCell.score - secondMaxCell.score;

      let isDarkEnough = maxCell.score > threshold || maxDiff > (threshold * 0.5);
      
      // Absolute minimum score to combat noise on empty pages
      if (maxCell.score < 0.06 || maxCell.bwRatio < 0.02) {
          isDarkEnough = false;
      }
      
      let selectedList = [];
      let isDoubleShaded = false;
      
      if (isDarkEnough) {
          selectedList.push(maxCell);
          
          if (secondMaxCell.score > threshold * 1.2 && secondMaxCell.score > 0.15) {
              if (diffSecond <= 0.02) {
                  isDoubleShaded = true;
              } else if (secondMaxCell.score >= 0.5 && diffSecond <= 0.04) {
                  isDoubleShaded = true;
              } else if (secondMaxCell.score >= 0.65 && diffSecond <= 0.08) {
                  isDoubleShaded = true;
              }
          }
          
          if (isDoubleShaded) {
              selectedList.push(secondMaxCell);
              for (let i = 2; i < sortedRatios.length; i++) {
                 let scoreI = sortedRatios[i].score;
                 let diffI = maxCell.score - scoreI;
                 if (scoreI > threshold * 1.2 && scoreI > 0.15) {
                     if (diffI <= 0.02) selectedList.push(sortedRatios[i]);
                     else if (scoreI >= 0.5 && diffI <= 0.04) selectedList.push(sortedRatios[i]);
                     else if (scoreI >= 0.65 && diffI <= 0.08) selectedList.push(sortedRatios[i]);
                 }
              }
          }
      }
      
      let isClearWinner = isDarkEnough && selectedList.length === 1;

      return {
          selected: (isDarkEnough && isClearWinner) ? maxCell : null,
          selectedList: selectedList,
          max: maxCell,
          isDarkEnough: isDarkEnough,
          isClearWinner: isClearWinner
      };
  };

  try {
      // Nhận diện SBD
      if (config.regions.studentId) {
          let sbdGrid = readGrid(config.regions.studentId, new cv.Scalar(255, 0, 0, 255));
          let sbd = "";
          for (let c = 0; c < config.regions.studentId.cols; c++) {
              let ratios = [];
              for (let r = 0; r < config.regions.studentId.rows; r++) {
                  ratios.push({ r: r, rawR: r, ...sbdGrid[r][c] });
              }
              
              let evalRes = evaluateGroup(ratios);
              let markedCell = evalRes.selected;
              let selectedVal = "?";
              if (markedCell) {
                  selectedVal = markedCell.r.toString();
              }
              
              results.rawStudentId.push({
                  selectedR: markedCell ? markedCell.r : -1,
                  maxR: evalRes.max ? evalRes.max.r : -1,
                  options: ratios.map(opt => ({ r: opt.r, cx: opt.cx, cy: opt.cy }))
              });
              sbd += selectedVal;
          }
          results.studentId = sbd;
          results.studentIdBox = [config.regions.studentId.y, config.regions.studentId.x, config.regions.studentId.y + config.regions.studentId.h, config.regions.studentId.x + config.regions.studentId.w];
      }
      
      // Nhận diện Mã đề
      if (config.regions.examCode) {
          let codeGrid = readGrid(config.regions.examCode, new cv.Scalar(0, 0, 255, 255));
          let examCode = "";
          for (let c = 0; c < config.regions.examCode.cols; c++) {
              let ratios = [];
              for (let r = 0; r < config.regions.examCode.rows; r++) {
                  ratios.push({ r: r, rawR: r, ...codeGrid[r][c] });
              }
              
              let evalRes = evaluateGroup(ratios);
              let markedCell = evalRes.selected;
              let selectedVal = "?";
              if (markedCell) {
                  selectedVal = markedCell.r.toString();
              }
              
              results.rawExamCode.push({
                  selectedR: markedCell ? markedCell.r : -1,
                  maxR: evalRes.max ? evalRes.max.r : -1,
                  options: ratios.map(opt => ({ r: opt.r, cx: opt.cx, cy: opt.cy }))
              });
              examCode += selectedVal;
          }
          results.examCode = examCode;
          results.examCodeBox = [config.regions.examCode.y, config.regions.examCode.x, config.regions.examCode.y + config.regions.examCode.h, config.regions.examCode.x + config.regions.examCode.w];
      }


      // Nhận diện Phần I (Trắc nghiệm 4 lựa chọn ABCD)
      if (Array.isArray(config.regions.part1)) {
          const options = ['A', 'B', 'C', 'D'];
          let questionIdx1 = 1;
          for (let block of config.regions.part1) {
              let p1Grid = readGrid(block, new cv.Scalar(255, 0, 255, 255));
              for (let r = 0; r < block.rows; r++) {
                  let ratios = [];
                  for (let c = 0; c < block.cols; c++) {
                      ratios.push({ c: c, ratio: p1Grid[r][c].ratio, bwRatio: p1Grid[r][c].bwRatio, cx: p1Grid[r][c].cx, cy: p1Grid[r][c].cy });
                  }
                  
                  let evalRes = evaluateGroup(ratios);
                  let markedCell = evalRes.selected;
                  let selectedAns = "";
                  
                  if (markedCell) {
                      selectedAns = options[markedCell.c];
                  }
                  results.part1.push(selectedAns);
                  results.rawPart1.push({
                      questionNumber: questionIdx1++,
                      selectedC: markedCell ? markedCell.c : -1,
                      maxC: evalRes.max ? evalRes.max.c : -1,
                      selectedList: evalRes.selectedList.map(opt => ({ c: opt.c, cx: opt.cx, cy: opt.cy })),
                      options: ratios.map(opt => ({ c: opt.c, cx: opt.cx, cy: opt.cy }))
                  });
              }
          }
      }

      // Nhận diện Phần II (Đúng / Sai)
      if (Array.isArray(config.regions.part2)) {
          let questionIdx = 1;
          for (let block of config.regions.part2) {
              let p2Grid = readGrid(block, new cv.Scalar(255, 255, 0, 255));
              const questionsInBlockX = Math.floor(block.cols / 2);
              const questionsInBlockY = Math.floor(block.rows / 4);
              
              for (let qy = 0; qy < questionsInBlockY; qy++) {
                  for (let qx = 0; qx < questionsInBlockX; qx++) {
                      let qAnswers = [];
                      let qRawItems = [];
                      for (let yi = 0; yi < 4; yi++) {
                          let r = qy * 4 + yi;
                          let c0 = qx * 2;
                          let c1 = qx * 2 + 1;
                          
                          let ratios = [
                              { c: 0, ratio: p2Grid[r][c0].ratio, bwRatio: p2Grid[r][c0].bwRatio, cx: p2Grid[r][c0].cx, cy: p2Grid[r][c0].cy },
                              { c: 1, ratio: p2Grid[r][c1].ratio, bwRatio: p2Grid[r][c1].bwRatio, cx: p2Grid[r][c1].cx, cy: p2Grid[r][c1].cy }
                          ];
                          
                          let evalRes = evaluateGroup(ratios);
                          let markedCell = evalRes.selected;
                          let selectedAns = "";
                          
                          if (markedCell) {
                              selectedAns = markedCell.c === 0 ? "Đ" : "S";
                          }
                          
                          qAnswers.push(selectedAns);
                          qRawItems.push({
                              selectedC: markedCell ? markedCell.c : -1,
                              maxC: evalRes.max ? evalRes.max.c : -1,
                              selectedList: evalRes.selectedList.map(opt => ({ c: opt.c, cx: opt.cx, cy: opt.cy })),
                              options: ratios.map(opt => ({ c: opt.c, cx: opt.cx, cy: opt.cy }))
                          });
                      }
                      results.part2.push({ questionNumber: questionIdx, answers: qAnswers });
                      results.rawPart2.push({ questionNumber: questionIdx++, items: qRawItems });
                  }
              }
          }
      }

      // Nhận diện Phần III (Trả lời ngắn). 
      if (Array.isArray(config.regions.part3)) {
          let questionIdx = 1;
          for (let block of config.regions.part3) {
              let p3Grid = readGrid(block, new cv.Scalar(0, 255, 255, 255));
              
              let answerStr = "";
              let qRawItems = [];
              // Quét từng cột trong ô (từ trái qua phải)
              for (let c = 0; c < block.cols; c++) {
                  let ratios = [];
                  for (let r = 0; r < block.rows; r++) {
                      ratios.push({ r: r, ratio: p3Grid[r][c].ratio, bwRatio: p3Grid[r][c].bwRatio, cx: p3Grid[r][c].cx, cy: p3Grid[r][c].cy });
                  }
                  
                  // So sánh độ đậm tương đối theo từng dòng trong 1 cột
                  let evalRes = evaluateGroup(ratios);
                  let markedCell = evalRes.selected;
                  if (markedCell) {
                      // Giả định: Hàng 0 là '-', '-' hoặc kí hiệu đặc biệt, hàng 1 là '0' -> '9' (nếu có 11 hàng)
                      // Hoặc tuỳ theo format phiếu thực tế.
                      // Tạm thời map: hàng đầu tiên (r=0) là kí tự đặc biệt '-', các hàng tiếp theo là dãy số.
                      // Tuy nhiên, để map chính xác, cứ trả về raw index trước, ở đây có 11 hàng: 0='-', 1='0', 2='1', ..., 10='9'.
                      // Nếu có 10 hàng thì 0='0', ..., 9='9'.
                      let char = "";
                      if (block.rows === 11) {
                          char = markedCell.r === 0 ? "-" : (markedCell.r - 1).toString();
                      } else if (block.rows === 10) {
                          char = markedCell.r.toString();
                      } else {
                          char = markedCell.r.toString(); // Fallback
                      }
                      
                      answerStr += char;
                  }
                  
                  qRawItems.push({
                      selectedC: markedCell ? markedCell.r : -1,
                      maxC: evalRes.max ? evalRes.max.r : -1,
                      selectedList: evalRes.selectedList.map(opt => ({ c: opt.r, cx: opt.cx, cy: opt.cy })),
                      options: ratios.map(opt => ({ c: opt.r, cx: opt.cx, cy: opt.cy }))
                  });
              }
              
              results.part3.push({ questionNumber: questionIdx, answer: answerStr.trim()});
              results.rawPart3.push({ questionNumber: questionIdx++, items: qRawItems });
          }
      }

      const tmpCanvas = document.createElement('canvas');
      cv.imshow(tmpCanvas, debugImg);
      results.debugImageBase64 = tmpCanvas.toDataURL('image/jpeg', 0.40);

      const cleanCanvas = document.createElement('canvas');
      cv.imshow(cleanCanvas, colorWarped);
      results.warpedDataUrl = cleanCanvas.toDataURL('image/jpeg', 0.45);

  } catch (err) {
      console.error("Local OMR Error: ", err);
  }

  // Clean up

  src.delete(); gray.delete(); blurred.delete(); edged.delete(); contours.delete(); hierarchy.delete(); warped.delete(); bwImages.delete(); debugImg.delete(); colorWarped.delete();

  return results;
};
