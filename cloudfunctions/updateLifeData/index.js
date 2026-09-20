const cloud = require('wx-server-sdk');
const cheerio = require('cheerio');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const NBS_DATA_URL = 'https://data.stats.gov.cn/easyquery.htm';
const NBS_SOURCE_URL = 'https://www.stats.gov.cn/';
const NBS_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Referer: NBS_SOURCE_URL
};
const INDICATORS = [
  {
    code: 'HOUSE_PRICE',
    name: '房价',
    unit: '%',
    changeMode: 'percent',
    database: 'fsyd',
    matches: [/新建商品住宅销售价格指数.*上月=100/, /新建商品住宅.*环比/],
    regionDimension: 'reg',
    regionName: '北京',
    sourceUrl: NBS_DATA_URL
  },
  {
    code: 'UNEMPLOYMENT',
    name: '就业',
    unit: '%',
    changeMode: 'point',
    database: 'hgyd',
    matches: [/全国城镇调查失业率/],
    sourceUrl: NBS_DATA_URL
  },
  {
    code: 'CPI',
    name: 'CPI物价',
    unit: '%',
    changeMode: 'point',
    database: 'hgyd',
    matches: [/居民消费价格指数.*同比.*涨跌幅/, /CPI.*同比.*涨跌幅/],
    sourceUrl: NBS_DATA_URL
  },
  {
    code: 'INCOME',
    name: '居民收入',
    unit: '%',
    changeMode: 'point',
    database: 'hgjd',
    matches: [/全国居民人均可支配收入.*累计.*同比.*增长/, /居民人均可支配收入.*累计.*同比/],
    sourceUrl: NBS_DATA_URL
  }
];

function buildNbsUrl(params) {
  const search = new URLSearchParams(params);
  return `${NBS_DATA_URL}?${search.toString()}`;
}

