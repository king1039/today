const cloud = require('wx-server-sdk');
const { XMLParser } = require('fast-xml-parser');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const TIME_ZONE = 'Asia/Shanghai';
const RSS_SOURCES = [
  { url: 'https://www.xinhuanet.com/politics/news_politics.xml', source: '新华网', category: 'domestic' },
  { url: 'https://www.chinanews.com.cn/rss/china.xml', source: '中国新闻网', category: 'domestic' },
  { url: 'https://www.xinhuanet.com/world/news_world.xml', source: '新华网', category: 'international' },
  { url: 'https://www.chinanews.com.cn/rss/world.xml', source: '中国新闻网', category: 'international' },
  { url: 'https://www.chinanews.com.cn/rss/finance.xml', source: '中国新闻网', category: 'mixed' },
  { url: 'http://www.xinhuanet.com/finance/news_finance.xml', source: '新华网', category: 'mixed' },
  { url: 'http://www.xinhuanet.com/fortune/news_fortune.xml', source: '新华网', category: 'mixed' },
  { url: 'http://www.xinhuanet.com/house/news_house.xml', source: '新华网', category: 'domestic' },
  { url: 'http://www.xinhuanet.com/energy/news_energy.xml', source: '新华网', category: 'mixed' },
  { url: 'https://www.chinanews.com.cn/rss/importnews.xml', source: '中国新闻网', category: 'mixed' },
  { url: 'https://www.chinanews.com.cn/rss/scroll-news.xml', source: '中国新闻网', category: 'mixed' }
];
const HTML_SOURCES = [
  { url: 'https://www.yicai.com/', source: '第一财经', category: 'mixed' },
  { url: 'https://stcn.com/', source: '证券时报', category: 'mixed' },
  { url: 'https://finance.cnr.cn/', source: '央广财经', category: 'mixed' }
];
const FINANCE_RELEVANT_WORDS = ['股票市场', '股市', '指数', 'A股', '美股', '港股', '资本市场', '房价', '楼市', '房地产', '房贷', '住房政策', '土地市场', '就业', '失业', '失业率', '工资', '薪资', '薪酬', '收入', '居民收入', '居民', '消费', '零售', '消费信心', 'CPI', 'PPI', '通胀', '物价', 'GDP', '经济增长', '经济衰退', '经济', '经济形势', '经济数据', '市场', '金融', '金融市场', '政策', '宏观', '产业', '企业投资', '制造业', 'PMI', '养老金', '社保', '央行', '中国人民银行', '美联储', '欧洲央行', '利率', '降息', '加息', '货币政策', '财政政策', '财政部', '财政', '税收', '关税', '国债', '政府债务', '债务', '银行', '贷款', '存款', '信贷', '融资', '债券', '人民币', '美元', '欧元', '日元', '汇率', '外汇', '黄金', '原油', '石油', '天然气', '能源', 'OPEC', '贸易', '出口', '进口', '供应链', '航运', '运费', '物流', '粮食', '大宗商品', '经济政策', '产业政策', '人口', '出生率', '老龄化'];
const A_TIER_WORDS = ['央行', '中国人民银行', '美联储', '欧洲央行', '降息', '加息', '降准', 'CPI', 'PPI', '通胀', 'GDP', '就业数据', '失业率', '重大房地产政策', '重大财政政策', '重大税收政策', '重大关税政策', '金融监管', '经济制裁', '能源危机'];
const B_TIER_WORDS = ['人民币', '汇率', '美元', '油价', '黄金', '房地产市场', '房贷', '消费', '收入', '工资', '出口', '进口', '贸易', '供应链', '国债', '财政赤字', '经济预测', '重大产业政策'];
const C_TIER_WORDS = ['人口', '出生', '老龄化', '消费趋势', '楼市数据', '企业投资', '制造业', 'PMI', '运输成本', '能源价格', '商品价格'];
const ANNOUNCEMENT_WORDS = ['宣布', '发布', '通过', '实施', '创历史', '新高', '新低', '首次', '重大', '紧急', '超预期', '不及预期'];
const EXCLUDED_WORDS = ['娱乐', '明星', '演员', '歌手', '电影', '电视剧', '综艺', '网红', '游戏赛事', '足球', '篮球', '体育比赛', '奥运赛事', '球员', '刑事案件', '旅游推荐', '美食', '时尚', '美容', '汽车测评', '汽车评测', '手机新品', '电子产品发布', '企业宣传', '公司人事', '个股涨停', '个股推荐', '股票推荐', '券商荐股', '目标价', '买入', '卖出', '投资建议'];
const LOW_VALUE_EVENT_WORDS = ['论坛', '峰会', '会议举行', '会议召开', '开幕', '闭幕', '代表团', '交流会', '推介会', '研讨会', '合作平台', '签约仪式', '共赴', '中国之约', '参访', '考察'];
const HARD_FINANCE_WORDS = ['降息', '加息', '降准', '利率', 'CPI', 'PPI', 'GDP', '通胀', '就业', '失业率', '工资', '收入', '房价', '房地产', '房贷', '股市', 'A股', '美股', '港股', '人民币', '美元', '汇率', '原油', '油价', '黄金', '能源', '关税', '出口', '进口', '贸易', '财政', '税收', '国债', '央行', '美联储', '欧洲央行'];
const DOMESTIC_WORDS = ['中国', '我国', '国务院', '央行', '中国人民银行', '国家统计局', '财政部', '商务部', '证监会', '人民币', 'A股', '港股', '房地产', '楼市', '就业', '居民收入', '中国经济', '国家发改委', '发改委', '工信部', '住建部', '银行', '中国企业'];
const INTERNATIONAL_WORDS = ['美国', '美联储', '欧洲', '欧盟', '欧洲央行', '日本', '英国', '俄罗斯', '乌克兰', '伊朗', '以色列', '中东', 'OPEC', '美元', '美股', '国际油价', '全球经济', '国际贸易', '关税', '全球', '国际', '华尔街', '纳斯达克', '标普', '道琼斯', 'IMF', '世界银行', '世贸组织', '国际能源署'];

function getBeijingParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return parts.reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
}

function getNewsWindow() {
  const nowParts = getBeijingParts(new Date());
  const todayStart = Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day), -8, 0, 0);
  return {
    date: `${nowParts.year}-${nowParts.month}-${nowParts.day}`,
    start: new Date(todayStart - 24 * 60 * 60 * 1000),
    backupStart: new Date(todayStart - 48 * 60 * 60 * 1000),
    end: new Date(todayStart + (8 * 60 + 30) * 60 * 1000)
  };
}

function formatPublishTime(date) {
  const parts = getBeijingParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

function includesAny(title, words) {
  return words.some(word => title.includes(word));
}

function removeRmbAmounts(text) {
  return String(text || '').replace(/人民币\s*\d+(?:\.\d+)?\s*(?:万|万元|亿|亿元)?/g, '');
}

function hasExchangeRateSignal(text) {
  return includesAny(removeRmbAmounts(text), ['人民币汇率', '人民币升值', '人民币贬值', '人民币兑美元', '人民币对美元', '离岸人民币', '在岸人民币', '美元兑人民币', '汇率', '外汇']);
}

function hasMacroFinanceSignal(text) {
  return includesAny(removeRmbAmounts(text), ['就业', '裁员', '工资', '收入', '利率', '央行', '通胀', 'CPI', 'GDP', '房地产', '房价', '油价', '能源', '汇率', '关税', '贸易', '重大产业政策', '金融监管']);
}

function scoreNews(title) {
  let score = 0;
  if (includesAny(title, A_TIER_WORDS)) score += 100;
  if (includesAny(title, B_TIER_WORDS)) score += 70;
  if (includesAny(title, C_TIER_WORDS)) score += 40;
  if (includesAny(title, ANNOUNCEMENT_WORDS)) score += 10;
  return score;
}

function isFinanceRelevant(title) {
  if (includesAny(title, EXCLUDED_WORDS)) return false;
  if (includesAny(title, ['捐赠', '慈善', '慈善总会', '公益', '爱心捐款', '善款', '慰问', '扶贫捐助']) && !hasMacroFinanceSignal(title)) return false;
  if (includesAny(title, LOW_VALUE_EVENT_WORDS) && !includesAny(removeRmbAmounts(title), HARD_FINANCE_WORDS)) return false;
  if (includesAny(title, ['投资', '融资', '收购', '入股', '签约', '合作', '开店', '新品', '公司战略'])
    && !includesAny(title, ['就业', '裁员', '行业监管', '关税', '利率', '房地产', '能源', '通胀', '产业政策', '市场系统性风险'])) return false;
  if (includesAny(removeRmbAmounts(title), FINANCE_RELEVANT_WORDS)) return true;
  if (includesAny(title, ['战争', '制裁', '军事冲突', '中东', '俄罗斯', '乌克兰', '伊朗', '以色列'])) {
    return includesAny(title, ['原油', '能源', '贸易', '金融市场', '供应链', '油价']);
  }
  if (includesAny(title, ['地震', '洪水', '台风', '自然灾害'])) {
    return includesAny(title, ['生产', '能源', '粮食', '运输', '经济']);
  }
  return false;
}

function getFinanceScore(title) {
  const analysisText = removeRmbAmounts(title);
  let score = 0;
  if (includesAny(analysisText, ['利率', 'CPI', 'PPI', 'GDP', '就业', '失业率', '房价', '油价', '汇率'])) score += 50;
  if (includesAny(analysisText, ['股票', '房地产', '收入', '消费', '黄金', '能源'])) score += 40;
  if (includesAny(analysisText, ['贸易', '供应链', '人口', '产业政策'])) score += 25;
  return score;
}

function classifyMixedNews(title) {
  if (includesAny(title, DOMESTIC_WORDS)) return 'domestic';
  if (includesAny(title, INTERNATIONAL_WORDS)) return 'international';
  return null;
}

function classifyNews(text, sourceCategory) {
  const hasDomestic = includesAny(text, DOMESTIC_WORDS);
  const hasInternational = includesAny(text, INTERNATIONAL_WORDS);
  if (hasInternational && (!hasDomestic || /美国.*(?:CPI|通胀|就业|失业|美联储|关税)|美联储|欧洲央行|日本央行/.test(text))) {
    return 'international';
  }
  if (hasDomestic && !hasInternational) return 'domestic';
  if (hasInternational && !hasDomestic) return 'international';
  if (!hasDomestic && !hasInternational && sourceCategory !== 'mixed') return sourceCategory;
  return null;
}

function hasGeopoliticalConflict(text) {
  return includesAny(text, ['中东', '俄罗斯', '乌克兰', '伊朗', '以色列'])
    && includesAny(text, ['战争', '冲突', '军事', '袭击', '导弹', '制裁', '封锁', '停火', '空袭', '战事', '武装', '海峡封锁', '供应中断']);
}

function buildTags(title) {
  const tags = [];
  const add = tag => {
    if (tags.length < 3 && !tags.includes(tag)) tags.push(tag);
  };
  if (includesAny(title, ['美联储', '美国利率', 'CPI', '通胀'])) ['美股', '黄金', '美元'].forEach(add);
  if (hasExchangeRateSignal(title)) ['人民币', '美元'].forEach(add);
  if (includesAny(title, ['原油', 'OPEC', '油价'])) ['原油', '运输成本'].forEach(add);
  if (includesAny(title, ['房地产', '房贷', '楼市', '房价'])) ['房价', '利率'].forEach(add);
  if (includesAny(title, ['就业', '失业'])) ['就业', '消费'].forEach(add);
  if (includesAny(title, ['战争', '制裁', '中东', '军事冲突'])) ['原油', '黄金', '能源'].forEach(add);
  if (includesAny(title, ['央行', '降息', '加息', '利率'])) ['利率', '美元'].forEach(add);
  return tags;
}

function buildImpactText(title) {
  if (hasGeopoliticalConflict(title)) return '可能影响原油、黄金、贸易和全球市场。';
  if (includesAny(title, ['美联储', '降息', '加息', '利率', '欧洲央行'])) return '可能影响美股、黄金、美元和全球利率预期。';
  if (includesAny(title, ['CPI', 'PPI', '通胀', '物价'])) return '可能影响生活成本、利率和市场预期。';
  if (includesAny(title, ['原油', 'OPEC', '油价', '国际能源'])) return '可能影响油价、运输成本和通胀。';
  if (hasExchangeRateSignal(title)) return '可能影响汇率、进口成本和跨境消费。';
  if (includesAny(title, ['房地产', '房贷', '楼市', '房价'])) return '可能影响房价、房贷和居民消费预期。';
  if (includesAny(title, ['就业', '失业'])) return '可能影响居民收入和消费信心。';
  if (includesAny(title, ['地震', '洪水', '台风', '事故', '公共卫生'])) return '可能影响当地交通、生产和居民生活。';
  return '';
}

function cleanDescription(description) {
  return String(description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;/gi, ' ')
    .replace(/(?:责任编辑|来源|免责声明|版权信息)[：:][\s\S]*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function buildPlainText(text) {
  if (includesAny(text, ['CPI', 'PPI', '通胀', '物价'])) return '简单说，就是东西整体涨价的速度仍然比较快。';
  if (includesAny(text, ['美联储', '央行', '欧洲央行', '利率', '降息', '加息'])) return '简单说，就是借钱成本和全球资金价格可能继续受到影响。';
  if (includesAny(text, ['就业', '失业', '工资', '收入'])) return '简单说，就是工作机会和居民收入预期可能发生变化。';
  if (includesAny(text, ['房地产', '房价', '房贷', '楼市'])) return '简单说，就是买房成本和住房市场预期可能受到影响。';
  if (includesAny(text, ['原油', '油价', 'OPEC'])) return '简单说，就是能源变贵或变便宜，可能逐步影响运输和生活成本。';
  if (hasExchangeRateSignal(text)) return '简单说，就是人民币兑换外币的价格发生变化，可能影响进口和出境消费。';
  if (includesAny(text, ['股市', 'A股', '美股', '资本市场'])) return '简单说，就是市场规则或资金环境发生了新的变化。';
  if (hasGeopoliticalConflict(text)) return '简单说，就是地缘风险升高，可能影响能源、贸易和金融市场。';
  return '';
}

function buildImpactItems(text) {
  if (includesAny(text, ['CPI', 'PPI', '通胀', '物价'])) return ['可能影响生活成本', '可能影响利率预期', '可能影响股票、黄金和美元走势'];
  if (includesAny(text, ['美联储', '央行', '欧洲央行', '利率', '降息', '加息'])) return ['可能影响借贷和融资成本', '可能影响全球资金流向', '可能影响股票、黄金和美元'];
  if (includesAny(text, ['房地产', '房价', '房贷', '楼市'])) return ['可能影响房价预期', '可能影响房贷成本', '可能影响居民消费信心'];
  if (includesAny(text, ['就业', '失业', '工资', '收入'])) return ['可能影响工作机会', '可能影响居民收入预期', '可能影响消费信心'];
  if (includesAny(text, ['原油', '油价', 'OPEC'])) return ['可能影响油价', '可能影响运输和生产成本', '可能影响通胀'];
  if (hasExchangeRateSignal(text)) return ['可能影响人民币汇率', '可能影响进口成本', '可能影响出境和跨境消费'];
  if (includesAny(text, ['贸易', '关税', '出口', '进口'])) return ['可能影响进出口', '可能影响企业成本', '可能影响相关商品价格和就业'];
  if (hasGeopoliticalConflict(text)) return ['可能影响原油和能源价格', '可能影响国际贸易和供应链', '可能增加市场避险情绪'];
  return [];
}

function buildRelationSteps(text) {
  if (includesAny(text, ['CPI', 'PPI', '通胀', '物价'])) return ['通胀偏高', '降息空间可能变小', '利率可能维持较高', '影响市场和生活成本'];
  if (includesAny(text, ['降息', '降准'])) return ['央行降低利率', '借钱成本下降', '资金环境变宽松', '可能影响房贷、消费和市场'];
  if (includesAny(text, ['房地产', '房价', '房贷', '楼市'])) return ['房地产政策或数据变化', '住房市场预期变化', '买房和房贷决策受影响', '进一步影响居民消费'];
  if (includesAny(text, ['就业', '失业', '工资', '收入'])) return ['就业情况变化', '居民收入预期变化', '消费意愿变化', '进一步影响经济'];
  if (includesAny(text, ['原油', '油价', 'OPEC'])) return ['原油价格变化', '运输和生产成本变化', '部分商品成本变化', '可能影响生活成本'];
  if (hasExchangeRateSignal(text)) return ['人民币汇率变化', '进口商品成本变化', '跨境消费成本变化', '可能影响居民和企业支出'];
  if (hasGeopoliticalConflict(text)) return ['地缘风险上升', '能源和贸易受扰动', '成本和市场预期变化', '影响油价、黄金和全球市场'];
  return [];
}

function getRssItems(xml) {
  const parsed = new XMLParser({ removeNSPrefix: true }).parse(xml);
  const channel = parsed && parsed.rss && parsed.rss.channel;
  const items = channel && channel.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function getImageUrl(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return String(value.url || value.href || value['@_url'] || value['@_href'] || value['#text'] || '').trim();
  }
  return '';
}

function resolveImageUrl(imageUrl, sourceUrl) {
  if (!imageUrl) return '';
  try {
    const url = new URL(imageUrl, sourceUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (err) {
    return '';
  }
}

function getRssImageUrl(item, sourceUrl) {
  const imageFields = [
    item['media:content'],
    item['media:thumbnail'],
    item.mediaContent,
    item.mediaThumbnail,
    item.content,
    item.thumbnail,
    item.enclosure,
    item.image
  ];
  for (const field of imageFields) {
    const imageUrl = resolveImageUrl(getImageUrl(Array.isArray(field) ? field[0] : field), sourceUrl);
    if (imageUrl) return imageUrl;
  }
  return '';
}

function getArticleMeta(html, sourceUrl) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  let twitterImage = '';
  let publishedAt = '';
  for (const tag of metaTags) {
    const property = (tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const content = (tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!property || !content) continue;
    if (property.toLowerCase() === 'og:image') twitterImage = resolveImageUrl(content, sourceUrl);
    if (property.toLowerCase() === 'twitter:image' && !twitterImage) twitterImage = resolveImageUrl(content, sourceUrl);
    if (['article:published_time', 'publishdate', 'pubdate', 'date'].includes(property.toLowerCase())) publishedAt = content;
  }
  if (!publishedAt) {
    const jsonLd = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const script of jsonLd) {
      const dateMatch = script.match(/"datePublished"\s*:\s*"([^"]+)"/i);
      if (dateMatch) {
        publishedAt = dateMatch[1];
        break;
      }
    }
  }
  if (!publishedAt) {
    const dateMatch = html.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?\s+\d{1,2}:\d{2})/);
    if (dateMatch) publishedAt = dateMatch[1].replace(/[年月]/g, '-').replace('日', '');
  }
  const date = publishedAt ? new Date(publishedAt) : null;
  return { imageUrl: twitterImage, publishedAt: date && !isNaN(date.getTime()) ? date : null };
}

async function fetchArticleMeta(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`图片页面请求失败，状态码: ${response.status}`);
  return getArticleMeta(await response.text(), sourceUrl);
}

