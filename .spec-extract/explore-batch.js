const fs = require('fs');
const transcriptPath =
  'C:/Users/sossu/.cursor/projects/c-Users-sossu-OneDrive-BandManager/agent-transcripts/bcc35d9e-2391-48df-a50d-b6514c1e7893/bcc35d9e-2391-48df-a50d-b6514c1e7893.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
const batchLine = lines[75]; // line 76
const text = JSON.parse(batchLine).message.content[0].text;
console.log('length', text.length);
const needles = [
  'ConfirmDialog',
  'reportsApi',
  'refreshUser',
  'TourStop',
  'client/src/lib/api',
  'C:/Users/sossu',
  'BandManager/client',
  '### `',
  '### client',
  'ФАЙЛ',
  'api.ts',
];
for (const n of needles) {
  const i = text.indexOf(n);
  console.log(n, i);
}
// show context around first ConfirmDialog
const i = text.indexOf('ConfirmDialog');
if (i >= 0) console.log('\n--- context ---\n', text.slice(Math.max(0, i - 200), i + 300));
