const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function changeClass(change) {
  if (change > 0) return "rise";
  if (change < 0) return "fall";
  return "flat";
}

function prepareIndicators(list) {
  return list.map(function (indicator) {
    return Object.assign({}, indicator, {
      dataAvailable: indicator.dataAvailable !== false,
      lastKnownText: indicator.value ? "最近数据：" + indicator.dataPeriod : "最近数据暂未提供",
      changeText: (indicator.change > 0 ? "+" : "") + indicator.change.toFixed(1) + "%",
      changeClass: changeClass(indicator.change),
      rangeOptions: indicator.ranges || [1, 3],
      defaultRange: indicator.defaultRange || 3
    });
  });
}

// mock data - 后续替换为官方 API 数据
const recentIndicators = prepareIndicators([
  {
    id: "house", name: "房价", icon: "🏠", subtitle: "上海二手房", compareText: "比上个月",
    value: "-0.5%", change: -0.5, simpleText: "比上个月便宜了一点", dataPeriod: "2026年8月",
    updateFrequency: "每月更新", source: "国家统计局", chartYears: 3,
    voteQuestion: "你觉得接下来房价会怎么走？",
    voteOptions: [{ key: "up", label: "上涨", percent: 28 }, { key: "flat", label: "变化不大", percent: 46 }, { key: "down", label: "下跌", percent: 26 }],
    history: {
      oneYear: [312, 310, 309, 308, 306, 305, 304, 303, 302, 301, 300, 298],
      threeYears: [338, 342, 335, 329, 321, 326, 315, 312, 309, 305, 302, 298],
      fiveYears: [280, 295, 310, 338, 321, 315, 309, 298]
    },
    chartExplain: "最近几年有上涨也有回落，目前比前几年高点低一些。"
  },
  {
    id: "fuel", name: "油价", icon: "⛽", subtitle: "国内92#汽油", compareText: "比上次调整",
    value: "7.88 元/升", change: 0.2, simpleText: "最近又贵了一些", dataPeriod: "2026年9月9日",
    updateFrequency: "按调价周期更新", source: "公开成品油价格资料", chartYears: 3,
    voteQuestion: "你觉得下次油价会怎么走？",
    voteOptions: [{ key: "up", label: "上涨", percent: 62 }, { key: "flat", label: "变化不大", percent: 24 }, { key: "down", label: "下跌", percent: 14 }],
    history: { oneYear: [7.6, 7.8, 7.7, 7.9, 8.1, 8.0, 7.9, 7.8, 7.7, 7.8, 7.86, 7.88], threeYears: [6.9, 7.1, 7.5, 8.2, 8.8, 8.5, 8.9, 8.4, 8.1, 7.9, 7.7, 7.88] },
    chartExplain: "油价这几年波动比较明显，国际原油变化会对国内油价产生影响。"
  },
  {
    id: "unemployment", name: "就业", icon: "👥", subtitle: "城镇调查失业率", compareText: "比上个月",
    value: "5.2%", change: 0.1, simpleText: "失业率比上个月高了一点", dataPeriod: "2026年8月",
    updateFrequency: "每月更新", source: "国家统计局", chartYears: 3,
    voteQuestion: "你感觉最近工作好找了吗？",
    voteOptions: [{ key: "better", label: "好找一些", percent: 26 }, { key: "flat", label: "差不多", percent: 48 }, { key: "worse", label: "更难一些", percent: 26 }],
    history: { oneYear: [5.1, 5.0, 5.1, 5.0, 5.2, 5.1, 5.0, 5.1, 5.2, 5.1, 5.1, 5.2], threeYears: [5.1, 5.4, 5.2, 5.0, 5.3, 5.1, 5.2, 5.0, 5.1, 5.2, 5.1, 5.2] },
    chartExplain: "就业数据每月都会有变化，整体情况还要结合更多时间和行业来看。"
  },
  {
    id: "cpi", name: "CPI 物价", icon: "🛒", subtitle: "居民消费价格", compareText: "比去年同期",
    value: "1.9%", change: 0.3, simpleText: "整体物价比去年同期高了一些", dataPeriod: "2026年8月",
    updateFrequency: "每月更新", source: "国家统计局", chartYears: 3,
    history: { oneYear: [0.8, 1.0, 1.2, 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 1.7, 1.8, 1.9], threeYears: [0.5, 0.8, 1.2, 0.9, 1.5, 1.1, 1.4, 1.6, 1.3, 1.7, 1.6, 1.9] },
    chartExplain: "不同商品价格变化并不完全一样，整体物价需要持续观察。"
  },
  {
    id: "income", name: "居民收入", icon: "🪙", subtitle: "居民人均可支配收入", compareText: "比去年同期",
    value: "+5.2%", change: 5.2, simpleText: "平均收入比去年同期有所增加", dataPeriod: "2026年前三季度",
    updateFrequency: "按季度更新", source: "国家统计局", chartYears: 3,
    history: { oneYear: [4.8, 5.0, 5.1, 5.2], threeYears: [4.2, 5.0, 4.6, 5.2, 5.1, 5.2], fiveYears: [3.8, 4.5, 4.2, 4.8, 5.0, 5.2] },
    chartExplain: "平均收入是整体情况的概括，不同家庭和个人的感受可能不同。"
  },
  {
    id: "usdCny", name: "人民币汇率", icon: "💱", subtitle: "美元 / 人民币", compareText: "比上一个交易日",
    value: "7.118", change: 0.1, simpleText: "变化不大", dataPeriod: "2026年9月9日",
    updateFrequency: "每个交易日更新", source: "公开汇率数据", chartYears: 3,
    history: { oneYear: [7.2, 7.18, 7.21, 7.16, 7.14, 7.12, 7.1, 7.13, 7.11, 7.09, 7.12, 7.118], threeYears: [6.9, 7.0, 7.1, 7.2, 7.15, 7.08, 7.2, 7.16, 7.12, 7.1, 7.12, 7.118] },
    chartExplain: "汇率每天可能有小幅变化，长期走势还要结合国内外经济情况观察。"
  }
]);

