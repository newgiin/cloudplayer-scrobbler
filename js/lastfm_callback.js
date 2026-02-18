/**
 * lastfm_callback.js — MV3 compatible
 * Uses chrome.runtime.sendMessage instead of getBackgroundPage()
 */

function _url_param(name, url) {
    return unescape((RegExp(name + '=(.+?)(&|$)').exec(url) || [, null])[1]);
}

var token = _url_param('token', location.search);

chrome.runtime.sendMessage({ type: 'get_lastfm_session', token: token }, function() {
    // Navigate to the music tab, then close this callback tab
    chrome.tabs.query({ url: '*://music.youtube.com/*' }, function(tabs) {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
        } else {
            chrome.tabs.create({ url: 'https://music.youtube.com', active: true });
        }
        setTimeout(function() { window.close(); }, 100);
    });
});