async function fetchRss(source) {
  const response = await fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  return getRssItems(await response.text());
}

async function fetchHtmlNewsSource(sourceConfig) {
  const response = await fetch(sourceConfig.url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
  const html = await response.text();
  const links = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  const items = [];
  const seen = new Set();
  for (const link of links) {
    const href = (link.match(/\bhref=["']([^"']+)["']/i) || [])[1];
    const title = link.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(?:\s*(?:昨天\s*)?\d{1,2}:\d{2}|\s*\d+\s*(?:小时前|分钟前)|\s*\d+(?:\.\d+)?万|\s*浏览(?:量)?\s*\d{1,})+\s*$/i, '')
      .replace(/\s*\d{5,}\s*$/, '')
      .trim();
    const sourceUrl = resolveImageUrl(href, sourceConfig.url);
    if (!title || title.length < 12 || !sourceUrl || seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    items.push({ title, sourceUrl });
  }
  return items;
}

function isDuplicate(candidate, selected) {
  const getBigrams = title => {
    const bigrams = new Set();
    for (let index = 0; index < title.length - 1; index++) bigrams.add(title.slice(index, index + 2));
    return bigrams;
  };
  const candidateBigrams = getBigrams(candidate.normalizedTitle);
  return selected.some(item => {
    if (item.normalizedTitle === candidate.normalizedTitle
      || (candidate.normalizedTitle.length >= 12
        && item.normalizedTitle.length >= 12
        && (item.normalizedTitle.includes(candidate.normalizedTitle)
          || candidate.normalizedTitle.includes(item.normalizedTitle)))) return true;
    const itemBigrams = getBigrams(item.normalizedTitle);
    let shared = 0;
    candidateBigrams.forEach(bigram => {
      if (itemBigrams.has(bigram)) shared++;
    });
    return shared >= 5 && shared / Math.min(candidateBigrams.size, itemBigrams.size) >= 0.6;
  });
}

exports.main = async () => {
  const { date, start, backupStart, end } = getNewsWindow();
  const errors = [];
  const candidates = [];
  const stats = {
    rawCount: 0,
    timeMatchedCount: 0,
    financeMatchedCount: 0,
    categorizedCount: 0
  };
  let successfulSources = 0;

  for (const sourceConfig of RSS_SOURCES) {
    try {
      const items = await fetchRss(sourceConfig);
      successfulSources++;
      stats.rawCount += items.length;
      for (const item of items) {
        const title = String(item.title || '').trim();
        const description = String(item.description || item.summary || '').trim();
        const analysisText = `${title} ${description}`;
        const sourceUrl = getImageUrl(item.link);
        const publishedAt = new Date(item.pubDate || item.date || item.published || '');
        if (!title || !sourceUrl || isNaN(publishedAt.getTime()) || publishedAt < backupStart || publishedAt > end) continue;
        stats.timeMatchedCount++;
        if (!isFinanceRelevant(analysisText)) continue;
        stats.financeMatchedCount++;
        const importanceScore = scoreNews(analysisText);
        const category = classifyNews(analysisText, sourceConfig.category);
        if (!category) continue;
        stats.categorizedCount++;
        let imageUrl = getRssImageUrl(item, sourceUrl);
        candidates.push({
          title,
          source: sourceConfig.source,
          sourceUrl: String(sourceUrl),
          publishTime: formatPublishTime(publishedAt),
          importanceScore,
          financeScore: getFinanceScore(analysisText),
          tags: buildTags(analysisText),
          impactText: buildImpactText(analysisText),
          eventSummary: cleanDescription(description) || title,
          plainText: buildPlainText(analysisText),
          impactItems: buildImpactItems(analysisText),
          relationSteps: buildRelationSteps(analysisText),
          imageUrl,
          category,
          normalizedTitle: normalizeTitle(title),
          publishedAt,
          isRecent: publishedAt >= start
        });
      }
    } catch (err) {
      errors.push({ source: sourceConfig.source, url: sourceConfig.url, error: err.message || String(err) });
    }
  }

  for (const sourceConfig of HTML_SOURCES) {
    try {
      const items = await fetchHtmlNewsSource(sourceConfig);
      successfulSources++;
      for (const item of items) {
        const title = String(item.title || '').trim();
        if (!isFinanceRelevant(title)) continue;
        const category = classifyNews(title, sourceConfig.category);
        if (!category) continue;
        candidates.push({
          title,
          source: sourceConfig.source,
          sourceUrl: item.sourceUrl,
          publishTime: '',
          importanceScore: scoreNews(title),
          financeScore: getFinanceScore(title),
          tags: buildTags(title),
          impactText: buildImpactText(title),
          eventSummary: title,
          plainText: buildPlainText(title),
          impactItems: buildImpactItems(title),
          relationSteps: buildRelationSteps(title),
          imageUrl: '',
          category,
          normalizedTitle: normalizeTitle(title),
          publishedAt: end,
          isRecent: true
        });
      }
    } catch (err) {
      errors.push({ source: sourceConfig.source, url: sourceConfig.url, error: err.message || String(err) });
    }
  }

  if (successfulSources === 0) {
    return { success: false, date, domesticCount: 0, internationalCount: 0, candidateCount: 0, errors, stats };
  }

  const compareCandidates = (a, b) => b.importanceScore - a.importanceScore
    || b.financeScore - a.financeScore
    || b.publishedAt - a.publishedAt
    || (a.source === '新华网' ? -1 : 1);
  const selectCategory = category => {
    const selected = [];
    const categoryCandidates = candidates.filter(item => item.category === category).sort(compareCandidates);
    categoryCandidates.filter(item => item.isRecent).forEach(candidate => {
      if (selected.length < 5 && !isDuplicate(candidate, selected)) selected.push(candidate);
    });
    return selected;
  };

  const toRecord = item => ({
    title: item.title,
    source: item.source,
    sourceUrl: item.sourceUrl,
    publishTime: item.publishTime,
    importanceScore: item.importanceScore,
    tags: item.tags,
    impactText: item.impactText,
    eventSummary: item.eventSummary,
    plainText: item.plainText,
    impactItems: item.impactItems,
    relationSteps: item.relationSteps,
    imageUrl: item.imageUrl
  });
  const selectedNews = selectCategory('domestic').concat(selectCategory('international'));
  await Promise.all(selectedNews.map(async item => {
    try {
      const meta = await fetchArticleMeta(item.sourceUrl);
      if (!item.imageUrl) item.imageUrl = meta.imageUrl;
      if (!item.publishTime && meta.publishedAt) item.publishTime = formatPublishTime(meta.publishedAt);
    } catch (err) {
      if (!item.imageUrl) item.imageUrl = '';
    }
  }));
  const domestic = selectedNews.filter(item => item.category === 'domestic').map(toRecord);
  const international = selectedNews.filter(item => item.category === 'international').map(toRecord);
  const record = {
    date,
    cutoffText: '截至08:30',
    domestic,
    international,
    updatedAt: db.serverDate()
  };
  const collection = db.collection('news_daily');
  const existing = await collection.where({ date }).get();
  if (existing.data && existing.data.length > 0) {
    await collection.doc(existing.data[0]._id).update({ data: record });
  } else {
    await collection.add({ data: record });
  }

  return {
    success: true,
    date,
    domesticCount: domestic.length,
    internationalCount: international.length,
    candidateCount: candidates.length,
    errors,
    stats
  };
};
