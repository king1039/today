const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const rawMarketList = [
  { icon: "🇺🇸", name: "标普500" },
  { icon: "🇺🇸", name: "纳斯达克100" },
  { icon: "🇺🇸", name: "道琼斯" },
  { icon: "🇨🇳", name: "上证指数" },
  { icon: "🇨🇳", name: "沪深300" },
  { icon: "🇨🇳", name: "科创50" },
  { icon: "🟡", name: "黄金" },
  { icon: "🛢️", name: "原油" },
  { icon: "💵", name: "美元/人民币" }
];

function formatValue(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "--";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 3 : 1,
    maximumFractionDigits: value < 10 ? 3 : 1
  });
}

function formatChange(change) {
  if (change === null || change === undefined || isNaN(change)) {
    return "--";
  }
  return (change > 0 ? "+" : "") + change.toFixed(1) + "%";
}

function getChangeClass(change) {
  if (change > 0) return "rise";
  if (change < 0) return "fall";
  return "flat";
}

function getTodayLabel() {
  const now = new Date();
  return (now.getMonth() + 1) + "月" + now.getDate() + "日 " + weekdayNames[now.getDay()];
}

function formatSourceDate(sourceDate) {
  if (!sourceDate) return null;
  let dateObj;
  if (typeof sourceDate === "string") {
    const parts = sourceDate.split(/[-T /]/);
    if (parts.length >= 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(day)) {
        return `${month}月${day}日`;
      }
    }
    dateObj = new Date(sourceDate);
  } else if (sourceDate instanceof Date) {
    dateObj = sourceDate;
  }
  if (dateObj && !isNaN(dateObj.getTime())) {
    return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
  }
  return null;
}

