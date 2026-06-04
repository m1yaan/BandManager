const fs = require('fs');
const path = require('path');

const outDir = __dirname;
const clientRoot = path.join(__dirname, '..', 'client');
const transcriptPath =
  'C:/Users/sossu/.cursor/projects/c-Users-sossu-OneDrive-BandManager/agent-transcripts/bcc35d9e-2391-48df-a50d-b6514c1e7893/bcc35d9e-2391-48df-a50d-b6514c1e7893.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
const batchLine = lines[75];
const text = JSON.parse(batchLine).message.content[0].text;

const patterns = [
  'client/src/components/ConfirmDialog.tsx',
  'client/src/lib/api.ts',
  'client/src/context/AuthContext.tsx',
  'client/src/main.tsx',
  'client/src/App.tsx',
  'client/src/components/Layout.tsx',
  'client/src/index.css',
  'client/src/pages/AuthPage.tsx',
];

function extractFile(filePath) {
  const header = `**Файл: ${filePath}**`;
  const start = text.indexOf(header);
  if (start === -1) return null;

  let pos = start + header.length;
  while (pos < text.length && /[\s\r\n]/.test(text[pos])) pos++;

  if (text.slice(pos, pos + 3) !== '```') return null;
  const langEnd = text.indexOf('\n', pos);
  pos = langEnd + 1;
  const endFence = text.indexOf('\n```', pos);
  if (endFence === -1) return null;
  return text.slice(pos, endFence);
}

for (const fp of patterns) {
  const content = extractFile(fp);
  if (!content) {
    console.error('FAILED:', fp);
    continue;
  }
  const dest = path.join(clientRoot, fp.replace('client/', ''));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
  console.log('OK', fp, content.length, 'chars');
}
