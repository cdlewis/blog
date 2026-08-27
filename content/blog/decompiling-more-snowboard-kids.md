+++
title = "Decompiling a Nintendo 64 Game in 85 Days"
date = "2026-08-26T20:23:59-07:00"
description = "The original Snowboard Kids has been fully decompiled in only 85 days! In this post I delve into what changed and what lessons might apply to future projects."
images = ["snowboard-kids-progress.png"]
tags = []
default = false
blueskyPostURL = "https://bsky.app/profile/did:plc:5j7epmcl35kl5pni4y6ehpl2/post/3mtiaxymkvs24"
+++

I’m very pleased to announce that the original _Snowboard Kids_ is now 100% decompiled! This means that all functions[^1] have matching C implementations that, when compiled, produce identical machine code to the original game.

This was obviously not a one-person effort. I am particularly grateful to [inspectredc](https://github.com/inspectredc), [Bl00D4NGEL](https://github.com/Bl00D4NGEL), and [queueRAM](https://github.com/queueRAM) for their significant contributions to the project. No amount of AI would have been able to replace them.[^2] I would also like to thank [iFuzzle](https://github.com/iFuzzle), [JamesBLewis](https://github.com/JamesBLewis), and [douglasjv](https://github.com/douglasjv) for lending their tokens to the cause.

My hope is that a full decompilation will prove useful to the Snowboard Kids community. Speedrunners in particular have long focused on the first game. Working source code can help shed light on externally observed phenomena such as CPU pathing and the exact factors contributing to player speed. A full understanding of the source code will also be useful for static recompilation and more ambitious modding efforts in the future.

The speed at which the project was finished is also noteworthy. _Snowboard Kids_ took only 85 days to decompile compared with 596 days for _Snowboard Kids 2_, roughly one-seventh of the elapsed time.[^3]

[![chart showing weekly Snowboard Kids decompilation progress](/snowboard-kids-progress.svg#darksafe "Weekly progress of the Snowboard Kids decompilation.")](https://decomp.dev/cdlewis/snowboardkids-decomp)

What explains this difference? Well, it’s 2026, so the answer is at least partially AI. But it would be a gross oversimplification to attribute the difference entirely to LLMs.

## What Was Different

To state the obvious, I was not starting from scratch. By this point I had already spent nearly two years on a similar project and was vastly faster than when I began. This advantage is difficult to quantify and was somewhat offset by new challenges such as working with a different compiler.

Overall, roughly 4.8% of matching commits involved expert intervention.[^6] I have already credited these amazing people once, but it’s worth reiterating. This project would not have been possible without significant help from the decompilation community, particularly [inspectredc](https://github.com/inspectredc), [queueRAM](https://github.com/queueRAM), and [Bl00D4NGEL](https://github.com/Bl00D4NGEL) <3.

The difficulty generally didn’t come from trying to understand what a function did[^8] but rather how that logic was expressed in C and how the resulting code was compiled. _Snowboard Kids_ was compiled with IDO 5.3 rather than the GCC 2.7.2 compiler used by _Snowboard Kids 2_.

Most programmers will be familiar with GCC. It is a widely used open-source compiler still in active development today. IDO, on the other hand, was a proprietary compiler developed by SGI, whose own story is closely entwined with that of the Nintendo 64.[^12] Its source was not available, and its original development environment was tied to obsolete SGI hardware and software. To use and properly understand it today, the decompilation community has had to reverse-engineer and [decompile parts of the compiler toolchain](https://github.com/n64decomp/ido) as well as [statically recompile the IDO 5.3 and 7.1 suites](https://github.com/decompals/ido-static-recomp) to run on modern hardware. That closed history makes IDO harder to reason about than an open compiler such as GCC.

IDO splits optimisation and code generation across several different passes, transforming code quite aggressively along the way.[^11] Tiny changes to the C can then ripple through those passes and produce a completely different register allocation.

The community has made great strides in understanding IDO and its quirks, but this remains more of an art than a science. LLMs and I are not particularly good at reproducing its output. The usual workflow, for both me and the agents, was to figure out what a function did and then write C that approximated that purpose. From there, small tweaks assisted by the [permuter](https://github.com/simonlindholm/decomp-permuter) could catch any remaining differences. But you can’t permute yourself into a match in all cases, particularly when the underlying structure is wrong. IDO’s behaviour made this workflow far less predictable.

A motivated human team with the right expertise and intuition can match or even exceed the pace of the _Snowboard Kids_ decompilation. The [_Pilotwings 64_](https://github.com/gcsmith/Pilotwings64Decomp) decompilation was completed in only 74 days.[^10] _Pilotwings 64_ had 16% fewer functions than _Snowboard Kids_, but more compiled code overall, so this is not a clean comparison either.

![screenshot of Pilotwings 64](/pilotwings.webp "Pilotwings 64, a charming flight simulator, was a Nintendo 64 launch title and remains a cult classic to this day.")

_Snowboard Kids_ was also smaller than its sequel, containing 2,145 functions compared with 2,995 in _Snowboard Kids 2_. Function count is a crude measure of difficulty, but there were simply fewer functions to decompile.

## Where Agents Did Help

I’ve [already written elsewhere](https://blog.chrislewis.au/the-long-tail-of-llm-assisted-decompilation/) about using agents to decompile functions. The same basic process was used here, so I’ll focus on what changed. Unlike the previous project, this one began with access to frontier models and a capable [agent harness](https://github.com/cdlewis/nigel).

### Library Code and Other Low-Hanging Fruit

I was interested to see how agents would fare during the early stages of a project. One area where they thrived was matching standard-library code. In theory, this is the most obvious chunk of almost any Nintendo 64 decompilation. The code is not unique to the game, and versions of it are available online. _Snowboard Kids_ contains more than a hundred source segments from Nintendo’s `libultra`, alongside functions from the `libmus` audio library. Tools such as [N64Sym](https://github.com/shygoo/n64sym) can identify probable library functions in the ROM.

This pass was fairly successful. The main stumbling block was convincing agents to rely on the existing library source rather than decompile the same functions again from scratch. This required stronger prompting. Once a likely library function was identified, agents were instructed to treat the corresponding source as their starting point and exhaust plausible SDK versions, compiler options, and conditional compilation paths before attempting their own implementation.

Another optimisation was to have an agent write a script that ran [`m2c`](https://github.com/matt-kempster/m2c) against every unmatched function and automatically integrated any exact matches, rather than relying on agents to attempt those functions individually.[^14] The script matched only 17 of 1,830 functions, an incredibly low success rate of 0.93%, but anything matched this way was cheaper than burning agent tokens.

### IDO Tooling and Skills

IDO is weird, but it is often weird in recurring ways. Successfully matching one function could reveal a compiler quirk that applied to many others. Codex has become better at carrying lessons between tasks through features such as local [memories](https://learn.chatgpt.com/docs/customization/memories). To make those lessons available beyond a single agent, I prompted agents to record observed IDO behaviour in a [DECOMPILATION_LEARNINGS.md](https://github.com/cdlewis/snowboardkids-decomp/blob/main/DECOMPILATION_LEARNINGS.md) file. When an agent discovered a generalisable compiler quirk, it could record the evidence there for later attempts. This created a useful feedback loop. Agents helped document IDO, and the resulting documentation made subsequent agents better at matching IDO code.

But the most useful resource was [N64 Decomp Workbench](https://github.com/akratch/n64-decomp-workbench), a collection of tooling and documentation for debugging late-stage MIPS decompilation mismatches. It can classify mismatches, account for relocations, replay individual compiler passes, and help distinguish a structural problem from a register-allocation problem. Pass replay requires the relevant compiler binaries and project-specific setup, but once configured it exposes information that a raw assembly diff cannot. A raw diff tells you that two functions differ. The Workbench can give agents a much better idea of why the functions differ and what sort of change might fix them.

### Worktrees and Synchronisation

For this project, I ran the decompilation harness across four Git worktrees. Each worktree gave an agent an independent copy of the repository, allowing several functions to be attempted in parallel.

One small but useful improvement was to give every task an explicit deadline and expose that deadline to the agent. During the _Snowboard Kids 2_ project, agents often struggled to use the permuter effectively because it would continue running until it found a 100% match or was manually stopped. An explicit deadline allowed agents to set sensible timeouts and trade off permuting time against other forms of problem-solving. Anecdotally, it also helped them judge how long to keep working on a difficult function before giving up. I could then increase the time allowance as the easy functions disappeared and the remaining work became more difficult.

Another problem that had existed in _Snowboard Kids 2_ but became more apparent as I added worktrees was synchronisation. As discussed in my [previous post](https://blog.chrislewis.au/the-long-tail-of-llm-assisted-decompilation/), each agent was given a function to decompile alongside a set of similar functions that had already been matched. These provided useful reference points for reproducing particular IDO instruction patterns. Work was divided between the worktrees using Nigel’s `--shard` option, which uses basic hashing to partition candidates between a specified number of workers.

This allowed more work to happen in parallel without duplication, but introduced a new problem as the worktrees diverged. One worktree, for example, might successfully decompile a function that was 99% similar to a function being attempted elsewhere, but that new reference would remain invisible to the other agent until the changes were merged. Periodically merging everything into the main branch and resynchronising the worktrees fixed this, but synchronising all four could take more than an hour. Synchronising continuously wasted time, while waiting too long increased drift.

To make synchronisation less critical, I updated the similarity search to inspect every worktree. A newly matched function could immediately become a reference for another agent without waiting for it to reach the main branch. The harness would produce messages such as the following.

```text
✓ Candidate ["func_80094A94", "func_80094FF4 (../sbk-c)",
  "func_80094808", "func_8009491C (../sbk-a)",
  "func_8009469C (../sbk-c)", "func_80093144"] was fixed!
```

This helped the process remain efficient as the easy functions disappeared. Synchronisation was still needed to consolidate and push changes, but it was no longer required for agents to learn from one another.

### Model Choice

I tried GPT-5.5 and 5.6, Claude 4.5 and Fable, and GLM 5.2. This is completely unscientific. The models were tested against a changing set of difficult functions, sometimes after another model had already made partial progress. Broadly, though, Codex continued to outperform Claude, as it had towards the end of the previous project. Sol xhigh was particularly effective once it became available.

GLM 5.2, served by z.ai, was very disappointing. I had previously been a big fan of GLM. It was effective, even if it was not quite a frontier model, and its generous usage limits made up for the gap. That tradeoff became much less attractive as the limits grew less generous while latency remained awful. The feedback cycles were so long that I stopped giving it work and eventually cancelled my subscription.

## What Next?

The immediate priority is to better document the game. A 100% match means we have C code for every function; it does not mean we understand what every function does. There are still generated names to replace, unknown structure fields to identify, awkward matches to clean up, and large amounts of data to describe.

Work is also underway on a _Snowboard Kids_ recompilation. Fortunately, the first game shares many of the quirks addressed by patches in [_Snowboard Kids 2: Recompiled_](/snowboard-kids-2-is-recompiled/).

![early screenshot of Snowboard Kids: Recompiled](/snowboard-kids-recomp-screenshot.webp)

I’m looking into porting the levels and other content from the first game into the second game’s engine, although I have no idea how much work that will be yet.

Beyond that, I’m interested in decompiling _Snowboard Kids Plus_ on the PlayStation, a Japan-exclusive expanded release of the first game with extra levels and characters.

_If you’ve made it this far, you’re probably interested in decompilation and Snowboard Kids. Take a look at the [Snowboard Kids decompilation project](https://github.com/cdlewis/snowboardkids-decomp). There is still plenty of cleanup and documentation work to do, and contributions are very welcome._

[^1]: Almost. A small amount of handwritten assembly from system libraries remains because assembly was the original source rather than a temporary decompilation placeholder.

[^2]: In the best case, I think the project would have stalled around 89–90% without their IDO expertise.

[^3]: For _Snowboard Kids 2_, I measured from the [first commit on 28 September 2024](https://github.com/cdlewis/snowboardkids2-decomp/commit/f1025d16a8aa1d11ec937f8c721af59149feee7c) to the [final matching function on 17 May 2026](https://github.com/cdlewis/snowboardkids2-decomp/commit/ec405bd1aa8a6a2fed4421e0ba33e37b973db4ec), a span of 596 days. The 85-day figure for _Snowboard Kids_ is my project-level count; the public repository itself spans from the [first commit on 28 May 2026](https://github.com/cdlewis/snowboardkids-decomp/commit/08f9b60604fd084215770d4a787f7fa9d4d61865) to the [final matching function on 19 August 2026](https://github.com/cdlewis/snowboardkids-decomp/commit/875002983e210f492aec61ebe78444d2227e270b), just over 83 days.

[^6]: Based on a manual review of the Git history, I identified roughly 41 expert-assisted matches, corresponding to about 4.8% of the commits I classified as function-matching work. This retrospective classification is approximate because commits can contain multiple functions, help was often incorporated into my own commits, and the figure does not measure person-hours. Note that I am not counting myself as an “expert”.

[^8]: One notable exception was [`validateControllerPakSave`](https://github.com/cdlewis/snowboardkids-decomp/blob/ba90a9ead954514cfaa1e7c0143957fdfc754092/src/menu/main_menu/controller_main_menu_flow.c#L560), which appears to have been used to debug Controller Pak saves. Most of its debugging and validation logic was omitted from the final build.

[^10]: Measured from the [addition of progress tracking on 26 January 2026](https://github.com/gcsmith/Pilotwings64Decomp/commit/64ae65fbc0dcbb1de772361b1dd84faf0816dc56) to the [final matching functions on 10 April 2026](https://github.com/gcsmith/Pilotwings64Decomp/commit/c041f5190e232988fec0cd17b1a5e6ad9182c25d), the decompilation took almost exactly 74 days. _Pilotwings 64_ had 1,791 functions compared with 2,145 for _Snowboard Kids_, but approximately 838 KB of code compared with 732 KB for _Snowboard Kids_.

[^11]: IDO used a [multi-stage compilation pipeline](https://techpubs.jurassic.nl/library/manuals/2000/007-2479-001/sgi_html/ch01.html). Its [`uopt` documentation](https://techpubs.jurassic.nl/manpages_0530/cat5/uopt.html) says that eligible loops were unrolled four times by default. Coincidentally, four is also the number of racers in the game. Loops with four iterations are therefore candidates for complete unrolling, and they occur frequently 🫠.

[^12]: [Nintendo has described](https://iwataasks.nintendo.com/interviews/wii/sinandpunishment/0/0/) adopting an architecture from Silicon Graphics for the Nintendo 64. The original development system was similarly SGI-centric. Nintendo’s [development documentation](https://ultra64.ca/files/documentation/online-manuals/man-v5-1/pro-man/pro01/index.htm) describes connecting its emulator board to an SGI Indy workstation, and IDO was one of the supported compilers. The relationship therefore extended from the console’s underlying architecture to the machines and tools used to develop its games.

[^14]: Using a one-shot script like this is not a particularly novel idea. I’m pretty sure I copied it from somewhere, possibly _Diddy Kong Racing_’s [m2c_all.sh](https://github.com/DavidSM64/Diddy-Kong-Racing/blob/84f0ea569b07903ba8a4f9f252e8dc8e4ba54bdc/m2c_all.sh).
