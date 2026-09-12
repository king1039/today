const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const SYMBOL_MAP = [
  { code: 'SPX', name: '标普500', type: 'us', symbol: '.INX' },
  { code: 'NDX', name: '纳斯达克100', type: 'us', symbol: '.NDX' },
  { code: 'DJI', name: '道琼斯', type: 'us', symbol: '.DJI' },
  { code: '000001.SS', name: '上证指数', type: 'cn', symbol: 'sh000001' },
  { code: '000300.SS', name: '沪深300', type: 'cn', symbol: 'sh000300' },
  { code: '000688.SS', name: '科创50', type: 'cn', symbol: 'sh000688' },
  { code: 'XAUUSD', name: '黄金', type: 'future', symbol: 'XAU' },
  { code: 'WTI', name: '原油', type: 'future', symbol: 'CL' },
  { code: 'USDCNY', name: '美元/人民币', type: 'forex', symbol: 'fx_susdcny' }
];

const SINA_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://finance.sina.com.cn/'
};

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

function parseJsonpArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) {
    throw new Error('新浪返回数据不是有效 JSONP 数组');
  }
  let data;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    throw new Error(`新浪 JSONP 解析失败: ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('新浪返回数据不是数组');
  }
  return data;
}

function normalizeRows(rows, dateKeys) {
  return rows
    .map(item => {
      const rawDate = dateKeys.map(key => item && item[key]).find(Boolean);
      const date = rawDate ? String(rawDate).slice(0, 10) : '';
      const close = Number(item && (item.c !== undefined ? item.c : item.close));
      return { date, close };
    })
    .filter(item => item.date && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchSinaUsIndex(config) {
  const url = `https://stock.finance.sina.com.cn/usstock/api/jsonp.php/IO.XSRV2.CallbackList/US_MinKService.getDailyK?symbol=${encodeURIComponent(config.symbol)}&_var=kline_dayqfq&range=400d`;
  const response = await fetch(url, { headers: SINA_HEADERS });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  const rows = normalizeRows(parseJsonpArray(await response.text()), ['d', 'date']);
  if (rows.length < 2) throw new Error('有效交易日数据少于 2 条');
  return rows;
}

async function fetchSinaCnIndex(config) {
  const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${encodeURIComponent(config.symbol)}&scale=240&datalen=1500`;
  const response = await fetch(url, { headers: SINA_HEADERS });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  const rows = parseJsonpArray(await response.text())
    .map(item => ({
      date: item && item.day ? String(item.day).slice(0, 10) : '',
      close: Number(item && item.close)
    }))
    .filter(item => item.date && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length < 2) throw new Error('有效交易日数据少于 2 条');
  return rows;
}

async function fetchSinaFuture(config) {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_data=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=${encodeURIComponent(config.symbol)}`;
  const response = await fetch(url, { headers: SINA_HEADERS });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  const rows = normalizeRows(parseJsonpArray(await response.text()), ['d', 'date', 'day']);
  if (rows.length < 2) throw new Error('有效交易日数据少于 2 条');
  return rows;
}

async function fetchSinaForex(config) {
  const url = `https://vip.stock.finance.sina.com.cn/forex/api/jsonp.php/var%20_data=/NewForexService.getDayKLine?symbol=${encodeURIComponent(config.symbol)}`;
  const response = await fetch(url, { headers: SINA_HEADERS });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  const text = await response.text();
  const match = text.match(/\("((?:\\.|[^"\\])*)"\)/);
  if (!match) throw new Error('新浪返回数据不是有效 JSONP 字符串');
  let content;
  try {
    content = JSON.parse(`"${match[1]}"`);
  } catch (err) {
    throw new Error(`新浪 JSONP 字符串解析失败: ${err.message}`);
  }
  const rows = content
    .split(',|')
    .map(record => {
      const fields = record.split(',');
      return {
        date: fields[0] ? fields[0].trim().slice(0, 10) : '',
        close: Number(fields[2])
      };
    })
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && Number.isFinite(item.close)
      && item.close > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length < 2) throw new Error('有效交易日数据少于 2 条');
  return rows;
}

async function fetchMarketData(symbolConfig) {
  let rows;
  if (symbolConfig.type === 'us') {
    rows = await fetchSinaUsIndex(symbolConfig);
  } else if (symbolConfig.type === 'cn') {
    rows = await fetchSinaCnIndex(symbolConfig);
  } else if (symbolConfig.type === 'future') {
    rows = await fetchSinaFuture(symbolConfig);
  } else if (symbolConfig.type === 'forex') {
    rows = await fetchSinaForex(symbolConfig);
  } else {
    throw new Error(`不支持的数据类型: ${symbolConfig.type}`);
  }

  const latest = rows[0];
  const previous = rows[1];
  const value = latest.close;
  const previousValue = previous.close;
  const changePercent = ((value - previousValue) / previousValue) * 100;
  const simpleText = calculateSimpleText(changePercent);
  const { history, historyLabels } = extractMonthlyHistory(rows);

  return {
    code: symbolConfig.code,
    name: symbolConfig.name,
    date: latest.date,
    value,
    previousValue,
    changePercent,
    simpleText,
    source: '新浪财经',
    sourceDate: latest.date,
    history,
    historyLabels,
    updatedAt: db.serverDate()
  };
}

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
