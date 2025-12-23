+++
title = "Finding Jingle Town: Debugging an N64 Game without Symbols"
date = "2025-12-23T20:57:17+11:00"
description = "Debuggers are an invaluable tool for decompilation but a lack of symbols can make it challenging to effectively use them. This post provides an overview of my own workflow applied to a seasonally appropriate problem: figuring out how the game loads Jingle Town."
draft = false 
images = ['jingle-town.jpg']
+++

![screenshot of the jingle town level in Snowboard Kids 2](/jingle-town.webp)

Recently, I have started using a debugger to better understand the runtime behaviour of _Snowboard Kids 2_. Debuggers are useful not only for tracking down crashes, but also for validating assumptions: when a function is called, what its inputs look like, and what effect it has on the game's state. For example, if we suspect that a particular function loads character data, we can set a breakpoint and observe whether it fires during the character selection screen. We can then inspect its inputs and begin forming theories about how characters map to variables and data structures in the code.

All of this is incredibly helpful, and in hindsight I probably should have started doing it much sooner. There was, however, a fair amount of friction getting started. Debugging an N64 game is not _hard_, exactly, but it's very different from using a debugger in a typical Java, Go, or even modern C++ project. Documentation (especially around using a debugger with an emulator) is surprisingly thin.

Since it's Christmas, I thought I would write down what I have learned so far and apply it to a concrete, seasonally-appropriate problem. In particular, this post uses a debugger-driven workflow to answer a specific question: how does _Snowboard Kids 2_ decide which level overlay[^2] to load, and how does that process select Jingle Town?

## The Problem

Debuggers are powerful tools, and (when they work) can feel almost magical. When we step through code in a debugger, we are not directly stepping through what the CPU executes. CPUs operate on low-level instructions such as `jal`, `addiu`, and `lw`, not on C statements like `i++`. Similarly, the variables we inspect do not truly have names; they are simply addresses in memory. A simple assignment like `i = 0` might compile to something like `sw zero, 0x18(sp)`, which stores a 32-bit value at an offset from the stack pointer.

Debuggers bridge this gap by relying on metadata embedded in the binary. This metadata maps machine instructions and memory locations back to source-level concepts such as lines of code and variable names. At runtime, the debugger consults this information to present a source-level view of program execution. The details of this mapping are interesting but beyond the scope of this post.[^1]

All of this works beautifully, _as long as you have debug symbols_.

Unfortunately, we cannot safely generate debug symbols for _Snowboard Kids 2_ at this stage of the decompilation. The original game, once compiled, will have all addresses fully resolved: jumps, function calls, jump tables, and data references point to fixed memory locations such as `0x80052334`, rather than symbolic expressions that the linker can adjust. Adding debug information (via `-g`) introduces new sections and shifts existing ones, which in turn moves code and data around in memory.

Once that happens, any absolute reference, whether it’s a jump table entry, a hard-coded function call, or a pointer baked into a data structure, can silently point at the wrong thing. The failure mode is not subtle: the game usually just fails to boot.

As part of the decompilation effort, we're gradually removing these references to fixed locations in memory. At this point the build becomes _shiftable_ and we can safely switch to using a modern version of GCC with all the associated debugging functionality. Unfortunately, that’s little comfort early on, when everything still depends on addresses lining up perfectly.

In short, we are working in an environment where debuggers expect rich metadata but we must do without it.

## The Debugging Workflow

With that background out of the way, here's the workflow I actually use. It consists of three key components:

