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
const refundAverageSatisfaction = refunds.reduce(
  (total, ticket) => total + ticket.satisfaction,
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
const refundUnresolvedTickets = refunds.filter((ticket) => !ticket.is_resolved);
const telephoneUnresolvedTickets = telephone.filter((ticket) => !ticket.is_resolved);
const ticketT050 = tickets.find((ticket) => ticket.ticket_id === 'T050');
const unresolvedRate = Math.round((unresolvedTickets.length / tickets.length) * 100);
const paymentHighPriorityRate = (
  (paymentHighPriorityTickets.length / payments.length) * 100
).toFixed(1);
const refundUnresolvedRate = (
  (refundUnresolvedTickets.length / refunds.length) * 100
).toFixed(1);
const dailyCounts = [...Array(11)].map((_, index) => {
  const day = String(index + 1).padStart(2, '0');
  return tickets.filter((ticket) => ticket.created_at.startsWith(`2024-06-${day}`)).length;
});
const paymentTrendDays = [...Array(6)].map(
  (_, index) => `2024-06-${String(index + 6).padStart(2, '0')}`,
);
const paymentDailyCounts = paymentTrendDays.map(
  (day) => payments.filter((ticket) => ticket.created_at.startsWith(day)).length,
);
const getDistribution = (
  key,
  transform = (value) => value,
  compareNames = (left, right) => left.localeCompare(right, 'zh-CN'),
) => {
  const counts = new Map();

  tickets.forEach((ticket) => {
    const name = transform(ticket[key]);
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return [...counts]
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / tickets.length) * 100),
    }))
    .sort((left, right) => right.count - left.count || compareNames(left.name, right.name));
};
const categoryDistribution = getDistribution('category');
const priorityDistribution = getDistribution('priority');
const statusDistribution = getDistribution(
  'is_resolved',
  (isResolved) => (isResolved ? '已解决' : '未解决'),
).sort(
  (left, right) => ['已解决', '未解决'].indexOf(left.name) - ['已解决', '未解决'].indexOf(right.name),
);
const channelDistribution = getDistribution('channel');
const getDistributionItem = (distribution, name) => {
  const item = distribution.find((stat) => stat.name === name);

  assert.ok(item, `源数据分布缺少“${name}”`);
  return item;
};
const paymentCategoryDistribution = getDistributionItem(categoryDistribution, '支付问题');
const refundCategoryDistribution = getDistributionItem(categoryDistribution, '退款退货');
const highPriorityDistribution = getDistributionItem(priorityDistribution, '高');
const telephoneDistribution = getDistributionItem(channelDistribution, '电话');
const refundShareOfUnresolved = (refundUnresolvedTickets.length / unresolvedTickets.length) * 100;
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
assert.equal(refundUnresolvedTickets.length, 5);
assert.equal(Number(refundAverageResolutionTime.toFixed(2)), 45.23);
assert.equal(Number(refundAverageSatisfaction.toFixed(2)), 2);
assert.equal(highPriorityTickets.length, 31);
assert.equal(telephone.length, 16);
assert.equal(telephoneUnresolvedTickets.length, 4);
assert.equal(Number(telephoneAverageResolutionTime.toFixed(2)), 31.63);
assert.equal(Number(telephoneAverageSatisfaction.toFixed(2)), 1.94);
assert.ok(ticketT050, '源数据缺少 T050');
assert.match(ticketT050.description, /扣了我299/);
assert.deepEqual(
  paymentDailyCounts.map((count) => count > 0),
  [true, true, true, true, true, true],
);
assert.equal(Math.max(...categoryStats.map((stats) => stats.total)), payments.length);
assert.equal(categoryStats.filter((stats) => stats.total === payments.length).length, 1);
assert.deepEqual(categoryDistribution, [
  { name: '支付问题', count: 16, percentage: 32 },
  { name: '退款退货', count: 13, percentage: 26 },
  { name: '物流查询', count: 8, percentage: 16 },
  { name: '商品咨询', count: 5, percentage: 10 },
  { name: '投诉', count: 4, percentage: 8 },
  { name: '账号问题', count: 4, percentage: 8 },
]);
assert.deepEqual(priorityDistribution, [
  { name: '高', count: 31, percentage: 62 },
  { name: '中', count: 13, percentage: 26 },
  { name: '低', count: 6, percentage: 12 },
]);
assert.deepEqual(statusDistribution, [
  { name: '已解决', count: 42, percentage: 84 },
  { name: '未解决', count: 8, percentage: 16 },
]);
assert.deepEqual(channelDistribution, [
  { name: '在线', count: 34, percentage: 68 },
  { name: '电话', count: 16, percentage: 32 },
]);
assert.equal(refundShareOfUnresolved, 62.5);

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

