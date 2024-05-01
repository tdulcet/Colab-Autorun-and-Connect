"use strict";

// communication type
const POPUP = "popup";
const CONTENT = "content";
const NOTIFICATION = "notification";
const START = "start";
const STOP = "stop";

const TITLE = "Colab Autorun and Connect";
const label = TITLE;
const MAX = 10;

const dateTimeFormat = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

// Automatically run the first cell
let RUN = false;

// Seconds to retry
let seconds = 60;

// Delay in seconds
let delay = 30;

// Seconds to wait
let wait = 10;

// Dismiss the reCAPTCHA popups
let CAPTCHA = true;

let enabled = true;
let running = false;
let captcha = false;
let time = null;

let now = 0;
let timeoutID = null;
let intervalID = null;

/**
 * Send data to popup.
 *
 * @returns {void}
 */
function send() {
	const response = {
		type: POPUP,
		RUN,
		enabled,
		running,
		time
	};
	// console.log(response);

	browser.runtime.sendMessage(response);
}

/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @param {number} [date]
 * @returns {void}
 */
function notification(title, message, date) {
	const response = {
		type: NOTIFICATION,
		title,
		message: `${message}\n\nClick to view.`,
		eventTime: date
	};
	// console.log(response);

	browser.runtime.sendMessage(response);
}

/**
 * Output date.
 *
 * @param {number} date
 * @returns {string}
 */
function outputdate(date) {
	return dateTimeFormat.format(new Date(date));
}

/**
 * Click button by selector.
 *
 * @param {HTMLElement} button
 * @param {string} selector
 * @param {string} text
 * @returns {void}
 */
function click(button, selector, text) {
	for (let i = 0; i < MAX && button; ++i) {
		button.click();
		button = document.querySelector(selector);
	}

	if (button) {
		console.error(`Error: ${text} button clicked ${MAX} times, but popup did not close.`);
	}
}

/**
 * Check if connected.
 *
 * @returns {void}
 */
function connected() {
	const button = document.querySelector("mwc-button[slot=primaryAction]");
	const title = document.title.slice(0, Math.max(0, document.title.lastIndexOf(" - ")));

	if (button) {
		const text = button.innerText.toLowerCase();
		if (text.includes("connect") || text.includes("without") || text.includes("manage")) {
			console.log(`Unable to connect${text.includes("without") ? " with selected runtime" : ""}, will retry in ${seconds} seconds`);
			const abutton = document.querySelector("mwc-button[slot=secondaryAction]");
			// console.log(button, abutton);

			if (abutton) {
				console.debug("Clicking button:", abutton.innerText, "Not clicking button:", button.innerText);
				click(abutton, "mwc-button[slot=secondaryAction]", "Cancel");
			} else {
				console.error("Error: Cannot find cancel button");
			}
		} else {
			console.log(`Unable to connect, will retry in ${seconds} seconds`);
			// console.log(button);
			console.debug("Clicking button:", button.innerText);
			click(button, "ok", "OK");
		}
		if (running) {
			notification(`⏹️ Notebook has ${RUN ? "stopped" : "disconnected"}`, `The “${title}” notebook has been ${RUN ? "stopped" : "disconnected"} and we are unable to reconnect. It is likely over the usage limits. It had been ${RUN ? "running" : "connected"} since ${outputdate(time)}`, now);
			running = false;
			time = now;
		}
	} else {
		if (running) {
			notification("🔁 Notebook has reconnected", `The “${title}” notebook has been reconnected! It had been ${RUN ? "running" : "connected"} since ${outputdate(time)}`, now);
		} else {
			notification(`▶️ Notebook is ${RUN ? "running" : "connected"}`, `The “${title}” notebook is ${RUN ? "running" : "connected"}!${time ? ` It had been ${RUN ? "stopped" : "disconnected"} since ${outputdate(time)}` : ""}`, now);
			running = true;
		}
		time = now;
	}

	send();
	console.timeEnd(label);
}

/**
 * Check for popups.
 *
 * @returns {void}
 */
