(function attachTicketAnalysis(root, factory) {
  const ticketAnalysis = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = ticketAnalysis;
  }

  if (root) {
    root.TicketAnalysis = ticketAnalysis;
  }
})(typeof window === 'undefined' ? null : window, function createTicketAnalysis() {
  const priorityNames = ['高', '中', '低'];
  const statusNames = ['已解决', '未解决'];

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
    const averageHours = round(
      tickets.reduce((sum, ticket) => sum + ticket.resolution_time_hours, 0) / total,
    );
    const averageSatisfaction = round(
      tickets.reduce((sum, ticket) => sum + ticket.satisfaction, 0) / total,
    );
    const trend = buildTrend(dates);
    const distributions = {
      category: buildDistribution(tickets, 'category'),
      priority: buildDistribution(tickets, 'priority', priorityNames),
      status: buildDistribution(
        tickets,
        'is_resolved',
        statusNames,
        (value) => (value ? '已解决' : '未解决'),
      ),
      channel: buildDistribution(tickets, 'channel'),
    };
    const categories = buildGroupStats(tickets, 'category');
    const channels = buildGroupStats(tickets, 'channel');

    return {
      summary: {
        total,
        startDate: [...dates].sort()[0],
        endDate: [...dates].sort().at(-1),
        unresolved,
        unresolvedRate: rate(unresolved, total),
        averageHours,
        averageSatisfaction,
        highPriority,
      },
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

  function getDateKey(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function isValidCreatedAt(value) {
    if (typeof value !== 'string') {
      return false;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);

    if (!match) {
      return false;
    }

    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, 0, 0);

    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
      && date.getUTCHours() === hour
      && date.getUTCMinutes() === minute;
  }

  function buildTrend(dates) {
    const counts = new Map();

    dates.forEach((date) => counts.set(date, (counts.get(date) || 0) + 1));
    return [...counts]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, count]) => ({ date, count }));
  }

  function buildDistribution(tickets, field, fixedNames, getName = (value) => value) {
    const counts = new Map();

    tickets.forEach((ticket) => {
      const name = getName(ticket[field]);
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    const names = fixedNames || [...counts.keys()].sort((left, right) => {
      const difference = counts.get(right) - counts.get(left);
      return difference || left.localeCompare(right, 'zh-CN');
    });

    return names.map((name) => ({
      name,
      count: counts.get(name) || 0,
      rate: rate(counts.get(name) || 0, tickets.length),
    }));
  }

  function buildGroupStats(tickets, field) {
    const groups = new Map();

    tickets.forEach((ticket) => {
      const name = ticket[field];
      const group = groups.get(name) || {
        name,
        count: 0,
        unresolved: 0,
        highPriority: 0,
        totalHours: 0,
        totalSatisfaction: 0,
      };

      group.count += 1;
      group.unresolved += Number(!ticket.is_resolved);
      group.highPriority += Number(ticket.priority === '高');
      group.totalHours += ticket.resolution_time_hours;
      group.totalSatisfaction += ticket.satisfaction;
      groups.set(name, group);
    });

    return [...groups.values()]
      .map((group) => ({
        name: group.name,
        count: group.count,
        unresolved: group.unresolved,
        highPriority: group.highPriority,
        averageHours: round(group.totalHours / group.count),
        averageSatisfaction: round(group.totalSatisfaction / group.count),
      }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'));
  }

  function buildTrendInsight(trend) {
    if (trend.length < 6) {
      return { status: 'insufficient' };
    }

    const previousAverage = average(trend.slice(-6, -3).map((point) => point.count));
    const recentAverage = average(trend.slice(-3).map((point) => point.count));
    const changeRate = previousAverage === 0
      ? (recentAverage === 0 ? 0 : Infinity)
      : ((recentAverage - previousAverage) / previousAverage) * 100;
    const status = changeRate >= 20 ? 'growth' : changeRate <= -20 ? 'decline' : 'stable';

    return {
      status,
      previousAverage: round(previousAverage),
      recentAverage: round(recentAverage),
      changeRate: Number.isFinite(changeRate) ? round(changeRate) : changeRate,
    };
  }

  function compareUnresolved(left, right) {
    const leftRate = left.unresolved / left.count;
    const rightRate = right.unresolved / right.count;
    return right.unresolved - left.unresolved || rightRate - leftRate || right.count - left.count || left.name.localeCompare(right.name, 'zh-CN');
  }

  function compareChannel(left, right) {
    const leftRate = left.unresolved / left.count;
    const rightRate = right.unresolved / right.count;
    return rightRate - leftRate || right.averageHours - left.averageHours || left.averageSatisfaction - right.averageSatisfaction || left.name.localeCompare(right.name, 'zh-CN');
  }

  function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function rate(value, total) {
    return round((value / total) * 100);
  }

  function round(value) {
    return Number(value.toFixed(2));
  }

  return { validateTickets, analyzeTickets };
});
