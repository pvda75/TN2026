import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the handleCapture since it used to await processImageData
const oldCapture = /const handleCapture = useCallback\(async \(\) => \{[\s\S]*?\}, \[webcamRef, gradeExamName, examConfigs, activeClass\]\);/;
const newCapture = `const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageBase64 = webcamRef.current.getScreenshot();
      if (imageBase64) {
         const newId = Date.now().toString();
         setImages(prev => [...prev, { id: newId, src: imageBase64, selected: true, status: 'pending' }]);
         setUseWebcam(false);
      }
    }
  }, [webcamRef]);`;

content = content.replace(oldCapture, newCapture);

const uiToReplaceOld = /{!imageSrc && !useWebcam && \([\s\S]*?{errorMsg && \(\s*<div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">\s*{errorMsg}\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;

const uiNew = `
                {!useWebcam && (
                  <div className="border border-solid border-slate-200 rounded-lg border-slate-200 bg-slate-50/50 p-6 text-center rounded-2xl mb-4 flex flex-col sm:flex-row justify-center gap-3">
                      <button 
                        onClick={() => setUseWebcam(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors text-sm"
                      >
                        Quét Trực Tiếp
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
                      >
                        Tải Lên File (Nhiều ảnh)
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                      />
                  </div>
                )}

                {useWebcam && (
                  <div className="space-y-4 mb-4">
                    <div className="aspect-[3/4] bg-indigo-600 border border-slate-200 rounded-lg overflow-hidden relative">
                      {/* @ts-ignore */}
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "environment" }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between">
                      <button 
                        onClick={() => setUseWebcam(false)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleCapture}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors"
                      >
                        CHỤP ẢNH
                      </button>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                       <div className="text-sm font-medium text-slate-800">Ảnh đã tải lên: {images.length}</div>
                       <div className="flex gap-2">
                          <button 
                             onClick={() => setImages(prev => prev.map(img => ({...img, selected: true})))}
                             className="text-xs text-indigo-600 font-medium px-2 py-1 hover:bg-indigo-50 rounded"
                          >
                             Chọn tất cả
                          </button>
                          <button 
                             onClick={() => setImages(prev => prev.map(img => ({...img, selected: false})))}
                             className="text-xs text-slate-500 font-medium px-2 py-1 hover:bg-slate-100 rounded"
                          >
                             Bỏ chọn
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                       {images.map(img => (
                          <div key={img.id} className={\`relative border rounded-lg overflow-hidden flex flex-col bg-white shadow-sm transition-colors \${img.selected ? 'border-indigo-500' : 'border-slate-200'} \${img.status === 'error' ? 'border-red-300' : ''} \${img.status === 'done' ? 'border-green-400' : ''}\`}>
                             <div className="h-32 bg-slate-100 relative cursor-pointer" onClick={() => {
                                if (img.status === 'processing') return;
                                setImages(prev => prev.map(i => i.id === img.id ? {...i, selected: !i.selected} : i));
                             }}>
                                <img src={img.src} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2 flex gap-1">
                                    <div className={\`w-5 h-5 rounded border flex items-center justify-center \${img.selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 border-slate-300'}\`}>
                                       {img.selected && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                    {img.status === 'done' && <div className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center"><CheckCircle className="w-3 h-3"/></div>}
                                    {img.status === 'error' && <div className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center text-[10px] font-bold">!</div>}
                                </div>
                                {img.status === 'processing' && (
                                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                   </div>
                                )}
                             </div>
                             {(img.errorMsg || img.status === 'done') && (
                                <div className={\`text-[10px] p-2 leading-tight flex-1 \${img.status === 'error' ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}\`}>
                                   {img.errorMsg}
                                   {img.status === 'done' && \`Điểm: \${img.result?.score.toFixed(2)} - \${img.result?.studentId}\`}
                                </div>   
                             )}
                             {img.status !== 'processing' && (
                                 <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       setImages(prev => prev.filter(i => i.id !== img.id));
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow"
                                 >
                                    <span className="text-xs mb-0.5">x</span>
                                 </button>
                             )}
                          </div>
                       ))}
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-200">
                      <button 
                        onClick={() => setImages([])}
                        disabled={globalProcessing}
                        className="bg-white hover:bg-red-50 text-red-600 font-medium py-2 px-4 border border-red-200 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50"
                      >
                        Xóa tất cả ảnh
                      </button>
                     
                      <button 
                        onClick={processSelectedImages}
                        disabled={globalProcessing || images.filter(i => i.selected && i.status !== 'done').length === 0}
                        className="bg-indigo-600 text-white px-6 py-2.5 font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                      >
                        {globalProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
                            ĐANG QUÉT AI...
                          </>
                        ) : \`BẮT ĐẦU CHẤM \${images.filter(i => i.selected && i.status !== 'done').length} ẢNH ►\`}
                      </button>
                    </div>
                    {errorMsg && (
                      <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm mt-4">
                        {errorMsg}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
`;

content = content.replace(uiToReplaceOld, uiNew);

fs.writeFileSync('src/App.tsx', content);
