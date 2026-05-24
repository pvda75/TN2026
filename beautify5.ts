import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/border border-slate-200 rounded-lg border-blue-600 bg-blue-600 text-white px-4 py-2 font-semibold text-\[10px\] tracking-widest hover:bg-blue-700 transition/g, 'bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition');

content = content.replace(/px-4 py-2 font-semibold text-\[10px\] tracking-widest/g, 'px-4 py-2 font-medium text-sm');
content = content.replace(/1. Môn học/g, 'Môn học'); // any leftover? no replaced earlier.

fs.writeFileSync('src/App.tsx', content);
