const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const tickets = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'source/task5_tickets.json'), 'utf8'),
);

const unresolvedTickets = tickets.filter((ticket) => !ticket.is_resolved);
const payments = tickets.filter((ticket) => ticket.category === '支付问题');
const refunds = tickets.filter((ticket) => ticket.category === '退款退货');
const telephone = tickets.filter((ticket) => ticket.channel === '电话');
const highPriorityTickets = tickets.filter((ticket) => ticket.priority === '高');
const averageResolutionTime = tickets.reduce(
  (total, ticket) => total + ticket.resolution_time_hours,
  0,
) / tickets.length;
const averageSatisfaction = tickets.reduce(
  (total, ticket) => total + ticket.satisfaction,
  0,
) / tickets.length;
const refundAverageResolutionTime = refunds.reduce(
  (total, ticket) => total + ticket.resolution_time_hours,
  0,
) / refunds.length;
const telephoneAverageResolutionTime = telephone.reduce(
  (total, ticket) => total + ticket.resolution_time_hours,
  0,
) / telephone.length;
const telephoneAverageSatisfaction = telephone.reduce(
  (total, ticket) => total + ticket.satisfaction,
  0,
) / telephone.length;
const paymentHighPriorityTickets = payments.filter(
  (ticket) => ticket.priority === '高',
);
const unresolvedRate = Math.round((unresolvedTickets.length / tickets.length) * 100);
const dailyCounts = [...Array(11)].map((_, index) => {
  const day = String(index + 1).padStart(2, '0');
  return tickets.filter((ticket) => ticket.created_at.startsWith(`2024-06-${day}`)).length;
});
const categoryStats = [...new Set(tickets.map((ticket) => ticket.category))].map(
  (category) => {
    const categoryTickets = tickets.filter((ticket) => ticket.category === category);
    return {
      category,
      total: categoryTickets.length,
      highPriority: categoryTickets.filter((ticket) => ticket.priority === '高').length,
      unresolved: categoryTickets.filter((ticket) => !ticket.is_resolved).length,
      averageHours: (
        categoryTickets.reduce(
          (total, ticket) => total + ticket.resolution_time_hours,
          0,
        ) / categoryTickets.length
      ).toFixed(2),
      averageSatisfaction: (
        categoryTickets.reduce((total, ticket) => total + ticket.satisfaction, 0) /
        categoryTickets.length
      ).toFixed(2),
    };
  },
);

assert.equal(tickets.length, 50);
assert.equal(unresolvedTickets.length, 8);
assert.equal(Number(averageResolutionTime.toFixed(2)), 19.69);
assert.equal(Number(averageSatisfaction.toFixed(2)), 2.36);
assert.equal(payments.length, 16);
assert.equal(paymentHighPriorityTickets.length, 14);
assert.equal(refunds.length, 13);
assert.equal(refunds.filter((ticket) => !ticket.is_resolved).length, 5);
assert.equal(Number(refundAverageResolutionTime.toFixed(2)), 45.23);
assert.equal(highPriorityTickets.length, 31);
assert.equal(telephone.length, 16);
assert.equal(Number(telephoneAverageResolutionTime.toFixed(2)), 31.63);
assert.equal(Number(telephoneAverageSatisfaction.toFixed(2)), 1.94);

const totalMetric = String(tickets.length);
const unresolvedMetric = `${unresolvedTickets.length} / ${tickets.length} · ${unresolvedRate}%`;
const averageHoursMetric = `${averageResolutionTime.toFixed(2)} 小时`;
const averageSatisfactionMetric = `${averageSatisfaction.toFixed(2)} / 5`;
const highPriorityMetric = `${highPriorityTickets.length} / ${tickets.length}`;
const paymentCategoryValues = [
  '支付问题',
  String(payments.length),
  String(paymentHighPriorityTickets.length),
];
const refundCategoryValues = [
  '退款退货',
  String(refunds.length),
  String(refunds.filter((ticket) => !ticket.is_resolved).length),
  refundAverageResolutionTime.toFixed(2),
];
const telephoneChannelValues = [
  '电话渠道',
  String(telephone.length),
  telephoneAverageResolutionTime.toFixed(2),
  telephoneAverageSatisfaction.toFixed(2),
];

