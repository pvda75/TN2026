import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Colors
content = content.replace(/bg-\[\#D8D7D3\]/g, 'bg-slate-50');
content = content.replace(/bg-\[\#F2F1ED\]/g, 'bg-slate-50\/50');
content = content.replace(/bg-\[\#E4E3E0\]/g, 'bg-slate-100');
content = content.replace(/border-\[\#141414\]/g, 'border-slate-200');
content = content.replace(/text-\[\#141414\]/g, 'text-slate-800');
content = content.replace(/bg-\[\#141414\]/g, 'bg-indigo-600'); // old black -> indigo

// Secondary reds
content = content.replace(/text-red-600/g, 'text-blue-600');
content = content.replace(/text-red-700/g, 'text-blue-700');
content = content.replace(/text-red-500/g, 'text-blue-500');
content = content.replace(/bg-red-600/g, 'bg-blue-600');
content = content.replace(/bg-red-700/g, 'bg-blue-700');
content = content.replace(/bg-red-50/g, 'bg-blue-50');
content = content.replace(/border-red-600/g, 'border-blue-600');
content = content.replace(/border-red-500/g, 'border-blue-500');
content = content.replace(/border-red-700/g, 'border-blue-700');

// Brutalist borders and shadows
content = content.replace(/border-4 border-\[\#141414\]/g, 'border border-slate-200 shadow-xl rounded-2xl');
content = content.replace(/border-2 border-\[\#141414\]/g, 'border border-slate-200 shadow-sm rounded-xl');
content = content.replace(/border-t-4 border-\[\#141414\]/g, 'border-t border-slate-200');
content = content.replace(/border-b-4 border-\[\#141414\]/g, 'border-b border-slate-200 shadow-sm');
content = content.replace(/border-r-2 border-\[\#141414\]/g, 'border-r border-slate-200');
content = content.replace(/border-t-2 border-\[\#141414\]/g, 'border-t border-slate-200');
content = content.replace(/border-l-2 border-\[\#141414\]/g, 'border-l border-slate-200');
content = content.replace(/border-2/g, 'border border-slate-200 rounded-lg');

// Shadows & Hard Corners
content = content.replace(/shadow-\[[^\]]*\]/g, 'shadow-md');
content = content.replace(/rounded-none/g, 'rounded-2xl');

// Typography
content = content.replace(/font-mono/g, ''); // Remove font-mono for a cleaner look
content = content.replace(/uppercase tracking-widest/g, 'font-medium');

fs.writeFileSync('src/App.tsx', content);
