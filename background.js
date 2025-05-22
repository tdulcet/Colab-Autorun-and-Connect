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
		chrome.notifications.create({
			type: "basic",
			iconUrl: chrome.runtime.getURL("icons/icon_128.png"),
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

chrome.notifications.onClicked.addListener((notificationId) => {
	const { tabId, url } = notifications.get(notificationId);

	if (tabId) {
		chrome.tabs.query({}).then((tabs) => {
			const atab = tabs.find((tab) => tab.id === tabId);
			if (atab) {
				chrome.windows.update(atab.windowId, { focused: true }); // focus window
				chrome.tabs.update(atab.id, { active: true }); // focus tab
			}
		}).catch(onError);
	} else if (url) {
		chrome.tabs.create({ url });
	}
});

chrome.notifications.onClosed.addListener((notificationId) => {
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

	if (chrome.tabs.warmup) {
		chrome.tabs.warmup(tab.id);
	}

	if (!previousWindow || previousWindow.id !== tab.windowId) {
		if (previousWindow) {
			// console.log(new Date(), "restoring previous", previousTab.id, previousTab);
			await chrome.windows.update(previousWindow.id, { focused: previousWindow.focused, state: previousWindow.state }); // focus window
			await chrome.tabs.update(previousTab.id, { active: previousTab.active }); // focus tab
		}

		chrome.windows.get(tab.windowId).then((windowInfo) => {
			previousWindow = windowInfo;
			// console.log(windowInfo);
		});

		chrome.tabs.query({ active: true, windowId: tab.windowId }).then((tabs) => {
			if (tabs[0]) {
				[previousTab] = tabs;
				// console.log(tabs);
			}
		});

		await chrome.windows.update(tab.windowId, { focused: true }); // focus window
	}

	await chrome.tabs.update(tab.id, { active: true }); // focus tab
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
				chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
					if (tabs[0]) {
						const [tab] = tabs;
						chrome.windows.get(tab.windowId).then((windowInfo) => {
							if (windowInfo.state !== "fullscreen") {
								atab = tab;
								awindow = windowInfo;
								// console.log(tabs, windowInfo);

								rotate();

								chrome.alarms.create(ALARM, {
									periodInMinutes: settings.period
								});
							}
						});
					}
				});
			}
		} else if (state === "active") {
			if (atab) {
				chrome.alarms.clear(ALARM);

				iterator = null;

				if (chrome.tabs.warmup) {
					chrome.tabs.warmup(atab.id);
				}

				if (previousWindow) {
					// console.log(new Date(), "restoring previous", previousTab.id, previousTab);
					chrome.windows.update(previousWindow.id, { focused: previousWindow.focused, state: previousWindow.state }); // focus window
					chrome.tabs.update(previousTab.id, { active: previousTab.active }); // focus tab
				}

				if (!previousWindow || previousWindow.id !== atab.windowId) {
					// console.log(new Date(), "restoring active", atab.id, atab);
					chrome.windows.update(atab.windowId, { focused: awindow.focused, state: awindow.state }); // focus window
					chrome.tabs.update(atab.id, { active: atab.active }); // focus tab
				}

				previousTab = null;
				previousWindow = null;

				atab = null;
				awindow = null;
			}
		}
	}
}

chrome.idle.onStateChanged.addListener(newState);

