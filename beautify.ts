import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Clean up duplicate strings
content = content.replace(/border border-slate-200 rounded-lg border-slate-200/g, 'border border-slate-200 rounded-lg');
content = content.replace(/border border-slate-200 rounded-lg border-dashed/g, 'border-2 border-dashed border-slate-300 rounded-lg');
content = content.replace(/rounded-lg rounded-2xl/g, 'rounded-2xl');
content = content.replace(/rounded-2xl rounded-lg/g, 'rounded-2xl');

content = content.replace(/bg-indigo-600 text-\[\#E4E3E0\] border border-slate-200 rounded-2xl border-slate-200/g, 'bg-indigo-600 text-white rounded-lg');
content = content.replace(/bg-indigo-600 text-\[\#E4E3E0\] border border-slate-200 rounded-lg px-6 py-3 font-bold  text-xs  hover:bg-gray-800 transition flex items-center justify-center gap-2/g, 'bg-indigo-600 text-white shadow-md rounded-xl px-6 py-3 font-semibold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2');

content = content.replace(/bg-indigo-600 text-white border border-slate-200 rounded-2xl/g, 'bg-indigo-600 text-white rounded-2xl');
content = content.replace(/border border-slate-200 rounded-lg bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-none/g, 'bg-white border border-slate-200 p-6 rounded-2xl shadow-sm');
content = content.replace(/bg-slate-50 border border-slate-200 rounded-lg border-slate-200/g, 'bg-white border border-slate-200 rounded-2xl shadow-sm');
content = content.replace(/bg-slate-50 border border-slate-200 rounded-2xl border-slate-200/g, 'bg-white border border-slate-200 rounded-2xl shadow-sm');

content = content.replace(/bg-white border border-slate-200 rounded-lg border-slate-200/g, 'bg-white border border-slate-200 rounded-xl shadow-sm');

// Remove extra border-slate-200
content = content.replace(/border-slate-200 border-slate-200/g, 'border-slate-200');

content = content.replace(/bg-slate-100 text-slate-800 border-\[\#E4E3E0\]/g, 'bg-indigo-50 text-indigo-700 border-indigo-100');
content = content.replace(/border-\[\#E4E3E0\] text-\[\#E4E3E0\] hover:bg-gray-800/g, 'text-slate-600 hover:bg-slate-50');

// Fix text-white color where it's weird 
content = content.replace(/text-\[\#E4E3E0\]/g, 'text-white');
content = content.replace(/text-\[\#141414\]/g, 'text-slate-800');

content = content.replace(/font-bold uppercase tracking-widest/g, 'font-semibold');
content = content.replace(/font-bold  uppercase tracking-widest/g, 'font-semibold');
content = content.replace(/font-bold uppercase/g, 'font-semibold');
content = content.replace(/font-bold  uppercase/g, 'font-semibold');
content = content.replace(/font-bold/g, 'font-semibold');

// Buttons padding to look better
content = content.replace(/px-6 py-3/g, 'px-6 py-2.5');

// Make logo and app header look good
content = content.replace(/border-b-4 border-slate-200 shadow-sm bg-white p-4 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-4/g, 'border-b border-slate-200 shadow-sm bg-white p-4 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-4');

content = content.replace(/text-slate-800 font-semibold  text-2xl pt-2 sm:pt-0/g, 'text-slate-900 font-bold text-2xl pt-2 sm:pt-0');
content = content.replace(/bg-indigo-600 text-white px-2 py-1 rotate-2/g, 'bg-indigo-600 text-white px-2 py-1 rounded-md ml-2');

// Fix tables and history
content = content.replace(/bg-slate-50 border border-slate-200 border-slate-200 overflow-hidden flex flex-col/g, 'bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col');
content = content.replace(/bg-slate-50 border border-slate-200 rounded-2xl p-6/g, 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6');
content = content.replace(/bg-white border border-slate-200 rounded-xl shadow-sm/g, 'bg-white border border-slate-100 rounded-2xl shadow-sm');

// Score rendering
content = content.replace(/shadow-\[2px_2px_0_0_\#141414\]/g, 'shadow-md rounded-lg');
content = content.replace(/shadow-\[2px_2px_0_0_\#D8D7D3\]/g, 'shadow-md');
content = content.replace(/border-2/g, 'border');

// Active/Inactive classes
content = content.replace(/border-r-2/g, 'border-r');
content = content.replace(/border-l-2/g, 'border-l');
content = content.replace(/border-t-2/g, 'border-t');
content = content.replace(/border-b-2/g, 'border-b');

fs.writeFileSync('src/App.tsx', content);
