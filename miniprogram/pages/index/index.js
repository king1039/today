const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const rawMarketList = [
  { icon: "🇺🇸", name: "标普500" },
  { icon: "🇺🇸", name: "纳斯达克100" },
  { icon: "🇺🇸", name: "道琼斯" },
  { icon: "🇨🇳", name: "上证指数" },
  { icon: "🇨🇳", name: "沪深300" },
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
  return (now.getMonth() + 1) + "月" + now.getDate() + "日  " + weekdayNames[now.getDay()];
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
        let detailExplain = "最近一年整体经历过上涨和回落，中间波动很正常。";

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

          if (hist && hist.length >= 2) {
            const first = hist[0];
            const last = hist[hist.length - 1];
            if (first > 0) {
              const annualChange = ((last - first) / first) * 100;
              if (annualChange >= 5) {
                detailExplain = "近一年整体上涨，中间也有过波动。";
              } else if (annualChange <= -5) {
                detailExplain = "近一年整体有所回落，中间也出现过反复。";
              } else {
                detailExplain = "近一年整体变化不大，期间有上涨也有回落。";
              }
            }
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
          detailExplain: detailExplain
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
            this.drawMarketChart(updatedSelected);
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
          detailExplain: "最近一年整体经历过上涨和回落，中间波动很正常。"
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
      showMarketDetail: true
    }, () => {
      this.drawMarketChart(market);
    });
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

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        const values = market && Array.isArray(market.history) ? market.history : null;
        if (!values || values.length < 2) {
          ctx.fillStyle = "#8494AD";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("暂无历史走势数据", width / 2, height / 2);
          return;
        }

        const labels = market && Array.isArray(market.historyLabels) ? market.historyLabels : [];

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
