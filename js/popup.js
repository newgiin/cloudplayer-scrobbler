/**
 * popup.js — MV3 compatible
 * Uses chrome.runtime.sendMessage instead of getBackgroundPage()
 */

var _state = {};   // cached background state

$(document).ready(function() {
    // Fetch current state from the service worker
    chrome.runtime.sendMessage({ type: 'get_state' }, function(state) {
        _state = state || {};

        chrome.storage.local.get('seen_alert', function(items) {
            if (items.seen_alert === undefined) show_alert();
        });

        set_play_link();
        render_song();

        if (_state.session && _state.session.name && _state.session.key) {
            render_scrobble_link();
        }
        render_auth_link();
    });
});

function set_play_link() {
    $('#cover').click(function() {
        chrome.runtime.sendMessage({ type: 'open_play_tab' });
        // util open_play_tab is in background; we just send the message
        find_play_tab(function(tab) {
            if (tab) chrome.tabs.update(tab.id, { active: true });
            else chrome.tabs.create({ url: 'https://music.youtube.com', active: true });
        });
    });
}

/* ---- Render helpers ---- */

function update_song_info(player) {
    $('#artist').text(player.song.artist);
    $('#track').text(player.song.title);
    $('#cover').attr({
        src: player.song.cover || '../img/defaultcover.png',
        alt: player.song.album
    });
    $('#album').text(player.song.album);

    if (_state.session && _state.session.name && _state.session.key) {
        render_love_button(player);
    }
    toggle_play_btn(player);
}

function toggle_play_btn(player) {
    var play_btn = $('#play-pause-btn');
    play_btn.removeClass();
    play_btn.addClass(player.is_playing ? 'pause' : 'play');
}

function render_song() {
    var player = _state.player || {};
    if (player.has_song) {
        update_song_info(player);
        $('#play-pause-btn').click(toggle_play);
        $('#next-btn').click(next_song);
        $('#prev-btn').click(prev_song);
        if (!(_state.session && _state.session.name && _state.session.key)) {
            $('#lastfm-buttons').hide();
        }
    } else {
        $('#song').addClass('nosong');
        $('#artist').text('');
        $('#track').html('');
        $('#cover').attr({ src: '../img/defaultcover.png' });
        $('#lastfm-buttons').hide();
        $('#player-controls').hide();
    }
}

function render_scrobble_link() {
    $('#scrobbling').html('<a></a>');
    $('#scrobbling a')
        .attr('href', '#')
        .click(on_toggle_scrobble)
        .text(_state.scrobble ? 'Stop scrobbling' : 'Resume scrobbling');
}

function render_auth_link() {
    if (_state.session && _state.session.name && _state.session.key) {
        render_scrobble_link();
        $('#lastfm-profile').html('Logged in as <a></a><a></a>');
        $('#lastfm-profile a:first')
            .attr({ href: 'http://last.fm/user/' + _state.session.name, target: '_blank' })
            .text(_state.session.name);
        $('#lastfm-profile a:last')
            .attr({ href: '#', title: 'Logout' })
            .click(on_logout)
            .addClass('logout');
    } else {
        $('#lastfm-profile').html('<a></a>');
        $('#lastfm-profile a')
            .attr('href', '#')
            .click(on_auth)
            .text('Connect to Last.fm');
    }
}

function render_love_button(player) {
    $('#love-button').html('<img src="../img/ajax-loader.gif">');
    chrome.runtime.sendMessage(
        { type: 'is_track_loved', track: player.song.title, artist: player.song.artist },
        function(result) {
            $('#love-button').html('<a href="#"></a>');
            if (result) {
                $('#love-button a')
                    .attr({ title: 'Unlove this song' })
                    .click(function() { on_unlove(player); })
                    .addClass('loved');
            } else {
                $('#love-button a')
                    .attr({ title: 'Love this song' })
                    .click(function() { on_love(player); })
                    .addClass('notloved');
            }
        }
    );
}

/* ---- Controls ---- */

function toggle_play() {
    find_play_tab(function(tab) {
        if (!tab) return;
        chrome.tabs.sendMessage(tab.id, { cmd: 'tgl' }, function(player) {
            if (player) toggle_play_btn(player);
        });
    });
}

function prev_song() {
    find_play_tab(function(tab) {
        if (!tab) return;
        chrome.tabs.sendMessage(tab.id, { cmd: 'prv' }, function(player) {
            if (player) {
                player.is_playing = true;
                update_song_info(player);
            }
        });
    });
}

function next_song() {
    find_play_tab(function(tab) {
        if (!tab) return;
        chrome.tabs.sendMessage(tab.id, { cmd: 'nxt' }, function(player) {
            if (player) {
                player.is_playing = true;
                update_song_info(player);
            }
        });
    });
}

/* ---- Event handlers ---- */

function on_toggle_scrobble() {
    chrome.runtime.sendMessage({ type: 'toggle_scrobble' }, function(resp) {
        if (resp) _state.scrobble = resp.scrobble;
        render_scrobble_link();
    });
}

function on_auth() {
    chrome.runtime.sendMessage({ type: 'start_web_auth' });
    window.close();
}

function on_logout() {
    chrome.runtime.sendMessage({ type: 'clear_session' }, function() {
        _state.session = {};
        render_auth_link();
    });
}

function on_love(player) {
    $('#love-button').html('<img src="../img/ajax-loader.gif">');
    chrome.runtime.sendMessage(
        { type: 'love_track', track: player.song.title, artist: player.song.artist },
        function(result) {
            if (!result || !result.error) {
                render_love_button(player);
            } else {
                if (result.error === 9) {
                    chrome.runtime.sendMessage({ type: 'clear_session' });
                    _state.session = {};
                    render_auth_link();
                }
            }
        }
    );
}

function on_unlove(player) {
    $('#love-button').html('<img src="../img/ajax-loader.gif">');
    chrome.runtime.sendMessage(
        { type: 'unlove_track', track: player.song.title, artist: player.song.artist },
        function(result) {
            if (!result || !result.error) {
                render_love_button(player);
            } else {
                if (result.error === 9) {
                    chrome.runtime.sendMessage({ type: 'clear_session' });
                    _state.session = {};
                    render_auth_link();
                }
            }
        }
    );
}

function show_alert() {
    $('#alert').removeClass('hidden');
    $('#extns_link').click(function() {
        chrome.runtime.sendMessage({ type: 'open_extensions_page' });
    });
    $('#dismiss_alert').click(function() {
        $('#alert').addClass('hidden');
        chrome.storage.local.set({ seen_alert: '1' });
    });
}

/* ---- Inline copy of find_play_tab (util.js not loaded in popup) ---- */
function find_play_tab(callback) {
    chrome.tabs.query({ url: '*://music.youtube.com/*' }, function(tabs) {
        if (tabs.length > 0) {
            callback(tabs[0]);
        } else {
            chrome.tabs.query({ url: '*://play.google.com/music/listen*' }, function(tabs2) {
                callback(tabs2.length > 0 ? tabs2[0] : null);
            });
        }
    });
}
