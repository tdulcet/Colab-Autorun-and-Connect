"use strict";

import { CONTENT, BACKGROUND, NOTIFICATION } from "/common.js";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";

const TITLE = "Colab Autorun and Connect";

const ALARM = "rotate";

const settings = {
	run: null,
	minutes: null,
	wait: null, // Seconds
	delay: null, // Seconds
	captcha: null,
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
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @returns {void}
 */
function notification(title, message) {
	console.log(title, message);
	if (settings.send) {
		browser.notifications.create({
			type: "basic",
			iconUrl: browser.runtime.getURL("icons/icon_128.png"),
			title,
			message
		});
	}
}

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
	const { tabId, url } = notifications.get(notificationId);

	if (tabId) {
		browser.tabs.query({}).then((tabs) => {
			const atab = tabs.find((tab) => tab.id === tabId);
			if (atab) {
				browser.windows.update(atab.windowId, { focused: true }); // focus window
				browser.tabs.update(atab.id, { active: true }); // focus tab
			}
		}).catch(onError);
	} else if (url) {
		browser.tabs.create({ url });
	}
});

browser.notifications.onClosed.addListener((notificationId) => {
	notifications.delete(notificationId);
});

/**
 * Rotate through Colab tabs.
 *
 * @returns {Promise<void>}
 */
async function rotate() {
	iterator ||= tabs.values();

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
				[previousTab] = tabs;
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
						const [tab] = tabs;
						browser.windows.get(tab.windowId).then((windowInfo) => {
							if (windowInfo.state !== "fullscreen") {
								atab = tab;
								awindow = windowInfo;
								// console.log(tabs, windowInfo);

								rotate();

								browser.alarms.create(ALARM, {
									periodInMinutes: settings.period
								});
							}
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

browser.tabs.onRemoved.addListener((tabId) => {
	tabs.delete(tabId);
});

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
	settings.captcha = asettings.captcha;
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
				type: CONTENT,
				RUN: settings.run,
				seconds: settings.minutes * 60,
				wait: settings.wait,
				delay: settings.delay,
				CAPTCHA: settings.captcha
			}
		).catch(onError);
	}
}

/**
 * Init.
 *
 * @returns {Promise<void>}
 */
async function init() {
	const asettings = await AddonSettings.get("settings");

	setSettings(asettings);
}

const promise = init();

browser.runtime.onMessage.addListener(async (message, sender) => {
	// console.log(message);
	await promise;
	switch (message.type) {
		case NOTIFICATION:
			console.log(message.title, message.message, new Date(message.eventTime));
			if (settings.send) {
				browser.notifications.create({
					type: "basic",
					iconUrl: browser.runtime.getURL("icons/icon_128.png"),
					title: message.title,
					message: message.message,
					eventTime: message.eventTime
				}).then((notificationId) => {
					const tabId = sender.tab.id;
					notifications.set(notificationId, { tabId });
					if (browser.tabs.warmup) {
						browser.tabs.warmup(tabId);
					}
				});
			}
			browser.pageAction.setTitle({
				title: `${TITLE}  \n${message.title}`,
				tabId: sender.tab.id
			});
			break;
		case CONTENT: {
			browser.pageAction.show(sender.tab.id);

			tabs.set(sender.tab.id, sender.tab);
			iterator = null;

			const response = {
				type: CONTENT,
				RUN: settings.run,
				seconds: settings.minutes * 60,
				wait: settings.wait,
				delay: settings.delay,
				CAPTCHA: settings.captcha
			};
			// console.log(response);
			return response;
		}
		case BACKGROUND:
			sendSettings(message.optionValue);
			break;
		// No default
	}
});

browser.runtime.onInstalled.addListener((details) => {
	console.log(details);

	const manifest = browser.runtime.getManifest();
	switch (details.reason) {
		case "install":
			notification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${TITLE}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension.`);
			break;
		case "update":
			if (settings.send) {
				browser.notifications.create({
					type: "basic",
					iconUrl: browser.runtime.getURL("icons/icon_128.png"),
					title: `✨ ${manifest.name} updated`,
					message: `The “${TITLE}” add-on has been updated to version ${manifest.version}. Click to see the release notes.`
				}).then((notificationId) => {
					if (browser.runtime.getBrowserInfo) {
						const url = `https://addons.mozilla.org/firefox/addon/colab-autorun-and-connect/versions/${manifest.version}`;
						notifications.set(notificationId, { url });
					}
				});
			}
			break;
	}
});
