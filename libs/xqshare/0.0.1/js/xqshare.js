/* 
author: fegq,
name: 分享组件
params: 
type: 类型，
url:网址
title:标题
*/
function xqShare(type, url, title, des) {
  let types = {
    // qq
    qq: function (url, title) {
      return `https://connect.qq.com/widget/shareqq/iframe_index.html?url=${url}&title=${title}`;
    },
    // qq空间
    qzone: function (url, title) {
      return `http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}&site=${url}&desc=${des}`;
    },
    // 微信
    wechat: function (url, title) {
      return "";
    },
    // 微博
    weibo: function (url, title) {
      return `http://service.weibo.com/share/share.php?url=${url}&title=${title}&language=zh_cn`;
    },
    // 豆瓣
    douban: function (url, title) {
      return `http://shuo.douban.com/!service/share?href=${url}&name=${title}`;
    },
    // 百度贴吧
    tieba: function (url, title) {
      return `http://tieba.baidu.com/f/commit/share/openShareApi?title=${title}&url=${url}`;
    },
  };
  let shareUrl = types[type](url, title);
  window.open(shareUrl, "_blank");
}
