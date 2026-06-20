+++
title = "Snowboard Kids 2 is Recompiled"
date = "2026-06-18T19:32:05-07:00"
description = "The Snowboard Kids 2 recompilation is in a good state and publicly available for download."
images = ["launcher.jpg"]
default = false
+++

**TL;DR: [Snowboard Kids 2: Recompiled v1.0.0](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.0) is available for Linux, Mac and Windows.**

Following the completion of the [Snowboard Kids 2 decompilation](https://blog.chrislewis.au/snowboard-kids-2-is-100-decompiled/), I’ve been focused[^1] getting the *recompilation* into a good state. Now that most of the most egregious bugs have been squashed, I’m pleased to announce the public release of [Snowboard Kids 2: Recompiled](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.0). This recomp is only possible due to support from the [community](https://discord.gg/AWZThJ4dPf). I’m particularly grateful to sonicdcer and Darío for their help bootstrapping the project, fixing bugs, and patiently explaining things to me. The artwork was contributed by [Snowboard Kids Discord](https://discord.gg/bwQ85rUED) members Moz and Jellsoup. 

![screenshot of the Snowboard Kids 2 game launcher](/launcher.png "Snowboard Kids 2 launcher. Artwork by Moz and Jellsoup.")

A recompilation, as the name suggests, aims to compile the original N64 game code directly for modern architectures, rather than running the game by using an emulator to simulate the original system hardware. This has a number of benefits:

* **High frame rate support**: the recompilation can run at 60 frames per second by leveraging RT64’s frame interpolation technology.
* **Widescreen and ultrawide support**: by tweaking the camera, most 3D scenes can be extended to 16:9 and wider aspect ratios without requiring major game changes. HUD elements have also been updated to take advantage of the additional space.
* **Mod support**: N64ModernRuntime and the recompilation tooling make it possible to hook and extend the game in ways that would have been painful on original hardware.

![screenshot of Snowboard Kids 2: Recompiled in action](/recomp-screenshot.png "Screenshot of the recompilation in action. Note the widescreen view and HUD. As for the placement, I’m just sandbagging to get better items, I swear 🙃.")

## The recompilation process

The recompilation landscape has changed drastically over the last couple of years. The release of [N64: Recompiled](https://github.com/N64Recomp/N64Recomp) in 2024 is what originally motivated me to start the Snowboard Kids 2 decompilation, particularly after listening to this [excellent interview with Darío and Wiseguy](https://softwareengineeringdaily.com/2024/10/02/n64-recompiled-with-dario-and-wiseguy/).

I’ve long been a fan of Snowboard Kids 2 and wanted to give it the enhancements bestowed upon more famous titles such as Mario 64 and Zelda but the technical challenges to doing so appeared insurmountable. Finally modern tooling made it seem like a far more achievable goal than it had previously. The tools appeared to exist to put my ambitions for Snowboard Kids 2 within reach!

The way N64: Recompiled accomplished this is itself quite interesting. Rather than trying to run the decompiled code through a modern compiler, fix the compiler flags, and fill in the gaps by mapping old concepts onto a modern PC architecture (i.e. a [source port](https://simple.wikipedia.org/wiki/Source_port)), N64: Recompiled takes the approach of recompiling at the instruction level. It takes the MIPS instructions from the original game binary and translates them into C code that can be compiled for modern platforms.

For example, an instruction like this:

```asm
addiu $r4, $r4, 0x20
```

might be recompiled into something like this:

```c
ctx->r4 = ADD32(ctx->r4, 0x20);
```

The resulting code is not pretty but operating on the assembly directly by-passes the need for a full decompilation. Indeed, work stated on the recompilation while the Snowboard Kids 2 decompilation was only about 75% complete.

The generated C code, along with any additional patches, is linked together with a runtime that speaks ‘N64’. The resulting binary is what constitutes the recompiled game.[^2]

The runtime part is a little interesting and worth digging into further. While functions are compiled natively, they still expect access to the same old N64 environment. For example, they will still try to build an F3DEX2 display list and ask the RSP to draw it. A suitable runtime is needed that can take those calls and translates them into Direct3D, Vulkan, Metal, and so on.

This is usually [N64 Modern Runtime](https://github.com/N64Recomp/N64ModernRuntime) but the iceberg of facilitating libraries runs deep with other packages such as ultramodern, librerecomp and RT64 all playing a role.

![overview of the recompilation stack](/recomp-stack.svg "Overview of the recompilation stack. Note that mods and patches are different beasts, with mods being dynamically compiled on game start rather than going through the static flow above.")

The runtime can also be an avenue for enhancements. For example, RT64 interpolates between the draw calls emitted by the game for a given matrix to create new frames, allowing frame rates far in excess of what the original game could have handled. This approach neatly sidesteps the problem of side effects: the game is unaware of the new frames, so its internal logic and subsequent behaviour are unaltered. Looking into the future, new runtime features such as raytracing could be added and taken advantage of be existing games leveraging that runtime.

## How much work is required?

N64: Recompiled was advertised as lowering the barrier for recompilations. No longer, for example, was a full decompilation required as a prerequisite.

I learnt the hard way that relatively lower does not mean easy! My first attempt at recompilation in 2024 failed because my decompilation was too immature. To recompile the game, you need to know what is code and what is data. You need to understand which functions are game functions and which ones are part of the N64 standard library. You need to identify places where the generated code needs special handling. And when something breaks, you are unlikely to understand the bug, let alone fix it, unless the relevant part of the game has been decompiled and understood.

With that said, many popular games have some kind of active decompilation effort and I would expect the number of recompilations to rapidly increase over the next few years. 

It’s also really cool to see less well known games get some attention with hundreds of hours collectively being put into decompiling games such as:

* [Neon Genesis: Evangelion 64](https://github.com/farisawan-2000/evangelion), based on the cult-favourite anime;
* [The F-Zero X Expansion Kit](https://github.com/inspectredc/fzerox-expansion-kit) for the Nintendo 64DD; and
* [Dinosaur Planet](https://github.com/zestydevy/dinosaur-planet), an unreleased Rareware game that eventually became [Star Fox Adventures](https://github.com/zcanann/SFA-Decomp) on the GameCube.

[![F-Zero X expansion kit for the ill-fated Nintendo 64DD. Picture from Spawn Wave’s Youtube channel (linked).](/f-zero-dd.jpg "F-Zero X expansion kit for the ill-fated Nintendo 64DD. Picture from Spawn Wave’s Youtube channel (linked).")](https://www.youtube.com/watch?v=mJSLqU2KjGM&feature=youtu.be)

Once you have a sufficiently decompiled game, the basic strategy, and path of least resistance, taken by most recomps is to copy/pasta one that already exists (usually Zelda) and adapt it for the new game. Usually with copious amounts of LLM tokens[^4]. Indeed, you’ll still see references to Zelda, and perhaps Starfox 64, in the scaffold code for the Snowboard Kids recompilation.

Snowboard Kids 2 is, from what I can gather, considered fairly straightforward on the recompilation difficulty curve.
Despite being quite challenging for me! It uses common patterns and common microcode such as F3DEX2 but this does not mean it was automatic.

The N64 Modern Runtime helps us avoid the hassle of a source port but the resulting game can sometimes behave in unexpected ways.

As I’ve alluded to earlier in this blog post, RT64 tracks 3D transformations between draw calls and uses interpolation to generate new frames. But it doesn’t have perfect knowledge to understand and distinguish between different display list objects between frames. Sometimes manual tagging or outright disabling the functionality is needed to avoid visual quirks.

![Picture of Slash with a hole in his head](/slash-hole-head.png "Picture of Slash with a hole in his head.")

<<full technical explanation of slash hole head issue, integrate into above section or add new paragraph(s)>>
* the "hole in head" is just that character limbs in general are suffering from two issues: they're not tagged for interpolation and their matrices are hard to decompose correctly for rt64, probably due to some shearing in the matrix itself. 
* when the matrices are not tagged, the renderer auto-interpolates and guesses based on what draw call is similar and on its movement whether it should interpolate or not.
* since character movements can be sudden, particularly when slash jumps, the renderer's heuristic is not picking that case up as it needing to be interpolated, it skips it, and that's why you see it break apart and introduce a hole.
* I believe you already know how this works thanks to shadow matrices, so the fix is mostly similar, you need to come up with a system to tag the limbs of characters in a matrix group. You should also specify these matrices should be interpolated without decomposition, which is one of the arguments in gEXMatrixGroup, or you can use gEXMatrixGroupSimple which puts G_EX_INTERPOLATE_SIMPLE as the argument.

Other issues came from the game itself doing something unusual. One especially spicy early bug manifested as extreme screen flickering. I was nowhere near clever enough to debug this on my own, but Darío was able to identify the issue as being caused by the way the game switched RSP microcode during frame rendering.

![diagram of Snowboard Kids 2 switching RSP microcode between 3D and 2D rendering](/microcode-switching.svg "Snowboard Kids 2 uses different RSP microcode for 3D and 2D rendering.")

It turns out that each frame the game was dispatching multiple graphics tasks, at least one per set of microcode although sometimes even multiple tasks for the same microcode.
* The original game switches between them by ending one graphics task and submitting another task with a different microcode. Each of those generated wrapper display lists ends with a `gDPFullSync`, so a frame with multiple 3D and 2D groups can produce multiple full syncs.

That is a problem because RT64 can only interpolate frames correctly when there is one `gDPFullSync` per frame. The result was flickering bad enough to make parts of the game unplayable.

Fortunately, the N64 has a better path for this: `gSPLoadUcode`, which allows a display list to load different RSP microcode without ending the whole graphics task. Instead of submitting separate tasks for each 3D or 2D group, the recompilation patches the display-list generation so those groups are merged into one continuous task. It emits `gSPLoadUcode` at the old task boundaries and leaves a single `gDPFullSync` at the real end of the frame.

The original developers may not have known about `gSPLoadUcode`, or may simply not have needed it. Their approach obviously worked on original hardware. It only became a problem once we started asking RT64 to interpolate between frames, which is exactly the kind of thing no N64 developer in 1999 had any reason to worry about.

Finally there are the less dramatic but still necessary enhancements. Once the 3D camera supports widescreen, it feels strange to leave the HUD crammed into the old 4:3 safe area. So the HUD needed to be adjusted too. These are not always glamorous changes, but they are the difference between a tech demo and something that feels nice to play.

## What next?

First: download the recompilation and give it a try! I’ve tried to squash most of the egregious issues but no doubt some more are lurking out there. If you find anything please open a Github issue.

I’m also particularly excited about modding. I already have a basic Time Trial mode working:[^3]

{{< youtube GIbylTso3hE >}}

Aside from the cool new functionality it can help unlock, I’m hopeful modding will create a virtuous cycle between the recompilation and the decompilation. Modding is goal-oriented in a way that pure documentation often is not. You want to change one specific thing: the coin count, the timer, the item rules, the level list. To do that, you have to understand that slice of the codebase. Maybe the field you need is still called `unk78C`. You will figure it out because you are motivated to make the thing work.

Then that understanding can flow back into the decompilation. Function names improve. Structs become clearer. Data formats get documented. I’ve already found myself doing this while messing around with test mods.

I’ve also started work on [decompiling Snowboard Kids 1](https://github.com/cdlewis/snowboardkids-decomp). I was surprised to learn it’s the more popular game in the speed running community. Aside from better knowledge of how the original game works, I’m hoping it will be possible to create a definitive version of the game tying together the more modern SBK2 engine with the levels from the original game. And perhaps even the Playstation version, which featured additional content albeit with a worse layer experience due to hardware limitations.

**Download [Snowboard Kids 2: Recompiled v1.0.0](https://github.com/cdlewis/snowboardkids2-recomp/releases/tag/v1.0.0).**

**You can also [follow me on Bluesky](https://bsky.app/profile/chrislewis.au) for more Snowboard Kids 2 updates.**

[^1]: As well as the whole, raising a child thing 😅.

[^2]: Mods follow a separate path. A `.nrm` mod is a container file that may include a compiled mod binary, symbol information, and optional ROM patches. Normal code mods are not statically linked into the recompilation. Instead, the runtime loads them at startup, copies their data into emulated memory, recompiles their functions on the fly, and wires them into the game by registering hooks or replacing original functions with jumps to the mod code. That means mods get to participate in the same native-code world as the base recompilation without requiring everyone to rebuild the whole game. It is a very neat trick.

[^3]: Summoning Salt video when?

[^4]: Much to the chagrin of the community as these often result in buggy, low-quality ports.