- _[gdb-multiarch](https://launchpad.net/ubuntu/jammy/+package/gdb-multiarch)_: GDB needs no introduction. It’s been the dominant debugger in the C/C++ ecosystem for decades. `gdb-multiarch` is a variant compiled with support for multiple architectures, which we need because the N64 uses a MIPS CPU rather than the architecture most modern machines run.
- _[Ares](https://ares-emu.net/)_: Ares is an emulator for the N64 (amongst other platforms) with a focus on cycle accuracy. Many N64 emulators take shortcuts for performance, but for decompilation we’re happy to trade speed for fidelity. Most importantly for our use case, Ares supports remote debugging with GDB.
- _SSH (optional)_: I usually do development on an x86 Ubuntu server rather than my M-series Mac for better tooling compatibility, so I need an SSH tunnel to connect my GDB client and server.

![diagram showing the ares emulator running a gdb server connected to gdb-multiarch via ssh](/gdb-diagram.svg#darksafe)

## Set up Ares

Ares works like most emulators: load your ROM and run it. It doesn’t really matter whether this is the original ROM or one built from your decompilation project; by definition, every byte should be identical. The default debug settings are fine; just make sure debugging is enabled.
![screenshot of sunny mountain on level select screen](/sunny-mountain.webp)

### Set up SSH Tunnel

You may not need this step, depending on your setup. Since I am running GDB on a remote server, I need a reverse tunnel so it can connect back to Ares:

```bash
ssh -R 1235:localhost:1235 dev-server
```

### Connect GDB to Ares

Start GDB; this can be done anywhere, but it's often convenient to do so from the root of the project:

```bash
gdb-multiarch
```

Set the architecture to something close to the N64's CPU architecture. GDB doesn't have first-class Nintendo 64 support, but this is sufficient for our needs:

```bash
set arch mips:4000
```

Point GDB at the ELF produced by the decompilation project:

```bash
file build/snowboardkids2.elf
```

Then connect to Ares:

```bash
target remote :1235
```

Our setup is complete. Thankfully, even without full debug information, the ELF contains enough symbol data for us to break on functions by name:

```bash
(gdb) b func_800BB2B0_B4240
Breakpoint 1 at 0x800bb2b0
```

Ares will now pause execution. Use `c` to continue until the breakpoint is hit.

## Finding Jingle Town

With the tooling in place, we can now return to the original question: how does the game decide which level overlay to load?

I recently came across a function named `func_8003D560_3E160` (an automatically generated name) that appeared to be loading one of 16 overlays.[^2] That number is suspiciously close to the number of levels in _Snowboard Kids 2_, which suggests that the overlay index might correspond to the currently loaded level.

In very simplified form, the function looks like this:

```c
func_8003D560_3E160() {
	Overlay *overlayConfig = &Overlays[D_800AFE8C_A71FC->unk7]
}
```

`D_800AFE8C_A71FC` is a global variable. `unk7` is an unsigned char located 0x6 bytes from the start of that structure (i.e. the 7th byte).[^3] That’s enough information to work with for now.

This is not much information, but it's enough to form a testable hypothesis: _if this function is responsible for loading level data it should get called when we enter a new level. And if unk7 represents the current level index, its value should change predictably as different levels are loaded._

To test this, we add a breakpoint and resume execution:

```bash
(gdb) b func_8003D560_3E160
Breakpoint 2 at 0x8003d564 # remember we set a breakpoint earlier!
(gdb) c
Continuing.
```

Next, we load the first level of the game: Sunny Mountain:

![screenshot of sunny mountain level select screen](/sunny-mountain.webp)

Execution immediately stops at the breakpoint:

```bash
Breakpoint 2, 0x8003d564 in func_8003D560_3E160 ()
(gdb)
```

Since GDB does not know the structure layout, we manually inspect the relevant byte:

```bash
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$1 = 0 '\000'
```

This is encouraging! If level indices start at zero, Sunny Mountain appears to correspond to index 0. To be sure, we check a few more levels:

```bash
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$2 = 1 '\001' # Turtle Island
(gdb) c
Continuing.
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$3 = 2 '\002' # Jingle Town
```

The pattern holds! This function is indeed loading code specific to the level being played, along with a whole bunch of other level initialisation logic.

## Potential Improvements

This workflow is effective but painfully manual. Short of being able to run a build with debug symbols, having a more visual debugging experience would be nice. I experimented with [gdbgui](https://www.gdbgui.com/), but didn’t have much luck getting it to work with my setup.

I also wonder whether it would be possible for a debugger to reference externally generated debug symbols without altering the binary itself. It doesn’t seem impossible in theory, even if it isn't something GDB supports in practice (as far as I can tell).

That said, it’s genuinely satisfying to see the _Snowboard Kids 2_ decompilation reach a point where we can reason about higher-level game behaviour, like level initialisation, rather than just individual instructions. If you’ve made it this far, you probably have an interest in decompilation, debugging, and the unequalled brilliance of _Snowboard Kids 2_. _Check out the [Snowboard Kids 2 decompilation project](https://github.com/cdlewis/snowboardkids2-decomp)_, and feel free to reach out on Discord if you’re interested in helping.

## Footnotes

[^1]: This is a deep rabbit hole. Compiled binaries typically use a standard debug encoding format called DWARF. Early approaches used hash tables for symbol mappings, but these massively inflated binary size, something that still matters even on modern systems. There’s also some fun lore: DWARF gets its name from the fictional creature (think Gimli), intended as a companion to the ELF binary format (think Legolas).
[^2]: On the N64, overlays are chunks of code that are loaded and unloaded at runtime to save memory.
[^3]: If you're curious about the full function, you can find it [here](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/src/3E160.c#L224).
