const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');
const axios = require('axios');

async function fetchContent(url) {
    try {
        console.log(`Downloading: ${url}`);
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        console.error(`Gagal mendownload ${url}: ${err.message}`);
        return `/* Gagal memuat: ${url} */`;
    }
}

async function run() {
    const inputPath = './src/index.html';
    const distDir = './dist';
    const tempCss = './temp_tailwind.css';

    await fs.ensureDir(distDir);

    // 1. Generate Tailwind CSS
    console.log('Sedang memproses Tailwind...');
    const tailwindInput = '@tailwind base; @tailwind components; @tailwind utilities;';
    await fs.writeFile('./input.css', tailwindInput);
    execSync(`npx tailwindcss -i ./input.css -o ${tempCss} --minify`);
    const tailwindContent = await fs.readFile(tempCss, 'utf8');

    // 2. Baca file HTML asli
    let html = await fs.readFile(inputPath, 'utf8');

    // 3. Proses External CSS (<link rel="stylesheet">)
    const linkRegex = /<link.*href=["'](http.*?)["'].*?>/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
        const fullTag = linkMatch[0];
        const url = linkMatch[1];
        const cssContent = await fetchContent(url);
        html = html.replace(fullTag, `<style>\n/* Inlined: ${url} */\n${cssContent}\n</style>`);
    }

    // 4. Proses External JS (<script src="http...">)
    const scriptRegex = /<script.*src=["'](http.*?)["'].*?><\/script>/g;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const fullTag = scriptMatch[0];
        const url = scriptMatch[1];
        
        // Lewati CDN Tailwind karena sudah kita build sendiri
        if (url.includes('cdn.tailwindcss.com')) {
            html = html.replace(fullTag, '');
            continue;
        }

        const jsContent = await fetchContent(url);
        html = html.replace(fullTag, `<script>\n/* Inlined: ${url} */\n${jsContent}\n</script>`);
    }

    // 5. Masukkan Tailwind hasil build ke dalam <head>
    const tailwindStyleTag = `\n<style>\n/* Tailwind CSS Built-in */\n${tailwindContent}\n</style>\n`;
    html = html.replace('</head>', `${tailwindStyleTag}</head>`);

    // 6. Simpan hasil akhir
    await fs.writeFile(path.join(distDir, 'index.html'), html);

    // Clean up
    await fs.remove('./input.css');
    await fs.remove(tempCss);

    console.log('Selesai! File output ada di dist/index.html');
}

run();