// mock data - 后续替换为官方 API 数据
const longTermIndicators = prepareIndicators([
  {
    id: "birthRate", name: "出生率", icon: "👶", compareText: "比去年", value: "6.39‰", change: -2.1,
    simpleText: "比去年有所下降", dataPeriod: "2023年", updateFrequency: "每年更新", source: "国家统计局",
    defaultRange: 3, ranges: [3, 5], voteQuestion: "你觉得未来出生率会怎样？",
    voteOptions: [{ key: "up", label: "上升", percent: 22 }, { key: "flat", label: "变化不大", percent: 48 }, { key: "down", label: "下降", percent: 30 }],
    history: { threeYears: [7.52, 7.18, 6.39], fiveYears: [10.94, 8.52, 7.52, 7.18, 6.39] },
    chartExplain: "出生率近几年总体在下降。"
  },
  {
    id: "deathRate", name: "死亡率", icon: "🧓", compareText: "比去年", value: "7.87‰", change: 0.3,
    simpleText: "比去年有所上升", dataPeriod: "2023年", updateFrequency: "每年更新", source: "国家统计局",
    defaultRange: 3, ranges: [3, 5], history: { threeYears: [7.18, 7.37, 7.87], fiveYears: [7.13, 7.18, 7.18, 7.37, 7.87] },
    chartExplain: "死亡率会受到人口年龄结构等多种因素影响，需要长期观察。"
  },
  {
    id: "marriage", name: "结婚登记数", icon: "💍", compareText: "比去年", value: "7.6百万对", change: -4.2,
    simpleText: "比去年有所下降", dataPeriod: "2023年", updateFrequency: "统计发布周期", source: "公开民政统计资料",
    defaultRange: 3, ranges: [3, 5], history: { threeYears: [7.64, 7.68, 7.6], fiveYears: [9.27, 8.14, 7.64, 7.68, 7.6] },
    chartExplain: "结婚登记数量每年都有变化，长期趋势值得继续观察。"
  },
  {
    id: "population", name: "人口总数", icon: "👥", compareText: "比去年", value: "14.1亿", change: 0.1,
    simpleText: "总人口变化不大", dataPeriod: "2023年", updateFrequency: "每年更新", source: "国家统计局",
    defaultRange: 5, ranges: [3, 5], history: { threeYears: [14.12, 14.11, 14.1], fiveYears: [14.0, 14.1, 14.12, 14.11, 14.1] },
    chartExplain: "人口总数近几年变化幅度不大，但趋势值得长期观察。"
  }
]);

