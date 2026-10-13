import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'src', 'data.ts');
const content = fs.readFileSync(dataPath, 'utf-8');
const words = [...content.matchAll(/fr:\s*"([^"]+)"/g)].map(m => m[1]);

async function getWikiImage(word) {
    let searchWord = word.replace(/^(le |la |les |l'|un |une )/, '').trim();
    if (searchWord.includes('/')) {
        searchWord = searchWord.split('/')[0].trim();
    }
    
    // First try EN wikipedia with translated word (conceptually) or just the FR word on EN wikipedia? 
    // FR word on EN wikipedia works for some. Let's try FR wikipedia first for better matching!
    const urlFr = `https://fr.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(searchWord)}`;
    try {
        const res = await fetch(urlFr, { headers: { 'User-Agent': 'Bot/1.0 (test)' }});
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId !== "-1" && pages[pageId].original) {
            return pages[pageId].original.source;
        }
    } catch(e) {}

    // fallback EN wikipedia
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(searchWord)}`;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Bot/1.0 (test)' }});
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId !== "-1" && pages[pageId].original) {
            return pages[pageId].original.source;
        }
    } catch(e) {}
    
    // try removing plural or extra words
    searchWord = searchWord.split(' ')[0];
    const urlFr2 = `https://fr.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(searchWord)}`;
    try {
        const res = await fetch(urlFr2, { headers: { 'User-Agent': 'Bot/1.0 (test)' }});
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId !== "-1" && pages[pageId].original) {
            return pages[pageId].original.source;
        }
    } catch(e) {}

    return null;
}

async function main() {
    console.log("Fetching Wiki images...");
    const results = {};
    for(let w of words) {
        let img = await getWikiImage(w);
        if (!img) {
            // Unsplash Source API fallback just to have a URL (it redirects to a random image)
            // But we know loremflickr works better as a static URL
            img = `https://loremflickr.com/400/300/${encodeURIComponent(w.replace(/^(le |la |les |l'|un |une )/, '').trim().split(' ')[0])},sport`;
        }
        results[w] = img;
    }
    
    // Now replace in data.ts
    let newDataContent = content;
    for(let w of words) {
        // we'll replace the kw field with the image url for simplicity
        newDataContent = newDataContent.replace(
            new RegExp(`(fr:\\s*"${w}".*?kw:\\s*)"([^"]+)"`),
            `$1"${results[w]}"`
        );
    }
    fs.writeFileSync(dataPath, newDataContent);
    console.log(`Updated data.ts with image URLs!`);
}
main();