const getDistributionCard = (distribution) => {
  const pattern = new RegExp(
    `<article\\b(?=[^>]*\\bdata-distribution\\s*=\\s*["']${escapeRegExp(distribution)}["'])[^>]*>([\\s\\S]*?)<\\/article>`,
    'i',
  );
  const match = html.match(pattern);

  assert.ok(match, `报告缺少 data-distribution="${distribution}" 卡片`);
  return match[1];
};

const getTagAttribute = (tag, attribute) => {
  const match = tag.match(
    new RegExp(`\\b${escapeRegExp(attribute)}\\s*=\\s*["']([^"']*)["']`, 'i'),
  );

  return match?.[1];
};

const assertDistributionCard = (distribution, dimensionName, stats, conclusion) => {
  const card = getDistributionCard(distribution);
  const svg = card.match(
    /<svg\b(?=[^>]*\brole\s*=\s*["']img["'])[^>]*>([\s\S]*?)<\/svg>/i,
  );
  const legend = card.match(/<ul\b(?=[^>]*\bclass\s*=\s*["']legend["'])[^>]*>([\s\S]*?)<\/ul>/i);
  const conclusionElement = card.match(
    /<[^>]*\bclass\s*=\s*["']conclusion["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
  );

  assert.ok(svg, `data-distribution="${distribution}" 卡片缺少 role="img" SVG`);
  const ariaLabel = getTagAttribute(svg[0], 'aria-label');
  assert.ok(ariaLabel, `data-distribution="${distribution}" 卡片 SVG 缺少 aria-label`);
  assert.ok(
    ariaLabel.includes(dimensionName) && ariaLabel.includes('分布'),
    `data-distribution="${distribution}" 卡片 SVG aria-label 必须包含“${dimensionName}”和“分布”`,
  );
  stats.forEach(({ name, count, percentage }) => {
    const description = `${name}${count}条占${percentage}%`;

    assert.ok(
      ariaLabel.includes(description),
      `data-distribution="${distribution}" 卡片 SVG aria-label 缺少“${description}”`,
    );
  });
  assert.ok(legend, `data-distribution="${distribution}" 卡片缺少 <ul class="legend"> 图例`);
  const legendItems = [...legend[1].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)].map((match) => ({
    tag: `<li${match[1]}>`,
    content: match[2],
    text: match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  }));
  const slices = [...svg[1].matchAll(/<circle\b[^>]*>/gi)].filter((match) =>
    getTagAttribute(match[0], 'class')?.split(/\s+/).includes('slice'),
  );
  assert.equal(
    legendItems.length,
    stats.length,
    `data-distribution="${distribution}" 卡片图例项目数应与源数据一致`,
  );
  assert.deepEqual(
    legendItems.map((item) => item.text),
    stats.map(({ name, count, percentage }) => `${name} ${count} · ${percentage}%`),
    `data-distribution="${distribution}" 卡片每个图例项目必须精确对应源数据`,
  );
  assert.equal(
    slices.length,
    stats.length,
    `data-distribution="${distribution}" 卡片扇区数量应与源数据一致`,
  );
  assert.deepEqual(
    slices.map((match) => getTagAttribute(match[0], 'data-segment')),
    stats.map(({ name }) => name),
    `data-distribution="${distribution}" 卡片扇区顺序必须与源数据一致`,
  );
  let accumulatedPercentage = 0;
  stats.forEach(({ name, percentage }) => {
    const slice = slices.find(
      (match) => getTagAttribute(match[0], 'data-segment') === name,
    )?.[0];
    const legendItem = legendItems.find(
      (item) => getTagAttribute(item.tag, 'data-segment') === name,
    );

    assert.ok(slice, `data-distribution="${distribution}" 缺少“${name}”扇区`);
    assert.ok(legendItem, `data-distribution="${distribution}" 缺少“${name}”图例`);
    assert.equal(getTagAttribute(slice, 'pathLength'), '100', `“${name}”扇区缺少 pathLength="100"`);
    const dasharray = getTagAttribute(slice, 'stroke-dasharray');
    assert.ok(dasharray, `“${name}”扇区缺少 stroke-dasharray`);
    assert.equal(
      Number(dasharray.split(/[\s,]+/)[0]),
      percentage,
      `“${name}”扇区 stroke-dasharray 首段应为 ${percentage}`,
    );
    const dashoffset = getTagAttribute(slice, 'stroke-dashoffset');
    if (accumulatedPercentage === 0) {
      assert.ok(
        dashoffset === undefined || Number(dashoffset) === 0,
        `首个“${name}”扇区的 dashoffset 应为 0 或省略`,
      );
    } else {
      assert.equal(
        Number(dashoffset),
        -accumulatedPercentage,
        `“${name}”扇区 dashoffset 应为此前累计比例的负数`,
      );
    }
    const color = getTagAttribute(slice, 'data-color');
    assert.ok(color, `“${name}”扇区缺少 data-color`);
    assert.equal(
      getTagAttribute(slice, 'stroke'),
      color,
      `“${name}”扇区 stroke 必须与 data-color 一致`,
    );
    assert.equal(
      getTagAttribute(legendItem.tag, 'data-color'),
      color,
      `“${name}”图例 data-color 必须与扇区一致`,
    );
    const swatch = legendItem.content.match(/<i\b[^>]*>/i)?.[0];
    assert.ok(swatch, `“${name}”图例缺少可见色标 <i>`);
    const background = getTagAttribute(swatch, 'style')?.match(
      /\bbackground\s*:\s*([^;]+)/i,
    )?.[1].trim();
    assert.equal(
      background,
      color,
      `“${name}”图例色标背景必须与扇区一致`,
    );
    accumulatedPercentage += percentage;
  });
  assert.ok(conclusionElement, `data-distribution="${distribution}" 卡片缺少 .conclusion`);
  assert.equal(
    conclusionElement[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    conclusion,
    `data-distribution="${distribution}" 卡片结论必须精确一致`,
  );
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
assertDistributionCard(
  'category',
  '问题分类',
  categoryDistribution,
  `支付与退款退货合计 ${paymentCategoryDistribution.count + refundCategoryDistribution.count} 条、占 ${paymentCategoryDistribution.percentage + refundCategoryDistribution.percentage}%，应作为支付链路和退款时效治理的优先方向。`,
);
assertDistributionCard(
  'priority',
  '优先级',
  priorityDistribution,
  `高优先级占 ${highPriorityDistribution.percentage}%，主管应先保障风险工单的响应能力。`,
);
assertDistributionCard(
  'status',
  '解决状态',
  statusDistribution,
  `退款退货有 ${refundUnresolvedTickets.length} 条未解决，占未解决工单 ${refundShareOfUnresolved}%，应优先清理退款积压。`,
);
assertDistributionCard(
  'channel',
  '来源渠道',
  channelDistribution,
  `电话渠道仅占 ${telephoneDistribution.percentage}%，但平均处理时长 ${telephoneAverageResolutionTime.toFixed(2)} 小时、平均满意度 ${telephoneAverageSatisfaction.toFixed(2)}，均弱于总体水平。`,
);
const narrowScreenRule = html.match(/@media\s*\(\s*max-width\s*:\s*480px\s*\)\s*\{([\s\S]*?)\n\s*\}/i);
assert.ok(narrowScreenRule, '报告缺少最大 480px 的窄屏媒体查询');
assert.match(
  narrowScreenRule[1],
  /\.distribution-card\s*\{[^}]*grid-template-columns\s*:\s*1fr/i,
  '最大 480px 时 .distribution-card 必须改为单列',
);
assert.match(
  narrowScreenRule[1],
  /\.distribution-content\s*\{[^}]*flex-direction\s*:\s*column/i,
  '最大 480px 时分布内容必须纵向排列',
);
assert.match(
  narrowScreenRule[1],
  /\.donut\s*\{[^}]*margin\s*:\s*0\s+auto/i,
  '最大 480px 时 .donut 必须居中',
);
const telephoneChannelText = getElementText('data-channel', '电话');
assert.doesNotMatch(
  telephoneChannelText,
  /高复杂度诉求|复杂度/,
  '电话渠道区不应包含无字段依据的复杂度结论',
);

const serviceTable = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
assert.ok(serviceTable, '报告缺少服务质量表');
const serviceCaption = serviceTable[1].match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
assert.ok(serviceCaption, '服务质量表缺少 caption');
const captionText = serviceCaption[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
['按分类汇总', '工单数量', '优先级', '状态', '处理时长', '满意度'].forEach((value) => {
  assert.match(captionText, new RegExp(value), `服务质量表 caption 缺少“${value}”说明`);
});

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

[String(payments.length), String(paymentHighPriorityTickets.length), paymentHighPriorityRate].forEach(
  (value) => assert.match(paymentAlert, new RegExp(escapeRegExp(value))),
);
assert.match(paymentAlert, /T046/);
assert.match(paymentAlert, /重复扣款、扣款成功订单失败/);
assert.match(paymentAlert, new RegExp(`${ticketT050.ticket_id}[^。]{0,20}金额多扣`));
assert.doesNotMatch(
  paymentAlert,
  new RegExp(`${ticketT050.ticket_id}[^。]{0,40}重复扣款|重复扣款[^。]{0,40}${ticketT050.ticket_id}`),
  'T050 不应被表述为重复扣款案例',
);
[
  String(refunds.length),
  String(refundUnresolvedTickets.length),
  refundUnresolvedRate,
  refundAverageResolutionTime.toFixed(2),
  refundAverageSatisfaction.toFixed(2),
].forEach((value) => assert.match(refundAlert, new RegExp(escapeRegExp(value))));
assert.match(refundAlert, /T031.*T036.*T039.*T042.*T047/);
assert.match(refundAlert, /超时队列/);
[
  String(telephone.length),
  String(telephoneUnresolvedTickets.length),
  telephoneAverageResolutionTime.toFixed(2),
  telephoneAverageSatisfaction.toFixed(2),
].forEach((value) => assert.match(telephoneAlert, new RegExp(escapeRegExp(value))));
assert.match(telephoneAlert, /T019.*T031.*T039.*T047/);
assert.match(telephoneAlert, /包裹被退回.*退款处理一周仍未完成/);
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

assert.match(
  readme,
  /支付问题在 6 月 6 日至 11 日连续 6 天每日出现，共 16 条、为分类第一/,
  'README 缺少支付问题连续六天且分类第一的量化趋势',
);

assert.match(
  readme,
  /^静态报告入口：\[[^\]\r\n]+\]\(\.\/index\.html\)$/m,
  'README 缺少指向 ./index.html 的静态报告入口',
);

const getMarkdownSection = (title) => {
  const section = readme.match(
    new RegExp(`^## ${escapeRegExp(title)}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'),
  );

  assert.ok(section, `README 缺少“${title}”章节`);
  return section[1];
};

const dataScope = readme.match(/^本报告基于[^\n]*数据范围[^\n]*(?=\n\n|$)/m);
assert.ok(dataScope, 'README 缺少包含数据范围的分析依据段落');
['2024-06-01', '2024-06-11', '50'].forEach((value) => {
  assert.match(dataScope[0], new RegExp(escapeRegExp(value)), `数据范围缺少“${value}”`);
});

const anomalyCriteria = getMarkdownSection('异常口径');
['连续三天', '未解决率', '高于整体', '处理时长', '满意度'].forEach((condition) => {
  assert.match(anomalyCriteria, new RegExp(condition), `异常口径缺少“${condition}”条件`);
});

const pagesSection = getMarkdownSection('GitHub Pages');
['python3 -m http.server 8000 --directory doc', 'http://localhost:8000'].forEach((value) => {
  assert.match(pagesSection, new RegExp(escapeRegExp(value)), `Pages 章节缺少“${value}”`);
});

const getYamlBlock = (key) => {
  const block = pagesWorkflow.match(
    new RegExp(`^${escapeRegExp(key)}:\\n([\\s\\S]*?)(?=^[^\\s]|(?![\\s\\S]))`, 'm'),
  );

  assert.ok(block, `Pages 工作流缺少顶级 ${key} 块`);
  return block[1];
};

assert.match(
  pagesWorkflow,
  /^on:\n  push:\n    branches:\n      - master\n  workflow_dispatch:$/m,
  'Pages 工作流触发器必须包含 master push 和同级 workflow_dispatch',
);

const permissions = getYamlBlock('permissions');
assert.match(permissions, /^  contents: read$/m, 'Pages 工作流缺少 contents: read 权限');
assert.match(permissions, /^  pages: write$/m, 'Pages 工作流缺少 pages: write 权限');
assert.match(permissions, /^  id-token: write$/m, 'Pages 工作流缺少 id-token: write 权限');

assert.match(
  pagesWorkflow,
  /^jobs:\n  deploy:\n    environment:\n      name: github-pages\n      url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}$/m,
  'Pages 部署环境必须使用 deployment 输出 URL',
);

const concurrency = getYamlBlock('concurrency');
assert.match(concurrency, /^  group: pages$/m, 'Pages 并发组必须为 pages');
assert.match(concurrency, /^  cancel-in-progress: false$/m, 'Pages 发布不能取消进行中的任务');

assert.match(
  pagesWorkflow,
  /^      - name: Upload Pages artifact\n        uses: actions\/upload-pages-artifact@v3\n        with:\n          path: doc$/m,
  'Pages 构件上传必须在 with 块中指定 doc 路径',
);

[
  'actions/checkout@v7',
  'actions/configure-pages@v5',
  'actions/upload-pages-artifact@v3',
  'actions/deploy-pages@v4',
].forEach((action) => {
  assert.match(
    pagesWorkflow,
    new RegExp(`^        uses: ${escapeRegExp(action)}$`, 'm'),
    `Pages 工作流缺少 ${action}`,
  );
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
  assert.doesNotMatch(
    match[1],
    /@import\s+(?:url\(\s*)?(?:["']\s*)?(?:https?:)?\/\//i,
    '报告不应通过 @import 引入外部 CSS 资源',
  );
});
assert.doesNotMatch(
  html,
  /\bstyle\s*=\s*["'][^"']*url\(\s*(?:["']\s*)?(?:https?:)?\/\//i,
  '报告不应在内联 style 中引用外部资源',
);

console.log('报告校验通过');
