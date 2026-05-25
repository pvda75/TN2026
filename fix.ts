import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// I will fix the first block that got destroyed (again)
const correctBlock = `                        const score = curr.score || 0;
                        acc[name].sum += score;
                        if (score > acc[name].max) acc[name].max = score;
                        if (score < acc[name].min) acc[name].min = score;
                        if (score >= 5) acc[name].passCount++;
                        return acc;
                      }, {} as Record<string, any>);

                      const statsArray = Object.keys(statsByExam).map(k => ({
                        examName: k,
                        total: statsByExam[k].total,
                        avg: statsByExam[k].total > 0 ? (statsByExam[k].sum / statsByExam[k].total).toFixed(2) : 0,
                        max: statsByExam[k].max === -1 ? 0 : statsByExam[k].max.toFixed(2),
                        min: statsByExam[k].min === 9999 ? 0 : statsByExam[k].min.toFixed(2),
                        passCount: statsByExam[k].passCount
                      }));

                      if (statsArray.length === 0) {
                        return (
                          <tr>
                              <td colSpan={6} className="px-4 py-8 text-slate-400 italic font-medium">Chưa có dữ liệu thống kê.</td>
                          </tr>
                        );
                      }

                      return statsArray.map((st, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 text-left">{st.examName}</td>`;

// I'll grab lines 5825 to 5855 and replace them.
const lines = content.split('\n');

// The file is messed up around 5824. 
// Let's replace the whole tbody with a clean one
const tbodyStart = lines.findIndex(line => line.includes('<tbody className="divide-y divide-slate-200 text-center">'));
const tbodyEnd = lines.findIndex((line, index) => index > tbodyStart && line.includes('</tbody>'));

const correctTbody = `                  <tbody className="divide-y divide-slate-200 text-center">
                    {(() => {
                      const statsByExam = userScanHistory.reduce((acc, curr) => {
                        const name = curr.examName || "Khác";
                        if (!acc[name]) {
                            acc[name] = { total: 0, sum: 0, max: -1, min: 9999, passCount: 0 };
                        }
                        acc[name].total++;
${correctBlock}
                            <td className="px-4 py-3">{st.total}</td>
                            <td className="px-4 py-3 text-blue-600 font-semibold">{st.avg}</td>
                            <td className="px-4 py-3 text-emerald-600 font-semibold">{st.max}</td>
                            <td className="px-4 py-3 text-red-600 font-semibold">{st.min}</td>
                            <td className="px-4 py-3">{st.passCount}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>`;

lines.splice(tbodyStart, tbodyEnd - tbodyStart + 1, correctTbody);

// Now finding the second block that I need to edit:
const finalContent = lines.join('\n');
let fixedContent = finalContent.replace(
  /truncate text-blue-600[^]{1,300}value=\{activeSessionId\}/,
  'truncate text-red-600`}\n                     value={activeSessionId}'
).replace(
  /bg-white text-blue-600[^]{1,300}value=\{statsExamFilter\}/,
  'bg-white text-red-600"\n                   value={statsExamFilter}'
);

fs.writeFileSync('src/App.tsx', fixedContent);
console.log("File fixed!");
