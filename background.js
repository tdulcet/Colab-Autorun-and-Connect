"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";

const TITLE = "Colab Autorun and Connect";

const ALARM = "rotate";

const settings = {
	run: null,
	minutes: null,
	wait: null, // Seconds
	delay: null, // Seconds
	rotate: null,
	idle: null, // Seconds
	period: null, // Minutes
	send: null
};

const notifications = new Map();

let atab = null;
let awindow = null;

let previousTab = null;
let previousWindow = null;

const tabs = new Map();

let iterator = null;

/**
 * On error.
 *
 * @param {string} error
 * @returns {void}
 */
function onError(error) {
	console.error(`Error: ${error}`);
}

browser.notifications.onClicked.addListener((notificationId) => {
	const tabId = notifications.get(notificationId);

	browser.tabs.query({}).then((tabs) => {
		for (const tab of tabs) {
			if (tab.id === tabId) {
				browser.windows.update(tab.windowId, { focused: true }); // focus window
				browser.tabs.update(tab.id, { active: true }); // focus tab
				break;
			}
		}
	}).catch(onError);
});

browser.notifications.onClosed.addListener((notificationId) => {
	notifications.delete(notificationId);
});

/**
 * Rotate through Colab tabs.
 *
 * @returns {void}
 */
async function rotate() {
	if (!iterator) {
		iterator = tabs.values();
	}

	let result = iterator.next();

	if (result.done) {
		iterator = tabs.values();
		result = iterator.next();
	}

	const tab = result.value;
	// console.log(new Date(), "switching to", tab.id, tab);

	if (browser.tabs.warmup) {
		browser.tabs.warmup(tab.id);
	}

	if (!previousWindow || previousWindow.id !== tab.windowId) {
		if (previousWindow) {
			// console.log(new Date(), "restoring previous", previousTab.id, previousTab);
			await browser.windows.update(previousWindow.id, { focused: previousWindow.focused, state: previousWindow.state }); // focus window
			await browser.tabs.update(previousTab.id, { active: previousTab.active }); // focus tab
		}

		browser.windows.get(tab.windowId).then((windowInfo) => {
			previousWindow = windowInfo;
			// console.log(windowInfo);
		});

		browser.tabs.query({ active: true, windowId: tab.windowId }).then((tabs) => {
			if (tabs[0]) {
				previousTab = tabs[0];
				// console.log(tabs);
			}
		});

		await browser.windows.update(tab.windowId, { focused: true }); // focus window
	}

	await browser.tabs.update(tab.id, { active: true }); // focus tab
}

/**
 * Handle idle state change.
 *
 * @param {string} state
 * @returns {void}
 */
function newState(state) {
	// console.log(`New state: ${state}`);
	if (settings.rotate) {
		console.log(new Date(), state);
		if (state === "locked" || state === "idle") {
			if (!atab && tabs.size) {
				browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
					if (tabs[0]) {
						atab = tabs[0];
						browser.windows.get(atab.windowId).then((windowInfo) => {
							awindow = windowInfo;
							// console.log(tabs, windowInfo);

							rotate();

							browser.alarms.create(ALARM, {
								periodInMinutes: settings.period
							});
						});
					}
				});
			}
		} else if (state === "active") {
			if (atab) {
				browser.alarms.clear(ALARM);

				iterator = null;

				if (browser.tabs.warmup) {
					browser.tabs.warmup(atab.id);
				}

				if (previousWindow) {
					// console.log(new Date(), "restoring previous", previousTab.id, previousTab);
					browser.windows.update(previousWindow.id, { focused: previousWindow.focused, state: previousWindow.state }); // focus window
					browser.tabs.update(previousTab.id, { active: previousTab.active }); // focus tab
				}

				if (!previousWindow || previousWindow.id !== atab.windowId) {
					// console.log(new Date(), "restoring active", atab.id, atab);
					browser.windows.update(atab.windowId, { focused: awindow.focused, state: awindow.state }); // focus window
					browser.tabs.update(atab.id, { active: atab.active }); // focus tab
				}

				previousTab = null;
				previousWindow = null;

				atab = null;
				awindow = null;
			}
		}
	}
}

browser.idle.onStateChanged.addListener(newState);

/**
 * Tab close handler.
 *
 * @param {number} tabId
 * @returns {void}
 */
function tabCloseHandler(tabId) {
	tabs.delete(tabId);
}

browser.tabs.onRemoved.addListener(tabCloseHandler);

/**
 * Handle alarm.
 *
 * @param {Object} alarmInfo
 * @returns {void}
 */
function handleAlarm(alarmInfo) {
	if (alarmInfo.name === ALARM) {
		rotate();
	}
}

browser.alarms.onAlarm.addListener(handleAlarm);

/**
 * Set settings.
 *
 * @param {Object} asettings
 * @returns {void}
 */
function setSettings(asettings) {
	settings.run = asettings.run;
	settings.minutes = asettings.minutes;
	settings.wait = asettings.wait;
	settings.delay = asettings.delay;
	settings.rotate = asettings.rotate;
	settings.idle = asettings.idle;
	settings.period = asettings.period;
	settings.send = asettings.send;

	browser.idle.setDetectionInterval(settings.idle);
}

/**
 * Send settings to content scripts.
 *
 * @param {Object} asettings
 * @returns {void}
 */
function sendSettings(asettings) {
	setSettings(asettings);

	for (const tab of tabs.values()) {
		browser.tabs.sendMessage(
			tab.id,
			{
				"type": CONTENT,
				"RUN": settings.run,
				"seconds": settings.minutes * 60,
				"wait": settings.wait,
				"delay": settings.delay
			}
		).catch(onError);
	}
}

/**
 * Init.
 *
 * @returns {void}
 */
async function init() {
	const asettings = await AddonSettings.get("settings");

	setSettings(asettings);
}

init();

browser.runtime.onMessage.addListener((message, sender) => {
	// console.log(message);
	if (message.type === NOTIFICATION) {
		console.log(message.title, message.message, new Date(message.eventTime));
		if (settings.send) {
			browser.notifications.create({
				"type": "basic",
				"iconUrl": browser.runtime.getURL("icons/icon_128.png"),
				"title": message.title,
				"message": message.message,
				"eventTime": message.eventTime
			}).then((notificationId) => {
				notifications.set(notificationId, sender.tab.id);
				if (browser.tabs.warmup) {
					browser.tabs.warmup(sender.tab.id);
				}
			});
		}
		browser.pageAction.setTitle({
			"title": `${TITLE}  \n${message.title}`,
			"tabId": sender.tab.id
		});
	} else if (message.type === CONTENT) {
		browser.pageAction.show(sender.tab.id);

		tabs.set(sender.tab.id, sender.tab);
		iterator = null;

		const response = {
			"type": CONTENT,
			"RUN": settings.run,
			"seconds": settings.minutes * 60,
			"wait": settings.wait,
			"delay": settings.delay
		};
		// console.log(response);
		return Promise.resolve(response);
	} else if (message.type === BACKGROUND) {
		sendSettings(message.optionValue);
	}
});
