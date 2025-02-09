/*
 * @Author: fegq
 * @Date: 2022-10-02 11:48:04
 * @LastEditors: fegq
 * @LastEditTime:2022-10-02 10:03:32
 * @Description: This is a mourn js!
 * @Version: 0.0.1
 */
(function xqMourn () {
    let xqmourn = document.getElementById('xqmourn');
    let dates = xqmourn.dataset.date;
    let now = new Date();
    let mouth = now.getMonth()+1;
    let day = now.getDate();
    let date = mouth.toString()+'.'+day.toString();
    let mourns = ['12.13', '7.7'];
    if (dates && dates.split(',').length) {
        mourns = dates.split(',');
    }

    if (mourns.includes(date)) {
        document.documentElement.style = 'filter: gray; filter: grayscale(1)';
    } else {
        document.documentElement.style = '';
    }
})();