Page({
  data: {
    dateLabel: getTodayLabel(),
    updateTime: "数据暂未更新",
    marketList: rawMarketList.map(function (market) {
      return Object.assign({}, market, {
        value: null,
        change: null,
        simpleText: "数据加载中",
        displayValue: "--",
        displayChange: "--",
        changeClass: "flat",
        updateTime: "数据暂未更新"
      });
    }),
    selectedMarket: null,
    showMarketDetail: false,
    chartPeriod: 1,
    periodChangePercent: null,
    periodChangeDisplay: "--",
    periodChangeClass: "flat",
    chartTrend: "",
    chartHistoryNotice: "",
    hasVoted: false,
    voteResult: "看涨 58%    看跌 42%",
    participantCount: "12,345 人参与"
  },

  onShow() {
    this.setData({
      dateLabel: getTodayLabel()
    });
    this.loadMarketData();
  },

  async loadMarketData() {
    try {
      const db = wx.cloud.database();
      const promises = rawMarketList.map(market => {
        return db.collection("market_daily")
          .where({ name: market.name })
          .orderBy("date", "desc")
          .limit(1)
          .get()
          .then(res => {
            if (res.data && res.data.length > 0) {
              return { name: market.name, record: res.data[0] };
            }
            return { name: market.name, record: null };
          })
          .catch(() => ({ name: market.name, record: null }));
      });

      const results = await Promise.all(promises);
      const recordsMap = {};
      let maxSourceDate = null;

      results.forEach(item => {
        if (item.record) {
          recordsMap[item.name] = item.record;
          const sDate = item.record.sourceDate || item.record.date;
          if (sDate) {
            if (!maxSourceDate || sDate > maxSourceDate) {
              maxSourceDate = sDate;
            }
          }
        }
      });

      let topUpdateTime = "数据暂未更新";
      if (maxSourceDate) {
        const formattedDate = formatSourceDate(maxSourceDate);
        if (formattedDate) {
          topUpdateTime = `数据截至 ${formattedDate}`;
        }
      }

      const newMarketList = rawMarketList.map(item => {
        const dbRecord = recordsMap[item.name];
        let val = null;
        let chg = null;
        let st = "数据暂未更新";
        let sDate = null;
        let itemUpdateTime = "数据暂未更新";
        let hist = null;
        let histLabels = null;

        if (dbRecord && typeof dbRecord.value === "number" && !isNaN(dbRecord.value) && dbRecord.value > 0) {
          val = dbRecord.value;
          if (typeof dbRecord.changePercent === "number" && !isNaN(dbRecord.changePercent)) {
            chg = dbRecord.changePercent;
          }
          if (dbRecord.simpleText) {
            st = dbRecord.simpleText;
          }
          sDate = dbRecord.sourceDate || dbRecord.date || null;
          const fDate = formatSourceDate(sDate);
          if (fDate) {
            itemUpdateTime = `数据截至 ${fDate}`;
          }
          if (Array.isArray(dbRecord.history) && dbRecord.history.length >= 2) {
            hist = dbRecord.history;
          }
          if (Array.isArray(dbRecord.historyLabels)) {
            histLabels = dbRecord.historyLabels;
          }

        }

        return Object.assign({}, item, {
          value: val,
          change: chg,
          simpleText: st,
          sourceDate: sDate,
          displayValue: formatValue(val),
          displayChange: formatChange(chg),
          changeClass: getChangeClass(chg),
          updateTime: itemUpdateTime,
          history: hist,
          historyLabels: histLabels,
        });
      });

      this.setData({
        updateTime: topUpdateTime,
        marketList: newMarketList
      });

      if (this.data.showMarketDetail && this.data.selectedMarket) {
        const updatedSelected = newMarketList.find(m => m.name === this.data.selectedMarket.name);
        if (updatedSelected) {
          this.setData({ selectedMarket: updatedSelected }, () => {
            this.updateChartState(updatedSelected, this.data.chartPeriod);
          });
        }
      }
    } catch (err) {
      console.error("loadMarketData error:", err);
      const fallbackMarketList = rawMarketList.map(item => {
        return Object.assign({}, item, {
          value: null,
          change: null,
          simpleText: "数据暂未更新",
          displayValue: "--",
          displayChange: "--",
          changeClass: "flat",
          updateTime: "数据暂未更新",
          history: null,
          historyLabels: null,
        });
      });
      this.setData({
        updateTime: "数据暂未更新",
        marketList: fallbackMarketList
      });
    }
  },

  openMarketDetail(e) {
    const index = e.currentTarget.dataset.index;
    const market = this.data.marketList[index];
    this.setData({
      selectedMarket: market,
      showMarketDetail: true,
      chartPeriod: 1
    }, () => {
      this.updateChartState(market, 1);
    });
  },

  getFilteredChartData(market, period) {
    const values = market && Array.isArray(market.history) ? market.history : [];
    const labels = market && Array.isArray(market.historyLabels) ? market.historyLabels : [];
    if (values.length !== labels.length || !labels.length) {
      return { values: [], labels: [], availableMonths: 0 };
    }
    const lastLabel = labels[labels.length - 1];
    const lastDate = new Date(`${lastLabel}-01T00:00:00`);
    const cutoff = new Date(lastDate.getFullYear(), lastDate.getMonth() - period * 12 + 1, 1);
    const startIndex = labels.findIndex(label => new Date(`${label}-01T00:00:00`) >= cutoff);
    const index = startIndex < 0 ? 0 : startIndex;
    return {
      values: values.slice(index),
      labels: labels.slice(index),
      availableMonths: labels.length
    };
  },

  getChartTrend(values, period) {
    if (values.length < 2 || values[0] <= 0) return "";
    const change = (values[values.length - 1] - values[0]) / values[0] * 100;
    const periodText = `近${period}年`;
    if (change >= 5) return `${periodText}整体上涨，中间也有过波动。`;
    if (change <= -5) return `${periodText}整体有所回落，中间也出现过反复。`;
    return `${periodText}整体变化不大，期间有上涨也有回落。`;
  },

  updateChartState(market, period) {
    const chartData = this.getFilteredChartData(market, period);
    const requiredMonths = period * 12;
    let periodChangePercent = null;
    if (chartData.values.length >= 2 && chartData.values[0] > 0) {
      periodChangePercent = (chartData.values[chartData.values.length - 1] - chartData.values[0])
        / chartData.values[0] * 100;
    }
    this.setData({
      chartPeriod: period,
      periodChangePercent,
      periodChangeDisplay: formatChange(periodChangePercent),
      periodChangeClass: getChangeClass(periodChangePercent),
      chartTrend: this.getChartTrend(chartData.values, period),
      chartHistoryNotice: chartData.availableMonths < requiredMonths
        ? `目前可用历史数据不足${period}年`
        : ""
    }, () => {
      this.drawMarketChart(chartData.values, chartData.labels);
    });
  },

  changeChartPeriod(e) {
    const period = Number(e.currentTarget.dataset.period);
    if ([1, 3, 5].indexOf(period) < 0 || !this.data.selectedMarket) return;
    this.updateChartState(this.data.selectedMarket, period);
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

  drawMarketChart(values, labels) {
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

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        if (!values || values.length < 2) {
          ctx.fillStyle = "#8494AD";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("暂无历史走势数据", width / 2, height / 2);
          return;
        }

        const minValue = Math.min.apply(null, values);
        const maxValue = Math.max.apply(null, values);
        const range = maxValue - minValue || 1;
        const left = 52;
        const right = width - 12;
        const top = 18;
        const bottom = height - 30;
        const plotHeight = bottom - top;
        const plotWidth = right - left;

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

        if (labels.length === values.length && labels.length > 0) {
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const maxLabelCount = Math.min(5, labels.length);
          for (let i = 0; i < maxLabelCount; i++) {
            const labelIdx = maxLabelCount === 1 ? 0 : Math.round(i * (labels.length - 1) / (maxLabelCount - 1));
            const labelText = labels[labelIdx];
            const x = left + plotWidth * labelIdx / (values.length - 1);
            ctx.fillStyle = "#8494AD";
            ctx.fillText(labelText, x, bottom + 9);
          }
        }

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
