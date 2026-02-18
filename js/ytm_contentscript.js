/**
 * ytm_contentscript.js — YouTube Music content script (MV3)
 */

// Default settings used in content script context
var CS_SETTINGS = {
    refresh_interval: 2
};

// ---------------------------------------------------------------------------
// Player / Parser classes
// ---------------------------------------------------------------------------

function Player(parser) {
    this.has_song   = parser._get_has_song();
    this.is_playing = parser._get_is_playing();
    this.song = {
        position:     parser._get_song_position(),
        time:         parser._get_song_time(),
        title:        parser._get_song_title(),
        artist:       parser._get_song_artist(),
        album_artist: parser._get_album_artist(),
        album:        parser._get_song_album(),
        cover:        parser._get_song_cover()
    };
}

var YtMusicParser = function() {};

YtMusicParser.prototype._get_has_song = function() {
    return $('yt-formatted-string.title.ytmusic-player-bar').text().length > 0;
};

YtMusicParser.prototype._get_is_playing = function() {
    var songTitle = this._get_song_title();
    return songTitle.length > 0 && window.document.title.startsWith(songTitle);
};

YtMusicParser.prototype._get_song_position = function() {
    var _time = $('span.time-info').text().split('/')[0];
    _time = $.trim(_time).split(':');
    if (_time.length === 2) return parseInt(_time[0]) * 60 + parseInt(_time[1]);
    if (_time.length === 3) return parseInt(_time[0]) * 3600 + parseInt(_time[1]) * 60 + parseInt(_time[2]);
    return null;
};

YtMusicParser.prototype._get_song_time = function() {
    var _time = $('span.time-info').text().split('/')[1];
    _time = $.trim(_time).split(':');
    if (_time.length === 2) return parseInt(_time[0]) * 60 + parseInt(_time[1]);
    if (_time.length === 3) return parseInt(_time[0]) * 3600 + parseInt(_time[1]) * 60 + parseInt(_time[2]);
    return null;
};

YtMusicParser.prototype._get_song_title = function() {
    return $('yt-formatted-string.title.ytmusic-player-bar').text();
};

YtMusicParser.prototype._get_song_artist = function() {
    return $('span.subtitle.ytmusic-player-bar>yt-formatted-string>a').first().text();
};

YtMusicParser.prototype._get_album_artist = function() {
    return $('span.subtitle.ytmusic-player-bar>yt-formatted-string>a').first().text();
};

YtMusicParser.prototype._get_song_cover = function() {
    var albumImg = $('div.thumbnail-image-wrapper.ytmusic-player-bar>img').attr('src');
    return albumImg || null;
};

YtMusicParser.prototype._get_song_album = function() {
    return $('span.subtitle.style-scope.ytmusic-player-bar>yt-formatted-string>a').last().text();
};

// ---------------------------------------------------------------------------
// Poll via sendMessage — wakes the service worker on demand each interval
// ---------------------------------------------------------------------------

chrome.storage.local.get('refresh_interval', function(items) {
    var interval = (items.refresh_interval || CS_SETTINGS.refresh_interval) * 1000;
    window.setInterval(function() {
        chrome.runtime.sendMessage(
            { type: 'player_state', state: new Player(new YtMusicParser()) },
            function() { void chrome.runtime.lastError; }
        );
    }, interval);
});

// ---------------------------------------------------------------------------
// Player control listeners
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    var btn;
    if (msg.cmd === 'tgl') {
        btn = $('#play-pause-button')[0];
        if (btn) btn.click();
        setTimeout(function() { sendResponse(new Player(new YtMusicParser())); }, 100);
        return true;
    }
    if (msg.cmd === 'prv') {
        btn = $('div.left-controls-buttons>.previous-button')[0];
        if (btn) btn.click();
        setTimeout(function() { sendResponse(new Player(new YtMusicParser())); }, 100);
        return true;
    }
    if (msg.cmd === 'nxt') {
        btn = $('div.left-controls-buttons>.next-button')[0];
        if (btn) btn.click();
        setTimeout(function() { sendResponse(new Player(new YtMusicParser())); }, 100);
        return true;
    }
    return false;
});
