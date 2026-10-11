const cloud = require('wx-server-sdk');
const cheerio = require('cheerio');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const NBS_RELEASE_URL = 'https://www.stats.gov.cn/sj/zxfb/';
const NBS_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Referer: NBS_RELEASE_URL
};
const HOUSE_CITIES = [
  '北京', '上海', '广州', '深圳',
  '杭州', '南京', '成都', '武汉',
  '西安', '长沙', '重庆', '天津'
];
const INDICATORS = [
  { code: 'HOUSE_PRICE', name: '房价', title: '70个大中城市商品住宅销售价格变动情况', unit: '%', changeMode: 'percent' },
  { code: 'CPI', name: 'CPI物价', title: '居民消费价格', unit: '%', changeMode: 'point' },
  { code: 'UNEMPLOYMENT', name: '就业', title: '国民经济运行', unit: '%', changeMode: 'point' },
  { code: 'INCOME', name: '居民收入', title: '居民收入和消费支出情况', unit: '%', changeMode: 'point' }
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, '').replace(/　/g, '');
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: NBS_HEADERS });
  const html = await response.text();
  if (!response.ok) throw new Error(`国家统计局页面 HTTP ${response.status}: ${url}`);
  return html;
}

async function findLatestArticle(title) {
  const articles = getReleaseArticles(await fetchHtml(NBS_RELEASE_URL), title);
  if (!articles.length) throw new Error(`未找到最新文章: ${title}`);
  return articles[0];
}

function getReleaseArticles(html, title) {
  const $ = cheerio.load(html);
  const articles = [];
  const link = $('a').filter(function () {
    return normalizeText($(this).attr('title') || $(this).text()).includes(title);
  });
  link.each(function () {
    const href = $(this).attr('href');
    if (href) {
      articles.push({
        title: normalizeText($(this).attr('title') || $(this).text()),
        url: new URL(href, NBS_RELEASE_URL).toString()
      });
    }
  });
  return articles;
}

function getSourceDate(title, articleText) {
  const text = `${title}${normalizeText(articleText)}`;
  const yearMatch = text.match(/(20\d{2})年/);
  if (!yearMatch) throw new Error(`文章未包含年份: ${title}`);
  const year = yearMatch[1];
  const monthMatch = text.match(/(\d{1,2})月份/);
  if (monthMatch) return `${year}-${String(monthMatch[1]).padStart(2, '0')}`;
  const quarterMatch = text.match(/([一二三四])季度|前([一二三四])季度|上半年/);
  if (quarterMatch) {
    const quarter = quarterMatch[1] || quarterMatch[2];
    const quarterNumber = quarter ? { 一: 1, 二: 2, 三: 3, 四: 4 }[quarter] : 2;
    return `${year}-Q${quarterNumber}`;
  }
  throw new Error(`文章未包含月份或季度: ${title}`);
}

function parseSignedPercent(text, pattern, label) {
  const match = normalizeText(text).match(pattern);
  if (!match) throw new Error(`未找到${label}`);
  const value = Number(match[2]);
  if (!Number.isFinite(value)) throw new Error(`${label}数值无效`);
  return match[1] === '下降' ? -value : value;
}

function parseCpi(articleText) {
  return parseSignedPercent(
    articleText,
    /全国居民消费价格同比(上涨|下降)(\d+(?:\.\d+)?)%/,
    '全国居民消费价格同比'
  );
}

function parseUnemployment(articleText) {
  const match = normalizeText(articleText).match(/(\d{1,2})月份，全国城镇调查失业率为(\d+(?:\.\d+)?)%/);
  if (!match) throw new Error('未找到当月全国城镇调查失业率');
  const value = Number(match[2]);
  if (!Number.isFinite(value)) throw new Error('全国城镇调查失业率数值无效');
  return value;
}

function parseIncome(articleText) {
  const text = normalizeText(articleText);
  const match = text.match(/全国居民人均可支配收入[\s\S]{0,200}?同比名义增长(\d+(?:\.\d+)?)%/);
  if (!match) throw new Error('未找到全国居民人均可支配收入名义同比增速');
  const value = Number(match[1]);
  if (!Number.isFinite(value)) throw new Error('居民收入名义同比增速数值无效');
  return value;
}

