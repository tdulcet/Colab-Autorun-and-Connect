# Colab Autorun and Connect
Automatically connect, reconnect and optionally run the first cell of notebooks in Google Colab

Copyright © 2020 Teal Dulcet and Daniel Connelly

![](icons/logo.png)

Firefox and Chromium add-on/WebExtension to automatically connect, reconnect and optionally run the first cell of notebooks in Google's [Colaboratory](https://colab.research.google.com/) (Colab) service. Useful when running [Distributed Computing projects in Colab](https://github.com/tdulcet/Distributed-Computing-Scripts/google-colab).

* Automatically connects to notebooks
* Automatically reconnects to notebooks
* Optionally automatically runs the first cell
* Desktop notifications when the notebooks change state
* Page action popup with the notebooks status and a stopwatch
* Detailed information output to the console

Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

🔜 This will soon be published to Addons.mozilla.org (AMO) and possibly the Chrome Web Store.

Use on Chromium/Chrome requires the downloading the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and renaming the [chromemanifest.json](chromemanifest.json) file to `manifest.json`.

## Other Colab Extensions

* [Colab Auto Reconnect](https://github.com/ZohebAbai/Colab_Auto_Reconnect) (Firefox and Chrome)
* [Colab Alive](https://github.com/rtindru/colabAlive) (Chrome)
* [Colab Auto Reconnect](https://github.com/charlie890414/Colab-Auto-Reconnect) (Chrome)

## Contributing

Pull requests welcome! Ideas for contributions:

* Add an [options page](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Options_pages)
* Workaround the issue with Colab popups hanging
* Improve the performance

Thanks to [Daniel Connelly](https://github.com/Danc2050) for the idea for this extension and for helping test it!
