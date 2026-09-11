const fontSizeMap = {
  small: "小",
  standard: "标准",
  large: "大"
};

const cacheKeys = ["marketCache", "newsCache", "lifeCache"];

Page({
  data: {
    version: "1.0.0",
    selectedCity: "上海",
    fontSize: "standard",
    fontSizeText: "标准",
    notificationEnabled: false,
    cacheSize: "0 KB",
    showSheet: false,
    sheetType: "",
    cities: ["北京", "上海", "广州", "深圳", "杭州", "南京", "成都", "武汉", "西安", "长沙", "重庆", "天津"],
    fontOptions: [
      { key: "small", label: "小" },
      { key: "standard", label: "标准" },
      { key: "large", label: "大" }
    ],
    selectedCityTemp: "",
    selectedFontTemp: ""
  },

  onLoad() {
    this.loadSettings();
    this.loadCacheSize();
  },

  loadSettings() {
    const selectedCity = wx.getStorageSync("selectedCity") || "上海";
    const fontSize = wx.getStorageSync("appFontSize") || "standard";
    const notificationEnabled = wx.getStorageSync("notificationEnabled") === true;
    this.setData({
      selectedCity: selectedCity,
      fontSize: fontSize,
      fontSizeText: fontSizeMap[fontSize] || fontSizeMap.standard,
      notificationEnabled: notificationEnabled
    });
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
    const city = this.data.selectedCityTemp || "上海";
    wx.setStorageSync("selectedCity", city);
    this.setData({ selectedCity: city, showSheet: false, sheetType: "" });
  },

  openFontSelector() {
    this.setData({ showSheet: true, sheetType: "font", selectedFontTemp: this.data.fontSize });
  },

  selectFont(e) {
    this.setData({ selectedFontTemp: e.currentTarget.dataset.font });
  },

  saveFontSize() {
    const fontSize = this.data.selectedFontTemp || "standard";
    wx.setStorageSync("appFontSize", fontSize);
    this.setData({
      fontSize: fontSize,
      fontSizeText: fontSizeMap[fontSize] || fontSizeMap.standard,
      showSheet: false,
      sheetType: ""
    });
  },

  onNotificationChange(e) {
    const enabled = e.detail.value === true;
    wx.setStorageSync("notificationEnabled", enabled);
    this.setData({ notificationEnabled: enabled });
    if (enabled) {
      // TODO: 配置微信订阅消息模板后接入 wx.requestSubscribeMessage
      wx.showToast({ title: "已保存，提醒功能稍后开放", icon: "none" });
    }
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