function getTableRows($, table) {
  const spans = [];
  return $(table).find('tr').map(function () {
    const row = [];
    let column = 0;
    function fillSpans() {
      while (spans[column]) {
        row[column] = spans[column].value;
        spans[column].rows -= 1;
        if (spans[column].rows === 0) delete spans[column];
        column += 1;
      }
    }
    fillSpans();
    $(this).find('th, td').each(function () {
      const value = normalizeText($(this).text());
      const colspan = Number($(this).attr('colspan')) || 1;
      const rowspan = Number($(this).attr('rowspan')) || 1;
      for (let index = 0; index < colspan; index += 1) {
        fillSpans();
        row[column] = value;
        if (rowspan > 1) spans[column] = { value, rows: rowspan - 1 };
        column += 1;
      }
    });
    return [row];
  }).get();
}

function findHousePriceTable($) {
  let selected = null;
  $('table').each(function () {
    const table = this;
    const tableText = normalizeText($(table).text());
    const precedingText = normalizeText(
      $(table).prevAll().slice(0, 5).text() + $(table).parent().prevAll().slice(0, 5).text()
    );
    if ((tableText + precedingText).includes('新建商品住宅销售价格指数')) {
      selected = table;
      return false;
    }
  });
  if (!selected) throw new Error('未找到表1：新建商品住宅销售价格指数');
  return selected;
}

function parseHousePrices($) {
  const rows = getTableRows($, findHousePriceTable($));
  const firstCityRow = rows.findIndex(row => HOUSE_CITIES.includes(normalizeText(row[0])));
  if (firstCityRow < 1) throw new Error('房价表未找到城市数据行');

  const headers = [];
  for (let column = 0; column < Math.max.apply(null, rows.slice(0, firstCityRow).map(row => row.length)); column += 1) {
    headers[column] = rows.slice(0, firstCityRow).map(row => row[column] || '').join('');
  }
  const monthOnMonthColumns = headers.reduce((columns, header, column) => {
    if (header.includes('环比') && header.includes('上月=100')) columns.push(column);
    return columns;
  }, []);
  if (!monthOnMonthColumns.length) throw new Error('房价表未找到环比上月=100列');

  const values = {};
  rows.slice(firstCityRow).forEach(row => {
    monthOnMonthColumns.forEach(column => {
      const city = normalizeText(row[column - 1]);
      if (!HOUSE_CITIES.includes(city)) return;
      const rawValue = Number(row[column]);
      if (!Number.isFinite(rawValue)) throw new Error(`${city}房价环比数值无效`);
      values[city] = rawValue;
    });
  });
  HOUSE_CITIES.forEach(city => {
    if (!Object.prototype.hasOwnProperty.call(values, city)) throw new Error(`房价表未找到城市: ${city}`);
  });
  return values;
}

function trimHistory(history, labels) {
  const paired = history.map((value, index) => ({ value, label: labels[index] }))
    .filter(item => typeof item.label === 'string' && Number.isFinite(item.value));
  const latestYear = Math.max.apply(null, paired.map(item => Number(item.label.slice(0, 4))));
  return paired.filter(item => Number(item.label.slice(0, 4)) >= latestYear - 4);
}

function updateValueHistory(existing, sourceDate, value) {
  const history = Array.isArray(existing && existing.history) ? existing.history.slice() : [];
  const labels = Array.isArray(existing && existing.historyLabels) ? existing.historyLabels.slice() : [];
  const index = labels.indexOf(sourceDate);
  if (index >= 0) history[index] = value;
  else {
    history.push(value);
    labels.push(sourceDate);
  }
  const trimmed = trimHistory(history, labels);
  return {
    history: trimmed.map(item => item.value),
    historyLabels: trimmed.map(item => item.label)
  };
}

function updateHouseHistory(existing, sourceDate, rawValue) {
  const history = Array.isArray(existing && existing.history) ? existing.history.slice() : [];
  const labels = Array.isArray(existing && existing.historyLabels) ? existing.historyLabels.slice() : [];
  const index = labels.indexOf(sourceDate);
  if (index >= 0) {
    history[index] = index === 0 ? 100 : history[index - 1] * rawValue / 100;
  } else if (history.length) {
    history.push(history[history.length - 1] * rawValue / 100);
    labels.push(sourceDate);
  } else {
    history.push(100);
    labels.push(sourceDate);
  }
  const trimmed = trimHistory(history, labels);
  return {
    history: trimmed.map(item => item.value),
    historyLabels: trimmed.map(item => item.label)
  };
}

