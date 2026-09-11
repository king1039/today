const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 集中定义市场代码 map (EODHD ticker)
 */
const SYMBOL_MAP = [
  { code: 'SPX', name: '标普500', symbol: 'GSPC.INDX' },
  { code: 'NDX', name: '纳斯达克100', symbol: 'NDX.INDX' },
  { code: 'DJI', name: '道琼斯', symbol: 'DJI.INDX' },
  { code: '000001.SS', name: '上证指数', symbol: '000001.SHG' },
  { code: '000300.SS', name: '沪深300', symbol: '000300.SHG' },
  { code: 'XAUUSD', name: '黄金', symbol: 'XAUUSD.FOREX' },
  { code: 'WTI', name: '原油', symbol: 'WTI' },
  { code: 'USDCNY', name: '美元/人民币', symbol: 'USDCNY.FOREX' }
];

/**
 * 根据涨跌幅计算 simpleText
 */
function calculateSimpleText(changePercent) {
  if (changePercent >= 1) {
    return '涨得比较多';
  } else if (changePercent >= 0.2) {
    return '涨了一点';
  } else if (changePercent > -0.2) {
    return '变化不大';
  } else if (changePercent > -1) {
    return '跌了一点';
  } else {
    return '跌得比较多';
  }
}

/**
 * 计算 370 天前日期 (YYYY-MM-DD)
 */
function getFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 370);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 从近一年交易日数据中按月份抽取每个月最后一个有效交易日
 */
function extractMonthlyHistory(sortedData) {
  const monthMap = {};
  for (const item of sortedData) {
    if (!item || !item.date) continue;
    const monthKey = String(item.date).slice(0, 7);
    const rawVal = item.close !== undefined ? item.close : item.value;
    const val = parseFloat(rawVal);
    if (isNaN(val) || val <= 0) continue;
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        month: monthKey,
        value: val
      };
    }
  }
  const months = Object.keys(monthMap).sort();
  if (months.length < 2) {
    return { history: [], historyLabels: [] };
  }
  const history = months.map(m => monthMap[m].value);
  const historyLabels = months;
  return { history, historyLabels };
}

/**
 * 数据源请求逻辑集中到该函数 (EODHD)
 */
async function fetchMarketData(symbolConfig) {
  const apiKey = process.env.MARKET_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API Key 未在 process.env 中配置 (MARKET_API_KEY 或 API_KEY)');
  }

  if (symbolConfig.code === 'WTI') {
    const url = `https://eodhd.com/api/commodities/historical/WTI?api_token=${encodeURIComponent(apiKey)}&interval=daily&fmt=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
    }
    const data = await response.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
    if (!list) {
      throw new Error('返回数据格式错误');
    }
    const fromDate = getFromDate();
    const sortedData = [...list]
      .filter(item => item && item.date && item.date >= fromDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortedData.length < 2) {
      throw new Error('有效交易日数据少于 2 条');
    }
    const latest = sortedData[0];
    const previous = sortedData[1];
    const date = latest.date;
    const value = parseFloat(latest.value || latest.close);
    const previousValue = parseFloat(previous.value || previous.close);

    if (!date || isNaN(value) || isNaN(previousValue) || value <= 0 || previousValue <= 0) {
      throw new Error(`无法解析 ${symbolConfig.name}(${symbolConfig.code}) 的有效交易日收盘价`);
    }

    const changePercent = Number((((value - previousValue) / previousValue) * 100).toFixed(2));
    const simpleText = calculateSimpleText(changePercent);
    const { history, historyLabels } = extractMonthlyHistory(sortedData);

    return {
      code: symbolConfig.code,
      name: symbolConfig.name,
      date,
      value,
      previousValue,
      changePercent,
      simpleText,
      source: 'EODHD',
      sourceDate: date,
      history,
      historyLabels,
      updatedAt: new Date()
    };
  }

  const fromDate = getFromDate();
  const url = `https://eodhd.com/api/eod/${encodeURIComponent(symbolConfig.symbol)}?api_token=${encodeURIComponent(apiKey)}&fmt=json&period=d&order=d&from=${fromDate}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('返回数据不是数组');
  }

  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedData.length < 2) {
    throw new Error('有效交易日数据少于 2 条');
  }

  const latest = sortedData[0];
  const previous = sortedData[1];

  const date = latest.date;
  const value = parseFloat(latest.close);
  const previousValue = parseFloat(previous.close);

  if (!date || isNaN(value) || isNaN(previousValue) || value <= 0 || previousValue <= 0) {
    throw new Error(`无法解析 ${symbolConfig.name}(${symbolConfig.code}) 的有效交易日收盘价`);
  }

  const changePercent = Number((((value - previousValue) / previousValue) * 100).toFixed(2));
  const simpleText = calculateSimpleText(changePercent);
  const { history, historyLabels } = extractMonthlyHistory(sortedData);

  return {
    code: symbolConfig.code,
    name: symbolConfig.name,
    date,
    value,
    previousValue,
    changePercent,
    simpleText,
    source: 'EODHD',
    sourceDate: date,
    history,
    historyLabels,
    updatedAt: new Date()
  };
}

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const symbolConfig of SYMBOL_MAP) {
    try {
      const record = await fetchMarketData(symbolConfig);

      const collection = db.collection('market_daily');
      const existRes = await collection.where({
        code: record.code,
        date: record.date
      }).get();

      if (existRes.data && existRes.data.length > 0) {
        await collection.doc(existRes.data[0]._id).update({
          data: record
        });
      } else {
        await collection.add({
          data: record
        });
      }

      updated++;
    } catch (err) {
      failed++;
      errors.push({
        code: symbolConfig.code,
        name: symbolConfig.name,
        error: err.message || String(err)
      });
    }
  }

  return {
    success: failed === 0,
    updated,
    failed,
    errors
  };
};
