import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Step 2 buttons
content = content.replace(/className="bg-white text-slate-800 border border-slate-200 rounded-lg px-6 py-2.5 font-semibold text-xs tracking-widest hover:bg-slate-50\/50 transition-colors"/g, 'className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"');
content = content.replace(/className="bg-blue-600 text-white border border-slate-200 rounded-lg border-blue-600 px-6 py-2.5 font-semibold text-xs tracking-widest hover:bg-blue-700 hover:border-blue-700 transition-colors flex items-center gap-2"/g, 'className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"');

// Fix border top
content = content.replace(/border-t-4 border-slate-200/g, 'border-t border-slate-200');

// Step 1 delete buttons
content = content.replace(/className="bg-white hover:bg-red-50 text-red-600 font-medium py-2 px-4 border border-red-200 rounded-lg shadow-sm transition-colors px-3 py-1 font-semibold  text-xs"/g, 'className="bg-white hover:bg-red-50 text-red-600 font-medium py-1 px-3 border border-red-200 rounded-md shadow-sm transition-colors text-xs"');
content = content.replace(/className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors px-3 py-1 font-semibold  text-xs"/g, 'className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-1 px-3 border border-slate-300 rounded-md shadow-sm transition-colors text-xs"');

fs.writeFileSync('src/App.tsx', content);
