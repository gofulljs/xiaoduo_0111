(function attachTicketAnalysis(root, factory) {
  const ticketAnalysis = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = ticketAnalysis;
  }

  if (root) {
    root.TicketAnalysis = ticketAnalysis;
    root.addEventListener('DOMContentLoaded', ticketAnalysis.initializeApp);
  }
})(typeof window === 'undefined' ? null : window, function createTicketAnalysis() {
  const priorityNames = ['高', '中', '低'];
  const statusNames = ['已解决', '未解决'];
  const chartColors = ['#37e0d0', '#ff9f43', '#ff6f61', '#4e9bd4', '#b9dbe8', '#94b5c8'];

  function validateTickets(tickets) {
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return { ok: false, error: '工单数组无效' };
    }

    const validators = [
      ['ticket_id', (value) => typeof value === 'string' && value.trim()],
      ['created_at', isValidCreatedAt],
      ['category', (value) => typeof value === 'string' && value.trim()],
      ['priority', (value) => priorityNames.includes(value)],
      ['resolution_time_hours', (value) => Number.isFinite(value) && value >= 0],
      ['satisfaction', (value) => Number.isFinite(value) && value >= 1 && value <= 5],
      ['channel', (value) => typeof value === 'string' && value.trim()],
      ['is_resolved', (value) => typeof value === 'boolean'],
    ];

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index];
      const invalidField = validators.find(([field, isValid]) => !ticket || !isValid(ticket[field]));

      if (invalidField) {
        return { ok: false, error: `第 ${index + 1} 条工单的 ${invalidField[0]} 无效` };
      }
    }

    return { ok: true, tickets };
  }

  function analyzeTickets(tickets) {
    const validation = validateTickets(tickets);

    if (!validation.ok) {
      return validation;
    }

    const total = tickets.length;
    const dates = tickets.map((ticket) => getDateKey(ticket.created_at));
    const unresolved = tickets.filter((ticket) => !ticket.is_resolved).length;
    const highPriority = tickets.filter((ticket) => ticket.priority === '高').length;
    const averageHours = round(tickets.reduce((sum, ticket) => sum + ticket.resolution_time_hours, 0) / total);
    const averageSatisfaction = round(tickets.reduce((sum, ticket) => sum + ticket.satisfaction, 0) / total);
    const trend = buildTrend(dates);
    const distributions = {
      category: buildDistribution(tickets, 'category'),
      priority: buildDistribution(tickets, 'priority', priorityNames),
      status: buildDistribution(tickets, 'is_resolved', statusNames, (value) => (value ? '已解决' : '未解决')),
      channel: buildDistribution(tickets, 'channel'),
    };
    const categories = buildGroupStats(tickets, 'category');
    const channels = buildGroupStats(tickets, 'channel');

    return {
      summary: { total, startDate: [...dates].sort()[0], endDate: [...dates].sort().at(-1), unresolved, unresolvedRate: rate(unresolved, total), averageHours, averageSatisfaction, highPriority },
      trend,
      distributions,
      categories,
      channels,
      insights: {
        structure: categories[0],
        unresolved: [...categories].sort(compareUnresolved)[0],
        channel: [...channels].sort(compareChannel)[0],
        trend: buildTrendInsight(trend),
      },
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function renderReport(analysis) {
    const { summary, trend, distributions, categories, channels, insights } = analysis;
    const lowestSatisfaction = [...channels].sort((left, right) => left.averageSatisfaction - right.averageSatisfaction || left.name.localeCompare(right.name, 'zh-CN'))[0];
    const peak = trend.reduce((currentPeak, point) => point.count > currentPeak.count ? point : currentPeak, trend[0]);
    const trendMessage = getTrendMessage(insights.trend);

    return `
      <section class="metrics" aria-label="核心指标">
        ${renderMetric('工单总量', `${summary.total} 条`)}
        ${renderMetric('未解决率', `${summary.unresolved} / ${summary.total} · ${summary.unresolvedRate}%`, true)}
        ${renderMetric('平均处理时长', `${summary.averageHours.toFixed(2)} 小时`)}
        ${renderMetric('平均满意度', `${summary.averageSatisfaction.toFixed(2)} / 5`)}
        ${renderMetric('高优先级工单', `${summary.highPriority} / ${summary.total}`, true)}
      </section>
      <section class="grid">
        <article class="panel">
          <div class="eyebrow">Volume Signal</div>
          <h2>每日工单量</h2>
          ${renderTrendChart(trend)}
          <p class="insight">统计范围为 ${escapeHtml(summary.startDate)} 至 ${escapeHtml(summary.endDate)}；峰值出现在 ${escapeHtml(formatDate(peak.date))}，共 ${escapeHtml(peak.count)} 条。${escapeHtml(trendMessage)}</p>
        </article>
        <article class="panel">
          <div class="eyebrow">Channel Watch</div>
          <h2>${escapeHtml(lowestSatisfaction.name)}渠道</h2>
          <p class="note">该渠道平均满意度最低，建议结合未解决工单与处理时长复盘升级和转派流程。</p>
          <div class="channel-stats">
            ${renderChannelStat('工单量', `${lowestSatisfaction.count} 条`)}
            ${renderChannelStat('未解决', lowestSatisfaction.unresolved)}
            ${renderChannelStat('平均处理时长', `${lowestSatisfaction.averageHours.toFixed(2)} 小时`)}
            ${renderChannelStat('平均满意度', `${lowestSatisfaction.averageSatisfaction.toFixed(2)} / 5`)}
          </div>
        </article>
      </section>
      <section aria-labelledby="distribution-title">
        <div class="eyebrow">Distribution Snapshot</div>
        <h2 id="distribution-title">维度分布与结论</h2>
        <div class="distribution-grid">
          ${renderDonut('问题分类', distributions.category)}
          ${renderDonut('优先级', distributions.priority)}
          ${renderDonut('解决状态', distributions.status)}
          ${renderDonut('来源渠道', distributions.channel)}
        </div>
      </section>
      <section class="panel" aria-labelledby="quality-title">
        <div class="eyebrow">Service Quality</div>
        <h2 id="quality-title">服务质量表</h2>
        <div class="table-wrap">
          <table>
            <caption>按分类汇总工单数量、优先级、解决状态、平均处理时长和平均满意度。</caption>
            <thead><tr><th>问题类别</th><th>工单量</th><th>高优先级</th><th>未解决</th><th>平均处理时长</th><th>平均满意度</th></tr></thead>
            <tbody>${categories.map((category) => `<tr><td>${escapeHtml(category.name)}</td><td>${escapeHtml(category.count)}</td><td>${escapeHtml(category.highPriority)}</td><td>${escapeHtml(category.unresolved)}</td><td>${escapeHtml(category.averageHours.toFixed(2))}h</td><td>${escapeHtml(category.averageSatisfaction.toFixed(2))}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="alerts-title" style="margin-top:18px">
        <div class="eyebrow">Action Queue</div>
        <h2 id="alerts-title">动态结论与处置建议</h2>
        <div class="alerts">
          ${renderConclusion('结构优先级', `${insights.structure.name}工单量最高，共 ${insights.structure.count} 条，其中 ${insights.structure.highPriority} 条为高优先级。`)}
          ${renderConclusion('未解决风险', `${insights.unresolved.name}有 ${insights.unresolved.unresolved} 条未解决，建议优先核查积压与升级时限。`)}
          ${renderConclusion('渠道体验', `${insights.channel.name}渠道未解决率为 ${rate(insights.channel.unresolved, insights.channel.count)}%，平均满意度 ${insights.channel.averageSatisfaction.toFixed(2)}。`)}
          ${renderConclusion('趋势信号', trendMessage)}
        </div>
      </section>
      <footer><p>数据仅在当前浏览器中读取和分析，不会上传。样本覆盖 ${escapeHtml(summary.startDate)} 至 ${escapeHtml(summary.endDate)} 共 ${escapeHtml(summary.total)} 条工单，不能据此推断长期季节性。</p></footer>
    `;
  }

  function initializeApp() {
    const exampleButton = document.getElementById('load-example');
    const fileButton = document.getElementById('load-file');
    const fileInput = document.getElementById('ticket-file');
    const status = document.getElementById('load-status');
    const report = document.getElementById('report');

    const setStatus = (message) => { status.textContent = message; };
    const showError = (error) => { setStatus(`加载失败：${error}`); };
    const loadExample = async () => {
      setStatus('正在加载内置示例…');
      try {
        const response = await fetch('./data/example-tickets.json');
        if (!response.ok) throw new Error(`内置示例请求失败（${response.status}）`);
        await loadTickets(await response.text(), '内置示例', report, setStatus);
      } catch (error) {
        showError(error.message || '无法读取内置示例');
      }
    };

    exampleButton.addEventListener('click', loadExample);
    fileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => loadTickets(reader.result, file.name, report, setStatus);
      reader.onerror = () => showError('无法读取所选文件');
      reader.readAsText(file);
    });
    loadExample();
  }

  function loadTickets(text, sourceName, report, setStatus) {
    try {
      const tickets = JSON.parse(text);
      const analysis = analyzeTickets(tickets);
      if (!analysis.ok && analysis.error) throw new Error(analysis.error);
      report.innerHTML = renderReport(analysis);
      setStatus(`已加载 ${sourceName}：${analysis.summary.total} 条工单。`);
      return analysis;
    } catch (error) {
      setStatus(`加载失败：${error.message || 'JSON 格式无效'}`);
      return null;
    }
  }

  function renderMetric(label, value, isRisk = false) {
    return `<article class="metric${isRisk ? ' risk' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function renderChannelStat(label, value) {
    return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderConclusion(title, content) {
    return `<article class="alert"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p></article>`;
  }

  function renderTrendChart(trend) {
    const width = 660;
    const left = 38;
    const bottom = 165;
    const chartWidth = 594;
    const maxCount = Math.max(...trend.map((point) => point.count), 1);
    const points = trend.map((point, index) => ({ ...point, x: left + (trend.length === 1 ? chartWidth / 2 : (chartWidth / (trend.length - 1)) * index), y: bottom - (point.count / maxCount) * 120 }));
    const ariaLabel = `每日工单量趋势：${trend.map((point) => `${formatDate(point.date)} ${point.count}条`).join('，')}。`;
    return `<svg class="chart" viewBox="0 0 ${width} 210" role="img" aria-label="${escapeHtml(ariaLabel)}"><line class="axis" x1="${left}" y1="${bottom}" x2="632" y2="${bottom}"/><line class="axis" x1="${left}" y1="45" x2="${left}" y2="${bottom}"/><text x="12" y="${bottom + 3}">0</text><text x="8" y="48">${escapeHtml(maxCount)}</text><polyline class="trend" points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}"/>${points.map((point) => `<circle class="dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"/>`).join('')}${points.map((point) => `<text x="${(point.x - 10).toFixed(1)}" y="190">${escapeHtml(formatShortDate(point.date))}</text>`).join('')}</svg>`;
  }

  function renderDonut(title, stats) {
    let offset = 0;
    const ariaLabel = `${title}分布：${stats.map((item) => `${item.name}${item.count}条占${item.rate}%`).join('、')}。`;
    const slices = stats.map((item, index) => {
      const color = chartColors[index % chartColors.length];
      const slice = `<circle cx="60" cy="60" r="46" pathLength="100" stroke="${color}" stroke-dasharray="${item.rate} ${100 - item.rate}" stroke-dashoffset="${-offset}"/>`;
      offset += item.rate;
      return slice;
    }).join('');
    return `<article class="panel distribution-card"><h3>${escapeHtml(title)}分布</h3><div class="distribution-content"><svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(ariaLabel)}"><circle class="track" cx="60" cy="60" r="46" pathLength="100"/>${slices}</svg><ul class="legend">${stats.map((item, index) => `<li><i class="legend-swatch" style="background:${chartColors[index % chartColors.length]}" aria-hidden="true"></i>${escapeHtml(item.name)} ${escapeHtml(item.count)} · ${escapeHtml(item.rate)}%</li>`).join('')}</ul></div><p class="conclusion">${escapeHtml(getDistributionConclusion(title, stats))}</p></article>`;
  }

  function getDistributionConclusion(title, stats) {
    const first = stats[0];
    return `${title}中“${first.name}”占比最高，为 ${first.count} 条（${first.rate}%）。`;
  }

  function getTrendMessage(insight) {
    if (insight.status === 'growth') return `近三日平均量较此前三日增长 ${insight.changeRate.toFixed(2)}%，需关注增量压力。`;
    if (insight.status === 'decline') return `近三日平均量较此前三日下降 ${Math.abs(insight.changeRate).toFixed(2)}%，仍应持续观察。`;
    if (insight.status === 'stable') return `近三日平均量与此前三日基本持平，变化 ${insight.changeRate.toFixed(2)}%。`;
    return '可用日期不足六天，暂不判断短期趋势。';
  }

  function formatDate(date) { return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`; }
  function formatShortDate(date) { return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`; }
  function getDateKey(value) { return value.slice(0, 10); }

  function isValidCreatedAt(value) {
    if (typeof value !== 'string') return false;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
    if (!match) return false;
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, 0, 0);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date.getUTCHours() === hour && date.getUTCMinutes() === minute;
  }

  function buildTrend(dates) {
    const counts = new Map();
    dates.forEach((date) => counts.set(date, (counts.get(date) || 0) + 1));
    return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count }));
  }

  function buildDistribution(tickets, field, fixedNames, getName = (value) => value) {
    const counts = new Map();
    tickets.forEach((ticket) => { const name = getName(ticket[field]); counts.set(name, (counts.get(name) || 0) + 1); });
    const names = fixedNames || [...counts.keys()].sort((left, right) => counts.get(right) - counts.get(left) || left.localeCompare(right, 'zh-CN'));
    return names.map((name) => ({ name, count: counts.get(name) || 0, rate: rate(counts.get(name) || 0, tickets.length) }));
  }

  function buildGroupStats(tickets, field) {
    const groups = new Map();
    tickets.forEach((ticket) => {
      const group = groups.get(ticket[field]) || { name: ticket[field], count: 0, unresolved: 0, highPriority: 0, totalHours: 0, totalSatisfaction: 0 };
      group.count += 1; group.unresolved += Number(!ticket.is_resolved); group.highPriority += Number(ticket.priority === '高'); group.totalHours += ticket.resolution_time_hours; group.totalSatisfaction += ticket.satisfaction;
      groups.set(ticket[field], group);
    });
    return [...groups.values()].map((group) => ({ name: group.name, count: group.count, unresolved: group.unresolved, highPriority: group.highPriority, averageHours: round(group.totalHours / group.count), averageSatisfaction: round(group.totalSatisfaction / group.count) })).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
  }

  function buildTrendInsight(trend) {
    if (trend.length < 6) return { status: 'insufficient' };
    const previousAverage = average(trend.slice(-6, -3).map((point) => point.count));
    const recentAverage = average(trend.slice(-3).map((point) => point.count));
    const changeRate = previousAverage === 0 ? (recentAverage === 0 ? 0 : Infinity) : ((recentAverage - previousAverage) / previousAverage) * 100;
    return { status: changeRate >= 20 ? 'growth' : changeRate <= -20 ? 'decline' : 'stable', previousAverage: round(previousAverage), recentAverage: round(recentAverage), changeRate: Number.isFinite(changeRate) ? round(changeRate) : changeRate };
  }

  function compareUnresolved(left, right) { return right.unresolved - left.unresolved || right.unresolved / right.count - left.unresolved / left.count || right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'); }
  function compareChannel(left, right) { return right.unresolved / right.count - left.unresolved / left.count || right.averageHours - left.averageHours || left.averageSatisfaction - right.averageSatisfaction || left.name.localeCompare(right.name, 'zh-CN'); }
  function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  function rate(value, total) { return round((value / total) * 100); }
  function round(value) { return Number(value.toFixed(2)); }

  return { validateTickets, analyzeTickets, escapeHtml, renderReport, initializeApp, loadTickets };
});
