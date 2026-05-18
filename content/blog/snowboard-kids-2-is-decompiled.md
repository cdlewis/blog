+++
title = "Snowboard Kids 2 is 100% Decompiled"
date = "2026-05-17T14:02:16-07:00"
description = "Snowboard Kids 2 for the Nintendo 64 has reached 100% matching decompilation. A brief note on what that means, how we got here, and what comes next."
draft = false 
images = ['snowboardkids2-decomp-report.png']
+++

I'm very pleased to announce that _Snowboard Kids 2_ is officially 100% decompiled!

All of the game's functions have now been implemented in C and compile to assembly that matches the original game. There's still some occasional `__asm__` hackery,[^1] and plenty of code needs better names and documentation, but every function now has a matching C implementation.

That matters because a matching decompilation turns the game from a pile of MIPS assembly into a codebase we can read, build, study, and modify. It should help with recompilation, asset extraction, modding, and generally understanding the mechanics of the N64's greatest game.

![screenshot of the decomp.dev Snowboard Kids 2 decompilation report](/snowboardkids2-decomp-report.svg "Snowboard Kids 2 decompilation report from decomp.dev. Boxes represent different files.")

## The journey

This project has been a little under two years in the making, with the [first commit](https://github.com/cdlewis/snowboardkids2-decomp/commit/f1025d16a8aa1d11ec937f8c721af59149feee7c) landing in September 2024.

The circumstances surrounding the final matches were not quite what I expected when I started. I'm currently sitting in hospital with my newborn daughter. She's doing fine, but needs some help eating. Decompilation has been a useful distraction and an enjoyable way to fill the quiet hours.

![photo of me in the hospital with my daughter](/hospital.webp)

The path to decompiling any game, let alone a Nintendo 64 game, is not especially well documented. This project would not have been possible without the N64 decompilation Discord community, whose members have been incredibly generous with their time. I would particularly like to thank [Bl00D4NGEL](https://github.com/Bl00D4NGEL), [inspectredc](https://github.com/inspectredc), [SlaveOfIDO](https://github.com/SlaveOfIDO), and [queueRAM](https://github.com/queueRAM) for their significant contributions to the project, especially across the final ten functions.

![screenshot of the decomp.dev Snowboard Kids 2 leaderboard](/leaderboard.webp "Leaderboard shared on discord for tracking work on the remaining Snowboard Kids 2 functions.")

The community was more important than any model: people answered my dumb questions, explained tooling, and decompiled functions themselves. With that said, coding agents also greatly accelerated the decompilation effort, particularly Claude, GLM, and Codex. I don't want to turn this into another AI blog post[^2], but I do have a couple of observations:

1. Based on my experience with the final ten functions, which were among the most difficult, the most effective model appeared to be Codex 5.5 xhigh. Historically Claude was more effective, and I expect this to keep changing, perhaps even by the time you read this.
2. Frontier models are now very effective at decompilation, but this comes at a cost. GLM has probably been the best value for money for this specific kind of work. If you want to try coding agents on your own decompilation project but are put off by high subscription fees, that is where I would start.

## What next?

Reaching 100% decompilation was not technically blocking the recompilation effort, but it was more interesting to me personally. With the decompilation finished, my next goal is to release a high-quality recompilation of _Snowboard Kids 2_.

That's already in a pretty good state thanks to help from [sonicdcer](https://github.com/sonicdcer) and [DarioSamo](https://github.com/DarioSamo), but there are still bugs to squash before I'm comfortable releasing it.

![screenshot of an alpha version of Snowboard Kids 2: Recompiled](/sbk2-recompiled-screenshot.webp "Screenshot from Snowboard Kids 2: Recompiled. Note the use of widescreen and expanded draw distance. This can lead to some visual quirks.")

There's also plenty of work left to do in the decompilation project itself. A 100% match doesn't mean the source is perfectly understood. Many functions still have generated names, many structures need to be cleaned up, and graphics/audio assets are still mostly treated as binary blobs. The project is now in a much better place for that work, but the work still needs doing.

Finally, I'm interested in starting a _Snowboard Kids_ 1 decompilation. I think it would be extremely cool to make a 'Super Snowboard Kids'[^3] that combines both games and allows you to play all the original tracks on the second game's more modern engine. I have no idea how feasible that ultimately is, but it's a fun thing to think about.

If you've made it this far, you probably have an interest in decompilation and _Snowboard Kids 2_. Take a look at the [Snowboard Kids 2 decompilation project](https://github.com/cdlewis/snowboardkids2-decomp). The README includes a list of good first tasks.

**You can also [follow me on Bluesky](https://bsky.app/profile/chrislewis.au) for more Snowboard Kids 2 updates.**

[^1]: The project uses some targeted `__asm__` instructions to coerce variables into particular registers, ensure writes happen at the appropriate time, etc. Generally, these could be removed and the game would function in exactly the same way (albeit no longer byte-for-byte matching). Still, ideally this wouldn't be needed at all, and the long-term goal is to remove them.

[^2]: I have [three of those already](https://blog.chrislewis.au) if you're interested.

[^3]: Trivia: this was actually the title of _Snowboard Kids 2_ in Japan!
