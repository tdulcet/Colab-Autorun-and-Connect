"use strict";

// communication type
export const POPUP = "popup";
export const CONTENT = "content";
export const BACKGROUND = "background";
export const NOTIFICATION = "notification";
export const START = "start";
export const STOP = "stop";

const dateTimeFormat = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

/**
 * Output date.
 *
 * @param {number} date
 * @returns {string}
 */
export function outputdate(date) {
	return dateTimeFormat.format(new Date(date));
}
