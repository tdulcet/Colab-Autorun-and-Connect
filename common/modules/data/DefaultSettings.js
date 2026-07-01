/**
 * Specifies the default settings of the add-on.
 *
 * @module data/DefaultSettings
 */

/**
 * An object of all default settings.
 *
 * @private
 * @constant
 * @type {object}
 */
const defaultSettings = {
	settings: {
		run: false,
		minutes: 1,
		wait: 10, // Seconds
		delay: 30, // Seconds
		captcha: true,
		rotate: false,
		idle: 10 * 60, // Seconds
		period: 1, // Minutes
		send: true
	}
};

// freeze the inner objects, this is strongly recommend
Object.values(defaultSettings).map(Object.freeze);

/**
 * Export the default settings to be used.
 *
 * @public
 * @constant
 * @type {object}
 */
export const DEFAULT_SETTINGS = Object.freeze(defaultSettings);
