/**
 * util.js — Various utility functions
 */

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

function open_play_tab() {
    find_play_tab(function(tab) {
        if (tab) {
            // MV3: use 'active' + 'highlighted' instead of deprecated 'selected'
            chrome.tabs.update(tab.id, { active: true, highlighted: true });
        } else {
            chrome.tabs.create({ url: 'https://music.youtube.com', active: true });
        }
    });
}