function check() {
	let button = document.querySelector("mwc-button[slot=primaryAction]");

	if (button) {
		const abutton = document.querySelector("mwc-button[slot=secondaryAction]");

		if (abutton) {
			// console.log(button, abutton);
			console.warn("Warning: Cancel button found. Clicking button:", abutton.innerText, "Not clicking button:", button.innerText);
			click(abutton, "mwc-button[slot=secondaryAction]", "Cancel");
		} else {
			console.warn("Warning: OK button found. Clicking button:", button.innerText);
			click(button, "ok", "OK");
		}
	}

	button = document.querySelector("colab-recaptcha-dialog");

	if (CAPTCHA) {
		if (button) {
			button = button.shadowRoot.querySelector("mwc-button").shadowRoot.getElementById("button");
			console.warn("Warning: Cancel button found. Clicking button:", button.innerText);
			button.click();
		}
	} else {
		const title = document.title.slice(0, Math.max(0, document.title.lastIndexOf(" - ")));

		if (button) {
			if (!captcha) {
				captcha = true;
				notification("❗ Colab reCAPTCHA popup needs attention", `A Colab reCAPTCHA popup needs attention on the “${title}” notebook.`);
			}
		} else {
			captcha &&= false;
		}
	}
}

/**
 * Run the first cell.
 *
 * @returns {void}
 */
function run() {
	check();

	const button = document.querySelector("colab-run-button");

	if (button) {
		button.dispatchEvent(new MouseEvent("mouseover", {
			bubbles: true
		}));
		const title = button.title.toLowerCase();

		if (title.includes("queued") || title.includes("executing") || title.includes("interrupt")) {
			console.log(`Notebook already running, will recheck in ${seconds} seconds`);
			// running = true;
		} else {
			// console.log(button);
			console.time(label);
			console.log("Connecting and running first cell");
			console.debug("Clicking button:", button.title);
			button.click();

			now = Date.now();
			setTimeout(connected, wait * 1000);
		}
	} else {
		console.error("Error: Cannot find run button");
	}
}

/**
 * Connect.
 *
 * @returns {void}
 */
function connect() {
	check();

	const button = document.querySelector("colab-connect-button");

	if (button) {
		const abutton = button.shadowRoot.getElementById("connect");
		if (abutton.innerText.toLowerCase().includes("connect")) {
			// console.log(button);
			console.time(label);
			console.log("Connecting");
			console.debug("Clicking button:", abutton.innerText);
			abutton.click();

			now = Date.now();
			setTimeout(connected, wait * 1000);
		} else {
			console.log(`Notebook already connected, will recheck in ${seconds} seconds`);
			// running = true;
		}
	} else {
		console.error("Error: Cannot find connect button");
	}
}

/**
 * Stop retrying.
 *
 * @returns {void}
 */
function astop() {
	if (timeoutID) {
		clearTimeout(timeoutID);
		timeoutID = null;
	}
	if (intervalID) {
		clearInterval(intervalID);
		intervalID = null;
	}
}

/**
 * Stop retrying.
 * Called by the popup.
 *
 * @returns {void}
 */
function stop() {
	if (enabled) {
		astop();

		enabled = false;
		time = null;
		console.log(`${TITLE} stopped`);
	} else {
		console.error(`Error: ${TITLE} already stopped.`);
	}
}

/**
 * Start.
 *
 * @returns {void}
 */
function astart() {
	timeoutID = null;
	if (!intervalID) {
		if (RUN) {
			run();

			intervalID = setInterval(run, seconds * 1000);
		} else {
			connect();

			intervalID = setInterval(connect, seconds * 1000);
		}
	}
}

/**
 * Start.
 * Called by the popup.
 *
 * @returns {void}
 */
function start() {
	if (enabled) {
		console.error(`Error: ${TITLE} already started.`);
	} else {
		enabled = true;
		console.log(`${TITLE} started`);

		astart();
	}
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

browser.runtime.sendMessage({ type: CONTENT }).then((message) => {
	if (message.type === CONTENT) {
		({
			RUN,
			seconds,
			wait,
			delay,
			CAPTCHA
		} = message);
		// console.log(message);

		timeoutID = setTimeout(astart, delay * 1000);
	}
}, handleError);

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.type) {
		case CONTENT:
			({
				RUN,
				seconds,
				wait,
				delay,
				CAPTCHA
			} = message);
			// console.log(message);

			if (enabled) {
				astop();
				timeoutID = setTimeout(astart, delay * 1000);
			}
			break;
		case POPUP:
			send();
			break;
		case START:
			start();
			break;
		case STOP:
			stop();
			break;
		// No default
	}
});

addEventListener("offline", (/* e */) => {
	console.log("Offline");

	if (enabled) {
		astop();
	}
});

addEventListener("online", (/* e */) => {
	console.log("Online");

	if (enabled) {
		timeoutID = setTimeout(astart, delay * 1000);
	}
});

console.log(`${TITLE} loaded`);
