const cacheKeys = ["marketCache", "newsCache", "lifeCache"];

Page({
  data: {
    version: "1.0.0",
    selectedCity: "上海",
    cacheSize: "0 KB",
    showSheet: false,
    sheetType: "",
    cities: ["北京", "上海", "广州", "深圳", "杭州", "南京", "成都", "武汉", "西安", "长沙", "重庆", "天津"],
    selectedCityTemp: ""
  },

  onLoad() {
    this.loadSettings();
    this.loadCacheSize();
  },

  loadSettings() {
    const selectedCity = wx.getStorageSync("selectedCity") || "上海";
    this.setData({ selectedCity: selectedCity });
  },

  loadCacheSize() {
    wx.getStorageInfo({
      success: (result) => {
        const size = Number(result.currentSize) || 0;
        this.setData({ cacheSize: size < 1024 ? size + " KB" : (size / 1024).toFixed(1) + " MB" });
      },
      fail: () => {
        this.setData({ cacheSize: "0 KB" });
      }
    });
  },

  openCitySelector() {
    this.setData({ showSheet: true, sheetType: "city", selectedCityTemp: this.data.selectedCity });
  },

  selectCity(e) {
    this.setData({ selectedCityTemp: e.currentTarget.dataset.city });
  },

  saveCity() {
    const cityName = this.data.selectedCityTemp || "上海";
    wx.setStorageSync("selectedCity", cityName);
    this.setData({ selectedCity: cityName, showSheet: false, sheetType: "" });
  },

  openDataSources() {
    this.setData({ showSheet: true, sheetType: "sources" });
  },

  openAbout() {
    this.setData({ showSheet: true, sheetType: "about" });
  },

  openPrivacy() {
    this.setData({ showSheet: true, sheetType: "privacy" });
  },

  openUsageGuide() {
    this.setData({ showSheet: true, sheetType: "usage" });
  },

  closeSheet() {
    this.setData({ showSheet: false, sheetType: "" });
  },

  stopPropagation() {},

  clearCache() {
    cacheKeys.forEach((key) => wx.removeStorageSync(key));
    wx.showToast({ title: "缓存已清理", icon: "success" });
    this.loadCacheSize();
  }
});
