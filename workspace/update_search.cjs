const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                                 <div className="flex gap-2">
                                   <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center" onClick={(e) => { e.stopPropagation(); exportAllPdfs(); }}>`;
const replacement1 = `                                 <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                   <input 
                                       type="text" 
                                       className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56 bg-white shrink-0" 
                                       placeholder="Tìm SBD, mã đề, hoặc tên..."
                                       value={historySearchPhrase}
                                       onChange={(e) => setHistorySearchPhrase(e.target.value)}
                                   />
                                   <div className="flex gap-2">
                                   <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap" onClick={(e) => { e.stopPropagation(); exportAllPdfs(); }}>`;

code = code.replace(target1, replacement1);

const target2 = `                                   <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center" onClick={(e) => { e.stopPropagation(); exportCsv(); }}>
                                      ↓ EXCEL/CSV
                                   </button>
                                 </div>
                              </div>
                              <div className="divide-y-2 divide-[#141414]">`;
const replacement2 = `                                   <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors text-xs flex items-center justify-center whitespace-nowrap" onClick={(e) => { e.stopPropagation(); exportCsv(); }}>
                                      ↓ EXCEL/CSV
                                   </button>
                                   </div>
                                 </div>
                              </div>
                              <div className="divide-y-2 divide-[#141414]">`;
code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