chrome.tabs.onRemoved.addListener((tabId) => {
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

chrome.alarms.onAlarm.addListener(handleAlarm);

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

	chrome.idle.setDetectionInterval(settings.idle);
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
		chrome.tabs.sendMessage(
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

// Initialize 'promise' globally or ensure it's accessible
const promise = init().catch(err => { // Make sure to catch init errors
    console.error("Initialization promise (global) rejected:", err);
    // Decide how to handle this - maybe set a flag that extension is not ready
    // For now, just logging is important.
});

// Issue from Firefox was that this was Async and it didn't like it... I don't know enough to know why
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BG: onMessage triggered. Message:", message);

    // Immediately handle the fact that sendResponse will be async due to initPromise
    // This structure assumes *all* message types might depend on initPromise.
    // If only some do, you can be more granular with 'return true'.

    promise.then(() => {
        // 'promise' (now initPromise) has resolved successfully
        console.log("BG: initPromise resolved. Processing message type:", message.type);

        if (!message || typeof message.type === 'undefined') {
            console.warn("BG: Message received without type or undefined message object:", message);
            // sendResponse({ error: "Invalid message format" }); // Optional: send error
            return; // Don't return true, as we are not sending a response for this specific path
        }

        switch (message.type) {
            case NOTIFICATION:
                console.log(message.title, message.message, new Date(message.eventTime));
                if (settings.send) {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: chrome.runtime.getURL("icons/icon_128.png"),
                        title: message.title,
                        message: message.message,
                        eventTime: message.eventTime
                    }).then((notificationId) => {
                        const tabId = sender.tab.id;
                        notifications.set(notificationId, { tabId });
                        if (chrome.tabs.warmup) {
                            chrome.tabs.warmup(tabId);
                        }
                    });
                }
                chrome.action.setTitle({
                    title: `${TITLE}  \n${message.title}`,
                    tabId: sender.tab.id
                });
                break;

            case CONTENT: {
                console.log("BG (CONTENT case): Entered after initPromise.");
                chrome.action.enable(sender.tab.id);
                // tabs.set(sender.tab.id, sender.tab); // Assuming 'tabs' and 'settings' are available
                // iterator = null;
                        
                // TODO -- the RUN is hardcoded since settings are not working in Chromium (i.e., I think not showing for user to set them)... check Firefox to see what it should look like.
                const responsePayload = {
                    type: CONTENT, // CONTENT from common.js
                    RUN: true,//settings.run, // 'settings' should be loaded by init() and accessible here
                    seconds: settings.minutes * 60,
                    wait: settings.wait,
                    delay: settings.delay,
                    CAPTCHA: settings.captcha
                };
                console.log("BG (CONTENT case): Prepared response:", responsePayload); // This is your line 311
                sendResponse(responsePayload);
                console.log("BG (CONTENT case): Called sendResponse.");
                break; 
            }

            case BACKGROUND:
                // sendSettings(message.optionValue); // Does this send a response? If so, call sendResponse()
                console.log("BG: BACKGROUND case processed.");
                break;

            default:
                console.log("BG: Unknown message type received:", message.type);
                // sendResponse({ error: "Unknown message type" }); // Optional
                break;
        }
    }).catch(error => {
        console.error("BG: Error after initPromise (in .then block processing message):", error);
        // It's tricky to call sendResponse here reliably if the error source is unknown
        // or if sendResponse might have already been called for a different path.
        // sendResponse({ error: "Background processing error", details: error.message });
    });

    // **CRUCIAL FOR ASYNCHRONOUS sendResponse IN A NON-ASYNC LISTENER**
    // This tells Chrome to keep the message channel open because we will call
    // sendResponse later (inside the initPromise.then() callback).
    return true;
});


//const promise = init();

/*chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	// console.log(message);
	await promise;
	switch (message.type) {
		case NOTIFICATION:
			console.log(message.title, message.message, new Date(message.eventTime));
			if (settings.send) {
				chrome.notifications.create({
					type: "basic",
					iconUrl: chrome.runtime.getURL("icons/icon_128.png"),
					title: message.title,
					message: message.message,
					eventTime: message.eventTime
				}).then((notificationId) => {
					const tabId = sender.tab.id;
					notifications.set(notificationId, { tabId });
					if (chrome.tabs.warmup) {
						chrome.tabs.warmup(tabId);
					}
				});
			}
			chrome.action.setTitle({
				title: `${TITLE}  \n${message.title}`,
				tabId: sender.tab.id
			});
			break;
		case CONTENT: {
			chrome.action.enable(sender.tab.id);

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
			console.log(response);
            sendResponse(response);
            break;
			//return response;
		}
		case BACKGROUND:
			sendSettings(message.optionValue);
			break;
		// No default
	}
});*/

chrome.runtime.onInstalled.addListener((details) => {
	console.log(details);

	const manifest = chrome.runtime.getManifest();
	switch (details.reason) {
		case "install":
			notification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${TITLE}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension.`);
			break;
		case "update":
			if (settings.send) {
				chrome.notifications.create({
					type: "basic",
					iconUrl: chrome.runtime.getURL("icons/icon_128.png"),
					title: `✨ ${manifest.name} updated`,
					message: `The “${TITLE}” add-on has been updated to version ${manifest.version}. Click to see the release notes.`
				}).then((notificationId) => {
					if (chrome.runtime.getBrowserInfo) {
						const url = `https://addons.mozilla.org/firefox/addon/colab-autorun-and-connect/versions/${manifest.version}`;
						notifications.set(notificationId, { url });
					}
				});
			}
			break;
	}
});