function buildHouseHistory(monthlyPrices, cityName) {
  let index = 100;
  return monthlyPrices.map((item, position) => {
    if (position > 0) index *= item.prices[cityName] / 100;
    return { label: item.sourceDate, value: index };
  });
}

function getHouseHistory(existing, cityName, monthlyPrices) {
  if (monthlyPrices.length) return buildHouseHistory(monthlyPrices, cityName);
  const history = Array.isArray(existing && existing.history) ? existing.history : [];
  const labels = Array.isArray(existing && existing.historyLabels) ? existing.historyLabels : [];
  return history.map((value, index) => ({ label: labels[index], value }))
    .filter(item => typeof item.label === 'string' && Number.isFinite(item.value));
}

async function saveIndicator(config, value, sourceDate, sourceUrl, cityName, rawHouseValue) {
  const collection = db.collection('life_data');
  const query = cityName
    ? { code: 'HOUSE_PRICE', city: cityName }
    : { code: config.code };
  const existingResult = await collection.where(query).get();
  const existing = existingResult.data && existingResult.data[0];
  const history = cityName
    ? updateHouseHistory(existing, sourceDate, rawHouseValue)
    : updateValueHistory(existing, sourceDate, value);
  const record = {
    code: config.code,
    name: config.name,
    value,
    unit: config.unit,
    changeMode: config.changeMode,
    source: '国家统计局',
    sourceDate,
    sourceUrl,
    history: history.history,
    historyLabels: history.historyLabels,
    updatedAt: db.serverDate()
  };
  if (cityName) record.city = cityName;
  if (existing) await collection.doc(existing._id).update({ data: record });
  else await collection.add({ data: record });
}

async function getHousePriceRecords() {
  const collection = db.collection('life_data');
  const records = {};
  for (const cityName of HOUSE_CITIES) {
    const result = await collection.where({ code: 'HOUSE_PRICE', city: cityName }).get();
    records[cityName] = result.data && result.data[0];
  }
  return records;
}

function needsHouseHistoryBackfill(records, latestSourceDate) {
  const latestDate = new Date(
    Number(latestSourceDate.slice(0, 4)),
    Number(latestSourceDate.slice(5, 7)) - 1,
    1
  );
  const minimumStartDate = new Date(latestDate);
  minimumStartDate.setMonth(minimumStartDate.getMonth() - 54);
  return HOUSE_CITIES.some(cityName => {
    const record = records[cityName];
    if (!record || !Array.isArray(record.history) || !Array.isArray(record.historyLabels)) return true;
    if (record.history.length !== record.historyLabels.length || record.historyLabels.length < 60) return true;
    const earliestLabel = record.historyLabels.slice().sort()[0];
    if (!/^\d{4}-\d{2}$/.test(earliestLabel)) return true;
    const earliestDate = new Date(
      Number(earliestLabel.slice(0, 4)),
      Number(earliestLabel.slice(5, 7)) - 1,
      1
    );
    return earliestDate > minimumStartDate;
  });
}

async function findHousePriceArticles(latestSourceDate, errors) {
  const oldestAllowed = new Date(
    Number(latestSourceDate.slice(0, 4)) - 5,
    Number(latestSourceDate.slice(5, 7)) - 1,
    1
  );
  const articles = new Map();
  for (let page = 0; page < 120; page += 1) {
    const url = page === 0 ? NBS_RELEASE_URL : new URL(`index_${page}.html`, NBS_RELEASE_URL).toString();
    let html;
    try {
      html = await fetchHtml(url);
    } catch (err) {
      if (page === 0) throw err;
      break;
    }
    const pageArticles = getReleaseArticles(html, '70个大中城市商品住宅销售价格变动情况');
    let reachedOldestArticle = false;
    pageArticles.forEach(article => {
      try {
        const sourceDate = getSourceDate(article.title, '');
        const month = new Date(Number(sourceDate.slice(0, 4)), Number(sourceDate.slice(5, 7)) - 1, 1);
        if (month >= oldestAllowed && sourceDate <= latestSourceDate) {
          articles.set(sourceDate, article);
        }
        if (month < oldestAllowed) reachedOldestArticle = true;
      } catch (err) {
        errors.push({
          code: 'HOUSE_PRICE',
          name: '房价',
          sourceUrl: article.url,
          error: err.message || String(err)
        });
      }
    });
    if (articles.size >= 60 || reachedOldestArticle) break;
  }
  return Array.from(articles.entries())
    .map(([sourceDate, article]) => Object.assign({ sourceDate }, article))
    .sort((a, b) => a.sourceDate.localeCompare(b.sourceDate))
    .slice(-60);
}

