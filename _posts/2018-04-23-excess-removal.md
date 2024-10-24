---
layout: post
title: Excess Removal
subtitle: v1.6.2
tags: Update Help Remind-Me
---

In the 4 months of development of CS-Pound a racked up a lot of unused code or temporary code that has been used to create the bot commands, this update focuses to do some code refactoring and cleaning up some of that mess.

One such cleanup is of the **,pet2**, a command in beta that aimed to replace **,pet** once it was completed. However due to the large amount of time it takes to process the image and the different sizes of pets and data that is listed in the rows, I've decided ultimately to give it up and remove the command. Instead, the **,image** command will take it place with added name (If applicable), adopted date and rarity. It would display as how you would see it if you were looking the pets in groups instead of the individual pet page.

Changelog:
* Added pet name, adopted date and rarity to **,image** command
* Changed **,help** command list layout
* Changed **,time** code to improve response time
* Removed link to CS-Pound website from "Playing" status
* Removed **,pet2** command
