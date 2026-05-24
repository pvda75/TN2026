import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-slate-50 border-4 border-slate-200 shadow-md max-w-sm w-full/g, 'bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden');
content = content.replace(/border-t-8 border-slate-200 px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center text-\[10px\] font-semibold  tracking-widest mt-auto shadow-inner/g, 'border-t border-slate-200 px-6 py-6 flex flex-col sm:flex-row justify-between items-center text-sm font-medium mt-auto text-slate-500');
content = content.replace(/bg-indigo-600 text-white px-4 py-2 font-semibold font-medium text-xs flex justify-between items-center/g, 'bg-slate-50 border-b border-slate-200 text-slate-800 px-4 py-3 font-semibold text-sm flex justify-between items-center');

// Also update the buttons inside the dialog
content = content.replace(/border-2 border-slate-200 bg-white px-4 py-2/g, 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg');
content = content.replace(/border-2 border-blue-600/g, '');

fs.writeFileSync('src/App.tsx', content);
