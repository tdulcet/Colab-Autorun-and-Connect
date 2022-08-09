/**
 * This modules contains the custom triggers for some options that are added.
 *
 * @module modules/CustomOptionTriggers
 */

import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";

// communication type
const BACKGROUND = "background";

/**
 * Apply the new settings.
 *
 * @private
 * @param  {Object} optionValue
 * @param  {string} [option]
 * @param  {Object} [event]
 * @returns {void}
 */
function apply(optionValue) {
	// trigger update for current session
	browser.runtime.sendMessage({
		type: BACKGROUND,
		optionValue
	});
}

/**
 * Binds the triggers.
 *
 * This is basically the "init" method.
 *
 * @returns {void}
 */
export function registerTrigger() {
	AutomaticSettings.Trigger.registerSave("settings", apply);
}
