/**
 * popup.js
 * Popup page script
 * Copyright (c) 2011 Alexey Savartsov <asavartsov@gmail.com>
 * Licensed under the MIT license
 */
/* Background page */
var bp;

/* Render popup when DOM is ready */
$(document).ready(function() {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        bp = backgroundPage;
        if (localStorage.getItem("seen_alert") === null) {
            show_alert();
        }
        set_play_link();
        render_song();
        if (bp.lastfm_api.session.name && bp.lastfm_api.session.key) {
            render_scrobble_link();
        }
        render_auth_link();
    });
});

function set_play_link() {
    $("#cover").click(open_play_tab);
}
/* Render functions */
function update_song_info() {
    $("#artist_track").text(bp.player.song.artist);
    var str1 = " - ";
    $("#artist_track").append(str1.concat(bp.player.song.title));
    $("#cover").attr({ src: bp.player.song.cover || "../img/defaultcover.png",
        alt:bp.player.song.album});
    $("#album").text(bp.player.song.album);

    if (bp.lastfm_api.session.name && bp.lastfm_api.session.key) {
        render_love_button();
    }
    toggle_play_btn();
}

function toggle_play_btn() {
    var play_btn = $("#play-pause-btn");
    play_btn.toggle = function() {
        if (bp.player.is_playing) {
            play_btn.removeClass();
            play_btn.addClass("pause");
        } else {
            play_btn.removeClass();
            play_btn.addClass("play");
        }
    }
    // TODO kind of hackish
    // This callback can be called too early (before bp.player is updated)
    // Thus, just try a few times for 3 seconds
    for (var i = 0; i < 30; i++) {
        setTimeout(play_btn.toggle, i * 100);
    }
}

/**
 * Renders current song details
 */
function render_song() {
    if (bp.player.has_song) {
        update_song_info();
        $("#play-pause-btn").click(toggle_play);
        $("#next-btn").click(next_song);
        $("#prev-btn").click(prev_song);
        if (!(bp.lastfm_api.session.name && bp.lastfm_api.session.key)) {
            $("#lastfm-buttons").hide();
        }
    } else {
        $("#song").addClass("nosong");
        $("#artist_track").text("");
        $("#cover ").attr({ src: "../img/defaultcover.png" });
        $("#lastfm-buttons").hide();
        $("#player-controls").hide();
    }
}

/**
 * Renders the link to turn on/off scrobbling
 */
function render_scrobble_link() {
    $("#scrobbling").html('<a></a>');
    $("#scrobbling a")
    .attr("href", "#")
    .click(on_toggle_scrobble)
    .text(bp.SETTINGS.scrobble ? "Stop scrobbling" : "Resume scrobbling");
}

/**
 * Renders authentication/profile link
 */
function render_auth_link() {
    if (bp.lastfm_api.session.name && bp.lastfm_api.session.key) {
        render_scrobble_link();
        $("#lastfm-profile").html("Logged in as " + "<a></a><a></a>");
        $("#lastfm-profile a:first")
        .attr({
            href: "http://last.fm/user/" + bp.lastfm_api.session.name,
            target: "_blank"
        })
        .text(bp.lastfm_api.session.name);

        $("#lastfm-profile a:last")
        .attr({
            href: "#",
            title: "Logout"
        })
        .click(on_logout)
        .addClass("logout");
    } else {
        $("#lastfm-profile").html('<a></a>');
        $("#lastfm-profile a").attr("href", "#")
        .click(on_auth)
        .text("Connect to Last.fm");
    }
}

/**
 * Renders the love button
 */
function render_love_button() {
    $("#love-button").html('<img src="../img/ajax-loader.gif">');

    bp.lastfm_api.is_track_loved(bp.player.song.title,
            bp.player.song.artist,
            function(result) {
                $("#love-button").html('<a href="#"></a>');
                if (result) {
                    $("#love-button a").attr({ title: "Unlove this song"})
                    .click(on_unlove)
                    .addClass("loved");

                } else {
                    $("#love-button a").attr({ title: "Love this song" })
                    .click(on_love)
                    .addClass("notloved");
                }
            });
}

/* Event handlers */

function toggle_play() {
    var has_song = bp.player.has_song;
    find_play_tab(
        function(tab) {
            chrome.tabs.sendMessage(tab.id, {cmd: "tgl"},
                function() {
                    if (has_song) {
                        toggle_play_btn();
                    } else { // if pressing FF on previous song reached end of play queue
                        update_song_info();
                        toggle_play_btn();
                    }
                }
            );
        }
    );
}

function prev_song() {
    find_play_tab(
        function(tab) {
            chrome.tabs.sendMessage(tab.id, {cmd: "prv"},
                update_song_info);
        }
    );
}

function next_song() {
    find_play_tab(
        function(tab) {
            chrome.tabs.sendMessage(tab.id, {cmd: "nxt"},
                update_song_info);
        }
    );
}

/**
 * Turn on/off scrobbling link was clicked
 */
function on_toggle_scrobble() {
    bp.toggle_scrobble();
    render_scrobble_link();
}

/**
 * Authentication link was clicked
 */
function on_auth() {
    bp.start_web_auth();
    window.close();
}

/**
 * Logout link was clicked
 */
function on_logout() {
    bp.clear_session();
    render_auth_link();
}

/**
 * Love button was clicked
 */
function on_love() {
    bp.lastfm_api.love_track(bp.player.song.title, bp.player.song.artist,
        function(result) {
            if (!result.error) {
                render_love_button();
            }
            else {
                if (result.error == 9) {
                    // Session expired
                    bp.clear_session();
                    render_auth_link();
                }

                chrome.browserAction.setIcon({
                     'path': SETTINGS.error_icon });
            }
        });

    $("#love-button").html('<img src="../img/ajax-loader.gif">');
}

/**
 * Unlove button was clicked
 */
function on_unlove() {
    bp.lastfm_api.unlove_track(bp.player.song.title, bp.player.song.artist,
        function(result) {
            if (!result.error) {
                render_love_button();
            } else {
                if (result.error == 9) {
                    // Session expired
                    bp.clear_session();
                    render_auth_link();
                }

                chrome.browserAction.setIcon({
                     'path': SETTINGS.error_icon });
            }
        });

    $("#love-button").html('<img src="../img/ajax-loader.gif">');
}

/**
* Show temporary msg from me to user <3
*/
function show_alert() {
    $("#alert").removeClass("hidden");
    $("#extns_link").click(function() {
        bp.open_extensions_page();
    });
    $("#dismiss_alert").click(function() {
        $("#alert").addClass("hidden");
        localStorage.setItem("seen_alert", "1");
    });
}