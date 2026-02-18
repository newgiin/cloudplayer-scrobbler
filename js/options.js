/**
 * options.js — MV3 compatible
 * Uses chrome.storage.local instead of localStorage
 */

function save_options() {
    var scrobble_mult = document.getElementById('scrobble_mult').checked;
    var logs_enabled  = document.getElementById('log_checkbox').checked;

    var updates = { logs_enabled: logs_enabled };
    if (!scrobble_mult) {
        updates.max_scrobbles = 1;
    } else {
        // Remove the limit so background uses POSITIVE_INFINITY default
        updates.max_scrobbles = null;
    }

    // Store all at once; null values removed manually
    chrome.storage.local.set({ logs_enabled: logs_enabled }, function() {
        if (!scrobble_mult) {
            chrome.storage.local.set({ max_scrobbles: 1 }, after_save);
        } else {
            chrome.storage.local.remove('max_scrobbles', after_save);
        }
    });
}

function after_save() {
    // Service worker will pick up new settings on next activation;
    // user just needs to reload the music tab.
    var status = document.getElementById('status');
    status.textContent = 'Options saved — please reload the YouTube Music tab.';
    setTimeout(function() { status.textContent = ''; }, 3500);
}

function restore_options() {
    chrome.storage.local.get(['max_scrobbles', 'logs_enabled'], function(items) {
        var max = items.max_scrobbles;
        var scrobble_mult = (max === undefined || max === null || max > 1);
        document.getElementById('scrobble_mult').checked = scrobble_mult;
        document.getElementById('log_checkbox').checked  = items.logs_enabled === true;

        // Show scrobble interval in minutes (from SETTINGS default)
        var minutes = Math.round((420 / 60) * 100) / 100;
        document.getElementById('minute_field').textContent = minutes;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
