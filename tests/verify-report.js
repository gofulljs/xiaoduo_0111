const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const readProjectFile = (filePath) => fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
const html = readProjectFile('doc/index.html');
const app = readProjectFile('doc/app.js');
const readme = readProjectFile('doc/README.md');
const pagesWorkflow = readProjectFile('.github/workflows/deploy-pages.yml');
const sourceTickets = JSON.parse(readProjectFile('source/task5_tickets.json'));
const examplePath = path.join(projectRoot, 'doc/data/example-tickets.json');
assert.ok(fs.existsSync(examplePath), '缺少内置示例 JSON 文件');
const exampleTickets = JSON.parse(readProjectFile('doc/data/example-tickets.json'));

assert.deepEqual(exampleTickets, sourceTickets, '内置示例必须与源工单 JSON 完全一致');
assert.match(html, /<button\b[^>]*\bid\s*=\s*["']load-example["']/i, '页面缺少内置示例加载按钮');
assert.match(html, /<button\b[^>]*\bid\s*=\s*["']load-file["']/i, '页面缺少本地文件加载按钮');
assert.match(html, /<input\b[^>]*\bid\s*=\s*["']ticket-file["'][^>]*\btype\s*=\s*["']file["'][^>]*\baccept\s*=\s*["']application\/json,\.json["'][^>]*\bhidden\b/i, '页面缺少隐藏的 JSON 文件输入框');
assert.match(html, /<[^>]+\bid\s*=\s*["']load-status["'][^>]*\brole\s*=\s*["']status["'][^>]*\baria-live\s*=\s*["']polite["']/i, '页面缺少可访问的加载状态区');
assert.match(html, /<[^>]+\bid\s*=\s*["']report["']/i, '页面缺少动态报告容器');
assert.match(html, /<script\b[^>]*\bsrc\s*=\s*["']\.\/app\.js["'][^>]*\bdefer\b[^>]*><\/script>/i, '页面必须以 defer 加载 app.js');
assert.doesNotMatch(html, /data-metric|data-distribution|data-category|data-channel/, '页面不应保留硬编码报告数据');

['renderReport', 'initializeApp', 'escapeHtml', 'loadTickets', 'fetch(\'./data/example-tickets.json\')', 'FileReader', 'readAsText'].forEach((value) => {
  assert.ok(app.includes(value), `app.js 缺少浏览器加载能力：${value}`);
});

assert.doesNotMatch(html, /(?:<|\s)(?:src|href)\s*=\s*(?:["']\s*)?(?:https?:)?\/\//i, '页面不应包含外部 HTML 资源');
[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].forEach((match) => {
  assert.doesNotMatch(match[1], /(?:@import|url\()\s*(?:url\(\s*)?(?:["']\s*)?(?:https?:)?\/\//i, '页面不应包含外部 CSS 资源');
});

['分析维度', '关键趋势与异常', 'AI 工具使用情况', 'GitHub Pages'].forEach((section) => {
  assert.match(readme, new RegExp(section), `README 缺少“${section}”章节`);
});
assert.match(readme, /python3 -m http.server 8000 --directory doc/, 'README 缺少本地预览命令');
assert.match(pagesWorkflow, /path: doc/, 'Pages 工作流必须发布 doc 目录');
assert.match(pagesWorkflow, /actions\/deploy-pages@v4/, 'Pages 工作流缺少部署步骤');

console.log('动态报告校验通过');
