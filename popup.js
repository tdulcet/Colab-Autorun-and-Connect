"use strict";

import { POPUP, START, STOP, outputdate } from "/common.js";

const durationFormat = new Intl.DurationFormat([], { style: "long" });

// Automatically run the first cell
let RUN = true;

let enabled = true;
let running = false;

let tabId = null;
let timeoutID = null;

const stopwatch = document.getElementById("stopwatch");

/**
 * Output duration.
 *
 * @param {number} sec
 * @returns {string}
 */
function outputduration(sec) {
	// console.log(sec);
	const days = Math.floor(sec / 86400);
	const hours = Math.floor(sec % 86400 / 3600);
	const minutes = Math.floor(sec % 3600 / 60);
	const seconds = sec % 60;
	return durationFormat.format({ days, hours, minutes, seconds });
}

/**
 * Output stopwatch.
 *
 * @param {number} time
 * @param {number} now
 * @returns {void}
 */
function outputstopwatch(time, now) {
	const sec = Math.floor((now - time) / 1000);
	stopwatch.textContent = sec > 0 ? (running ? sec >= 3600 * 24 ? "‼️\u{A0}" : sec >= 3600 * 12 ? "❗\u{A0}" : "" : "") + outputduration(sec) : "";
}

/**
 * Timer tick.
 *
 * @param {number} time
 * @returns {void}
 */
function timerTick(time) {
	const now = Date.now();
	const delay = 1000 - now % 1000;

	timeoutID = setTimeout(() => {
		outputstopwatch(time, now + delay);
		if (time <= now) {
			timerTick(time);
		}
	}, delay);
}

/**
 * Update popup.
 *
 * @param {number} time
 * @returns {void}
 */
function updatePopup(time) {
	// console.log(running, time);

	if (enabled) {
		document.getElementById("status").textContent = time ? running ? `▶️ ${RUN ? "Running" : "Connected"}` : `⏹️ ${RUN ? "Stopped" : "Disconnected"}` : "❓ Unknown";

		if (time) {
			const now = Date.now();
			document.getElementById("date").textContent = outputdate(time);
			if (timeoutID) {
				clearTimeout(timeoutID);
				timeoutID = null;
			}
			outputstopwatch(time, now);

			timerTick(time);

			document.getElementById("time").classList.remove("hidden");
		}
	} else {
		document.getElementById("table").classList.add("hidden");
		document.getElementById("time").classList.add("hidden");
	}
}

/**
 * Get data from content script.
 *
 * @returns {void}
 */
function getstatus() {
	document.getElementById("status").textContent = "Loading…";

	browser.tabs.sendMessage(tabId, { type: POPUP }).catch((error) => {
		console.error(`Error: ${error}`);
	});
}

document.getElementById("settings").addEventListener("click", (event) => {
	event.target.disabled = true;

	browser.runtime.openOptionsPage().finally(() => {
		event.target.disabled = false;
	});
});

document.getElementById("enabled").addEventListener("change", (event) => {
	enabled = event.target.checked;

	if (tabId) {
		if (enabled) {
			event.target.disabled = true;

			browser.tabs.sendMessage(tabId, { type: START }).catch((error) => {
				console.error(`Error: ${error}`);
			});

			document.getElementById("status").textContent = "Waiting…";

			document.getElementById("table").classList.remove("hidden");
		} else {
			browser.tabs.sendMessage(tabId, { type: STOP }).catch((error) => {
				console.error(`Error: ${error}`);
			});

			document.getElementById("table").classList.add("hidden");
			document.getElementById("time").classList.add("hidden");
		}
	}
});

browser.runtime.onMessage.addListener((message, sender) => {
	if (sender.tab.id === tabId) {
		if (message.type === POPUP) {
			({
				RUN,
				enabled,
				running
			} = message);

			const aenabled = document.getElementById("enabled");
			aenabled.checked = enabled;
			aenabled.disabled = false;

			updatePopup(message.time);
			// console.log(message);
		}
	}
});

browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
	if (!tabs[0]) {
		return;
	}

	tabId = tabs[0].id;

	if (tabId) {
		document.querySelector(".no-data").classList.add("hidden");
		document.querySelector(".data").classList.remove("hidden");

		getstatus();
	}
});
