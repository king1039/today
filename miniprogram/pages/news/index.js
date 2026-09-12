function formatCardTime(publishTime) {
  const date = new Date(String(publishTime || '').replace(' ', 'T'));
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const newsDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (newsDay.getTime() === today.getTime()) return time;
  if (newsDay.getTime() === yesterday.getTime()) return `昨天 ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

function prepareNews(list) {
  return list.map(function (news, index) {
    return Object.assign({}, news, {
      id: news.sourceUrl || `${news.title}-${index}`,
      imageFailed: false,
      timeText: news.publishTime || '',
      cardTime: formatCardTime(news.publishTime),
      summary: news.impactText || '',
      eventSummary: news.eventSummary || news.impactText || news.title || '',
      plainText: news.plainText || news.eventSummary || news.impactText || '',
      impactItems: Array.isArray(news.impactItems) && news.impactItems.length
        ? news.impactItems
        : (news.impactText ? [news.impactText] : []),
      relationSteps: Array.isArray(news.relationSteps) ? news.relationSteps : []
    });
  });
}

Page({
  data: {
    activeNewsType: "international",
    internationalNews: [],
    domesticNews: [],
    currentNewsList: [],
    topNews: [],
    selectedNews: null,
    showNewsDetail: false
  },

  onShow() {
    this.loadDailyNews();
  },

  async loadDailyNews() {
    try {
      const result = await wx.cloud.database()
        .collection("news_daily")
        .orderBy("date", "desc")
        .limit(1)
        .get();
      const dailyNews = result.data && result.data[0];
      const internationalNews = prepareNews(dailyNews && Array.isArray(dailyNews.international) ? dailyNews.international : []);
      const domesticNews = prepareNews(dailyNews && Array.isArray(dailyNews.domestic) ? dailyNews.domestic : []);
      const isInternational = this.data.activeNewsType === "international";
      const currentNewsList = isInternational ? internationalNews : domesticNews;
      this.setData({
        internationalNews,
        domesticNews,
        currentNewsList,
        topNews: currentNewsList.map((news, index) => ({ index, label: news.title }))
      });
    } catch (err) {
      console.error("loadDailyNews error:", err);
      this.setData({
        internationalNews: [],
        domesticNews: [],
        currentNewsList: [],
        topNews: []
      });
    }
  },

  switchNewsType(e) {
    const type = e.currentTarget.dataset.type;
    const isInternational = type === "international";
    const currentNewsList = isInternational ? this.data.internationalNews : this.data.domesticNews;
    this.setData({
      activeNewsType: type,
      currentNewsList,
      topNews: currentNewsList.map((news, index) => ({ index, label: news.title }))
    });
  },

  openNewsDetail(e) {
    const index = e.currentTarget.dataset.index;
    const news = this.data.currentNewsList[index];
    if (!news) return;
    this.setData({
      selectedNews: news,
      showNewsDetail: true
    });
  },

  closeNewsDetail() {
    this.setData({ showNewsDetail: false });
  },

  openTopNews(e) {
    const index = e.currentTarget.dataset.index;
    this.openNewsDetail({ currentTarget: { dataset: { index } } });
  },

  handleImageError(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.currentNewsList.slice();
    if (!list[index]) return;
    list[index].imageFailed = true;
    const updateData = { currentNewsList: list };
    if (this.data.activeNewsType === "international") updateData.internationalNews = list;
    else updateData.domesticNews = list;
    this.setData(updateData);
  },

  handleDetailImageError() {
    const selectedNews = Object.assign({}, this.data.selectedNews, { imageFailed: true });
    this.setData({ selectedNews });
  },

  noop() {}
});
