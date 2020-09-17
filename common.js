"use strict";

// communication type
const CONTENT = "content";
const BACKGROUND = "background";
const NOTIFICATION = "notification";

/**
 * Output date.
 *
 * @param {number} date
 * @returns {void}
 */
function outputdate(date) {
	return new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
}
