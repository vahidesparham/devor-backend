const fs = require('fs');
const path = require('path');

const PRISMA_DIR = path.join(process.cwd(), 'prisma');

function hasBom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(PRISMA_DIR)) {
    process.stdout.write('[strip-bom-prisma] prisma directory not found, skipped.\n');
    return;
  }

  const files = walk(PRISMA_DIR);
  let changed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file);
    if (!hasBom(content)) continue;
    fs.writeFileSync(file, content.subarray(3));
    changed += 1;
  }

  process.stdout.write(`[strip-bom-prisma] scanned ${files.length} file(s), fixed ${changed} file(s).\n`);
}

main();
