# Colab Autorun and Connect
Automatically connect, reconnect and optionally run the first cell of notebooks in Google Colab

Copyright © 2020 Teal Dulcet and Daniel Connelly

![](icons/logo.png)

Firefox and Chromium add-on/WebExtension to automatically connect, reconnect and optionally run the first cell of notebooks in Google's [Colaboratory](https://colab.research.google.com/) (Colab) service. Useful when running [Distributed Computing projects in Colab](https://github.com/tdulcet/Distributed-Computing-Scripts/google-colab).

* Automatically connects to notebooks
* Automatically reconnects to notebooks
* Optionally automatically runs the first cell
* Desktop notifications when the notebooks change state
* Optionally rotate through Colab tabs when the system is idle or locked \*
* Page action popup with the notebooks status and a stopwatch
* Detailed information output to the console
* Settings automatically synced between all browser instances and devices
* Follows the [Firefox Photon Design](https://design.firefox.com/photon)
* Compatible with Firefox for Android

❤️ Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

🔜 This will soon be published to Addons.mozilla.org (AMO) and possibly the Chrome Web Store.

Use on Chromium/Chrome requires the downloading the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and renaming the [chromemanifest.json](chromemanifest.json) file to `manifest.json`.

\* Tab rotate does not currently work well with Firefox on Windows because of [Bug 1615885](https://bugzilla.mozilla.org/show_bug.cgi?id=1615885).

## Other Colab Extensions

* [Colab Auto Reconnect](https://github.com/ZohebAbai/Colab_Auto_Reconnect) (Firefox and Chrome)
* [Colab Alive](https://github.com/rtindru/colabAlive) (Chrome)
* [Colab Auto Reconnect](https://github.com/charlie890414/Colab-Auto-Reconnect) (Chrome)

## Contributing

Pull requests welcome! Ideas for contributions:

* Add option to run all cells, not just the first
* Workaround the issue with Colab popups hanging
* Improve the performance

Thanks to [Daniel Connelly](https://github.com/Danc2050) for the idea for this extension and for helping test it!
