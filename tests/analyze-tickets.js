const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { analyzeTickets, validateTickets } = require('../doc/app.js');

const projectRoot = path.resolve(__dirname, '..');
const tickets = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'source/task5_tickets.json'), 'utf8'),
);

assert.deepEqual(validateTickets(tickets), { ok: true, tickets });

const invalidCreatedAt = tickets.map((ticket) => ({ ...ticket }));
invalidCreatedAt[2].created_at = 'not-a-date';
assert.deepEqual(validateTickets(invalidCreatedAt), {
  ok: false,
  error: '第 3 条工单的 created_at 无效',
});

const analysis = analyzeTickets(tickets);

assert.deepEqual(analysis.summary, {
  total: 50,
  startDate: '2024-06-01',
  endDate: '2024-06-11',
  unresolved: 8,
  unresolvedRate: 16,
  averageHours: 19.69,
  averageSatisfaction: 2.36,
  highPriority: 31,
});
assert.deepEqual(analysis.trend, [
  { date: '2024-06-01', count: 3 },
  { date: '2024-06-02', count: 3 },
  { date: '2024-06-03', count: 4 },
  { date: '2024-06-04', count: 5 },
  { date: '2024-06-05', count: 4 },
  { date: '2024-06-06', count: 5 },
  { date: '2024-06-07', count: 5 },
  { date: '2024-06-08', count: 5 },
  { date: '2024-06-09', count: 5 },
  { date: '2024-06-10', count: 6 },
  { date: '2024-06-11', count: 5 },
]);
assert.deepEqual(analysis.distributions.priority, [
  { name: '高', count: 31, rate: 62 },
  { name: '中', count: 13, rate: 26 },
  { name: '低', count: 6, rate: 12 },
]);
assert.deepEqual(analysis.distributions.status, [
  { name: '已解决', count: 42, rate: 84 },
  { name: '未解决', count: 8, rate: 16 },
]);
assert.deepEqual(analysis.distributions.category.slice(0, 2), [
  { name: '支付问题', count: 16, rate: 32 },
  { name: '退款退货', count: 13, rate: 26 },
]);
assert.deepEqual(analysis.distributions.channel, [
  { name: '在线', count: 34, rate: 68 },
  { name: '电话', count: 16, rate: 32 },
]);
assert.deepEqual(analysis.categories.slice(0, 2), [
  {
    name: '支付问题',
    count: 16,
    unresolved: 1,
    highPriority: 14,
    averageHours: 5.25,
    averageSatisfaction: 2.25,
  },
  {
    name: '退款退货',
    count: 13,
    unresolved: 5,
    highPriority: 7,
    averageHours: 45.23,
    averageSatisfaction: 2,
  },
]);
assert.deepEqual(analysis.channels, [
  {
    name: '在线',
    count: 34,
    unresolved: 4,
    highPriority: 17,
    averageHours: 14.07,
    averageSatisfaction: 2.56,
  },
  {
    name: '电话',
    count: 16,
    unresolved: 4,
    highPriority: 14,
    averageHours: 31.63,
    averageSatisfaction: 1.94,
  },
]);
assert.equal(analysis.insights.structure.name, '支付问题');
assert.equal(analysis.insights.unresolved.name, '退款退货');
assert.equal(analysis.insights.channel.name, '电话');
assert.equal(analysis.insights.trend.status, 'stable');

console.log('动态分析校验通过');
