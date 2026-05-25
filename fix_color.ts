import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /\$\{currentUserData\?\.role === "ADMIN" \? "text-red-600" : ""\}/g,
  'text-red-600'
);

content = content.replace(
  /\$\{currentUserData\?\.role === "ADMIN" \? "text-red-600" : "text-slate-800"\}/g,
  'text-red-600'
);

content = content.replace(
  /\$\{currentUserData\?\.role === "ADMIN" \? "text-red-600" : "text-indigo-700"\}/g,
  'text-red-600'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Replaced colors.");
