const internationalNews = [
  {
    id: 1,
    title: "美国公布通胀数据高于市场预期",
    timeText: "2小时前",
    summary: "美国物价上涨速度比大家原来预计的快一些，市场开始重新考虑未来降息速度。",
    image: "/images/news/us-cpi.jpg",
    tags: ["美股", "黄金", "美元"],
    source: "公开信息整理",
    publishTime: "2026-09-09 06:30",
    whatHappened: "美国公布了最新通胀数据，结果高于市场此前的普遍预期。",
    plainExplain: "简单说，美国东西涨价的速度还没有大家原来想象得那么慢。",
    impacts: ["美股：市场情绪可能受到影响", "美元：可能出现波动", "黄金：可能受到利率预期变化影响"],
    relationText: "美国通胀数据 → 市场重新判断降息速度 → 美股、美元、黄金可能出现变化"
  },
  {
    id: 2,
    title: "国际油价继续上涨",
    timeText: "5小时前",
    summary: "受到国际局势和供应变化影响，原油价格最近继续上涨。",
    image: "/images/news/oil.jpg",
    tags: ["原油", "油价", "运输成本"],
    source: "公开信息整理",
    publishTime: "2026-09-09 03:20",
    whatHappened: "国际原油价格近期继续上涨。",
    plainExplain: "简单说，生产汽油、柴油的重要原料变贵了一些。",
    impacts: ["国内油价：后续调价可能受到影响", "运输：物流成本可能变化", "航空：燃油成本可能变化"],
    relationText: "国际原油上涨 → 能源成本变化 → 国内油价和运输成本可能受到影响"
  },
  {
    id: 3,
    title: "欧洲央行释放最新利率信号",
    timeText: "8小时前",
    summary: "欧洲央行表示会继续观察通胀和经济变化，目前没有急着大幅调整政策。",
    image: "/images/news/europe.jpg",
    tags: ["欧洲", "利率", "汇率"],
    source: "公开信息整理",
    publishTime: "2026-09-09 00:30",
    whatHappened: "欧洲央行公布了最新的政策态度。",
    plainExplain: "简单说，欧洲暂时还是边走边看，不急着大幅调整利率。",
    impacts: ["欧元：可能出现波动", "美元：可能间接受影响", "全球市场：可能关注欧洲后续经济数据"],
    relationText: "欧洲利率预期变化 → 欧元和美元可能变化 → 全球市场情绪可能受到影响"
  }
];

const domesticNews = [
  {
    id: 101,
    title: "国内发布房地产新政策",
    timeText: "1小时前",
    summary: "部分城市调整房地产相关政策，买房人的贷款和购房条件可能发生变化。",
    image: "/images/news/china-house.jpg",
    tags: ["楼市", "房贷", "住房"],
    source: "公开政策资料整理",
    publishTime: "2026-09-09 07:30",
    whatHappened: "有关部门发布新的房地产相关政策。",
    plainExplain: "简单说，部分买房人的购房条件和贷款成本可能发生变化。",
    impacts: ["楼市：市场关注度可能提高", "房贷：部分人的贷款条件可能变化", "银行：相关业务可能受到影响"],
    relationText: "房地产政策变化 → 买房成本和条件可能变化 → 楼市成交可能受到影响"
  },
  {
    id: 102,
    title: "央行公布最新金融数据",
    timeText: "3小时前",
    summary: "最新金融数据反映出市场资金和信贷活动的变化，后续情况值得继续留意。",
    image: "",
    tags: ["金融", "信贷", "经济"],
    source: "公开信息整理",
    publishTime: "2026-09-09 05:30",
    whatHappened: "中国人民银行公布了最新金融数据。",
    plainExplain: "简单说，这些数据可以帮助大家了解借钱、存钱和市场资金的大致变化。",
    impacts: ["贷款：资金使用情况可能变化", "消费：市场可能关注需求变化", "经济：后续数据仍需继续观察"],
    relationText: "金融数据变化 → 市场了解资金情况 → 经济活动可能受到关注"
  },
  {
    id: 103,
    title: "国家统计局公布最新物价数据",
    timeText: "6小时前",
    summary: "最新物价数据展示了生活成本的变化，食品、居住和出行等项目值得关注。",
    image: "/images/news/china-cpi.jpg",
    tags: ["物价", "消费", "生活"],
    source: "公开信息整理",
    publishTime: "2026-09-09 02:30",
    whatHappened: "国家统计局公布了最新居民消费价格相关数据。",
    plainExplain: "简单说，这些数据反映了日常生活中不少商品和服务价格的变化。",
    impacts: ["生活成本：部分开支可能变化", "消费：居民消费情况可能受到关注", "政策：后续政策判断可能参考这些数据"],
    relationText: "物价数据变化 → 生活成本受到关注 → 消费和政策可能出现相应变化"
  },
  {
    id: 104,
    title: "国内成品油调价窗口即将开启",
    timeText: "9小时前",
    summary: "国内成品油新一轮调价窗口临近，国际油价变化可能影响后续调整。",
    image: "/images/news/china-oil.jpg",
    tags: ["油价", "出行", "运输"],
    source: "公开信息整理",
    publishTime: "2026-09-08 23:30",
    whatHappened: "国内成品油新一轮价格调整窗口即将开启。",
    plainExplain: "简单说，后续加油价格是否变化，要看国际油价和调价规则的综合结果。",
    impacts: ["车主：用车成本可能变化", "运输：物流费用可能受到关注", "物价：部分商品成本可能间接受影响"],
    relationText: "国际油价变化 → 成品油调价窗口开启 → 出行和运输成本可能受到影响"
  }
];

function prepareNews(list) {
  return list.map(function (news) {
    return Object.assign({}, news, { imageFailed: false });
  });
}

Page({
  data: {
    activeNewsType: "international",
    internationalNews: prepareNews(internationalNews),
    domesticNews: prepareNews(domesticNews),
    currentNewsList: prepareNews(internationalNews),
    topNews: [
      { index: 0, label: "美国通胀" },
      { index: 1, label: "国际油价" },
      { index: 2, label: "欧洲利率" }
    ],
    selectedNews: null,
    showNewsDetail: false
  },

  switchNewsType(e) {
    const type = e.currentTarget.dataset.type;
    const isInternational = type === "international";
    this.setData({
      activeNewsType: type,
      currentNewsList: isInternational ? this.data.internationalNews : this.data.domesticNews,
      topNews: isInternational
        ? [{ index: 0, label: "美国通胀" }, { index: 1, label: "国际油价" }, { index: 2, label: "欧洲利率" }]
        : [{ index: 0, label: "房地产政策" }, { index: 2, label: "国内物价" }, { index: 3, label: "成品油调价" }]
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
    this.openNewsDetail({ currentTarget: { dataset: { index: index } } });
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
    this.setData({ selectedNews: selectedNews });
  },

  noop() {}
});
