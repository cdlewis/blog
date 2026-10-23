+++
title = "Make Your Own Recomp Texture Pack"
date = "2026-10-15T21:25:58-07:00"
description = "Make a texture pack for Snowboard Kids: Recompiled without touching the command line."
tags = []
images = ["characters-upscale-social.png"]
draft = true
+++

Nintendo 64 games are instantly recognisable from their charming[^2] low-resolution textures. Recomps improve many things about a game, but generally leave those textures intact. For anyone wanting a more modern look, or a different artistic style entirely, texture packs offer a ready-made solution. As the name suggests, they let you replace in-game textures with images of your choice, often at much higher resolutions.

For all their promise, texture packs are a rare sight outside the most popular games, such as Super Mario 64, Ocarina of Time and Mario Kart 64. This is unfortunate because making a texture pack is not especially difficult[^1] and there’s no shortage of talented artists in the retro gaming community. Indeed, I’m very grateful to M. Lee Lunsford, Moz and Jellsoup for contributing artwork to [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp) and [Snowboard Kids 2: Recompiled](https://github.com/cdlewis/snowboardkids2-recomp).

![Snowboard Kids and Snowboard Kids 2 launcher artwork side by side.](/snowboard-kids-launcher-art-pair.webp "Launcher artwork by M. Lee Lunsford (left), and Moz (right).")

My theory is that the technical steps put off otherwise interested people, especially those unfamiliar with recomps and command-line tools.

This guide walks through making a small texture pack using [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp) as an example. All you’ll need is a working copy of the game. Everything else is embedded or linked on this page, and there’s no command line involved!

## What we’re going to do

A texture pack tells the game to use our images in place of its original artwork. We’ll find a texture in the debugger, save it as a PNG, edit it, then replace it in game. Once we’re happy with the result, we’ll bundle it into a mod that other people can install.

## 1. Enable developer mode

RT64, the renderer used by these recomps, includes a developer menu that lets us collect and replace textures.

In recent builds of Snowboard Kids: Recompiled and Snowboard Kids 2: Recompiled, go to **Settings → Graphics** and enable **Dev Mode**. Click **Apply**, then restart the game.

![The Graphics settings in Snowboard Kids: Recompiled, with the Dev Mode toggle at the bottom.](/dev-mode-option.png "Scroll to the bottom of the Graphics settings to find Dev Mode.")

If that worked, you can move on to the next step!

If your game doesn’t have that option, run the game once, close it, then open its settings folder. For Snowboard Kids: Recompiled:

* **Windows:** Press **Windows+R**, paste `%LOCALAPPDATA%\SnowboardKidsRecompiled`, and press Enter.
* **macOS:** In Finder, choose **Go → Go to Folder**, paste `~/Library/Application Support/SnowboardKidsRecompiled`, and press Return.
* **Linux:** Open `~/.config/SnowboardKidsRecompiled` in your file manager.

Other recompilations generally use their own folders in the same location.

Make a backup of `graphics.json`, then open the original in a plain-text editor. Change `"developer_mode": false` to `"developer_mode": true` and save it.

## 2. Find and save a texture

Start the game and visit the character-select screen. We’re going to replace a couple of Jam’s textures.

This is the fiddliest part: finding the drawing operation, or ‘draw call’, that uses the texture we want to edit.

1. Press **F1** (**Fn+F1** on some keyboards) to open the developer menu.
2. In the debugger, click **Pause (F4)** to freeze the scene.
3. Right-click the part of Jam you want to edit. Inspect the draws underneath it and expand the relevant texture tile until you find the matching preview.
4. Click **Dump PNG**, next to the replacement controls, and save the image somewhere easy to find. If that button is missing, use the fallback below.

That gives us an ordinary image file to work with. Some artwork is split across several textures, so we’ll stick with individual textures for now. Leave the game paused here while you edit.

![Navigating the debugger’s draw calls to find a texture.](/navigate-draw-calls.gif)

### Automatically dump textures

*This is another way to collect textures. If you saved a PNG in the previous step, you can skip to step 3.*

RT64 only added **Dump PNG** in October 2026, so your recomp may not have it yet. Older builds offer **Dump TMEM**, which saves raw memory as a `.bin` file. To turn that into an image, we also need the texture’s settings. The easiest way to get both is a folder dump:

1. Click **Copy hash** beside **Replace** and paste it somewhere for reference. This identifies the texture you found.
2. Open **Textures**, click **Start dumping textures**, and choose a new folder called `Dumps`.
3. Unpause briefly so the game draws the texture, then pause again and click **Stop dumping textures**.
4. Select `Dumps` in the [texture converter](https://chrislewis.au/texture-converter/). Keep its `.tmem` and `.tile.json` files together.
5. Extract the downloaded ZIP and find the PNG in `images` whose filename starts with the hash you copied. Continue below with that image.

Even if **Dump PNG** is available, automatic dumping can be quicker when collecting lots of textures. You can browse the images afterwards instead of saving them one at a time.

## 3. Edit the texture

Create a folder called `MyPack` for your texture replacements. Edit the PNG you just saved, keeping its proportions and any transparent areas intact, then save the result inside `MyPack`. Keep the original separately so you can go back to it.

For this example, I’m running Jam’s textures through an [online image upscaler](https://upscale.chino.icu/). You can redraw them, recolour them, or do something much more interesting.

## 4. Replace the texture in game

Return to the paused game. If your texture is no longer selected, find it again using the steps above. Now we can load its replacement:

1. Open **Textures**, click **Load directory**, and select `MyPack`.
2. Switch back to the debugger and click **Replace** on the selected texture tile. Choose your edited PNG inside `MyPack`.
3. Return to **Textures** and click **Save directory**.

You should now have an `rt64.json` file in `MyPack`. This records which original texture your image replaces. Keep it with your replacement images.

Unpause, press **F1** to hide the developer menu, and check your work. If you make more edits, use **Load directory** again to reload the images. Repeat the process for any other textures you want to replace, saving the directory after each new replacement.

Here’s a video of me replacing two of Jam’s textures:

{{< youtube id="wQbQtcwvjm0" caption="Replacing two of Jam’s textures with higher-resolution versions." >}}

## 5. Package your mod

Now we’ll turn `MyPack` into an `.rtz` file for distribution. Packaging converts the images to a more efficient format and creates a cache to help reduce texture-loading delays.

You can package textures with the [official command-line tool](https://github.com/rt64/rt64/releases/tag/texture_pack_tools), but that would break our no-command-line rule. So I’ve made a simple web alternative, embedded below. Everything happens locally; your images stay on your computer.

If you’d like an icon in the mod menu, put an image named `thumb.png` in `MyPack` too.

{{< texture-tool src="https://chrislewis.au/texture-packer/" title="RT64 texture packer" >}}

Select `MyPack`, fill in your pack’s details, and choose **Pack & download**. For this example, the Game ID is `snowboardkids`. Save the downloaded `.rtz` somewhere outside `MyPack`.

*If the embed doesn’t load, [open the packer in a new tab](https://chrislewis.au/texture-packer/).*

## 6. Admire your finished work

Restart the game, open **Mods**, and install and enable your `.rtz` file. Head back to the game to admire your work.

I’ve updated all the character-select portraits using the upscaling tool mentioned earlier. Here’s how they compare with the originals:

![Original and upscaled Snowboard Kids character-select portraits.](/characters-upscale.png "Original textures on the left of the divider; upscaled textures on the right.")

*If you’ve made it this far, you might enjoy the [Snowboard Kids Community Discord](https://discord.gg/PJzG4F8SpF).*

{{< recomp-release-logos >}}

[^1]: The texture pack creation process is [well documented](https://github.com/rt64/rt64/blob/main/TEXTURE-PACKS.md).

[^2]: Perhaps a controversial opinion. It’s impressive how much detail artists managed to fit into a vanishingly small amount of space.
