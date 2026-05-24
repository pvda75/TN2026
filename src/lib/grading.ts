export type Part1Answers = string[]; // each element 'A' | 'B' | 'C' | 'D' | ''
export type Part2Answers = { questionNumber: number, answers: string[] }[]; // answers: ['Đ', 'S', 'S', 'Đ']
export type Part3Answers = { questionNumber: number, answer: string }[];

export interface ExamAnswers {
  part1: Part1Answers;
  part2: Part2Answers;
  part3: Part3Answers;
}

export interface ExamStructure {
  id: string;
  name: string;
  sessionId?: string;
  rooms?: string[];
  part1: { active: boolean; numQuestions: number; pointsPerQuestion: number };
  part2: { active: boolean; numQuestions: number; points: [number, number, number, number] }; // points for 1, 2, 3, 4 correct answers
  part3: { active: boolean; numQuestions: number; pointsPerQuestion: number };
}

export interface ExamSession {
  id: string;
  name: string;
}

export const DEFAULT_STRUCTURES: ExamStructure[] = [
  {
    id: 'MATH',
    name: 'TOÁN (12 - 4 - 6)',
    part1: { active: true, numQuestions: 12, pointsPerQuestion: 0.25 },
    part2: { active: true, numQuestions: 4, points: [0.1, 0.25, 0.5, 1.0] },
    part3: { active: true, numQuestions: 6, pointsPerQuestion: 0.5 }
  },
  {
    id: 'SCIENCE',
    name: 'LÝ/HÓA/SINH (18 - 4 - 6)',
    part1: { active: true, numQuestions: 18, pointsPerQuestion: 0.25 },
    part2: { active: true, numQuestions: 4, points: [0.1, 0.25, 0.5, 1.0] },
    part3: { active: true, numQuestions: 6, pointsPerQuestion: 0.25 }
  },
  {
    id: 'SOCIAL',
    name: 'SỬ/ĐỊA/GDCD/TIN/CN (24 - 4 - 0)',
    part1: { active: true, numQuestions: 24, pointsPerQuestion: 0.25 },
    part2: { active: true, numQuestions: 4, points: [0.1, 0.25, 0.5, 1.0] },
    part3: { active: false, numQuestions: 0, pointsPerQuestion: 0 }
  },
  {
    id: 'LANG',
    name: 'NGOẠI NGỮ (40 - 0 - 0)',
    part1: { active: true, numQuestions: 40, pointsPerQuestion: 0.25 },
    part2: { active: false, numQuestions: 0, points: [0, 0, 0, 0] },
    part3: { active: false, numQuestions: 0, pointsPerQuestion: 0 }
  }
];

export const calculateScore = (
  student: ExamAnswers, 
  key: ExamAnswers, 
  structure: any
) => {
  const resultDetails: any = { part1: [], part2: [], part3: [] };
  let totalComputedScore = 0;

  // Part 1
  if (structure.part1?.active) {
    const numP1 = structure.part1.numQuestions;
    const p1Value = Number(structure.part1.pointsPerQuestion || structure.part1.points || 0.25);
  
    for (let i = 0; i < numP1; i++) {
      const studentAns = student.part1?.[i] || '';
      const keyAns = key.part1?.[i] || '';
      const isCorrect = String(studentAns).trim().toUpperCase() === String(keyAns).trim().toUpperCase() && String(keyAns).trim() !== '';
      const points = isCorrect ? p1Value : 0;
      totalComputedScore += points;
      resultDetails.part1.push({ q: i + 1, student: studentAns, key: keyAns, isCorrect, points });
    }
  }

  // Part 2
  if (structure.part2?.active) {
    const numP2 = structure.part2.numQuestions;
    const safePart2 = Array.isArray(student.part2) ? student.part2 : [];
    const safeKeyPart2 = Array.isArray(key.part2) ? key.part2 : [];
    const pointsArr = Array.isArray(structure.part2.points) ? structure.part2.points : [0.1, 0.25, 0.5, 1.0];

    for (let i = 0; i < numP2; i++) {
      const studentQ = safePart2.find((q: any) => q && q.questionNumber === i + 1) || { answers: ['', '', '', ''] };
      const keyQ = safeKeyPart2.find((q: any) => q && q.questionNumber === i + 1) || { answers: ['', '', '', ''] };
      
      let correctCount = 0;
      const itemDetails = [];
      for (let j = 0; j < 4; j++) {
        const sAns = Array.isArray(studentQ.answers) ? studentQ.answers[j] || '' : '';
        const kAns = Array.isArray(keyQ.answers) ? keyQ.answers[j] || '' : '';
        const isCorrect = String(sAns).trim().toUpperCase() === String(kAns).trim().toUpperCase() && String(kAns).trim() !== '';
        if (isCorrect) correctCount++;
        itemDetails.push({ item: ['a','b','c','d'][j], student: sAns, key: kAns, isCorrect });
      }
  
      let points = 0;
      if (correctCount > 0 && correctCount <= 4) {
         points = Number(pointsArr[correctCount - 1]) || 0;
      }
      totalComputedScore += points;
      resultDetails.part2.push({ q: i + 1, itemDetails, correctCount, points });
    }
  }

  // Part 3
  if (structure.part3?.active) {
    const numP3 = structure.part3.numQuestions;
    const p3Value = Number(structure.part3.pointsPerQuestion || structure.part3.points || 0.5); 
    const safePart3 = Array.isArray(student.part3) ? student.part3 : [];
    const safeKeyPart3 = Array.isArray(key.part3) ? key.part3 : [];
    for (let i = 0; i < numP3; i++) {
      const studentQ = safePart3.find((q: any) => q && q.questionNumber === i + 1) || { answer: '' };
      const keyQ = safeKeyPart3.find((q: any) => q && q.questionNumber === i + 1) || { answer: '' };
      const isCorrect = String(studentQ.answer).trim().toUpperCase() !== '' && String(studentQ.answer).trim().toUpperCase() === String(keyQ.answer).trim().toUpperCase(); // Simple string match
      const points = isCorrect ? p3Value : 0;
      totalComputedScore += points;
      resultDetails.part3.push({ q: i + 1, student: studentQ.answer, key: keyQ.answer, isCorrect, points });
    }
  }

  return { totalScore: parseFloat(totalComputedScore.toFixed(2)), resultDetails };
};

export const createEmptyAnswers = (structure: ExamStructure): ExamAnswers => ({
  part1: Array(structure.part1.numQuestions || 40).fill(''),
  part2: Array.from({length: structure.part2.numQuestions || 4}, (_, i) => ({ questionNumber: i + 1, answers: ['', '', '', ''] })),
  part3: Array.from({length: structure.part3.numQuestions || 6}, (_, i) => ({ questionNumber: i + 1, answer: '' })),
});
