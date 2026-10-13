import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'src', 'data.ts');
let content = fs.readFileSync(dataPath, 'utf-8');

const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
const images = fs.readdirSync(imagesDir);

images.forEach(img => {
    const match = img.match(/^sport_(.+?)_\d+\.jpg$/);
    if (match) {
        let word = match[1].replace(/_/g, ' ');
        if (word === 'equipe') word = 'équipe';
        if (word === 'strategie') word = 'stratégie';
        if (word === 'activite') word = 'activité';
        if (word === 'debut') word = 'début';
        
        const localPath = `/src/assets/images/${img}`;
        const regex = new RegExp(`(fr:\\s*"[^"]*?${word}".*?kw:\\s*)"([^"]+)"`);
        content = content.replace(regex, `$1"${localPath}"`);
    }
});

fs.writeFileSync(dataPath, content);
console.log("Fixed accents");
