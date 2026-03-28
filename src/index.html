const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');

async function build() {
    const inputHtmlPath = './src/index.html';
    const outputDir = './dist';
    const outputHtmlPath = path.join(outputDir, 'index.html');
    const tempCssPath = './temp.css';

    // 1. Pastikan folder dist ada
    await fs.ensureDir(outputDir);

    // 2. Buat file CSS dasar untuk Tailwind
    const tailwindDirectives = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';
    await fs.writeFile(tempCssPath, tailwindDirectives);

    // 3. Jalankan Tailwind CLI untuk build CSS berdasarkan isi index.html
    console.log('Generating Tailwind CSS...');
    execSync(`npx tailwindcss -i ${tempCssPath} -o ${outputDir}/style.css --minify`);

    // 4. Baca CSS yang baru di-generate
    const generatedCss = await fs.readFile(`${outputDir}/style.css`, 'utf8');

    // 5. Baca file HTML input
    let htmlContent = await fs.readFile(inputHtmlPath, 'utf8');

    // 6. HAPUS tag script CDN Tailwind
    htmlContent = htmlContent.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, '');

    // 7. Masukkan CSS yang sudah di-build ke dalam tag <style> sebelum </head>
    const styleTag = `\n<style>\n/* Tailwind Built-in */\n${generatedCss}\n</style>\n`;
    htmlContent = htmlContent.replace('</head>', `${styleTag}</head>`);

    // 8. Tulis file HTML hasil akhir ke folder dist
    await fs.writeFile(outputHtmlPath, htmlContent);

    // 9. Hapus file temporary
    await fs.remove(tempCssPath);
    await fs.remove(`${outputDir}/style.css`);

    console.log('Build completed! Cek folder /dist');
}

build().catch(err => console.error(err));
