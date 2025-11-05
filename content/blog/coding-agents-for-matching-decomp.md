+++
title = "Using Coding Agents to Decompile Nintendo 64 Games"
date = "2025-11-04T17:41:10-05:00"
description = "A look at where coding agents help (or don’t) in the matching decompilation of Snowboard Kids 2 on the Nintendo 64."
draft = false
images = ['sbk2-title.webp']
+++

Recently, I've been working on a matching decompilation of [Snowboard Kids 2](https://github.com/cdlewis/snowboardkids2-decomp), an incredibly underrated racing game for the Nintendo 64. The purpose of this post is to document how coding agents have and haven't helped with the decompilation process. While much has been written about LLMs, far less has been written about decompilation,[^2] so I’m adding another data point. A few lessons may apply beyond the N64. If you’ve got suggestions to improve the workflow, please let me know!

![Snowboard Kids 2 title screen with logo](/sbk2-title.webp)

## What is matching decompilation?

'Decompilation is the process of turning compiled code back into equivalent, human-readable source code.'[^1]

Snowboard Kids 2 was written in C and compiled to MIPS machine code. The compiler was likely GCC 2.7.2 based on the instruction patterns.[^4]

The matching decompilation process involves analysing the MIPS assembly, inferring its behaviour, and writing C that, when compiled with the same toolchain and settings, reproduces the exact code: same registers, delay slots, and instruction order.

For example:

```asm
glabel func_800B0858_1DD908
    /* 27BDFFE8 */  addiu   $sp, $sp, -0x18
    /* AFBF0010 */  sw      $ra, 0x10($sp)
    /* 84840000 */  lh      $a0, 0x0($a0)
    /* 28820004 */  slti    $v0, $a0, 0x4
    /* 54400001 */  bnel    $v0, $zero, .L800B0870_1DD920
    /* 24040004 */  addiu   $a0, $zero, 0x4
  .L800B0870_1DD920:
    /* 0C015D59 */  jal     func_80057564_58164
    /* 00000000 */  nop
    /* 8FBF0010 */  lw      $ra, 0x10($sp)
    /* 03E00008 */  jr      $ra
    /* 27BD0018 */  addiu   $sp, $sp, 0x18
endlabel func_800B0858_1DD908
```

Might become:

```c
void func_800B0858_1DD908(s16 *arg0) {
    if (*arg0 < 4) {
        func_80057564_58164(4);
    } else {
        func_80057564_58164(*arg0);
    }
}
```

Of course, this still doesn't tell us what the function is _for_ in the broader codebase. Why clamp the argument to `func_80057564_58164` to a minimum of four? Matching the bytes, however, is only the first step. A true match requires understanding the function's intent through naming conventions, cross-references, and analysis of how the call sites behave.

Matches also vary in quality. A good match is more than just C code that compiles to the right bytes.[^3] It should look like something an N64-era developer would plausibly have written: simple, idiomatic C control flow and sensible data structures.[^9] Prioritising plausibility pays off: later functions naturally share helpers and struct layouts, and you avoid artefacts that only exist to trigger some quirk of the compiler.

Why do a matching decompilation at all? It deepens understanding of the engine, opens the door to new content, provides a solid base for tooling and, most importantly, it's fun!

## My Workflow

Here’s the loop I use:

