---
layout: post
title: Tests tests tests!
subtitle: v1.7
tags: Update Test
---

What good is having a large chunk of code without having any tests to make sure it works in all cases? This update includes some tests to check edge cases of the **,remindme** command for correct formatting and tests for **,time** command to make sure the correct message is being extracted from the Chicken Smoothie website. Some other tests include checking the xpath expression is correct for getting pet data.

Changelog:
* Added tests for **,time** command getting pound time
* Added tests for **,remindme** command to check correct parsing of time
* Added tests for **,pet** command for extracting pet data
* Added tests for **,image** command for correct image creation and uploading to Imgur
* Added some extra tests for performance