Page({
  data: {
    activeLifeType: "recent",
    updateTime: "9月9日 08:30 更新",
    recentIndicators: recentIndicators,
    longTermIndicators: longTermIndicators,
    currentIndicators: recentIndicators,
    selectedIndicator: null,
    showIndicatorDetail: false,
    activeRange: 3,
    votedIndicators: {}
  },

  switchLifeType(e) {
    const type = e.currentTarget.dataset.type;
    const indicators = type === "recent" ? this.data.recentIndicators : this.data.longTermIndicators;
    this.setData({
      activeLifeType: type,
      currentIndicators: indicators,
      selectedIndicator: null,
      activeRange: indicators[0].defaultRange
    });
  },

  openIndicatorDetail(e) {
    const indicator = this.data.currentIndicators[e.currentTarget.dataset.index];
    if (!indicator) return;
    this.setData({
      selectedIndicator: indicator,
      showIndicatorDetail: true,
      activeRange: indicator.defaultRange
    });
    this.drawIndicatorChart(indicator, indicator.defaultRange);
  },

  closeIndicatorDetail() {
    this.setData({ showIndicatorDetail: false });
  },

  switchChartRange(e) {
    const range = Number(e.currentTarget.dataset.range);
    const indicator = this.data.selectedIndicator;
    if (!indicator || !indicator.history[range === 1 ? "oneYear" : range === 3 ? "threeYears" : "fiveYears"]) return;
    this.setData({ activeRange: range });
    this.drawIndicatorChart(indicator, range);
  },

  voteIndicator(e) {
    const indicator = this.data.selectedIndicator;
    if (!indicator || this.data.votedIndicators[indicator.id]) return;
    const key = e.currentTarget.dataset.key;
    const votedIndicators = Object.assign({}, this.data.votedIndicators, { [indicator.id]: key });
    const options = indicator.voteOptions.map(function (option) {
      return Object.assign({}, option, { percent: option.key === key ? option.percent + 1 : option.percent });
    });
    const selectedIndicator = Object.assign({}, indicator, { voteOptions: options });
    const currentIndicators = this.data.currentIndicators.map(function (item) {
      return item.id === selectedIndicator.id ? selectedIndicator : item;
    });
    const updateData = { votedIndicators: votedIndicators, selectedIndicator: selectedIndicator, currentIndicators: currentIndicators };
    if (this.data.activeLifeType === "recent") updateData.recentIndicators = currentIndicators;
    else updateData.longTermIndicators = currentIndicators;
    this.setData(updateData);
  },

  stopPropagation() {},

  drawIndicatorChart(indicator, range) {
    if (this.chartTimer) clearTimeout(this.chartTimer);
    this.chartTimer = setTimeout(() => {
      const historyKey = range === 1 ? "oneYear" : range === 3 ? "threeYears" : "fiveYears";
      const values = indicator.history[historyKey];
      const query = this.createSelectorQuery();
      query.select("#indicator-chart").fields({ node: true, size: true }).exec((result) => {
        const chart = result && result[0];
        if (!chart || !chart.node || !this.data.showIndicatorDetail || !values || values.length < 2) return;
        const canvas = chart.node;
        const ctx = canvas.getContext("2d");
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        const width = chart.width;
        const height = chart.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        const min = Math.min.apply(null, values);
        const max = Math.max.apply(null, values);
        const rangeValue = max - min || 1;
        const left = 48;
        const right = width - 12;
        const top = 16;
        const bottom = height - 30;
        const plotHeight = bottom - top;
        const plotWidth = right - left;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let i = 0; i < 4; i += 1) {
          const ratio = i / 3;
          const y = top + plotHeight * ratio;
          ctx.strokeStyle = "#EEF5FB";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.fillStyle = "#8494AD";
          ctx.fillText(formatChartValue(max - rangeValue * ratio), left - 7, y);
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelCount = Math.min(5, values.length);
        for (let i = 0; i < labelCount; i += 1) {
          const index = Math.round(i * (values.length - 1) / (labelCount - 1));
          const x = left + plotWidth * index / (values.length - 1);
          ctx.fillStyle = "#8494AD";
          ctx.fillText(getChartLabel(range, index, values.length), x, bottom + 9);
        }
        const lineColor = indicator.id === "birthRate" ? "#16A36A" : "#1689F8";
        const points = values.map(function (value, index) {
          return {
            x: left + plotWidth * index / (values.length - 1),
            y: top + (max - value) / rangeValue * plotHeight
          };
        });
        ctx.beginPath();
        points.forEach(function (point, index) {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(points[points.length - 1].x, bottom);
        ctx.lineTo(points[0].x, bottom);
        ctx.closePath();
        ctx.fillStyle = indicator.id === "birthRate" ? "rgba(22, 163, 106, 0.10)" : "rgba(22, 137, 248, 0.10)";
        ctx.fill();

        ctx.beginPath();
        values.forEach(function (value, index) {
          const x = left + plotWidth * index / (values.length - 1);
          const y = top + (max - value) / rangeValue * plotHeight;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.stroke();
        values.forEach(function (value, index) {
          const x = left + plotWidth * index / (values.length - 1);
          const y = top + (max - value) / rangeValue * plotHeight;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = lineColor;
          ctx.fill();
        });
      });
    }, 80);
  },

  onUnload() {
    if (this.chartTimer) clearTimeout(this.chartTimer);
  }
});

function formatChartValue(value) {
  if (value >= 1000) return Math.round(value).toLocaleString("en-US");
  return value.toFixed(value < 10 ? 2 : 0);
}

function getChartLabel(range, index, length) {
  if (range === 1) return (index + 1) + "月";
  if (range === 3 && length > 6) return "第" + (index + 1) + "月";
  return (2024 - length + index) + "年";
}