1. Identify a function to decompile and import it into [`decomp.me`](https://www.decomp.me).
2. Try to produce matching code.
3. If I get stuck, import the function locally and bring in agents.
4. `diff -u` the agent's best attempt and update the scratch on `decomp.me`.
5. If the matching percentage reaches 100%, the function is considered decompiled and work can cease. Otherwise, go back to Step 2.

Agents come in at Step 3. I have a helper script that pulls scratches from `decomp.me`. Running:

```bash
./tools/claude <decomp.me id>
```

This script creates a dedicated subdirectory for the match attempt, which in turn has a [tailored CLAUDE.md file](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/claude-decomp-env/CLAUDE.md)[^6] and a set of tools. For convenience, it also starts a new Claude instance with instructions to read the aforementioned file and 'use thinking'.

Agents have their own loop, described in CLAUDE.md:

> Repeat the following steps:
>
> 1. Run ./build.sh base.c to build base.c and get an object dump of the compiled code. You will also get a score, with a score of 100% indicating a perfect match.
> 2. Look for an area where the control flow and instructions do not match. Consider what the original developers probably intended to write given the function's broader purpose. Print out an explanation for why they don't match.
> 3. Test your change by creating a new file (base_n.c where n is your attempt number).
> 4. Run ./build.sh base_n.c (where n is your attempt number).
> 5. If your possible solution did not improve the match percentage, use tools to analyse what went wrong and summarise your theory. Then apply this theory to improving the match in your next attempt.

The purpose of this workflow is to encourage the agent to identify and test small, incremental improvements. Claude would otherwise attempt to fix everything at once, only to be confounded by the drop in match rate, which had too many possible causes to diagnose effectively. Similarly, each attempt is made in a new file so that we can easily recover good matches. We want to avoid situations where an agent achieves a good match but subsequently edits the file and degrades its quality. The trail of attempts is also a useful reference for the agent.

The requests in Step 2 and Step 5 for an explanation are intended to encourage the agent to (respectively) anticipate the effect of its changes and reflect on their outcomes.

The agent environment also exposes several tools, including:

- Build & diff: compile a C file and diff it against the target binary, reporting a match percentage (0–100%).
- Disassembly: dump a binary to MIPS assembly.
- Object file diff: disassemble and diff two object files with register-name normalisation.
- Line mapping: best-effort mapping from disassembly lines to C lines (via the candidate's debug symbols).

Most of these utilities were initially scaffolded by Claude and then customised for this project. They're [all available on Github](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/tools). Agents excel at bootstrapping one-off CLI tools: setup is fast, and ongoing maintenance is minimal because the agent can regenerate or patch them as needed.

## Where Agents Have/Haven't Helped

My workflow is still human-driven, with agents acting as research assistants. I pick functions and try to decompile them first. Part of that is emotional. It's more satisfying to figure things out yourself than to stare at a coding agent. Even if you wanted to, relying solely on an agent won’t get you far. We’re a long way from 'vibe coding' being viable for matching decompilation.

### Have Helped

Agents are great at spotting patterns and sometimes make surprising leaps. Where I see 2,000 lines of noise, Claude might spot an audio processing routine. They're also patient enough to try dozens of variations to see what nudges the match.

Agents approach problems in distinct ways and often produce different answers. I frequently run Claude and Codex in parallel to widen the search space and diversify ideas. In my (completely unscientific) testing, Claude tends to perform better on decompilation overall.[^7]

### Haven’t Helped

Agents often stumble on basic arithmetic and bookkeeping that a human would do quickly. For example, they struggle to compute the correct byte offset of a struct field.

They also repeat small syntactic mistakes despite prompting. Claude is instructed to use C89 (i.e., the 1989 standard of C), but it often forgets this, which leads to trivial syntax errors. In this version of C, for example, variables must be declared at the start of each scope (right after the opening `{`). If you write `int temp = 7;` mid-scope, it won’t compile.

Finally, while agents are good at spotting high-level patterns, they struggle to reproduce the precise control flow that compilers generate for complex functions. This limitation becomes more pronounced with deeply nested conditionals and tangled goto-style jumps. To be fair, humans find these equally challenging.

## Ideas for Further Improvement

Some of these are experiments I’ve tried; others are hypotheses I haven’t tested yet. I’ve noted what’s been tried, what I observed, and what's still speculative.

### Stop Isolating Decompilation Tasks

My [Claude script](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/claude) creates a dedicated directory with focused instructions and tools for each attempt. In theory, you could instead run Claude from the root directory; with the right prompting, it might perform as well or better.

In practice, running from the root directory burned a lot of tokens before any decompilation began, as the agent explored the environment. Results were mixed, and the extra tokens didn’t translate into a clear win. This occurred prior to subscription access, when wasted tokens had a greater cost.

### Verbose Tool Output

Originally the `compile.sh` tool dumped full candidate and target assembly on every build. This information is relevant to the agent, which needs to see the assembly output generated by its latest attempt. However force-feeding Claude relevant context didn't seem to help. Claude often ignored this information and re-disassembled the object files regardless.

My takeaway is: don't provide unasked-for context. Keep disassembly available on demand and only include full listings when requested.

### Retrieval Augmented Generation (RAG)

RAG builds vector embeddings of relevant sources (here: project files) and, at query time, injects the top-K matches into the agent's context.

It’s tempting, but the payoff seems lower lately: larger context windows plus simple Unix tools (`grep`, `rg`, `ctags`) already give agents powerful retrieval options.[^8] Like 'Verbose Tool Output', RAG can end up forcing context the agent didn’t ask for, increasing token use without clearer wins.

I’m not in a rush to try this.

### Add a Permuter Tool

[decomp-permuter](https://github.com/simonlindholm/decomp-permuter) explores nearby program variants (statement reordering, temp variables, conditional forms, etc) and rechecks match %. This is _generally_ not an efficient strategy. The permuter, particularly at low match percentages, can arrive at local optima and introduce code artefacts/behaviours that no developer would plausibly write. Those shapes rarely lead to a true match even if the percentage ticks up.

The permuter shines when a match is nearly complete. It can nudge register allocation or scheduling just enough to cross to 100%. This is an area in which Claude often struggles because sometimes fixing register allocations is just a matter of trying (literally) a million different things. Such a scale is beyond the reach of current agents; at best, Claude often racks up dozens of attempts.

Making a permuter tool available to coding agents could enable them to generate new approaches more effectively. However, this approach would need to be accompanied by strong safeguards such as requiring a minimum match percentage and clear instructions to avoid implausible suggestions.

### XML Prompt

My `CLAUDE.md` is YAML today, but both [Claude’s guide](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) and [Codex’s guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide) suggest XML tags can improve adherence and output quality.

I didn’t expect to be writing XML in 2025, but it's likely worth testing.

## Final Thoughts

Coding agents have clear benefits and have lowered the barrier to entry for decompilation. I suspect many projects would benefit from using them, with caveats. These tools are powerful, though not a panacea. They don’t replace human problem-solving nor the generous support of the decomp community on Discord; they work best as accelerators inside a human-led loop.

If you’ve made it this far, you probably have an interest in decompilation and Snowboard Kids. Give it a try: decompile a small function or contribute to the project. You can find more details on the [Snowboard Kids 2 decomp Github page](https://github.com/cdlewis/snowboardkids2-decomp).

*Something to say? You can upvote and/or join [the discussion on HackerNews](https://news.ycombinator.com/item?id=45821911)*

[^1]: I couldn't think of anything better than how [Twilight Princess Decompilation](https://zsrtp.link/about) defines matching decompilation.
[^2]: The one exception I'm aware of is [this excellent series of posts](https://gambiconf.substack.com/p/development-journey-on-game-decompilation) by Macabeus.
[^3]: Taken to an extreme, C code that just inlines the target assembly function could otherwise be counted as a successful 'decompilation'.
[^4]: This is mostly just guesswork and trying different variations of compiler versions and configuration options. But it isn't as bad as it sounds since the time period limits which compilers were plausibly used. The compiler arguments used in other, similar, games also provide a useful reference.
[^5]: Since my M2 Macbook tragically cannot run GCC from the mid-90s or the utilities necessary for MIPS cross-compilation, everything I describe is running on an Ubuntu server in a cupboard.
[^6]: I symlink CLAUDE.md to AGENTS.md for Codex's benefit. Codex responds differently to prompts and so would ideally have its own file (see [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)) but the maintenance overhead of two sets of instructions isn't worth it for me.
[^7]: Peter Steinberger has an [excellent post](https://steipete.me/posts/just-talk-to-it#what-about-claude-code) contrasting Claude and Codex. Although he reaches the opposite conclusion from me.
[^8]: [The RAG Obituary: Killed by Agents, Buried by Context Windows](https://www.nicolasbustamante.com/p/the-rag-obituary-killed-by-agents).
[^9]: Not that developers always write well-structured, idiomatic code. But this rule has been a surprisingly effective guide for finding a match.
