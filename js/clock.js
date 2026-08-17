/* ---------------------------------------------------------------
 * 电子钟 · 自托管修补版
 * 原文件：https://cdn.jsdelivr.net/npm/hexo-butterfly-clock/lib/clock.min.js
 * 2026-08-18 重写，插件已多年未维护（npm 上仍停在 1.0.7）。
 *
 * 原版的问题：
 *   fetch('https://wttr.in/<ip>?format=...') 拿到什么就往界面上填，不做任何校验。
 *   而 wttr.in 只对 curl 一类的 UA 返回纯文本，对浏览器返回的是完整 HTML 页面
 *   —— 于是页面里的 `body{ margin:0; padding:0; background:#000000 ... }`
 *   被当成天气数据注入，就是首页那串乱码的来源。
 *   另外 returnCitySN 取不到时（搜狐接口返回回环地址或加载失败）整段会直接抛错。
 *
 * 这一版的策略：
 *   1. 时钟先渲染出来（日期 / 时间 / AM·PM 不依赖任何外部接口）
 *   2. 天气单独异步取，校验通过才填进去；取不到就安静地不显示，绝不吐原文
 *   3. 任何一步出错都不影响时钟本身
 * --------------------------------------------------------------- */
(function () {
  var box = document.getElementById('hexo_electric_clock');
  if (!box) return;

  var WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function pad(num, digit) {
    var zero = '';
    for (var i = 0; i < digit; i++) zero += '0';
    return (zero + num).slice(-digit);
  }

  /* ---------- 1. 先把时钟骨架渲染出来 ---------- */
  var loading = document.getElementById('card-clock-loading');
  if (loading) loading.innerHTML = '';

  box.innerHTML =
    '<div class="clock-row">' +
      '<span id="card-clock-clockdate" class="card-clock-clockdate"></span>' +
      '<span id="card-clock-weather" class="card-clock-weather"></span>' +
      '<span id="card-clock-humidity" class="card-clock-humidity"></span>' +
    '</div>' +
    '<div class="clock-row">' +
      '<span id="card-clock-time" class="card-clock-time"></span>' +
    '</div>' +
    '<div class="clock-row">' +
      '<span id="card-clock-ip" class="card-clock-ip"></span>' +
      '<span id="card-clock-location" class="card-clock-location"></span>' +
      '<span id="card-clock-dackorlight" class="card-clock-dackorlight"></span>' +
    '</div>';

  function updateTime() {
    var d = new Date();
    var t = pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
    var date = pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + ' ' + WEEK[d.getDay()];
    var h = d.getHours();
    var ampm = h > 12 ? ' PM' : ' AM';

    var $t = document.getElementById('card-clock-time');
    if (!$t) return;
    $t.innerHTML = t;
    document.getElementById('card-clock-clockdate').innerHTML = date;
    document.getElementById('card-clock-dackorlight').innerHTML = ampm;
  }

  updateTime();
  setInterval(updateTime, 1000);

  /* ---------- 2. IP：取不到就不显示，不写回环地址 ---------- */
  var ip = '';
  try {
    if (typeof returnCitySN !== 'undefined' && returnCitySN && returnCitySN.cip) {
      ip = String(returnCitySN.cip);
    }
  } catch (e) { /* 接口没加载，忽略 */ }

  // 回环地址和内网地址没有展示意义
  if (/^(127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) ip = '';
  if (ip) document.getElementById('card-clock-ip').innerHTML = ip;

  /* ---------- 3. 天气：校验通过才填 ---------- */
  if (!ip) return; // 没有可用 IP 就不查天气

  fetch('https://wttr.in/' + encodeURIComponent(ip) + '?format=%l|%c|%t|%h')
    .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(function (raw) {
      var text = (raw || '').trim();

      // 关键防线：wttr.in 对浏览器会返回整页 HTML，必须挡住
      if (!text || text.length > 120 || /[<>{}]/.test(text)) return;

      var parts = text.replace(/"/g, '').split('|');
      if (parts.length < 4) return;

      var location = parts[0].trim();
      var cond = parts[1].trim();
      var temp = parts[2].trim();
      var humidity = parts[3].trim();

      // wttr.in 查不到时会返回 "not found" 之类
      if (/not found|unknown|error/i.test(text)) return;

      if (cond || temp) {
        document.getElementById('card-clock-weather').innerHTML = (cond + ' ' + temp).trim();
      }
      if (humidity) {
        document.getElementById('card-clock-humidity').innerHTML = '💧 ' + humidity;
      }
      if (location) {
        document.getElementById('card-clock-location').innerHTML = location;
      }
    })
    .catch(function () { /* 天气取不到就算了，时钟照常走 */ });
})();
