+++
title = "Snowboard Kids 2 is Recompiled"
date = "2026-06-20T9:00:00-07:00"
description = "Snowboard Kids 2 has been recompiled for modern platforms, bringing widescreen, 60 FPS support, and modding to Snow Town."
images = ["launcher.jpg"]
default = false
+++

**TL;DR: [Snowboard Kids 2: Recompiled](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.3) is available for Linux, Mac and Windows.**

Following the completion of the [Snowboard Kids 2 decompilation](https://blog.chrislewis.au/snowboard-kids-2-is-100-decompiled/), I’ve been focused[^1] on getting the *recompilation* into a good state. Now that the worst bugs have been squashed, I’m pleased to announce the public release of [Snowboard Kids 2: Recompiled](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.3). This recomp is only possible thanks to support from the [N64 Recomp Community](https://discord.gg/AWZThJ4dPf). I’m particularly grateful to sonicdcer and Darío for their help bootstrapping the project, fixing bugs, and patiently explaining things to me. The artwork was contributed by [Snowboard Kids Discord](https://discord.gg/bwQ85rUED) members Moz and Jellsoup.

![screenshot of the Snowboard Kids 2 game launcher](/launcher.webp "Snowboard Kids 2 launcher. Artwork by Moz and Jellsoup.")

A recompilation, as the name suggests, translates the original N64 game binary into native code for modern platforms before the game is run, rather than relying on an emulator to interpret the original system at runtime. This has a number of benefits:

* **High frame rate support**: the recompilation can run at 60 frames per second by leveraging RT64’s frame interpolation technology.
* **Widescreen and ultrawide support**: by tweaking the camera, most 3D scenes can be extended to 16:9 and wider aspect ratios without requiring major game changes. HUD elements have also been updated to take advantage of the additional space.
* **Mod support**: N64ModernRuntime and the recompilation tooling make it easier to modify and extend the game.

![screenshot of Snowboard Kids 2: Recompiled in action](/recomp-screenshot.webp "Screenshot of the recompilation in action. Note the widescreen view and HUD. As for the placement, I’m just sandbagging to get better items, I swear 🙃.")

## The recompilation process

The recompilation landscape has changed drastically over the last couple of years. The release of [N64: Recompiled](https://github.com/N64Recomp/N64Recomp) in 2024 is what originally motivated me to start the Snowboard Kids 2 decompilation, particularly after listening to this [excellent interview with Darío and Wiseguy](https://softwareengineeringdaily.com/2024/10/02/n64-recompiled-with-dario-and-wiseguy/).

I’ve long been enamoured with Snowboard Kids 2 and wanted to give it the sort of enhancements enjoyed by more famous games such as Mario 64 and Zelda. For a long time, the technical challenges seemed insurmountable. But these new developments appeared to finally put my rather niche ambition within reach.

The way N64: Recompiled accomplishes this is itself quite interesting. Rather than trying to run the decompiled code through a modern compiler, fix the compiler flags, and map old concepts onto a modern PC architecture (i.e. a [source port](https://simple.wikipedia.org/wiki/Source_port)), N64: Recompiled works at the instruction level. It takes the MIPS instructions from the original game binary and translates them into C code that can be compiled for modern platforms.

For example, an instruction like this:

```asm
addiu $r4, $r4, 0x20
```

might be recompiled into something like this:

```c
ctx->r4 = ADD32(ctx->r4, 0x20);
```

The resulting code is not pretty, but operating on the assembly directly bypasses the need for a full decompilation. Indeed, work started on the recompilation while the Snowboard Kids 2 decompilation was only about 75% complete.

The generated C code, along with any additional patches, is linked together with a runtime and the resulting binary is what constitutes the recompiled game.[^2]

The runtime acts as an interface between the native code and the N64 environment it still expects to exist. While functions are compiled natively, they still try to build things like F3DEX2 display lists and submit them to the N64 graphics pipeline. A suitable runtime is needed to take those calls and translate them into Direct3D, Vulkan, Metal, and so on.

This is usually [N64 Modern Runtime](https://github.com/N64Recomp/N64ModernRuntime), though the iceberg of supporting libraries runs deep. Packages such as ultramodern, librecomp and RT64 all play a role.

![overview of the recompilation stack](/recomp-stack.svg#darksafe "Overview of the recompilation stack. Note that mods and patches are different beasts, with mods being dynamically compiled on game start rather than going through the static flow above.")

The runtime can also be an avenue for enhancements. For example, RT64 interpolates between the draw calls emitted by the game for a given matrix to create new frames, allowing frame rates far in excess of what the original game could have handled. This approach neatly sidesteps the problem of side effects: the game is unaware of the new frames, so its internal logic and subsequent behaviour are unaltered. Looking further ahead, new runtime features such as ray tracing could potentially be added and then used by existing games that already run on that runtime.

## How much work is required?

N64: Recompiled certainly lowered the barrier for recompilations, but it is still by no means easy. My first attempt at recompilation in 2024 failed because my decompilation was too immature. To recompile the game, you need to know what is code and what is data. You need to understand which functions are game functions and which ones are part of the N64 standard library. You need to identify places where the generated code needs special handling. And when something breaks, you are unlikely to understand the bug, let alone fix it, unless the relevant part of the game has been decompiled and understood.

With that said, many popular games have some kind of active decompilation effort and I would expect the number of recompilations to rapidly increase over the next few years.

It’s also really cool to see less well-known games get some attention, with hundreds of hours collectively being put into decompiling games such as:

* [Neon Genesis: Evangelion 64](https://github.com/farisawan-2000/evangelion), based on the cult-favourite anime;
* [The F-Zero X Expansion Kit](https://github.com/inspectredc/fzerox-expansion-kit) for the Nintendo 64DD; and
* [Dinosaur Planet](https://github.com/zestydevy/dinosaur-planet), an unreleased Rareware game that eventually became [Star Fox Adventures](https://github.com/zcanann/SFA-Decomp) on the GameCube.

[![F-Zero X expansion kit for the ill-fated Nintendo 64DD. Picture from Spawn Wave’s Youtube channel (linked).](/f-zero-dd.webp "F-Zero X expansion kit for the ill-fated Nintendo 64DD. Picture from Spawn Wave’s Youtube channel (linked).")](https://www.youtube.com/watch?v=mJSLqU2KjGM&feature=youtu.be)

Once you have a sufficiently decompiled game, the basic strategy, and path of least resistance, taken by many recomps is to copy/pasta one that already exists (usually Zelda) and adapt it for the new game.[^4] Indeed, you’ll still see references to Zelda, and perhaps Star Fox 64, in the scaffold code for the Snowboard Kids recompilation.

Snowboard Kids 2 is, from what I can gather, considered fairly straightforward on the recompilation difficulty curve (although still quite challenging for me). It uses common patterns and common microcode such as F3DEX2, but this does not mean it was automatic.

N64 Modern Runtime helps us avoid the hassle of a source port, but the resulting game can sometimes behave in unexpected ways. Poor Slash, for example, initially had a hole in his head! Without explicit annotations, the renderer has to guess which draw calls are related across frames and whether they should be interpolated. That heuristic works surprisingly well, but character animation can move suddenly, especially when Slash jumps. In this case RT64 decided not to interpolate part of the model, so the character could briefly be pulled apart.

![Picture of Slash with a hole in his head](/slash-hole-head.png "Picture of Slash with a hole in his head.")

The fix was fairly straightforward: we just needed to label related matrices and mark them for simple interpolation, so RT64 knows both that they belong together and that it should not try to decompose them.

Other issues came from the game itself doing something unusual. One especially spicy early bug manifested as extreme screen flickering. I was nowhere near clever enough to debug this on my own, but Darío was able to identify the issue as being caused by the way the game switched RSP microcode during frame rendering.

![diagram of Snowboard Kids 2 switching RSP microcode between 3D and 2D rendering](/microcode-switching.svg#darksafe "Snowboard Kids 2 uses different RSP microcode for 3D and 2D rendering.")

It turns out that each frame the game was dispatching multiple graphics tasks: at least one per set of microcode, and sometimes multiple tasks for the same microcode. The original game switches between them by ending one graphics task and submitting another with different microcode. Each of those generated wrapper display lists ends with a `gDPFullSync`, so a frame with multiple 3D and 2D groups can produce multiple full syncs.

That is a problem because RT64 can only interpolate frames correctly when there is one `gDPFullSync` per frame. The result was flickering bad enough to make parts of the game unplayable.

The N64 has a better path for this: `gSPLoadUcode`, which allows a display list to load different RSP microcode without ending the whole graphics task. The recompilation patches the display-list generation so those groups are merged into one continuous task. The original developers may not have known about `gSPLoadUcode`, or may simply not have needed it. Their approach obviously worked on original hardware. It only became a problem once we started asking RT64 to interpolate between frames, which is exactly the kind of thing no N64 developer in 1999 had any reason to worry about.

Finally, there are the less dramatic but still necessary enhancements. Once the 3D camera supports widescreen, it feels strange to leave the HUD crammed into the old 4:3 safe area. So the HUD needed to be adjusted too. These are not always glamorous changes, but they are the difference between a tech demo and something that feels nice to play.

## What next?

Download the recompilation and give it a go! I’ve tried to squash the most egregious issues, but no doubt some more are lurking out there. If you find anything, please open a GitHub issue.

I’m also particularly excited about modding. I already have a basic Time Trial mode working:[^3]

{{< youtube GIbylTso3hE >}}

Aside from the cool new functionality it can help unlock, I’m hopeful modding will create a virtuous cycle between the recompilation and the decompilation. Modding is goal-oriented in a way that pure documentation often is not. You want to change one specific thing: the coin count, the timer, the item rules, the level list. To do that, you have to understand that slice of the codebase. Maybe the field you need is buried three functions deep and still called `unk78C`. You will figure it out because you are motivated to make the thing work.

Then that understanding can be used to improve the decompilation through better function names, structure fields, and documentation. This information in turn assists with future modding. I’ve already found myself in this loop while messing around with test mods.

I’ve also started work on [decompiling Snowboard Kids 1](https://github.com/cdlewis/snowboardkids-decomp). I was surprised to learn it’s the more popular game in the speedrunning community.[^5] Aside from understanding the original game better, I’m hoping it will eventually be possible to create a definitive version of Snowboard Kids that ties together the more modern SBK2 engine with the levels from the original game. And perhaps even the PlayStation version, which featured additional content, albeit with a worse player experience due to hardware limitations.

**Download [Snowboard Kids 2: Recompiled](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.3).**

**You can also [follow me on Bluesky](https://bsky.app/profile/chrislewis.au) for more Snowboard Kids 2 updates.**

[^1]: As well as the whole raising a 3-month-old thing 😅.

[^2]: Mods follow a separate path. Normal code mods are not statically linked into the recompilation. Instead, the runtime loads them at startup, copies their data into emulated memory, recompiles their functions on the fly, and wires them into the game by registering hooks or replacing original functions with jumps to the mod code. That means mods get to participate in the same native-code world as the base recompilation without requiring everyone to rebuild the whole game. It is a very neat trick.

[^3]: Summoning Salt video when?

[^4]: Usually with copious amounts of LLM tokens, much to the chagrin of the community as these often result in buggy, low-quality ports.

[^5]: They seem to prefer SBK1’s physics and skill system.
