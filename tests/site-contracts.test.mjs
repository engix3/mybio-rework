import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (filePath) => readFile(new URL(`../${filePath}`, import.meta.url), 'utf8');

test('HTML pages do not use inline event handlers', async () => {
    const pages = await Promise.all([
        readProjectFile('index.html'),
        readProjectFile('404.html')
    ]);

    for (const page of pages) {
        assert.doesNotMatch(page, /\son[a-z]+\s*=/i);
    }
});

test('Discord activity text is not rendered through innerHTML', async () => {
    const script = await readProjectFile('script.js');

    assert.match(script, /el\.textContent = newContent/g);
    assert.doesNotMatch(script, /el\.innerHTML = newContent/);
    assert.match(script, /statusDot\.replaceChildren\(\)/);
});

test('background video is deferred and has a compact WebM source', async () => {
    const [html, config, script] = await Promise.all([
        readProjectFile('index.html'),
        readProjectFile('config.js'),
        readProjectFile('script.js')
    ]);

    assert.match(html, /preload="none"/);
    assert.match(html, /data-video-webm-src=/);
    assert.match(config, /video_webm:/);
    assert.match(script, /navigator\.connection\?\.saveData/);
    assert.match(script, /prefersReducedMotion\(\)/);
});
