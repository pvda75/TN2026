import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(line => line.includes('// --- FIREBASE SYNC: Globals ---'));
const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('// --------------------------------'));

if (startIndex !== -1 && endIndex !== -1) {
  const extracted = lines.slice(startIndex, endIndex + 1);
  content = lines.slice(0, startIndex).concat(lines.slice(endIndex + 1)).join('\n');
  
  const insertIndex = content.split('\n').findIndex(line => line.includes('const isLoadedRef = useRef(false);'));
  if (insertIndex !== -1) {
      const newLines = content.split('\n');
      newLines.splice(insertIndex + 1, 0, ...extracted);
      fs.writeFileSync('src/App.tsx', newLines.join('\n'));
      console.log('Successfully moved Firebase block');
  } else {
      console.log('Could not find insert index');
  }
} else {
  console.log('Could not find FIREBASE block', startIndex, endIndex);
}

// remove duplicate XLSX
let fixedContent = fs.readFileSync('src/App.tsx', 'utf-8');
const fLines = fixedContent.split('\n');
let foundXLSX = false;
for (let i = 0; i < fLines.length; i++) {
  if (fLines[i].includes('import * as XLSX from "xlsx";')) {
    if (foundXLSX) {
      fLines.splice(i, 1);
      break; 
    }
    foundXLSX = true;
  }
}
fs.writeFileSync('src/App.tsx', fLines.join('\n'));
console.log('done fixing XLSX');
