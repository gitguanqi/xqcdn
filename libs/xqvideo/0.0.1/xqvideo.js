/*
 * @Author: fegq
 * @Date: 2021-11-28 11:48:04
 * @LastEditors: fegq
 * @LastEditTime: 2021-11-28 11:48:05
 * @Description: This is a file comment!
 * @Version: 
 */
/**
 * 
 * @param {*} video 视频元素
 * type 视频格式（mp4,m3u8,flv）
 * url 视频地址
 * poster 视频封面
 */
function xqVideo ({
    video, type, url, poster 
}) {
    if (video) {
        if (type && ['mp4', 'flv', 'm3u8'].includes(type)) {

            // mp4播放
            if (type == 'mp4') {
                video.src = url;
            }
            // m3u8格式播放
            if (type == 'm3u8') {
                if (Hls.isSupported()) {
                    var hls = new Hls();
                    // bind them together
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                    hls.loadSource(url);
                    hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                            console.log(
                            'manifest loaded, found ' + data.levels.length + ' quality level'
                            );
                        });
                    });
                } else {
                    console.error('tip: m3u8 video play error!');
                }
            }
            // flv播放
            if (type == 'flv') {
                if (flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({
                        type: 'flv',
                        url,
                    });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                    flvPlayer.play();
                } else {
                    console.error('tip: flv video play error!');
                }
            }
        } else {
            console.error('tip: type error!');
        }

        // 设置海报
        if (poster) {
            video.setAttribute('poster', poster);
        }
    } else {
        console.error('tip: video not null!');
    }
}