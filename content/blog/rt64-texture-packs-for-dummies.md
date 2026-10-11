+++
title = "Make Your Own Recomp Texture Pack"
date = "2026-10-05T21:25:58-07:00"
description = "Make a texture pack for Snowboard Kids: Recompiled without touching the command line."
tags = []
+++

> this pitch comes across as weird and self-centered
> pitch should be:
>> There’s so much amazing fan art in the retro gaming community. I'm very grateful to have had M. Lee Lunsford and Moz contribute artwork for [Snowboard Kids: Recompiled](link to game) and [Snowboard Kids 2: Recompiled](link to game)
>> Recomps help mordernise games visually through improved framerates and widescreen support. but i think texture packs are an underrated and underutilised capability
>> Making a texture pack isn’t especially hard, and RT64’s texture system is [well documented](https://github.com/rt64/rt64/blob/main/TEXTURE-PACKS.md). But it can be intimidating if you’re not used to messing around with recomps and command-line tools.
>> This guide walks through a small texture pack using [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp) as an example. All you’ll need a working copy of the game. Everything else is included on this page.

![Snowboard Kids and Snowboard Kids 2 launcher artwork side by side.](/snowboard-kids-launcher-art-pair.webp "Launcher artwork by M. Lee Lunsford (left), and Moz (right).")

## What we’re going to do

> no this was supposed to be a brief overview of the process at a high level before we get into the nitty gritty
1. Collect textures while playing the game.
2. Edit a couple of them. I’ll use an image upscaler for this example.
3. Package the replacements as a mod we can install and share.

## 1. Enable developer mode

RT64, the renderer used by these recomps, includes a developer menu that lets us collect and replace textures.

In recent builds of Snowboard Kids: Recompiled and Snowboard Kids 2: Recompiled, go to **Settings → Graphics** and enable **Dev Mode**. Congratulations, you're done, you can skip to the next step.

>> get me a screenshot of this and add here

If your game doesn’t have that option, run the game once, close it, then open its settings folder. For Snowboard Kids: Recompiled:

* **Windows:** Press **Windows+R**, paste `%LOCALAPPDATA%\SnowboardKidsRecompiled`, and press Enter.
* **macOS:** In Finder, choose **Go → Go to Folder**, paste `~/Library/Application Support/SnowboardKidsRecompiled`, and press Return.
* **Linux:** Open `~/.config/SnowboardKidsRecompiled` in your file manager.

Other recompilations will use their own folder names but they will be in the same directory. Make a backup of `graphics.json`, then open the original in a plain-text editor. Change `"developer_mode": false` to `"developer_mode": true` and save it.

## 2. Collect the original textures

Create a folder called `Dumps` somewhere easy to find. Start the game and press **F1** (**Fn+F1** on some keyboards) to open the developer menu.

Select the **Textures** tab, click **Start dumping textures**, and choose `Dumps`.

![The RT64 Textures tab with the Start dumping textures button.](/start-dumping-textures.png)

Press F1 again to hide the menu, then visit the character-select screen. We’re going to replace a couple of Jam’s textures.

Dumping collects textures as the game draws them, so you’ll only get images from places you visit. You can collect more later. If you restart the game, you’ll need to start dumping again.

## 3. Edit a texture

Open `Dumps` and browse the PNGs. Some images fit in a single texture; larger ones can be split across several. We’ll stick with individual textures for now.

If you see `.json`, `.tmem`, and `.rdram` files but no PNGs, your recomp may use an older version of RT64. You can use [this converter](https://chrislewis.au/texture-converter/) to change them to PNGs.

Create a separate folder called `MyPack` for your replacements. Edit your chosen images and save them there as PNGs, keeping their proportions and any transparent areas intact. Leave the original dumps alone.

As established, I’m not artistically talented, so I’m running Jam’s textures through an [online image upscaler](https://upscale.chino.icu/). You can redraw them, recolour them, or do something much more interesting.

## 4. Replace the textures in game

This is the fiddliest part: finding the drawing operation, or “draw call”, that uses your texture. I’ve recorded a walkthrough of replacing two of Jam’s textures:

{{< youtube id="wQbQtcwvjm0" caption="Replacing two of Jam’s textures with higher-resolution versions." >}}

At a high level, the process is:

1. Return to the character-select screen and press **F1**.
2. Open **Textures**, click **Load directory**, and select `MyPack`.
3. In the debugger, click **Pause (F4)** to freeze the scene.
4. Right-click the part of Jam you want to replace. Inspect the draws underneath it and expand the relevant texture tile until you find the matching preview.
5. Click **Replace** and select your edited PNG inside `MyPack`.
6. Repeat for the other texture, then return to **Textures** and click **Save directory**.

You should now have an `rt64.json` file in `MyPack`. This records which original textures your images replace. Keep it with them.

Unpause, hide the developer menu, and check your work. If you make more edits, use **Load directory** again to reload the images.

## 5. Package your work

Now we’ll turn `MyPack` into an `.rtz` file for distribution. Packaging converts the images to a more efficient format and creates a cache to help reduce texture-loading delays.

There’s an official command-line tool, but that would break our promise! I’ve made a browser tool that handles this for us. Everything happens locally; your images stay on your computer.

If you’d like an icon in the mod menu, put an image named `thumb.png` in `MyPack` too.

{{< texture-tool src="https://chrislewis.au/texture-packer/" title="RT64 texture packer" >}}

Select `MyPack`, fill in your pack’s details, and choose **Pack & download**. For this example, the Game ID is `snowboardkids`. Save the downloaded `.rtz` somewhere outside `MyPack`.

*If the embed doesn’t load, [open the packer in a new tab](https://chrislewis.au/texture-packer/).*

## 6. Admire your finished work

Restart the game, open **Mods**, and install and enable your `.rtz` file. Head back to character select and check that everything looks right.

You’ve made a texture pack! Now you can share the `.rtz`, or go back and replace more textures. I’m looking forward to seeing what people make.
