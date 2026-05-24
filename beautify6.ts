import fs from 'fs';

function standardizeButtons(content: string) {
  // Common fixes
  content = content.replace(/bg-gray-800/g, 'bg-indigo-700');
  
  // Replace ugly border-slate-200 everywhere
  content = content.replace(/border border-slate-200 rounded-lg/g, '');
  content = content.replace(/border border-slate-200 rounded-2xl/g, '');
  content = content.replace(/border-slate-200/g, 'border-slate-200');
  
  // Remove messy class combinations
  content = content.replace(/\[#E4E3E0\]/g, 'slate-200');
  content = content.replace(/\[#D8D7D3\]/g, 'slate-50');
  content = content.replace(/\[#141414\]/g, 'slate-800');

  // Typographic cleanup
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/font-semibold/g, 'font-medium');
  content = content.replace(/opacity-70/g, 'text-slate-500');
  content = content.replace(/opacity-50/g, 'text-slate-400');
  
  // Forms & Inputs
  content = content.replace(/border-2 border-\[\#141414\] p-2 font-mono font-bold uppercase bg-white focus:outline-none focus:border-red-600 transition-colors/g, 'border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow');

  // Let's sweep some button classes:
  
  // Primary
  content = content.replace(/bg-indigo-600 text-white px-2 py-1 .*?hover:bg-indigo-700 transition/g, "bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1 px-3 rounded-md shadow-sm transition-colors");
  content = content.replace(/bg-indigo-600 text-white .*?px-6 py-2.5 .*?hover:bg-indigo-700 transition/g, "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-sm transition-colors");
  content = content.replace(/bg-blue-600 text-white border border-slate-200 rounded-lg border-blue-600 px-6 py-2 text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50/g, "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50");
  
  // Secondary
  content = content.replace(/border border-slate-200 rounded-lg bg-white text-slate-800 px-6 py-2.5 font-semibold text-xs hover:bg-indigo-600 hover:text-white transition/g, "bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors");

  // Fix button styles specifically
  return content;
}

let content = fs.readFileSync('src/App.tsx', 'utf8');

// I will just use regex to target <button className="..."> to style them cleanly
content = content.replace(/<button([^>]*?)className="(.*?)"/g, (match, prefix, classNames) => {
    let classes = classNames;

    if (classes.includes("bg-indigo-600") || classes.includes("bg-blue-600")) {
        // primary button
        // Remove all old classes and apply standard
        let customKeys = [];
        if(classes.includes('flex')) customKeys.push('flex items-center justify-center gap-2');
        if(classes.includes('absolute')) customKeys.push('absolute right-2 top-2');
        if(classes.includes('mt-4')) customKeys.push('mt-4');
        if(classes.includes('w-full')) customKeys.push('w-full');
        if(classes.includes('disabled:opacity-50')) customKeys.push('disabled:opacity-50');

        return `<button${prefix}className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors ${customKeys.join(' ')}"`
    } else if (classes.includes('bg-white') && classes.includes('text-red-')) {
        // danger outline button
        return `<button${prefix}className="bg-white hover:bg-red-50 text-red-600 font-medium py-2 px-4 border border-red-200 rounded-lg shadow-sm transition-colors"`
    } else if (classes.includes('bg-red-600') && classes.includes('text-white')) {
        // danger solid button
        return `<button${prefix}className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors"`
    } else if (classes.includes('bg-white') && classes.includes('border')) {
        // secondary outline button
        let customKeys = [];
        if(classes.includes('flex')) customKeys.push('flex items-center justify-center gap-2');
        if(classes.includes('disabled:opacity-50')) customKeys.push('disabled:opacity-50');
        if(classes.includes('text-xs')) customKeys.push('text-sm');
        return `<button${prefix}className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg shadow-sm transition-colors ${customKeys.join(' ')}"`
    }

    return match;
});

// Fix some specific buttons:
// Add class button in step 3
content = content.replace(/className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors "><Plus className="w-3 h-3" \/><\/button>/g, 'className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-r-lg shadow-sm transition-colors flex items-center justify-center"><Plus className="w-4 h-4" /></button>');
// And the input next to it
content = content.replace(/className="border border-slate-200 rounded-lg border-r-0 border-slate-200 px-2 py-1  text-\[10px\] w-24 focus:outline-none bg-slate-50\/50"/g, 'className="border border-slate-300 rounded-l-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"');

content = content.replace(/className="border border-slate-200 rounded-lg px-2 py-1 font-semibold  text-xs focus:outline-none bg-white max-w-\[200px\] truncate"/g, 'className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"');
content = content.replace(/className="border border-slate-200 rounded-lg px-2 py-1 font-semibold  text-xs focus:outline-none"/g, 'className="border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"');

// Inputs
content = content.replace(/className="border border-slate-200 p-2 font-mono font-bold uppercase bg-white focus:outline-none focus:border-blue-600 transition-colors w-24 text-center text-lg"/g, 'className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 text-center uppercase tracking-widest text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-24"');
content = content.replace(/className="border border-slate-200 p-2 font-mono font-bold uppercase bg-white focus:outline-none focus:border-blue-600 transition-colors w-32 sm:w-48 text-center"/g, 'className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 text-center font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow w-full sm:w-48"');


// Inputs inside Subject config
content = content.replace(/className="border border-slate-200 border-slate-200 w-12 text-center p-1 text-\[10px\] uppercase focus:border-slate-800"/g, 'className="border border-slate-300 rounded-md w-16 text-center p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"');

// Cleanup layout inside forms
content = content.replace(/text-\[10px\]/g, 'text-xs');
content = content.replace(/text-xs font-semibold/g, 'text-sm font-medium');

// Header cleanup
content = content.replace(/<span className="absolute -top-1 -right-8 text-xs bg-blue-600 text-white px-1 leading-none">2025<\/span>/g, '<span className="absolute -top-2 -right-10 text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded shadow-sm">2025</span>');
content = content.replace(/<div className="text-\[10px\] font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full sm:ml-3">BETA<\/div>/g, '<div className="text-xs font-bold tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md sm:ml-3">BETA</div>');

// Structure Boxes
content = content.replace(/bg-slate-50\/50 hover:bg-slate-100/g, 'bg-white hover:bg-slate-50 border-slate-200');

// "Select Structure" in Key config
content = content.replace(/bg-slate-50 border-slate-100 hover:bg-slate-100/g, 'bg-white border-slate-200 hover:bg-slate-50');
content = content.replace(/border-blue-600 bg-blue-50/g, 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50');

// Card styles
content = content.replace(/shadow-xl rounded-2xl/g, 'shadow-lg rounded-2xl');
content = content.replace(/bg-slate-50 border border-slate-200 rounded-2xl p-6/g, 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6');
content = content.replace(/bg-white border border-slate-200 rounded-lg p-6 rounded-2xl shadow-none/g, 'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm');
content = content.replace(/bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col/g, 'bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm');

// Remove border-dashed logic since solid looks cleaner
content = content.replace(/border-dashed border-slate-300/g, 'border-solid border-slate-200');

// Fix text-white color inside the scanning screen
content = content.replace(/text-white bg-indigo-600 px-2 py-1 border border-slate-200 uppercase/g, 'bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-medium text-xs border border-indigo-200');
content = content.replace(/text-blue-500/g, 'text-indigo-600');

// Colors
content = content.replace(/text-slate-800 opacity-70/g, 'text-slate-500');
content = content.replace(/text-slate-800 opacity-50/g, 'text-slate-400');
content = content.replace(/opacity-70/g, 'text-slate-500');
content = content.replace(/opacity-50/g, 'text-slate-400');

fs.writeFileSync('src/App.tsx', content);
