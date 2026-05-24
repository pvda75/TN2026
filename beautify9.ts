import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="bg-white border border-slate-200 rounded-lg px-3 py-1 font-semibold  text-xs hover:bg-indigo-600 hover:text-white transition"/g, 'className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-1.5 px-3 border border-slate-300 rounded-md shadow-sm transition-colors text-xs"');
content = content.replace(/className="bg-white border border-slate-200 rounded-lg border-blue-600 text-blue-600 px-3 py-1 font-semibold  text-xs hover:bg-blue-600 hover:text-white transition"/g, 'className="bg-white hover:bg-red-50 text-red-600 font-medium py-1.5 px-3 border border-red-200 rounded-md shadow-sm transition-colors text-xs"');

content = content.replace(/className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-8 shadow-md"/g, 'className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm"');
content = content.replace(/<div className="border border-slate-200 rounded-lg bg-slate-50\/50 p-4 flex flex-col justify-between hover:bg-slate-100 transition relative group">/g, '<div className="border border-slate-200 rounded-xl bg-white shadow-sm p-4 flex flex-col justify-between hover:border-indigo-300 transition relative group">');

content = content.replace(/<div className="border-b-4 border-slate-200 pb-4 flex justify-between items-start flex-wrap gap-4">/g, '<div className="border-b border-slate-200 pb-4 flex justify-between items-start flex-wrap gap-4">');

// Form action fixing
content = content.replace(/<div className="pt-6 mt-8 flex justify-end gap-3 border-t border-slate-200">/g, '<div className="pt-6 mt-8 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-200">');
content = content.replace(/className="bg-white border border-slate-200 rounded-lg text-slate-800 px-6 py-2  font-semibold text-xs tracking-widest hover:bg-slate-50\/50 transition-colors"/g, 'className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-6 border border-slate-300 rounded-lg shadow-sm transition-colors w-full sm:w-auto text-sm"');
content = content.replace(/className="bg-indigo-600 text-white border border-slate-200 rounded-lg px-6 py-2  font-semibold text-xs tracking-widest hover:bg-gray-800 transition flex items-center gap-2"/g, 'className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-sm"');

fs.writeFileSync('src/App.tsx', content);
