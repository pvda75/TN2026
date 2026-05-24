import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="flex flex-wrap gap-2 text-\[10px\]  font-semibold transition-transform justify-center sm:justify-end"/g, 'className="flex flex-wrap gap-2 text-sm font-medium transition-transform justify-center sm:justify-end"');

content = content.replace(/<BookOpen className="w-3 h-3" \/> 1\. Môn học/g, '<BookOpen className="w-4 h-4 mr-1" /> Môn học');
content = content.replace(/<Key className="w-3 h-3" \/> Mã đề & Đáp án/g, '<Key className="w-4 h-4 mr-1" /> Mã đề & Đáp án');
content = content.replace(/<Camera className="w-3 h-3" \/> Chấm bài/g, '<Camera className="w-4 h-4 mr-1" /> Chấm bài');
content = content.replace(/<ListChecks className="w-4 h-4" \/> Kết quả & Lịch sử/g, '<ListChecks className="w-4 h-4 mr-1" /> Kết quả & Lịch sử'); // wait what do I have here
content = content.replace(/<ListChecks className="w-3 h-3" \/> Kết quả & Lịch sử/g, '<ListChecks className="w-4 h-4 mr-1" /> Kết quả & Lịch sử');

// Also update the app bottom footer
content = content.replace(/<footer className="bg-slate-900 border-t-4 border-slate-200 shadow-sm text-slate-800 p-6 flex flex-col sm:flex-row justify-between items-center text-\[10px\]  font-semibold tracking-widest mt-8">/g, '<footer className="bg-white border-t border-slate-200 text-slate-500 p-6 flex flex-col sm:flex-row justify-between items-center text-xs font-medium tracking-wide mt-8">');
content = content.replace(/<div className="opacity-50">GEMINI AI ENGINE • REACT 19<\/div>/g, '<div>Powered by Gemini AI</div>');
content = content.replace(/<div className="mt-2 sm:mt-0 text-blue-600">DESIGNED FOR MINISTRY OF EDUCATION AND TRAINING - 2025 COMPLIANT<\/div>/g, '<div className="mt-2 sm:mt-0 text-slate-400">Thiết kế dành cho kỳ thi 2025</div>');

fs.writeFileSync('src/App.tsx', content);
