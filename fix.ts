import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Looking for the problematic insertion at STEP7_STATS
const searchStr = `                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-slate-700">Bài thi:</span>
                 <select
                   className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                   value={statsExamFilter}
                   onChange={(e) => setStatsExamFilter(e.target.value)}
                 >
                   <option value="ALL">Tất cả bài thi</option>
                   {Array.from(new Set(userScanHistory.map((h) => h.examName).filter(Boolean))).map((name) => (
                      <option key={name as string} value={name as string}>{name as React.ReactNode}</option>
                   ))}
                 </select>
               </div>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 w-full h-[400px]">`;

const replaceStr = `                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-slate-700">Bài thi:</span>
                 <select
                   className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                   value={statsExamFilter}
                   onChange={(e) => setStatsExamFilter(e.target.value)}
                 >
                   <option value="ALL">Tất cả bài thi</option>
                   {Array.from(new Set(userScanHistory.map((h) => h.examName).filter(Boolean))).map((name) => (
                      <option key={name as string} value={name as string}>{name as React.ReactNode}</option>
                   ))}
                 </select>
               </div>
               </div>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 w-full h-[400px]">`;

if (content.includes(searchStr)) {
   fs.writeFileSync('src/App.tsx', content.replace(searchStr, replaceStr));
   console.log('Fixed STEP7 div');
} else {
   console.log('Search string not found in STEP7');
}
