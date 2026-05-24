import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/min-h-screen bg-slate-100/g, 'min-h-screen bg-slate-50');
content = content.replace(/bg-indigo-600 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-10 border-b-4 border-blue-600 shadow-md/g, 'bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-20 shadow-sm');
content = content.replace(/<div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">/g, '<div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-sm flex items-center justify-center">');
content = content.replace(/<h1 className="text-2xl font-semibold  tracking-tighter">AI AUTOGRADE<\/h1>/g, '<h1 className="text-2xl font-bold tracking-tight text-slate-800">AI Autograde</h1>');
content = content.replace(/<div className="text-\[10px\]  font-semibold bg-blue-600 px-2 py-1 rounded-sm mt-1 sm:mt-0 sm:ml-2 shadow-inner">THỬ NGHIỆM<\/div>/g, '<div className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full sm:ml-3">BETA</div>');

// Remove uppercase from button labels in tabs
content = content.replace(/1. Cấu hình Môn học/g, 'Cấu hình Môn học');
content = content.replace(/2. Mã đề & Đáp án/g, 'Mã đề & Đáp án');
content = content.replace(/3. Chấm bài/g, 'Chấm bài');
content = content.replace(/4. Kết quả & Lịch sử/g, 'Kết quả & Lịch sử');

// Change tab buttons text colors since the navbar is white now
content = content.replace(/text-slate-600 hover:bg-slate-50/g, 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');

fs.writeFileSync('src/App.tsx', content);
