"use strict";

// Automatically run the first cell
let RUN = false;

// Minutes to retry
let minutes = 1;

// Display notifications
let SEND = true;

const notifications = new Map();

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
			if (tab.id == tabId) {
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

browser.runtime.onMessage.addListener((message, sender) => {
	// console.log(message);
	if (message.type === NOTIFICATION) {
		browser.notifications.create({
			"type": "basic",
			"iconUrl": browser.runtime.getURL("icons/icon_128.png"),
			"title": message.title,
			"message": message.message,
			"eventTime": message.eventTime
		}).then((notificationId) => {
			notifications.set(notificationId, sender.tab.id);
			// browser.tabs.warmup(sender.tab.id);
		});
	} else if (message.type === BACKGROUND) {
		browser.pageAction.show(sender.tab.id);

		const response = {
			"type": BACKGROUND,
			"RUN": RUN,
			"seconds": minutes * 60,
			"SEND": SEND
		};
		// console.log(response);
		return Promise.resolve(response);
	}
});