async function loadHousePriceHistory(latestArticle, latestSourceDate, latestPrices, errors) {
  const articles = await findHousePriceArticles(latestSourceDate, errors);
  if (!articles.some(article => article.sourceDate === latestSourceDate)) {
    articles.push(Object.assign({ sourceDate: latestSourceDate }, latestArticle));
  }
  const monthlyPrices = [];
  for (const article of articles.sort((a, b) => a.sourceDate.localeCompare(b.sourceDate))) {
    try {
      const $ = cheerio.load(await fetchHtml(article.url));
      monthlyPrices.push({
        sourceDate: article.sourceDate,
        sourceUrl: article.url,
        prices: parseHousePrices($)
      });
    } catch (err) {
      errors.push({
        code: 'HOUSE_PRICE',
        name: '房价',
        sourceUrl: article.url,
        error: err.message || String(err)
      });
    }
  }
  if (!monthlyPrices.some(item => item.sourceDate === latestSourceDate)) {
    monthlyPrices.push({
      sourceDate: latestSourceDate,
      sourceUrl: latestArticle.url,
      prices: latestPrices
    });
  }
  if (!monthlyPrices.length) throw new Error('未解析到任何房价历史数据');
  return monthlyPrices
    .sort((a, b) => a.sourceDate.localeCompare(b.sourceDate))
    .slice(-60);
}

async function saveHousePriceHistory(config, records, monthlyPrices) {
  const latest = monthlyPrices[monthlyPrices.length - 1];
  const collection = db.collection('life_data');
  for (const cityName of HOUSE_CITIES) {
    const history = getHouseHistory(records[cityName], cityName, monthlyPrices);
    const trimmed = history
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-60);
    const record = {
      code: 'HOUSE_PRICE',
      city: cityName,
      name: config.name,
      value: latest.prices[cityName] - 100,
      unit: config.unit,
      changeMode: config.changeMode,
      source: '国家统计局',
      sourceDate: latest.sourceDate,
      sourceUrl: latest.sourceUrl,
      history: trimmed.map(item => item.value),
      historyLabels: trimmed.map(item => item.label),
      updatedAt: db.serverDate()
    };
    const existing = records[cityName];
    if (existing) await collection.doc(existing._id).update({ data: record });
    else await collection.add({ data: record });
  }
}

async function updateHousePrices(config, errors, forceHouseBackfill) {
  const article = await findLatestArticle(config.title);
  const html = await fetchHtml(article.url);
  const $ = cheerio.load(html);
  const sourceDate = getSourceDate(article.title, $('body').text());
  const housePrices = parseHousePrices($);
  const records = await getHousePriceRecords();
  if (forceHouseBackfill || needsHouseHistoryBackfill(records, sourceDate)) {
    const monthlyPrices = await loadHousePriceHistory(article, sourceDate, housePrices, errors);
    await saveHousePriceHistory(config, records, monthlyPrices);
    return HOUSE_CITIES.length;
  }
  for (const cityName of HOUSE_CITIES) {
    const rawValue = housePrices[cityName];
    await saveIndicator(config, rawValue - 100, sourceDate, article.url, cityName, rawValue);
  }
  return HOUSE_CITIES.length;
}

async function updateNationalIndicator(config) {
  const article = await findLatestArticle(config.title);
  const html = await fetchHtml(article.url);
  const articleText = cheerio.load(html)('body').text();
  const sourceDate = getSourceDate(article.title, articleText);
  const parsers = {
    CPI: parseCpi,
    UNEMPLOYMENT: parseUnemployment,
    INCOME: parseIncome
  };
  const value = parsers[config.code](articleText);
  await saveIndicator(config, value, sourceDate, article.url);
  return 1;
}

exports.main = async (event) => {
  let updated = 0;
  let failed = 0;
  const errors = [];
  for (const config of INDICATORS) {
    try {
      updated += config.code === 'HOUSE_PRICE'
        ? await updateHousePrices(config, errors, event && event.forceHouseBackfill === true)
        : await updateNationalIndicator(config);
    } catch (err) {
      failed++;
      errors.push({
        code: config.code,
        name: config.name,
        sourceUrl: NBS_RELEASE_URL,
        error: err.message || String(err)
      });
    }
  }
  failed += errors.length;
  return {
    success: failed === 0,
    updated,
    failed,
    errors
  };
};
