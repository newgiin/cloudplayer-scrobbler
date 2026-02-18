/**
 * contentscript.js — Google Play Music content script (MV3)
 */

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

var GoogleMusicParser = function() {};

GoogleMusicParser.prototype._get_has_song = function() {
    return $('#playerSongInfo').children().length > 0;
};

GoogleMusicParser.prototype._get_is_playing = function() {
    var play_btn = $('.material-player-middle paper-icon-button[data-id="play-pause"]');
    if (play_btn.length === 0) {
        play_btn = $('.material-player-middle sj-icon-button[data-id="play-pause"]');
    }
    return play_btn.hasClass('playing');
};

GoogleMusicParser.prototype._get_song_position = function() {
    var _time = $.trim($('#time_container_current').text()).split(':');
    if (_time.length === 2) return parseInt(_time[0]) * 60 + parseInt(_time[1]);
    if (_time.length === 3) return parseInt(_time[0]) * 3600 + parseInt(_time[1]) * 60 + parseInt(_time[2]);
    return null;
};

GoogleMusicParser.prototype._get_song_time = function() {
    var _time = $.trim($('#time_container_duration').text()).split(':');
    if (_time.length === 2) return parseInt(_time[0]) * 60 + parseInt(_time[1]);
    if (_time.length === 3) return parseInt(_time[0]) * 3600 + parseInt(_time[1]) * 60 + parseInt(_time[2]);
    return null;
};

GoogleMusicParser.prototype._get_song_title = function() {
    return $('#currently-playing-title').text();
};

GoogleMusicParser.prototype._get_song_artist = function() {
    return $('#player-artist').text();
};

GoogleMusicParser.prototype._get_album_artist = function() {
    var album_artist = $('#playerSongInfo .player-album').attr('data-id');
    if (album_artist) return decodeURIComponent(album_artist.split('/')[1].replace(/\+/g, ' '));
    return null;
};

GoogleMusicParser.prototype._get_song_cover = function() {
    return $('#playerBarArt').attr('src') || null;
};

GoogleMusicParser.prototype._get_song_album = function() {
    return $('#playerSongInfo .player-album').text();
};

// ---------------------------------------------------------------------------
// Poll via sendMessage — wakes the service worker on demand each interval
// ---------------------------------------------------------------------------

chrome.storage.local.get('refresh_interval', function(items) {
    var interval = (items.refresh_interval || CS_SETTINGS.refresh_interval) * 1000;
    window.setInterval(function() {
        chrome.runtime.sendMessage(
            { type: 'player_state', state: new Player(new GoogleMusicParser()) },
            function() { void chrome.runtime.lastError; }
        );
    }, interval);
});

// ---------------------------------------------------------------------------
// Player control listeners
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    var play_btn, prev_btn, next_btn;
    if (msg.cmd === 'tgl') {
        play_btn = $('.material-player-middle paper-icon-button[data-id="play-pause"]');
        if (play_btn.length === 0) play_btn = $('.material-player-middle sj-icon-button[data-id="play-pause"]');
        play_btn.click();
        setTimeout(function() { sendResponse(new Player(new GoogleMusicParser())); }, 100);
        return true;
    }
    if (msg.cmd === 'prv') {
        prev_btn = $('.material-player-middle paper-icon-button[data-id="rewind"]');
        if (prev_btn.length === 0) prev_btn = $('.material-player-middle sj-icon-button[data-id="rewind"]');
        prev_btn.click();
        setTimeout(function() { sendResponse(new Player(new GoogleMusicParser())); }, 100);
        return true;
    }
    if (msg.cmd === 'nxt') {
        next_btn = $('.material-player-middle paper-icon-button[data-id="forward"]');
        if (next_btn.length === 0) next_btn = $('.material-player-middle sj-icon-button[data-id="forward"]');
        next_btn.click();
        setTimeout(function() { sendResponse(new Player(new GoogleMusicParser())); }, 100);
        return true;
    }
    return false;
});
