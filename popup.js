"use strict";

import { POPUP, START, STOP, outputdate } from "/common.js";

const numberFormat1 = new Intl.NumberFormat([], { style: "unit", unit: "day", unitDisplay: "long" });
const numberFormat2 = new Intl.NumberFormat([], { style: "unit", unit: "hour", unitDisplay: "long" });
const numberFormat3 = new Intl.NumberFormat([], { style: "unit", unit: "minute", unitDisplay: "long" });
const numberFormat4 = new Intl.NumberFormat([], { style: "unit", unit: "second", unitDisplay: "long" });

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
	let text = "";
	if (days > 0) {
		text += `${numberFormat1.format(days)} `;
	}
	if (days > 0 || hours > 0) {
		text += `${numberFormat2.format(hours)} `;
	}
	if (days > 0 || hours > 0 || minutes > 0) {
		text += `${numberFormat3.format(minutes)} `;
	}
	if (days > 0 || hours > 0 || minutes > 0 || seconds > 0) {
		text += numberFormat4.format(seconds);
	}
	return text;
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
	stopwatch.textContent = sec > 0 ? (running ? sec >= 3600 * 24 ? "‼️\u00A0" : sec >= 3600 * 12 ? "❗\u00A0" : "" : "") + outputduration(sec) : "";
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
 * Handle error.
 *
 * @param {string} error
 * @returns {void}
 */
function handleError(error) {
	console.error(`Error: ${error}`);
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

	chrome.tabs.sendMessage(tabId, { type: POPUP }).catch(handleError);
}

document.getElementById("settings").addEventListener("click", (event) => {
	event.target.disabled = true;

	chrome.runtime.openOptionsPage().finally(() => {
		event.target.disabled = false;
	});
});

document.getElementById("enabled").addEventListener("change", (event) => {
	enabled = event.target.checked;

	if (tabId) {
		if (enabled) {
			event.target.disabled = true;

			chrome.tabs.sendMessage(tabId, { type: START }).catch(handleError);

			document.getElementById("status").textContent = "Waiting…";

			document.getElementById("table").classList.remove("hidden");
		} else {
			chrome.tabs.sendMessage(tabId, { type: STOP }).catch(handleError);

			document.getElementById("table").classList.add("hidden");
			document.getElementById("time").classList.add("hidden");
		}
	}
});

chrome.runtime.onMessage.addListener((message, sender) => {
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

chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
	if (tabs[0]) {
		tabId = tabs[0].id;

		if (tabId) {
			document.querySelector(".no-data").classList.add("hidden");
			document.querySelector(".data").classList.remove("hidden");

			getstatus();
		}
	}
});
