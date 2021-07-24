Hey! Thank you for trying out this software and paving the way for even more translations and localization within FoundryVTT!

## Instructions

This download package includes a few things:

* The new translation files (in the format of `[languageCode]-magicl10n.json`)
* A `languages.json` file
* A license file
* This README

Copy the generated translations files into the directory where your original translations files live in your system / module. More specifically, the directories listed in the `languages.json` file.

Replace the `languages` property in your `module.json` / `system.json` with the content in the generated `languages.json` file. This references all the new translation files, as well as your existing human-translated files. Note: Foundry Magic L10n is set up to only translate the strings you don't currently have in the target languages. That means, no machine-translated string will overwrite your existing human-translated strings.

Publish a new version of your system or module and you should be good to go!

## Licensing

These translations are licensed under the MIT License (included). You may use them however you wish.
