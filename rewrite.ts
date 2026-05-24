import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// We will add the ScannedImage interface and replace imageSrc state.
const newInterface = `
export interface ScannedImage {
  id: string;
  src: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  selected: boolean;
  result?: any;
  errorMsg?: string;
}
`;

content = content.replace(/export default function App\(\) {/, newInterface + '\nexport default function App() {');

content = content.replace(/const \[imageSrc, setImageSrc\] = useState<string \| null>\(null\);/, `const [images, setImages] = useState<ScannedImage[]>([]);
  const [globalProcessing, setGlobalProcessing] = useState(false);`);

content = content.replace(/const \[isProcessing, setIsProcessing\] = useState\(false\);/, '');

// Fix missing imports if `images` is not used properly yet, but this is fine.
// WebCam processing
content = content.replace(/await processImageData\(imageBase64\);/, `
         const newId = Date.now().toString();
         setImages(prev => [...prev, { id: newId, src: imageBase64, selected: true, status: 'pending' }]);
         setUseWebcam(false);
`);

// Handle file upload
const oldHandleUpload = `const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setImageSrc(base64);
        setUseWebcam(false);
        await processImageData(base64);
      };
      reader.readAsDataURL(file);
    }
  };`;

const newHandleUpload = `const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setImages(prev => [
            ...prev,
            { id: Date.now() + Math.random().toString(), src: base64, selected: true, status: 'pending' }
          ]);
          setUseWebcam(false);
        };
        reader.readAsDataURL(file);
      });
    }
    // reset input so same files can be chosen again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };`;
content = content.replace(oldHandleUpload, newHandleUpload);

// Rewrite processImageData
const oldProcessImageData = /const processImageData = async \(dataUrl: string\) => \{[\s\S]*?\} finally \{\s*setIsProcessing\(false\);\s*\}\s*\};/;

const newProcessImageData = `const processSelectedImages = async () => {
    if (!gradeExamName) {
       setErrorMsg('Vui lòng tạo ít nhất 1 Bài thi / Cấu hình mã đề ở Bước 2.');
       return;
    }

    setGlobalProcessing(true);
    setErrorMsg(null);
    
    const selectedImages = images.filter(img => img.selected && (img.status === 'pending' || img.status === 'error'));
    
    for (const image of selectedImages) {
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing', errorMsg: undefined } : img));
        
        try {
            const base64Data = image.src.split(',')[1];
            const mimeType = image.src.split(';')[0].split(':')[1];
            
            const studentAnswers = await extractAnswersFromImage(base64Data, mimeType);
            
            if (studentAnswers) {
                const detectedCode = studentAnswers.examCode?.trim() || '';
                const currentConfig = examConfigs[detectedCode];

                if (!detectedCode) {
                    setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: \`Không tìm thấy mã đề.\` } : img));
                    continue;
                }

                if (!currentConfig) {
                    setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: \`Mã "\${detectedCode}" chưa có cài đặt.\` } : img));
                    continue;
                }

                if (currentConfig.name !== gradeExamName) {
                    setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: \`Mã "\${detectedCode}" thuộc "\${currentConfig.name}".\` } : img));
                    continue;
                }

                const currentStructure = examStructures.find(s => s.id === currentConfig.structureId);
                if (!currentStructure) {
                    setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: 'Lỗi môn học.' } : img));
                    continue;
                }

                const result = calculateScore(studentAnswers, currentConfig.key, currentStructure);
                
                const newRecord = {
                    id: Date.now().toString() + Math.random().toString(),
                    studentId: studentAnswers.studentId || 'Chưa rõ',
                    className: activeClass,
                    examCode: detectedCode,
                    score: result.totalScore,
                    resultDetails: result,
                    timestamp: new Date(),
                    imageSrc: image.src
                };
                setScanHistory(prev => [newRecord, ...prev]);
                
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'done', result: newRecord } : img));
            } else {
                setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: 'Ảnh mờ/Lỗi đọc.' } : img));
            }
        } catch (err) {
            console.error(err);
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', errorMsg: 'Lỗi AI GEMINI.' } : img));
        }
    }
    setGlobalProcessing(false);
  };`;

content = content.replace(oldProcessImageData, newProcessImageData);

fs.writeFileSync('src/App.tsx', content);
