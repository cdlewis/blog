+++
title = "Snowboard Kids 2 is 100% Decompiled"
date = "2026-05-17T14:02:16-07:00"
description = ""
draft = false 
images = ['snowboardkids2-decomp-report.png']
+++

I am very pleased to announce that snowboard kids too is officially 100% decompiled!

All of the game's functions have now been implemented in C and compilable to assembly that matches the original assembly for that function (albeit with some occaisional `__asm__` hackery). This is useful for people that want to understand more about how the game works and may help with other efforts such as recompilation, asset extraction and modding.

![screenshot of the decomp.dev Snowboard Kids 2 decompilation report](/snowboardkids2-decomp-report.png)

## The journey

This project has been a little under two years in the making with the [first commit](https://github.com/cdlewis/snowboardkids2-decomp/commit/f1025d16a8aa1d11ec937f8c721af59149feee7c) to the decompilation repo happening in September 2024.

The circumstances surrounding the final matches are not what I expected when I initially started the project. I'm currently sitting in the hospital with my newborn baby daughter (she's doing fine but needs some help eating). It has certainly been a helpful distraction and enjoyable way to kill time.

![photo of me in the hospital with my daughter](/hospital.jpeg)

The path to decoying any game let alone a Nintendo 64 game is not well documented. This project would not have been possible without the assistance of the N64 decompilation Discord members of the community who have been incredibly generous with their time. I would in particular like to thank [Bl00D4NGEL](https://github.com/Bl00D4NGEL), [inspectredc](https://github.com/inspectredc), [SlaveOfIDO](https://github.com/SlaveOfIDO) and [queueRAM](https://github.com/queueRAM) for their significant contributions to the project. Particularly the last 10 functions.

![screenshot of the decomp.dev Snowboard Kids 2 leaderboard](/leaderboard.png "Leaderboard shared on discord for tracking work on the remaining Snowboard Kids 2 functions.")

As I written elsewhere on this blog, coding agents played an important role in the decompilation effort, particularly Claude, GLM and Codex. I don't want to turn this into another artificial intelligence blog post (I have three of those already if you're interested) but I would like to make a couple of observations:

1. Based on my experience with the last ten functions, the most effective model appears to be Codex 5.5 xhigh. Historically Claude was more effective and I expect this to continue changing, perhaps even by the time you read this.
2. Frontier models are highly effective at decompilation but this does come at a cost. GLM is probably the best value for money when it comes to decompilation work if you would like to try coding agents in your own project, but are put off by high subscription fees.

## What next?

Reaching 100% decompilation was not blocking the recompilation effort but it was has a higher priority for me personally. With the decompilation finished, my next goal is to release a high-quality recompilation snowboard kids 2. This is in a pretty good state already thanks to help from [sonicdcer](https://github.com/sonicdcer) and [DarioSamo](https://github.com/DarioSamo) but there are still bugs to squash before I'm comfortable releasing it.

![screenshot of an alpha version of Snowboard Kids 2: Recompiled](/sbk2-recompiled-screenshot.png "Screenshot from Snowboard Kids 2: Recompiled. Note the use of widescreen and expanded draw distance. This can lead to some visual quirks.")

There is also plenty of work left to do documenting the decompiled functions and properly extracting graphics/audio assets which are currently just treated as binary blobs.

Finally I am interested in starting a Snowboard Kids 1 decompilation. I think it would be really cool to make a Super Snowboard Kids that combined both games and allowed you to play all the original tracks on the more modern engine. But I have no idea how feasible this ultimately would be 🤷.