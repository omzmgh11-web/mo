import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'src', 'data.ts');
let content = fs.readFileSync(dataPath, 'utf-8');

// Replace /src/assets/images/ with /images/
content = content.replace(/\/src\/assets\/images\//g, '/images/');

fs.writeFileSync(dataPath, content);
console.log("Fixed paths to /images/");
