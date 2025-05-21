/**
 * Starter module for addon settings site.
 *
 * @requires modules/OptionHandler
 */

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";

import * as CustomOptionTriggers from "./modules/CustomOptionTriggers.js";

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

document.getElementById("shortcut").addEventListener("click", (event) => {
	event.target.disabled = true;

	if (browser.commands.openShortcutSettings) {
		browser.commands.openShortcutSettings().finally(() => {
			event.target.disabled = false;
		});
	} else if (IS_CHROME) {
		browser.tabs.create({ url: "chrome://extensions/shortcuts" }).finally(() => {
			event.target.disabled = false;
		});
	}
});

// init modules
CustomOptionTriggers.registerTrigger();
AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();
