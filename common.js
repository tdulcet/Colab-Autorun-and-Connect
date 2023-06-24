"use strict";

// communication type
const POPUP = "popup";
const CONTENT = "content";
const BACKGROUND = "background";
const NOTIFICATION = "notification";
const START = "start";
const STOP = "stop";

const dateTimeFormat = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

/**
 * Output date.
 *
 * @param {number} date
 * @returns {string}
 */
function outputdate(date) {
	return dateTimeFormat.format(new Date(date));
}
