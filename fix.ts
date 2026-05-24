import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/Object\.values\(examConfigs\)\.map\(c => c\.name\)/g, 'Object.values(examConfigs).map((c: any) => c.name)');
content = content.replace(/Object\.values\(examConfigs\)\.find\(c => c\.name === gradeExamName\)/g, 'Object.values(examConfigs).find((c: any) => c.name === gradeExamName)');
content = content.replace(/getStructureLabel\(currentGradeConfig\.structureId\)/g, 'getStructureLabel((currentGradeConfig as any).structureId)');

fs.writeFileSync('src/App.tsx', content);
