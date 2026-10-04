+++
title = "Introducing Snowboard Kids: Recompiled"
date = "2026-10-02T06:39:43-07:00"
description = "Snowboard Kids is recompiled for Windows, Mac and Linux, with widescreen, high frame rates, local multiplayer and mod support."
images = ["snowboard-kids-launcher-preview.png"]
tags = []
default = false
+++

**TL;DR [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp/releases) is available for Windows, Mac and Linux!**

Following the [decompilation of Snowboard Kids](/decompiling-a-nintendo-64-game-in-84-days/), I’ve been working on recompiling the game for modern hardware. Today I’m pleased to announce the release of Snowboard Kids: Recompiled!

This was far from a solo effort. I’d like to thank the members of the community who helped make this release possible.

* M. Lee Lunsford from the Snowboard Kids Discord for his amazing launcher image.
* [Darío](https://github.com/DarioSamo) for his help and advice throughout the recompilation effort.[^1]
* Everyone who helped with the decompilation, particularly [inspectredc](https://github.com/inspectredc), [Bl00D4NGEL](https://github.com/Bl00D4NGEL), and [queueRAM](https://github.com/queueRAM).
* Everyone who tested the pre-release builds, especially [McGyna](https://twitch.tv/McGyna), who sent me dozens of videos and screenshots showing in exquisite detail all the ways I’d screwed up or missed something.

![screenshot of the Snowboard Kids: Recompiled launcher](/snowboard-kids-launcher.webp "Launcher artwork by M. Lee Lunsford.")

## Features

_Snowboard Kids: Recompiled_ supports widescreen and ultrawide displays, high frame rates, configurable controls, mods and so much more.

There are also a few smaller quality-of-life improvements. The recompilation handles saves directly, avoiding the hassle of managing a virtual Controller Pak and letting us simplify the game’s save menus.

The game also includes a few simple mods to serve as inspiration:

* **Mod Example:** available as a [template on GitHub](https://github.com/cdlewis/snowboardkids-recomp-mod-template), this is a great starting point if you’re looking to create your own mod. It gives you unlimited parachutes and fans for good measure.
* **Quick Start:** at some point I got tired of watching the opening credits while testing the recomp. Skip straight to the title screen.
* **Nepo Kids:** takes place in an alternate reality where the kids had wealthy parents. Start the game with all content unlocked.[^2]
* **No Rubber Banding:** there’s no worse feeling than building a massive lead only to have the AI inexplicably catch up and overtake you.

![screenshot of the mod menu](/mod-menu.webp "The bundled example mod keeps player one supplied with parachutes and fans. Perfect for multiplayer.")

### Local Multiplayer

Up to four players can race locally, with high frame rates and a choice of vertical or horizontal splits for two-player races.

![screenshot of split-screen multiplayer](/split-screen.webp "Two-player races default to a vertical split.")

Behind the scenes, both Snowboard Kids recompilations share a fork of [RecompFrontend](https://github.com/cdlewis/RecompFrontend). This provides the launcher, settings, and controller configuration, with some additional work on theming and (in my opinion) a smoother multiplayer controller assignment flow.

![screenshot of controller assignment for a four-player game](/pair-controllers.webp "Each player presses a button on their controller to claim a slot. The keyboard can also be assigned to a player.")

I’d like to upstream some of these changes eventually. Multiplayer support is a relatively new [RecompFrontend](https://github.com/N64Recomp/RecompFrontend) feature, though, and I think it’ll take more projects using it before we know what works best.

If, like me, you’re more of a _Snowboard Kids 2_ person, its multiplayer support is [also available](https://github.com/cdlewis/snowboardkids2-recomp/releases) as an alpha release.

## What Next?

There’s plenty more to say about building and testing the recompilation. Projects using [N64Recomp](https://github.com/N64Recomp/N64Recomp) seem to encounter many of the same problems, and I think some of what I learnt could help other recompilation efforts. When I started writing those thoughts down, though, this post quickly ran over 3,000 words. I’ve decided to cover the development process in a separate series. Stay tuned!

*If you love Snowboard Kids, please do join us on the [Snowboard Kids Discord](https://discord.gg/bwQ85rUED).*

**Download [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp/releases)**

[^1]: At one point I woke up to 43 messages from him going into minute detail on everything I’d missed in an early alpha build 🫠.

[^2]: True fans of the series know that the Konami code already does this.
