import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'src', 'data.ts');
let content = fs.readFileSync(dataPath, 'utf-8');

const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
const images = fs.readdirSync(imagesDir);

images.forEach(img => {
    // img e.g., sport_badminton_1789592048378.jpg
    const match = img.match(/^sport_(.+?)_\d+\.jpg$/);
    if (match) {
        let word = match[1].replace(/_/g, ' ');
        // special cases
        if (word === 'echecs') word = 'échecs';
        if (word === 'tir a larc') word = "tir à l'arc";
        
        const localPath = `/src/assets/images/${img}`;
        
        // Find the line in data.ts that matches this word
        // e.g., fr:"le badminton"
        const regex = new RegExp(`(fr:\\s*"[^"]*?${word}".*?kw:\\s*)"([^"]+)"`);
        content = content.replace(regex, `$1"${localPath}"`);
    }
});

fs.writeFileSync(dataPath, content);
console.log("Updated data.ts with local images");