const html = fs.readFileSync(path.join(projectRoot, 'doc/index.html'), 'utf8');
const readme = fs.readFileSync(path.join(projectRoot, 'doc/README.md'), 'utf8');
const pagesWorkflow = fs.readFileSync(
  path.join(projectRoot, '.github/workflows/deploy-pages.yml'),
  'utf8',
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getElementText = (attribute, value) => {
  const pattern = new RegExp(
    `<([a-z][\\w:-]*)\\b(?=[^>]*\\b${escapeRegExp(attribute)}\\s*=\\s*["']${escapeRegExp(value)}["'])[^>]*>([\\s\\S]*?)<\\/\\1>`,
    'i',
  );
  const match = html.match(pattern);

  assert.ok(match, `报告缺少 ${attribute}="${value}" 元素`);
  return match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const assertElementIncludes = (attribute, value, expectedValues) => {
  const text = getElementText(attribute, value);

  expectedValues.forEach((expectedValue) => {
    assert.match(
      text,
      new RegExp(`(?:^|\\D)${escapeRegExp(expectedValue)}(?:\\D|$)`),
      `${attribute}="${value}" 缺少数值：${expectedValue}`,
    );
  });
};

const alertCards = [...html.matchAll(/<article\s+class="alert">([\s\S]*?)<\/article>/gi)].map(
  (match) => match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
);
const getAlertText = (identifier) => {
  const alertText = alertCards.find((text) => text.includes(identifier));

  assert.ok(alertText, `报告缺少 ${identifier} 异常卡片`);
  return alertText;
};

assertElementIncludes('data-metric', 'total', ['工单总量', totalMetric]);
assertElementIncludes('data-metric', 'unresolved', ['未解决率', unresolvedMetric]);
assertElementIncludes('data-metric', 'avg-hours', ['平均处理时长', averageHoursMetric]);
assertElementIncludes('data-metric', 'avg-satisfaction', [
  '平均满意度',
  averageSatisfactionMetric,
]);
assertElementIncludes('data-metric', 'high-priority', [
  '高优先级工单',
  highPriorityMetric,
]);
assertElementIncludes('data-category', '支付问题', paymentCategoryValues);
assertElementIncludes('data-category', '退款退货', refundCategoryValues);
categoryStats.forEach((stats) => {
  assertElementIncludes('data-category', stats.category, [
    stats.category,
    String(stats.total),
    String(stats.highPriority),
    String(stats.unresolved),
    stats.averageHours,
    stats.averageSatisfaction,
  ]);
});
assertElementIncludes('data-channel', '电话', telephoneChannelValues);

assert.deepEqual(dailyCounts, [3, 3, 4, 5, 4, 5, 5, 5, 5, 6, 5]);
assert.match(html, /日总量依次为\s*3、3、4、5、4、5、5、5、5、6、5/);
assert.match(html, /6\s*月\s*10\s*日峰值为\s*6\s*条/);
assert.match(html, /最后六天每日不少于\s*5\s*条/);
const trendSvg = html.match(
  /<svg\b[^>]*aria-label="6月1日至11日每日工单总量折线图"[^>]*>([\s\S]*?)<\/svg>/i,
);
assert.ok(trendSvg, '报告缺少每日工单量趋势 SVG');
const trendPolyline = trendSvg[1].match(/<polyline\b[^>]*\bpoints="([^"]+)"[^>]*>/i);
assert.ok(trendPolyline, '趋势 SVG 缺少 polyline points');
const trendPoints = trendPolyline[1]
  .trim()
  .split(/\s+/)
  .map((point) => point.split(',').map(Number));
assert.equal(trendPoints.length, dailyCounts.length, '趋势点数量应与每日序列一致');
assert.deepEqual(
  trendPoints.map(([, y]) => y),
  dailyCounts.map((count) => 165 - count * 20),
  '趋势 polyline 的 y 坐标应按每日工单量映射',
);

const paymentAlert = getAlertText('支付问题');
const refundAlert = getAlertText('退款退货');
const telephoneAlert = getAlertText('电话渠道');

assert.match(paymentAlert, /T046/);
assert.match(refundAlert, /T031.*T036.*T039.*T042.*T047/);
assert.match(telephoneAlert, /T019.*T031.*T039.*T047/);
assert.doesNotMatch(
  paymentAlert,
  /(?:优先处理|优先处置|优先回访)[^。]{0,40}T050|T050[^。]{0,40}(?:优先处理|优先处置|优先回访)/,
  '支付建议不应将 T050 作为优先处理或优先回访对象',
);

assert.match(html, /<html\b[^>]*\blang\s*=\s*["']zh-CN["'][^>]*>/i);
assert.match(html, /<svg\b/i);

['分析维度', '关键趋势与异常', 'AI 工具使用情况', 'GitHub Pages'].forEach((section) => {
  assert.match(readme, new RegExp(section), `README 缺少“${section}”章节`);
});

['actions/deploy-pages', 'path: doc', 'pages: write', 'id-token: write'].forEach((value) => {
  assert.match(pagesWorkflow, new RegExp(value), `Pages 工作流缺少“${value}”`);
});

assert.doesNotMatch(
  html,
  /(?:<|\s)(?:src|href)\s*=\s*(?:["']\s*)?(?:https?:)?\/\//i,
  '报告不应包含外部 HTML 资源',
);

[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].forEach((match) => {
  assert.doesNotMatch(
    match[1],
    /url\(\s*(?:["']\s*)?(?:https?:)?\/\//i,
    '报告不应包含外部 CSS 资源',
  );
});

console.log('报告校验通过');
