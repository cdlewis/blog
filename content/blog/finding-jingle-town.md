+++
title = "Finding Jingle Town: Debugging an N64 Game Without Symbols"
date = "2025-12-23T20:57:17+11:00"
description = "Debugging an N64 game without symbols is notoriously difficult, but this article walks through a practical, real-world workflow for reverse engineering Snowboard Kids 2 using GDB and emulator-based debugging. Learn how to trace level overlays, inspect runtime state, and reason about game behaviour even when traditional debug symbols are unavailable."
draft = false 
images = ['jingle-town.jpg']
+++

![screenshot of the jingle town level in snowboard kids 2](/jingle-town.webp)

Recently, I’ve started using a debugger to understand the runtime behaviour of _Snowboard Kids 2_. Debuggers are useful not just for tracking down crashes, but also for validating assumptions: when a function is called, what its inputs look like, and what effect it has on the game's state. For example, if we think some code loads character data, we can set a breakpoint and see whether it fires during the character selection screen. We can inspect its inputs and start forming theories about how characters map to variables and data structures in the code.

All of this is incredibly helpful, and I probably should have started doing it a lot sooner. There was, however, a fair bit of friction getting started. It’s not _hard_, exactly, but it’s very different from how you’d use a debugger in a typical Java, Go, or even modern C++ project. Documentation, especially around using a debugger with an emulator, was surprisingly thin. Since it’s Christmas, I thought I’d write down what I’ve learned so far and apply it to a concrete, seasonally appropriate problem: figuring out how the game loads Jingle Town (and other level overlays).[^2]

## The Problem

Debuggers are incredibly useful tools and, frankly, kind of magical. The code we 'step through' doesn’t directly correspond to what the CPU is executing. CPUs operate on instructions like `jal`, `addiu`, and `lw`, not C statements like `i++`. Similarly, the variables we inspect don’t really have names; they’re just addresses in memory. A simple assignment like `i = 0` might turn into something like `sw zero, 0x18(sp)` (store a 32-bit value at stack pointer + 0x18).

Debuggers work because the binary is compiled with metadata that maps machine instructions and memory locations back to source-level concepts like lines of code and variables. This metadata lives alongside the program and is consulted by the debugger at runtime. The details of how this mapping works are interesting but beyond the scope of this post.[^1]

All of this works beautifully—_as long as you have debug symbols_. Unfortunately, we can’t safely generate debug symbols for _Snowboard Kids 2_ right now, because the decompilation isn’t shiftable.

The original game was built with all addresses fully resolved. Jumps, function calls, jump tables, and data references all point to fixed memory locations like `0x80052334`, not symbolic expressions like `i + 5`. At this stage of the project, our goal is a byte-for-byte match with the original ROM, which means the layout of code and data must be _exactly_ right. Adding debug information (via `-g`) introduces new sections and shifts existing ones, which in turn moves code and data around in memory.

Once that happens, any absolute reference, whether it’s a jump table entry, a hard-coded function call, or a pointer baked into a data structure, can silently point at the wrong thing. The failure mode is not subtle: the game usually just fails to boot.

Later in the project, once we’ve identified and relocated enough of these references, the build becomes _shiftable_: code can move without breaking runtime behaviour. At that point we can compile with debug symbols and debug normally, even though the output no longer matches the original binary exactly. Unfortunately, that’s little comfort early on, when everything still depends on addresses lining up perfectly.

## The Debugging Workflow

With that background out of the way, here’s the workflow I actually use. It consists of three key components:

