/**
 * settings.js
 * Extension settings — MV3 compatible (chrome.storage.local instead of localStorage)
 */

var SETTINGS = {
    api_key: 'd00dce85051b7dbcbfcc165eaebfc6d2',
    api_secret: 'bdfcae3563763ece1b6d3dcdd56a7ab8',

    callback_file: 'html/lastfm_callback.html',

    main_icon: chrome.runtime.getURL('img/main-icon.png'),
    playing_icon: chrome.runtime.getURL('img/main-icon-playing.png'),
    paused_icon: chrome.runtime.getURL('img/main-icon-paused.png'),
    error_icon: chrome.runtime.getURL('img/main-icon-error.png'),
    scrobbling_stopped_icon: chrome.runtime.getURL('img/main-icon-scrobbling-stopped.png'),

    scrobble_point: 0.7,
    scrobble_interval: 420, // 7 minutes
    max_scrobbles: Number.POSITIVE_INFINITY,

    refresh_interval: 2,

    gmusic_ads_metadata: {
        title: "We'll be right back",
        artist: 'Subscribe to go ad-free'
    },

    // Defaults (overwritten by loadSettings)
    scrobble: true,
    logs_enabled: false
};

/**
 * Load persisted settings from chrome.storage.local.
 * Returns a Promise that resolves once SETTINGS has been updated.
 */
function loadSettings() {
    return new Promise(function(resolve) {
        chrome.storage.local.get(
            ['session_key', 'session_name', 'max_scrobbles', 'logs_enabled', 'scrobble'],
            function(items) {
                if (items.max_scrobbles !== undefined) {
                    var parsed = parseInt(items.max_scrobbles);
                    if (!isNaN(parsed)) SETTINGS.max_scrobbles = parsed;
                }
                SETTINGS.logs_enabled = items.logs_enabled === true;
                // scrobble defaults to true; only false if explicitly stored as false
                SETTINGS.scrobble = items.scrobble !== false;
                resolve(items);
            }
        );
    });
}