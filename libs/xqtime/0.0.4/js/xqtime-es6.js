/*
* author: fegq,
* time: 2021-11-12,
* version: 0.0.1,
* name: 时间个性化显示js插件,
* params {
*   time:Date = 时间(1.YYYY-MM-DD HH:MM:SS 2.GMT),
*   append: Boolean = 是否附带YYYY-MM-DD HH:MM:SS格式
*},
*return String XX时间前
*github: https://github.com/gitguanqi/xqtime.git
*/
function formdateTime (time, append = false) {
    let currentTime = new Date().getTime(); // 当前时间
    let newTime = new Date(time).getTime(); // 新时间
    let diff = (currentTime - newTime)/1000; // 时间差值
    let standars = [
        60, // 超过1分钟
        60*60, // 超过1小时
        60*60*24, // 超过1天
        60*60*24*30, // 超过1月
        60*60*24*365, // 超过1年
        60*60*24*365*100, // 超过1个世纪
        60*60*24*365*100*10, // 超过1千年
        60*60*24*365*100*100, // 超过1万年
        60*60*24*365*100*100*10000, // 超过1亿年
    ]
    let newType,newNum; // 类型，数值
    for(let i=0; i<standars.length;i++) {
        if (diff < standars[i]) {
            newType = i;
            newNum = i === 0 ? 0 : diff / standars[i-1];
            break;
        }
    }
    newNum = parseInt(newNum);
    let timeStr = {
        show: '',
        append: '',
    }
    timeStr.show = showTime(newType, newNum);
    if (append) {
        timeStr.append = appendTime(newType, time);
    }
    let result = append ? `${timeStr.show}(${timeStr.append})` : timeStr.show;
    return result;
}

// 获取个性化时间文本
function showTime(type, num) {
    let types = ['刚刚', '分钟前','小时前', '天前', '月前', '年前', '世纪前', '千年前', '万年前', '亿年前']; // 文本
    let text = type == 0 ? types[0] : `${num}${types[type]}`; // 时间拼合
    return text;
}

// 附带时间
function appendTime (type, time) { // type 类型，time时间，
    let newTime = new Date(time);
    let sec = newTime.getSeconds(); // 秒
    let min = newTime.getMinutes(); // 分
    let hour = newTime.getHours(); // 时
    let day = newTime.getDay(); // 日
    let mon = newTime.getMonth(); // 月
    let year = newTime.getFullYear(); // 年
    sec = sec < 10 ? `0${sec}` : sec;
    min = min < 10 ? `0${min}` : min;
    hour = hour < 10 ? `0${hour}` : hour;
    day = day < 10 ? `0${day}` : day;
    mon = mon < 10 ? `0${mon}` : mon;
    let types = {
        3: `${hour}:${min}:${sec}`,
        5: `${mon}-${day}`,
        6: `${year}-${mon}-${day}`, 
    }
    let result = '';
    for (const key in types) {
        if (type < key) {
            result = types[key];
            break;
        }
    }
    return result;
}

const xqtime = {
    friend: formdateTime,
}

export default xqtime;