- [gdb-multiarch](https://launchpad.net/ubuntu/jammy/+package/gdb-multiarch): GDB needs no introduction. It’s been the dominant debugger in the C/C++ ecosystem for decades. `gdb-multiarch` is a variant compiled with support for multiple architectures, which we need because the N64 uses a MIPS CPU rather than the architecture most modern machines run.
- [Ares](https://ares-emu.net/): Ares is an emulator for the N64 (amongst other platforms) with a focus on cycle accuracy. Many N64 emulators take shortcuts for performance, but for decompilation we’re happy to trade speed for fidelity. But most importantly for our use case, Ares supports remote debugging with GDB.
- SSH (optional): I usually do development on an x86 Ubuntu server rather than my M-series Mac for better tooling compatibility, so I need an SSH tunnel to connect my GDB client and server.

![diagram showing the ares emulator running a gdb server connected to gdb-multiarch via ssh](/gdb-diagram.svg#darksafe)

## Set up Ares

Ares works like most emulators: load your ROM and run it. It doesn’t really matter whether this is the original ROM or one built from your decompilation project; by definition, every byte should be identical. The default debug settings are fine; just make sure debugging is enabled.
![screenshot of sunny mountain on level select screen](/sunny-mountain.webp)

### Set up SSH Tunnel

You may or may not need this step, depending on your setup. Since I’m running GDB on a remote server, I need a reverse tunnel so it can connect back to Ares:

```bash
ssh -R 1235:localhost:1235 dev-server
```

### Connect GDB to Ares

Start GDB, this can be done anywhere but it's often convenient to do so from the root of the project:

```bash
gdb-multiarch
```

Set the architecture to something close to the N64’s CPU. GDB doesn’t have first-class Nintendo 64 support, but this is sufficient for disassembly and basic debugging:

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

At this point, we’re in. Even without full debug information, the ELF contains enough symbol data for us to break on functions by name:

```bash
(gdb) b func_800BB2B0_B4240
Breakpoint 1 at 0x800bb2b0
```

Ares will now pause execution. Use `c` to continue until the breakpoint is hit.

## Finding Jingle Town

Let’s apply this to a concrete problem. I recently came across a function named `func_8003D560_3E160` (an automatically generated name) that appeared to be loading one of 16 overlays.[^2] That number is suspiciously close to the number of levels in _Snowboard Kids 2_, which suggests that the overlay index might correspond to the currently loaded level.

In very simplified form, the function looks like this:

```c
func_8003D560_3E160() {
	Overlay *overlayConfig = &Overlays[D_800AFE8C_A71FC->unk7]
}
```

`D_800AFE8C_A71FC` is a global variable. `unk7` is an unsigned char located 0x6 bytes from the start of that structure (i.e. the 7th byte). That’s enough information to work with for now. If you’re curious about the full function, you can see it [here](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/src/3E160.c#L224).

What we want to know is fairly simple:

- Is `func_8003D560_3E160` called during level loads?
- If so, which overlay does it select?
- Is there a clear pattern in the value of `unk7` that tells us which level is being loaded?

To answer these questions, we add a breakpoint and resume execution:

```bash
(gdb) b func_8003D560_3E160
Breakpoint 2 at 0x8003d564 # remember we set a breakpoint earlier!
(gdb) c
Continuing.
```

Now we load the first level of the game, Sunny Mountain.

![screenshot of sunny mountain level select screen](/sunny-mountain.webp)

We immediately hit the breakpoint:

```bash
Breakpoint 2, 0x8003d564 in func_8003D560_3E160 ()
(gdb)
```

Next, we inspect unk7. Since GDB doesn’t know the structure layout, we read it manually:

```bash
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$1 = 0 '\000'
```

That’s encouraging. If level indices start at zero, this lines up nicely. To be sure, we check a couple more levels:

```bash
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$2 = 1 '\001' # Turtle Island
(gdb) c
Continuing.
(gdb) p *((unsigned char*)D_800AFE8C_A71FC + 0x7)
$3 = 2 '\002' # Jingle Town
```

The pattern holds! This function is indeed loading code specific to the level being played, along with a whole bunch of other level-initialisation logic.

## Potential Improvements

This workflow works, but it’s undeniably manual. Short of being able to run a build with debug symbols, having a more visual debugging experience would be nice. I experimented with [gdbgui](https://www.gdbgui.com/), but didn’t have much luck getting it to connect to my server.

I also wonder whether it would be possible for GDB to reference externally generated debug symbols without altering the binary itself. It doesn’t seem impossible in theory, even if it isn’t something GDB supports today (as far as I can tell).

That said, it’s genuinely satisfying to see the _Snowboard Kids 2_ decompilation reach a point where we can reason about higher-level game behaviour, like level initialisation, rather than just individual instructions. If you’ve made it this far, you probably have an interest in decompilation, debugging, and _Snowboard Kids_. Take a look at the [Snowboard Kids 2 decompilation project](https://github.com/cdlewis/snowboardkids2-decomp), and feel free to reach out on Discord if you’re interested in helping.

## Footnotes

[^1]: It's a tantalisingly deep rabbit hole but tragically few articles worth recommending outside of Wikipedia. Compiled binaries typically use a standard debug encoding format called DWARF. Initially, hash tables were used for symbol mappings but this massively inflated the size of binaries. Indeed, even on modern systems binary size can be a real issue. (What if, for example, you need to jump to a location further than 2^32-1 bytes away?). There's also some amazing lore. DWARF derived its name from the fictional creature (e.g. Gimli) as a companion to the ELF binary format (e.g. Legolas).
[^2]: On the N64, overlays are chunks of code that are loaded and unloaded at runtime to save memory.
