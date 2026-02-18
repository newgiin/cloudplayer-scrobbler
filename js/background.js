/**
 * background.js — MV3 Service Worker
 * Copyright (c) 2011 Alexey Savartsov <asavartsov@gmail.com>
 * Licensed under the MIT license
 */

importScripts(
    'md5.js',
    'lastfm.js',
    'settings.js',
    'util.js',
    'logging.js'
);

// ---------------------------------------------------------------------------
// State (lives only while the service worker is alive)
// ---------------------------------------------------------------------------
var player = {};
var time_played = 0;
var last_refresh = Date.now();
var num_scrobbles = 0;
var curr_song_title = '';

var lastfm_api = null;  // initialised after settings load

// ---------------------------------------------------------------------------
// Bootstrap — load persisted settings then wire everything up
// ---------------------------------------------------------------------------
loadSettings().then(function(stored) {
    lastfm_api = new LastFM(SETTINGS.api_key, SETTINGS.api_secret);
    lastfm_api.session.key  = stored.session_key  || null;
    lastfm_api.session.name = stored.session_name || null;

    log('background.js loaded (service worker)');

    if (!SETTINGS.scrobble) {
        chrome.action.setIcon({ path: SETTINGS.scrobbling_stopped_icon });
    }

    // Messages from content scripts and popup/callback pages
    chrome.runtime.onMessage.addListener(on_message);

    bind_keyboard_shortcuts();
});

// ---------------------------------------------------------------------------
// Player state handler (called by content scripts via sendMessage)
// ---------------------------------------------------------------------------
function handle_player_state(_p) {
    var now = Date.now();

    player = _p;

    if (!SETTINGS.scrobble) {
        chrome.action.setIcon({ path: SETTINGS.scrobbling_stopped_icon });
        return;
    }

    if (_p.has_song) {
        if (_p.song.title !== curr_song_title ||
            _p.song.position <= SETTINGS.refresh_interval) {

            log('Started playing: ' + _p.song.artist + ' - ' + _p.song.title);
            curr_song_title = _p.song.title;
            time_played     = 0;
            num_scrobbles   = 0;
            last_refresh    = now - SETTINGS.refresh_interval * 1000;

            lastfm_api.now_playing(
                _p.song.title, _p.song.artist, _p.song.album, _p.song.time,
                function() {}
            );
        }

        if (_p.is_playing) {
            chrome.action.setIcon({ path: SETTINGS.playing_icon });

            if ((_p.song.time &&
                 time_played >= _p.song.time * SETTINGS.scrobble_point ||
                 time_played >= SETTINGS.scrobble_interval) &&
                num_scrobbles < SETTINGS.max_scrobbles &&
                !is_advertisement(_p.song)) {

                log('Scrobbled: ' + _p.song.artist + ' - ' + _p.song.title);
                scrobble_song(
                    _p.song.artist, _p.song.album_artist,
                    _p.song.album,  _p.song.title,
                    Math.round(Date.now() / 1000 - time_played)
                );
                time_played   = 0;
                num_scrobbles += 1;
            } else {
                time_played += (now - last_refresh) / 1000;
            }
        } else {
            chrome.action.setIcon({ path: SETTINGS.paused_icon });
        }
    } else {
        chrome.action.setIcon({ path: SETTINGS.main_icon });
    }
    last_refresh = now;
}

// ---------------------------------------------------------------------------
// Message handler — content scripts + popup/callback pages
// ---------------------------------------------------------------------------
function on_message(message, sender, sendResponse) {
    switch (message.type) {
        case 'player_state':
            handle_player_state(message.state);
            return false;

        case 'get_state':
            sendResponse({
                player:   player,
                session:  lastfm_api ? lastfm_api.session : {},
                scrobble: SETTINGS.scrobble
            });
            return false;

        case 'start_web_auth':
            start_web_auth();
            return false;

        case 'clear_session':
            clear_session();
            sendResponse({ ok: true });
            return false;

        case 'toggle_scrobble':
            toggle_scrobble();
            sendResponse({ scrobble: SETTINGS.scrobble });
            return false;

        case 'get_lastfm_session':
            get_lastfm_session(message.token, function() {
                sendResponse({ ok: true });
            });
            return true; // async

        case 'open_extensions_page':
            chrome.tabs.create({ url: 'chrome://extensions/' });
            return false;

        case 'love_track':
            lastfm_api.love_track(message.track, message.artist, function(result) {
                sendResponse(result);
            });
            return true;

        case 'unlove_track':
            lastfm_api.unlove_track(message.track, message.artist, function(result) {
                sendResponse(result);
            });
            return true;

        case 'is_track_loved':
            lastfm_api.is_track_loved(message.track, message.artist, function(result) {
                sendResponse(result);
            });
            return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scrobble_song(artist, album_artist, album, title, time) {
    lastfm_api.scrobble(artist, album_artist, album, title, time,
        function(response) {
            if (response && response.error) {
                if (response.error === 9) clear_session();
                chrome.action.setIcon({ path: SETTINGS.error_icon });
            }
        }
    );
}

function is_advertisement(song) {
    return (song.title  === SETTINGS.gmusic_ads_metadata.title &&
            song.artist === SETTINGS.gmusic_ads_metadata.artist);
}

function start_web_auth() {
    var callback_url = chrome.runtime.getURL(SETTINGS.callback_file);
    chrome.tabs.create({
        url: 'http://www.last.fm/api/auth?api_key=' + SETTINGS.api_key +
             '&cb=' + callback_url
    });
}

function clear_session() {
    if (lastfm_api) lastfm_api.session = {};
    chrome.storage.local.remove(['session_key', 'session_name']);
}

function toggle_scrobble() {
    SETTINGS.scrobble = !SETTINGS.scrobble;
    chrome.storage.local.set({ scrobble: SETTINGS.scrobble });
    chrome.action.setIcon({
        path: SETTINGS.scrobble ? SETTINGS.main_icon : SETTINGS.scrobbling_stopped_icon
    });
}

function get_lastfm_session(token, callback) {
    lastfm_api.authorize(token, function(response) {
        if (response && response.session) {
            chrome.storage.local.set({
                session_key:  response.session.key,
                session_name: response.session.name
            });
        }
        if (callback) callback();
    });
}

function bind_keyboard_shortcuts() {
    chrome.commands.onCommand.addListener(function(command) {
        switch (command) {
            case 'toggle_play':   send_cmd_to_play_tab('tgl'); break;
            case 'prev_song':     send_cmd_to_play_tab('prv'); break;
            case 'next_song':     send_cmd_to_play_tab('nxt'); break;
            case 'goto_play_tab': open_play_tab();              break;
            default:
                console.error("No handler for command '" + command + "'");
        }
    });
}

function send_cmd_to_play_tab(cmd) {
    find_play_tab(function(tab) {
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { cmd: cmd }, function() { void chrome.runtime.lastError; });
        } else {
            log('Unable to find Play tab');
        }
    });
}
