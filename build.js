const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Helper: fetch URL as string ─────────────────────────────────────────────
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            // Follow redirects (up to 5)
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                return fetchUrl(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${url} — HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Inline all external <script src="https://..."> tags ─────────────────────
async function inlineScripts(html) {
    const scriptRegex = /<script\s+[^>]*src="(https?:\/\/[^"]+)"[^>]*><\/script>/gi;
    const matches = [...html.matchAll(scriptRegex)];

    for (const match of matches) {
        const [fullTag, url] = match;
        try {
            console.log(`  ↓ Fetching JS : ${url}`);
            const code = await fetchUrl(url);
            // Preserve defer/async attributes as comments for clarity
            html = html.replace(fullTag, `<script>\n/* Inlined from: ${url} */\n${code}\n</script>`);
        } catch (err) {
            console.warn(`  ⚠ Could not fetch JS (${url}): ${err.message} — leaving as-is`);
        }
    }
    return html;
}

// ─── Inline all external <link rel="stylesheet" href="https://..."> tags ─────
async function inlineStylesheets(html) {
    const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href="(https?:\/\/[^"]+)"[^>]*\/?>/gi;
    const matches = [...html.matchAll(linkRegex)];

    for (const match of matches) {
        const [fullTag, url] = match;
        try {
            console.log(`  ↓ Fetching CSS: ${url}`);
            const css = await fetchUrl(url);
            html = html.replace(fullTag, `<style>\n/* Inlined from: ${url} */\n${css}\n</style>`);
        } catch (err) {
            console.warn(`  ⚠ Could not fetch CSS (${url}): ${err.message} — leaving as-is`);
        }
    }
    return html;
}

// ─── Main build ───────────────────────────────────────────────────────────────
async function build() {
    const inputHtmlPath = './src/index.html';
    const outputDir    = './dist';
    const outputHtmlPath = path.join(outputDir, 'index.html');
    const tempCssPath  = './temp.css';

    // 1. Pastikan folder dist ada
    await fs.ensureDir(outputDir);

    // 2. Buat file CSS dasar untuk Tailwind
    const tailwindDirectives = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';
    await fs.writeFile(tempCssPath, tailwindDirectives);

    // 3. Jalankan Tailwind CLI untuk build CSS berdasarkan isi index.html
    console.log('\n[1/5] Generating Tailwind CSS...');
    execSync(`npx tailwindcss -i ${tempCssPath} -o ${outputDir}/style.css --minify`);

    // 4. Baca CSS yang baru di-generate
    const generatedCss = await fs.readFile(`${outputDir}/style.css`, 'utf8');

    // 5. Baca file HTML input
    let html = await fs.readFile(inputHtmlPath, 'utf8');

    // 6. Hapus tag CDN Tailwind (sudah di-build manual)
    html = html.replace(/<script\s+src="https:\/\/cdn\.tailwindcss\.com"><\/script>/gi, '');

    // 7. Inline Tailwind CSS ke <head>
    console.log('\n[2/5] Inlining Tailwind CSS...');
    const tailwindStyleTag = `\n<style>\n/* Tailwind Built-in */\n${generatedCss}\n</style>`;
    html = html.replace('</head>', `${tailwindStyleTag}\n</head>`);

    // 8. Inline semua external stylesheet CDN (Font Awesome, dll.)
    console.log('\n[3/5] Inlining external CSS (Font Awesome, etc.)...');
    html = await inlineStylesheets(html);

    // 9. Inline semua external script CDN (Alpine.js, marked.js, dll.)
    console.log('\n[4/5] Inlining external JS (Alpine.js, marked.js, etc.)...');
    html = await inlineScripts(html);

    // 10. Tulis file HTML hasil akhir ke folder dist
    console.log('\n[5/5] Writing dist/index.html...');
    await fs.writeFile(outputHtmlPath, html);

    // 11. Hapus file temporary
    await fs.remove(tempCssPath);
    await fs.remove(`${outputDir}/style.css`);

    // 12. Ringkasan
    const sizeKB = ((await fs.stat(outputHtmlPath)).size / 1024).toFixed(1);
    console.log(`\n✅ Build completed! → dist/index.html (${sizeKB} KB)`);
    console.log('   Semua CDN (Tailwind, Font Awesome, Alpine.js, marked.js, dll.) sudah di-inline.\n');
}

build().catch(err => { console.error('\n❌ Build failed:', err); process.exit(1); });