async function fetchNbsJson(url) {
  const response = await fetch(url, { headers: NBS_HEADERS });
  const text = await response.text();
  if (!response.ok) throw new Error(`国家统计局接口 HTTP ${response.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`国家统计局接口未返回 JSON: ${text.slice(0, 300)}`);
  }
}

function flattenTree(nodes, result) {
  (Array.isArray(nodes) ? nodes : []).forEach(node => {
    result.push(node);
    flattenTree(node.children, result);
  });
  return result;
}

async function findIndicatorCode(config) {
  const metadataUrl = buildNbsUrl({
    m: 'getTree',
    dbcode: config.database,
    wdcode: 'zb'
  });
  const tree = await fetchNbsJson(metadataUrl);
  const matches = flattenTree(tree, []).filter(node => {
    const name = String(node.name || node.text || '');
    return config.matches.some(pattern => pattern.test(name));
  });
  if (matches.length !== 1 || !matches[0].id) {
    throw new Error(`国家统计局指标元数据不匹配: ${JSON.stringify(matches.slice(0, 5))}`);
  }
  return String(matches[0].id);
}

function getDimensionNodes(returnData, dimension) {
  const node = (returnData.wdnodes || []).find(item => item.wdcode === dimension);
  return node && Array.isArray(node.nodes) ? node.nodes : [];
}

function getNodeValue(node, dimension) {
  const entry = (node.wds || []).find(item => item.wdcode === dimension);
  return entry && String(entry.valuecode || entry.code || '');
}

function parsePeriod(label) {
  const quarterMatch = String(label || '').match(/^(\d{4})([ABCD])$/);
  if (quarterMatch) {
    const quarter = { A: 1, B: 2, C: 3, D: 4 }[quarterMatch[2]];
    return { key: `${quarterMatch[1]}-Q${quarter}`, year: Number(quarterMatch[1]), order: quarter };
  }
  const match = String(label || '').match(/(\d{4})(?:[-年](\d{1,2}))?/);
  if (!match) return null;
  const year = match[1];
  const month = match[2] ? String(match[2]).padStart(2, '0') : '';
  return { key: month ? `${year}-${month}` : year, year: Number(year), order: Number(month || 0) };
}

async function fetchIndicatorSeries(config) {
  const indicatorCode = await findIndicatorCode(config);
  const dimensions = [{ wdcode: 'zb', valuecode: indicatorCode }];
  if (config.regionDimension) {
    const regionTree = await fetchNbsJson(buildNbsUrl({
      m: 'getTree',
      dbcode: config.database,
      wdcode: config.regionDimension
    }));
    const regionMatches = flattenTree(regionTree, []).filter(node => String(node.name || node.text || '') === config.regionName);
    if (regionMatches.length !== 1 || !regionMatches[0].id) {
      throw new Error(`国家统计局地区元数据不匹配: ${JSON.stringify(regionMatches.slice(0, 5))}`);
    }
    dimensions.push({ wdcode: config.regionDimension, valuecode: String(regionMatches[0].id) });
  }
  const dataUrl = buildNbsUrl({
    m: 'QueryData',
    dbcode: config.database,
    rowcode: 'zb',
    colcode: 'sj',
    wds: '[]',
    dfwds: JSON.stringify(dimensions)
  });
  const payload = await fetchNbsJson(dataUrl);
  const returnData = payload.returndata;
  if (!returnData || !Array.isArray(returnData.datanodes)) {
    throw new Error(`国家统计局数据格式不符合预期: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  const periods = new Map(getDimensionNodes(returnData, 'sj').map(node => [String(node.code), node.name]));
  const rows = returnData.datanodes.map(node => {
    const period = parsePeriod(periods.get(getNodeValue(node, 'sj')));
    const rawValue = Number(node.data && node.data.data);
    const value = config.code === 'HOUSE_PRICE' ? rawValue - 100 : rawValue;
    return period && Number.isFinite(value) && Number.isFinite(rawValue) ? { period, value, rawValue } : null;
  }).filter(Boolean).sort((a, b) => a.period.year - b.period.year || a.period.order - b.period.order);
  if (rows.length < 2) throw new Error(`国家统计局有效历史数据少于 2 条: ${config.code}`);
  const latest = rows[rows.length - 1];
  const firstYear = latest.period.year - 5;
  const historyRows = rows.filter(row => row.period.year >= firstYear);
  if (historyRows.length < 2) throw new Error(`国家统计局近 5 年有效历史数据少于 2 条: ${config.code}`);
  const history = config.code === 'HOUSE_PRICE'
    ? historyRows.reduce((indexes, row, index) => {
      indexes.push(index === 0 ? 100 : indexes[index - 1] * row.rawValue / 100);
      return indexes;
    }, [])
    : historyRows.map(row => row.value);
  return {
    value: latest.value,
    sourceDate: latest.period.key,
    history,
    historyLabels: historyRows.map(row => row.period.key)
  };
}

async function updateIndicator(config) {
  const series = await fetchIndicatorSeries(config);
  const record = {
    code: config.code,
    name: config.name,
    value: series.value,
    unit: config.unit,
    changeMode: config.changeMode,
    source: '国家统计局',
    sourceDate: series.sourceDate,
    history: series.history,
    historyLabels: series.historyLabels,
    updatedAt: db.serverDate()
  };
  const collection = db.collection('life_data');
  const existing = await collection.where({ code: config.code }).get();
  if (existing.data && existing.data.length > 0) {
    await collection.doc(existing.data[0]._id).update({ data: record });
  } else {
    await collection.add({ data: record });
  }
}

exports.main = async () => {
  let updated = 0;
  let failed = 0;
  const errors = [];
  for (const config of INDICATORS) {
    try {
      await updateIndicator(config);
      updated++;
    } catch (err) {
      failed++;
      errors.push({
        code: config.code,
        name: config.name,
        sourceUrl: config.sourceUrl,
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
