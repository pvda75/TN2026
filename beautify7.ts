import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Style the input boxes for Name and Code
content = content.replace(/className="border border-slate-200 rounded-lg p-2  font-semibold bg-white focus:outline-none focus:border-blue-600 transition-colors w-32 sm:w-48 text-center"/g, 'className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full sm:w-48 text-center"');
content = content.replace(/className="border border-slate-200 rounded-lg p-2  font-semibold bg-white focus:outline-none focus:border-blue-600 transition-colors w-24 text-center text-lg"/g, 'className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-24 text-center text-lg font-medium tracking-widest uppercase"');

// Fix the Part 1/2/3 wrappers
content = content.replace(/bg-slate-50 p-4 border border-slate-200/g, 'bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm');
content = content.replace(/bg-slate-50 p-3 border border-slate-200/g, 'bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm');

// Input in Part 1
content = content.replace(/className="w-full text-center border border-slate-200 rounded-lg p-1  font-semibold bg-white focus:bg-slate-100 focus:outline-none focus:border-blue-600 transition-colors"/g, 'className="w-full text-center border border-slate-300 rounded-lg p-1.5 font-medium bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-800"');

// Input in Part 2
content = content.replace(/className="w-8 text-center border border-slate-200 rounded-lg p-1  font-semibold bg-slate-50\/50 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"/g, 'className="w-10 text-center border border-slate-300 rounded-lg p-1 font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-800"');

// Input in Part 3
content = content.replace(/className="w-full text-center border border-slate-200 rounded-lg p-1  font-semibold bg-white focus:bg-slate-100 focus:outline-none focus:border-blue-600 transition-colors" /g, 'className="w-full text-center border border-slate-300 rounded-lg p-1.5 font-medium bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-800" ');

// Config step borders
content = content.replace(/border border-slate-200 rounded-lg p-2  font-semibold/g, 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow');

// Radio indicators
content = content.replace(/w-4 h-4 bg-blue-600 border border-slate-200/g, 'w-4 h-4 bg-indigo-600 rounded-full shadow-inner ring-2 ring-indigo-200 ring-offset-2 ring-offset-white');

content = content.replace(/w-4 h-4 border border-slate-200 rounded-2xl accent-red-600/g, 'w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500');


fs.writeFileSync('src/App.tsx', content);
