# 客服工单趋势分析

基于客服工单数据的浏览器端趋势与异常分析工具。页面可直接加载内置样例或用户选择的本地 JSON 文件，在浏览器内重算指标、图表、异常信号和处置建议。

## 在线访问

GitHub Pages：<https://gofulljs.github.io/xiaoduo_0111/>

若页面暂未可访问，请确认仓库的 **Settings → Pages → Build and deployment** 已选择 **GitHub Actions**，再在 Actions 中重新运行 `Deploy GitHub Pages` 工作流。

## 功能

- 加载 `doc/data/example-tickets.json` 中的内置 50 条样例。
- 选择本地 JSON 文件进行动态分析；数据仅在当前浏览器处理，不会上传。
- 校验工单字段、类型和日期；无效文件会显示具体错误并保留上一次有效报告。
- 展示核心指标、按日趋势、问题分类、优先级、解决状态、渠道分布、服务质量表和异常处置建议。

## 分析维度

| 维度 | 关注指标 | 决策价值 |
| --- | --- | --- |
| 时间趋势 | 每日工单量、最近三日与此前三日日均量 | 识别短期变化，辅助排班和资源准备。 |
| 问题结构 | 分类数量、占比、高优先级占比 | 定位主要业务问题，安排专项排查。 |
| 处置效率 | 未解决率、平均处理时长、满意度 | 发现当前未解决风险和服务体验问题。 |
| 渠道体验 | 渠道数量、处理时长、满意度 | 比较线上与人工渠道，优化升级和转派流程。 |

## 样例结论

内置样例覆盖 2024-06-01 至 2024-06-11 的 50 条工单：

- 支付问题 16 条，占 32%，其中 14 条高优先级，是规模和紧急度最高的分类。
- 退款退货 13 条，其中 5 条未解决，未解决率 38.5%，平均处理时长 45.23 小时。
- 高优先级工单 31 条，占 62%，需要优先保障响应能力。
- 电话渠道 16 条，平均处理时长 31.63 小时、满意度 1.94，均弱于总体水平。
- 最后六天的日工单量维持在 5 至 6 条。该结论是短期观察，不构成长期预测。

## 异常规则

页面按当前加载样本自动生成以下信号：

- 数量最多的分类及其高优先级占比。
- 有未解决工单的分类中未解决率最高的项目。
- 满意度最低的来源渠道。
- 至少有 6 个日期时，比较最近三日与此前三日日均量：变化达到 20% 标记为增长或下降，否则标记为稳定；日期不足时明确提示样本不足。

这些规则用于样本内风险排序，不代表因果关系、增长预测或季节性预测。

## 数据格式

加载文件必须是非空 JSON 数组，且每条工单包含：

```json
{
  "ticket_id": "T001",
  "created_at": "2024-06-01 09:15",
  "category": "退款退货",
  "description": "退货申请提交一周了还在审核中",
  "priority": "高",
  "resolution_time_hours": 72,
  "satisfaction": 2,
  "channel": "在线",
  "is_resolved": true
}
```

`priority` 仅允许 `高`、`中`、`低`；`resolution_time_hours` 必须为非负数；`satisfaction` 为 1 至 5；`is_resolved` 必须为布尔值。`description` 可省略。

## 本地运行与测试

内置示例通过 `fetch` 加载，需要经 HTTP 服务访问：

```bash
python3 -m http.server 8000 --directory doc
```

打开 <http://localhost:8000>。

运行校验：

```bash
node tests/analyze-tickets.js
node tests/verify-report.js
```

## GitHub Pages 部署

工作流位于 `.github/workflows/deploy-pages.yml`，推送到 `master` 后会部署 `doc/`：

1. 在仓库 **Settings → Pages** 中选择 **GitHub Actions**。
2. 推送 `master`，或在 **Actions → Deploy GitHub Pages** 中手动触发。
3. 工作流成功后，访问 Pages 地址。

若 `Configure Pages` 步骤失败，通常是 Pages 发布源尚未设置为 GitHub Actions；完成上述设置后重新运行工作流。

## AI 工具使用情况

AI 用于梳理需求、设计页面信息架构、生成初稿和辅助测试。所有页面统计、异常结论和图表数据均由浏览器中的分析逻辑从加载的 JSON 实时计算，测试使用题目源数据校验。
