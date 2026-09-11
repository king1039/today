const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const rawMarketList = [
  { icon: "🇺🇸", name: "标普500", value: 5483.2, change: -0.6, simpleText: "昨晚跌了一点", history: [4780, 4860, 4915, 5050, 5140, 5075, 5260, 5350, 5290, 5430, 5510, 5483.2] },
  { icon: "🇺🇸", name: "纳斯达克100", value: 18765.4, change: -1.2, simpleText: "跌得比较多", history: [15120, 15840, 16320, 17050, 17620, 17180, 18100, 18840, 18420, 19320, 19100, 18765.4] },
  { icon: "🇺🇸", name: "道琼斯", value: 39123.6, change: -0.4, simpleText: "小幅下跌", history: [35200, 35800, 36120, 36900, 37450, 37180, 38200, 38700, 37900, 39400, 39300, 39123.6] },
  { icon: "🇨🇳", name: "上证指数", value: 2982.1, change: 0.3, simpleText: "微微上行", history: [3050, 2980, 3015, 3070, 3150, 3085, 2960, 3010, 2890, 2940, 2972, 2982.1] },
  { icon: "🇨🇳", name: "沪深300", value: 3321.5, change: 0.2, simpleText: "变化不大", history: [3700, 3620, 3680, 3750, 3810, 3690, 3500, 3580, 3260, 3300, 3315, 3321.5] },
  { icon: "🟡", name: "黄金", value: 2508.4, change: 0.7, simpleText: "又贵了一些", history: [1980, 2040, 2110, 2180, 2260, 2310, 2375, 2430, 2390, 2460, 2490, 2508.4] },
  { icon: "🛢️", name: "原油", value: 72.4, change: 2.1, simpleText: "涨得明显", history: [82, 78, 84, 80, 76, 73, 77, 70, 68, 71, 70, 72.4] },
  { icon: "💵", name: "美元/人民币", value: 7.118, change: 0.1, simpleText: "变化不大", history: [7.18, 7.22, 7.24, 7.20, 7.16, 7.12, 7.10, 7.14, 7.11, 7.09, 7.12, 7.118] }
];

const historyLabels = ["2025-09", "2025-12", "2026-03", "2026-06", "2026-09"];
const historyLabelIndices = [0, 3, 6, 9, 11];

function formatValue(value) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 3 : 1,
    maximumFractionDigits: value < 10 ? 3 : 1
  });
}

function formatChange(change) {
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
}

function getChangeClass(change) {
  if (change > 0) return "rise";
  if (change < 0) return "fall";
  return "flat";
}

function getTodayLabel() {
  const now = new Date();
  return (now.getMonth() + 1) + "月" + now.getDate() + "日  " + weekdayNames[now.getDay()];
}

Page({
  data: {
    dateLabel: getTodayLabel(),
    updateTime: "08:30 更新",
    marketList: rawMarketList.map(function (market) {
      return Object.assign({}, market, {
        displayValue: formatValue(market.value),
        displayChange: formatChange(market.change),
        changeClass: getChangeClass(market.change),
        updateTime: "08:30 更新"
      });
    }),
    todayEvent: {
      time: "20:30",
      title: "美国通胀数据",
      content: "今晚美国将公布重要通胀数据，可能影响美股、美元和黄金的市场情绪。"
    },
    selectedMarket: null,
    showMarketDetail: false,
    hasVoted: false,
    voteResult: "看涨 58%    看跌 42%",
    participantCount: "12,345 人参与"
  },

  openMarketDetail(e) {
    const index = e.currentTarget.dataset.index;
    const market = this.data.marketList[index];
    this.setData({
      selectedMarket: market,
      showMarketDetail: true
    });
    this.drawMarketChart(market);
  },

  closeMarketDetail() {
    this.setData({
      showMarketDetail: false
    });
  },

  noop() {},

  onUnload() {
    if (this.chartTimer) clearTimeout(this.chartTimer);
  },

  voteUp() {
    if (this.data.hasVoted) return;
    this.setData({
      hasVoted: true,
      voteResult: "看涨 59%    看跌 41%"
    });
  },

  voteDown() {
    if (this.data.hasVoted) return;
    this.setData({
      hasVoted: true,
      voteResult: "看涨 57%    看跌 43%"
    });
  },

  drawMarketChart(market) {
    if (this.chartTimer) clearTimeout(this.chartTimer);
    this.chartTimer = setTimeout(() => {
      const query = this.createSelectorQuery();
      query.select("#market-chart").fields({ node: true, size: true }).exec((result) => {
        const chart = result && result[0];
        if (!chart || !chart.node || !this.data.showMarketDetail) return;

        const canvas = chart.node;
        const ctx = canvas.getContext("2d");
        const systemInfo = wx.getSystemInfoSync();
        const dpr = systemInfo.pixelRatio || 1;
        const width = chart.width;
        const height = chart.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const values = market.history;
        const minValue = Math.min.apply(null, values);
        const maxValue = Math.max.apply(null, values);
        const range = maxValue - minValue || 1;
        const left = 52;
        const right = width - 12;
        const top = 18;
        const bottom = height - 30;
        const plotHeight = bottom - top;
        const plotWidth = right - left;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        for (let gridIndex = 0; gridIndex < 4; gridIndex += 1) {
          const ratio = gridIndex / 3;
          const y = top + plotHeight * ratio;
          const gridValue = maxValue - range * ratio;
          ctx.strokeStyle = "#EEF5FB";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.fillStyle = "#8494AD";
          ctx.fillText(formatChartValue(gridValue), left - 8, y);
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        historyLabels.forEach((label, labelIndex) => {
          const x = left + plotWidth * historyLabelIndices[labelIndex] / (values.length - 1);
          ctx.fillStyle = "#8494AD";
          ctx.fillText(label, x, bottom + 9);
        });

        ctx.strokeStyle = "#1689F8";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        values.forEach((value, valueIndex) => {
          const x = left + plotWidth * valueIndex / (values.length - 1);
          const y = top + (maxValue - value) / range * plotHeight;
          if (valueIndex === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }, 80);
  }
});

function formatChartValue(value) {
  if (value >= 1000) return Math.round(value).toLocaleString("en-US");
  return value.toFixed(value < 10 ? 2 : 0);
}
