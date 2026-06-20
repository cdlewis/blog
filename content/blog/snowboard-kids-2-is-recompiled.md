+++
title = "Snowboard Kids 2 is Recompiled"
date = "2026-06-18T19:32:05-07:00"
description = "The Snowboard Kids 2 recompilation is in a good state and publicly available for download."
images = ["launcher.jpg"]
default = false
+++

TLDR: [Snowboard Kids 2: Recompiled v1.0.0]() is available for Linux, Mac and Windows.

Following the completion of the [Snowboard Kids 2 decompilation](https://blog.chrislewis.au/snowboard-kids-2-is-100-decompiled/), I’ve been investing a lot of time in getting the *recompilation* into a good state. I’m pleased to announce that it is now ready for interested fans of the series to play.

![screenshot of the Snowboard Kids 2 game launcher](/launcher.png "Snowboard Kids 2 launcher. Artwork by Moz and Jellsoup.")

A recompilation, as the name suggests, aims to compile the original N64 game code directly for modern architectures, rather than running the game by using an emulator to simulate the original system hardware. This has a number of potential benefits:
* High frame rate support: the original game runs at roughly 29 frames per second. The recompilation can run at 60 frames per second by leveraging RT64’s frame interpolation technology.
* Widescreen and ultrawide support: by tweaking the camera, most 3D scenes can be extended to 16:9 and wider aspect ratios without requiring major game changes. HUD elements have also been updated to take advantage of the additional space.
* Modern UI: menus and settings can be implemented with RmlUi rather than by trying to force every new option through the original game’s UI system.
* Mod support: N64ModernRuntime and the recompilation tooling make it possible to hook and extend the game in ways that would have been painful on original hardware.

![screenshot of the Snowboard Kids 2 game launcher](/recomp-screenshot.png "Screenshot of the recompilation in action. Note the widescreen view and HUG. As for the placement, I’m just sandbagging to get better items I swear 🙃.")

## The recompilation process

There’s been a lot of movement in the recompilation scene in the last few years. The release of [N64: Recompiled](https://github.com/N64Recomp/N64Recomp) in 2024 is what originally motivated me to start the Snowboard Kids 2 decompilation. And in particular this [excellent interview with Darío and Wiseguy](https://softwareengineeringdaily.com/2024/10/02/n64-recompiled-with-dario-and-wiseguy/). The idea of taking advantage of original hardware and the promise of bringing modern features such as Ray Tracing to the N64 games of my childhood was very enticing and recompilations had just become easier than ever.

Rather than trying to run the decompiled code through a modern compiler, fixing flags and updating the code to fill gaps by mapping concepts to a modern PC architecture (a, source port). N64 Recompiled took the approach of recompiling at the instruction level. It takes the MIPS instructions from the original game binary and translates them into C code that can be compiled for modern platforms.

For example, an instruction like this:

```asm
addiu $r4, $r4, 0x20
```

might be recompiled into something like this:

```c
ctx->r4 = ADD32(ctx->r4, 0x20);
```

The generated C code is not nice code. It is not code you would want to maintain by hand. It is, in fact, pretty gruesome. But since we’re just converting assembly code, we can start without a fully recompiled game. In fact, I have been working on the Snowboard Kids 2 recompilation since the decompilation was only roughly 75% complete.

This C code, along with any additional game patches you’re making, are linked together along with a runtime that speaks ‘N64’. The C functions will be compiled natively but still expect access to the same old N64 runtime. For example, they will still try to build an F3DEX2 display list and call the RDP to display it.

The modern runtime is a crucial piece of software that can take these calls and translate them into Direct3D, Vulcan, Metal etc. It is also an avenue for potential enhancements. For example, RT64 interpolates between the draw calls emitted by the game for a given matrix to create new frames, along for frame rates far in excess of what the original game could have handled. This approach also neatly sidesteps the problem of side effects since the game is unaware of the new frames and therefore its internal logic and sequent behaviour is unaltered.

![overview of the recompilation stack](/recomp-stack.svg "Overview of the recompilation stack. Note that mods and patches are different beasts, with mods being dynamically compiled on game start rather than going through the above static flow.")

The resulting binary is what constitutes the recompiled game.

Mods follow a separate path, being loaded dynamically at runtime
* .nrm mods are container files. The runtime expects code mods to contain:
	*  mod_binary.bin
	*  mod_syms.bin
	*  optionally patch.bps
*  That is defined here: lib/N64ModernRuntime/librecomp/src/mods.cpp:253.
*  For normal code mods, the game does not statically compile them into RecompiledPatches. Instead, at load time it reads mod_binary.bin and mod_syms.bin, parses the symbols with N64Recomp APIs,  copies the mod binary into emulated RDRAM, then uses LiveRecompilerCodeHandle to generate callable native functions at runtime: lib/N64ModernRuntime/librecomp/src/mods.cpp:2164, lib/N64ModernRuntime/librecomp/src/mods.cpp:2384.
* Then it wires those functions into the game by:
  - adding mod functions to the function lookup table,
  - registering hooks,
  - replacing original/base functions with host-side jumps to the mod function.

## How much work is required?

That said, the decompilation still mattered a lot.

To recompile the game, you need to know what is code and what is data. You need to understand which functions are game functions and which ones are part of the N64 standard library. You need to identify places where the generated code needs special handling. And when something breaks, you are unlikely to understand the bug, let alone fix it, unless the relevant part of the game has been decompiled and understood. But it’s still theoretically much faster than a doing a full source port.

N64: Recompiled can at least sound like a promise of easy recompilation of any Nintendo 64 game as long as the code segments can be properly identified -- something that requires a fraction of the work of a full decompilation. Many remotely popular games have some kind of active decomp as well as less well known titles such as. It’s actually pretty incredible the kinds of titles that have seen recompilation:
* [Neon Genesis: Evangelion 64](https://github.com/farisawan-2000/evangelion) based on the cult-fan favourite anime;
* [The F-Zero X expansion](https://github.com/inspectredc/fzerox-expansion-kit) for the Nintendo 64 DD; and
* [Dinosaur Planet](https://github.com/zestydevy/dinosaur-planet) an unreleased Rareware game that eventually became [Star Fox Adventures](https://github.com/zcanann/SFA-Decomp) on the Gamecube.

It was not quite that simple: (each of these should be a paragraph)
* Tweaking the runtime: while this magic runtime had allowed us to avoid the hassle of a source port, it implicitly needed to make decisions about how to handle certain things and inevitably these were sometimes ‘wrong’ in that they made the game behave in weird or unexpected ways.

* Developer errors (?): this was one particularly spicy issue early on which manifested as extreme screen flicking. I was nowhere near clever enough to debug this on my own but Dario was able to identify the issue as being caused by the way the game switched microcodes during frame rendering!

who is wrong, the runtime or the developer? Snowboard Kids 2 developers didn’t seem to know how to juggle RSP microcode within a single set of display instructions. Had to patch
![description needed](/microcode-switching.svg "description needed.")
 In SK2, “3D” and “2D” are not just different display-list commands. They run under different RSP
  microcodes:

  - 3D uses F3DEX2
  - 2D sprites/UI use S2DEX

  The original game switches between them by ending one graphics task and submitting another task
  with a different OSTask.ucode. Each of those generated wrapper display lists ends with a
  gDPFullSync, so a frame with multiple 3D/2D groups can produce multiple full syncs.
  >  RT64 can only perform frame interpolation correctly when one gDPFullSync is used per frame. Resulting in weird flicking making parts of the game unplayable.

But we have a solution for this! `gSPLoadUcode` which allows us to load a specified microcode from within an existing graphics display list. It’s possible the original developers did not know about this. 

  The better N64-side approach is:

  1. Submit one graphics task for the frame.
  2. Start it with the first needed microcode.
  3. When the display list reaches a 3D/2D boundary, emit gSPLoadUcode(...).
  4. Continue the same display list under the new microcode.
  5. Do one gDPFullSync at the real end of the frame.

  So “patch display list generation” is needed because the existing game does not generate one
  continuous display list. It generates separate task wrapper display lists per microcode group.
  To avoid the extra full syncs, we have to synthesize/merge those lists and insert the microcode-
  load command where task boundaries used to be.
  The important distinction: gSPLoadUcode changes the RSP microcode, not the RDP state. So you
  still need normal pipe syncs/state setup around boundaries, but you do not need to fully drain
  the RDP with gDPFullSync every time the RSP switches from F3DEX2 to S2DEX or back.
  That is exactly what patches/single_task_graphics_dispatch.c is doing: it detects multiple task
  groups, creates a merged display list, emits gSPLoadUcode(...) before each group’s draw list,
  and leaves only one gDPFullSync at the end.

* Mandatory enhancements: feels weird to make the camera widescreen and not update the HUD element positions!

And from what I can gather Snowboard Kids 2 is considered ‘straightforward’ on the recompilation difficulty curve, using common patterns and microcode such as F3DEX

## What Next?

* Download the recomp!
* Hope there are no bugs but I imagine some time will be needed to address those that emerge.
* I’m very excited about the possibility for modding <cue mod screenshot or GIF). Already have the basic time trial mode but I’m excited for what else could be added to the game.
	* My WR
	* Summoning Salt video when?

{{< youtube GIbylTso3hE >}}

*put this somewhere*
* modding has a virtuous cycle with decompilation
* modding is very goal oriented -- change some part of the decomp X to accomplish Y. The parts of the decomp you need to change may not be documented properly (function names, etc). Maybe you’re trying to change the coin count and it’s just called `alloc->unk78C`. You’ll figure it out. You’re motivated to understand that slice of the codebase.
* we can then work backwards from mods to improve the documentation of the decompilation. I’ve already found myself doing this while messing around with test mods.
* Continuing to document the decomp, particularly data formats.
* Started work on the Snowboard Kids 1 decomp

**link to release**

**You can also [follow me on Bluesky](https://bsky.app/profile/chrislewis.au) for more Snowboard Kids 2 updates.**
