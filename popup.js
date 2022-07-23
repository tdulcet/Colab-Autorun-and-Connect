"use strict";

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
 * Get seconds as digital clock.
 *
 * @param {number} sec_num
 * @returns {string}
 */
function getSecondsAsDigitalClock(sec_num) {
	// console.log(sec_num);
	const d = Math.floor(sec_num / 86400);
	const h = Math.floor((sec_num % 86400) / 3600);
	const m = Math.floor((sec_num % 86400 % 3600) / 60);
	const s = sec_num % 86400 % 3600 % 60;
	let text = "";
	if (d > 0) {
		// text += d.toLocaleString() + '\xa0days ';
		text += `${numberFormat1.format(d)} `;
	}
	if (d > 0 || h > 0) {
		// text += ((h < 10) ? '0' + h : h) + '\xa0hours ';
		text += `${numberFormat2.format(h)} `;
	}
	if (d > 0 || h > 0 || m > 0) {
		// text += ((m < 10) ? '0' + m : m) + '\xa0minutes ';
		text += `${numberFormat3.format(m)} `;
	}
	if (d > 0 || h > 0 || m > 0 || s > 0) {
		// text += ((s < 10) ? '0' + s : s) + '\xa0seconds';
		text += numberFormat4.format(s);
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
	const sec_num = Math.floor(now / 1000) - Math.floor(time / 1000);
	if (sec_num > 0) {
		stopwatch.textContent = (running && sec_num >= 3600 * 12 ? "‼️\xa0" : "") + getSecondsAsDigitalClock(sec_num);
	} else {
		stopwatch.textContent = "";
	}
}

/**
 * Timer tick.
 *
 * @param {number} time
 * @returns {void}
 */
function timerTick(time) {
	const now = Date.now();
	const delay = 1000 - (now % 1000);

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
		document.getElementById("status").textContent = time ? (running ? `▶️ ${RUN ? "Running" : "Connected"}` : `⏹️ ${RUN ? "Stopped" : "Disconnected"}`) : "❓ Unknown";

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

	browser.tabs.executeScript(tabId, {
		code: "send();"
	}).catch(handleError);
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

			browser.tabs.executeScript(tabId, {
				code: "start();"
			}).catch(handleError);

			document.getElementById("status").textContent = "Waiting…";

			document.getElementById("table").classList.remove("hidden");
		} else {
			browser.tabs.executeScript(tabId, {
				code: "stop();"
			}).catch(handleError);

			document.getElementById("table").classList.add("hidden");
			document.getElementById("time").classList.add("hidden");
		}
	}
});

browser.runtime.onMessage.addListener((message, sender) => {
	if (sender.tab.id === tabId) {
		if (message.type === POPUP) {
			RUN = message.RUN;
			enabled = message.enabled;
			running = message.running;

			const aenabled = document.getElementById("enabled");
			aenabled.checked = enabled;
			aenabled.disabled = false;

			updatePopup(message.time);
			// console.log(message);
		}
	}
});

browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
	if (tabs[0]) {
		tabId = tabs[0].id;

		if (tabId) {
			document.querySelector(".no-data").classList.add("hidden");
			document.querySelector(".data").classList.remove("hidden");

			getstatus();
		}
	}
});
