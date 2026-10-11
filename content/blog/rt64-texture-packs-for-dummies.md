+++
title = "Make Your Own Recomp Texture Pack"
date = "2026-10-05T21:25:58-07:00"
description = "Step-by-step guide to making your own texture pack using Snowboard Kids as an example."
tags = []
+++

Intro
* there all this amazing fan art in the community
	* I wish we had more texture packs for recomps
	* i have no artistic talent myself

<show snowboard kids: recompiled and snowboard kids 2: recompiled launcher backgrounds side by side. they'll each need to be small to fit but it's fine. might be easier to make a new composite image than figure out the css>

* making texture packs isn't super hard, it's [well documented](link to rt64 texture pack documentation) but i think it can be intimidating if you're not used to messing around with recomps and command line tools add additional friction to the process
* the goal of this guide is to serve as a simple easy to follow set of instructions for making a simple texture pack, using [snowboard kids recompiled](link to recomp) as an example
	* you need no other tools other than this page and the snowboard kids recomp and an image editor
	* i promise you will never touch the command line

## High level overview of what we're about to do pick a better title than this

* We're going to run the game and collect all the textures we see
* We're going to edit them using a simple upscaling tool as an example 
* We're going to make a game mod that replaces the original textures with our new textures

## 1. Enable Developer Mode

Before we can change anything we first need to dump textures from the game to edit.

Recompilations built with RT64 (confirm this is what is adding the menu, etc). There is a secret developer mode we need to turn on so that we can start dumping textures.

If you're running the latest version of Snowboard Kids: Recompiled or Snowboard Kids 2: Recompiled, all you need to do is go to Graphics --> Enable Developer Mode. Congratulations, you can move on to then next step. Otherwise, you're going to have to keep reading!

Enabling developer mode on a standard N64Recompiled game requires us to edit a specific config file for the recomp. The location of this file will vary depending on your operating system:

* **Windows**:  Press **Windows+R**, paste `%LOCALAPPDATA%\SnowboardKidsRecompiled`, and press Enter.
* **macOS**: In Finder, choose **Go > Go to Folder**, paste `~/Library/Application Support/SnowboardKidsRecompiled`, and press Return.
* **Linux**: In your file manager, press **Ctrl+L**, enter `~/.config/SnowboardKidsRecompiled`, and press Enter.

*Make sure you've run the game at least once. Otherwise you won't be able to see the config file we're about to change.*

## 2. Collect the original textures

Now when you start the game and press **F1** (try Fn+F1 if that doesn't work) you'll see a developer menu. Pressing F1 again will hide the menu.

Open the game and start dumping textures:

1. In the debugger, select the **Textures** tab.
2. Click **Start dumping textures**, then choose your `Dumps` folder.

<screenshot of the textures tab of the debug menu> start-dumping-textures.png

*Note: you will need to repeat this step each time you restart the game.*

In our snowboard kids: recompiled example let's go to the character select menu so we can replace those textures.

<screenshot of the character select menu>

Dumping collects textures as the game draws them. A short visit will not collect every course, character, animation, or menu. You can collect more later.

## 3. Edit texture

Open the converted images folder and find the image that you want to edit. You'll notice that some images are represented as a single texture file while other, larger in-game images, are spread across multiple files. The principles we're discussing today work just as well for these larger files but for simplicity we'll be focusing on the single file use-case

*Note: if you look in the folder and see this weird collection of json, tmem and rdram files but no PNG files, you're running a recomp that hasn't upgraded to the latest version of RT64. You'll first need to use [this tool](https://chrislewis.au/texture-converter/) to convert your images.*

i am not artistically talented so i'm going to run the character textures we captured earlier through an [online image upscaler](https://upscale.chino.icu)

## 4. Replace the texture in game

Now we're going to locate the draw call for the specific texture you want to replace and update it live in game. Unfortunately this process is a little involved. I've created a youtube video that walks through the steps as well though.

1. Start the game and navigate to the scene showing your chosen texture.
2. Press F1, open **Textures**, and click **Load directory**. Select the directory containing your higher-definition textures.
4. Use the debugger's **Pause** (F4) button to freeze the scene.
5. Right-click the object in the game view to inspect the draws underneath it. You can also
   browse the debugger's draw-call list and hover over entries to identify the object.
   A draw call is one drawing operation; the same object may use several.
6. Expand the relevant texture tile, check its preview, and click **Replace**.
7. Select `MyPack/textures/my-sign.png`. The image must already be inside `MyPack`.
8. Return to **Textures** and click **Save directory**. You'll notice that there's a new file (rt64.json) in the directory now!
10. Unpause, hide the debugger, and inspect your change in motion.

{{ youtube mBZVcxJypuU "caption explaining that the video is a walkthrough of replacing two of Jam's textures with higher definition versions." }}

## 5. Package your work as an `.rtz` file

* Now that we've replaced the textures that we wanted to replace, it's time to package that work as a mod (.rtz file) for distribution.
	* packaging does a few things, including converting images to a more efficient format and creating a cache to help speed up texture-loading times.

You can use the official command line tool to do this but that would break our rule against no command line tools! I've created a simple online tool that replicates the process. Everything is done locally in your browser, no image data etc will leave your computer.

If you would like an icon as well, be sure to put a thumb.png file in that directory

{{< texture-tool src="https://chrislewis.au/texture-packer/" title="RT64 texture packer" >}}
*If the embedded tool does not load, [open the packer in a new tab](https://chrislewis.au/texture-packer/).*

## 6. Admire your finished work

Restart the game, open the **Mods** menu and install the .rtz file that you just created. Your changes should be visible!