+++
title = "Using Coding Agents to Decompile Nintendo 64 Games"
date = "2025-11-04T17:41:10-05:00"
description = "A look at where coding agents help (and don’t) in matching decompilation of Snowboard Kids 2 on the Nintendo 64."
draft = false
images = ['sbk2-title.webp']
+++

Recently I've been working on a matching decompilation of [Snowboard Kids 2](https://github.com/cdlewis/snowboardkids2-decomp), an incredibly underrated racing game for the Nintendo 64. The purpose of this post is to document how coding agents have and haven't helped this process. While much has been written about LLMs, far less has been written about decompilation,[^2] so I’m adding another data point. A few lessons may apply beyond N64. If you’ve got suggestions to improve the workflow, please let me know!

![Snowboard Kids 2 title](/sbk2-title.webp)

## What is matching decompilation?

'Decompilation is the process of turning compiled code back into equivalent, human-readable source code.'[^1]

Snowboard Kids 2 was written in C and compiled to MIPS. From instruction patterns, prologue/epilogue shapes, and delay-slot behaviour, we infer the compiler was likely GCC 2.7.2.[^4] In matching decompilation, we read the MIPS assembly, infer its behaviour, and write C that, when compiled with the same toolchain and settings, reproduces the exact code: same registers, same delay-slots, same instruction order, byte-for-byte identical.

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

Of course, this still doesn't tell us what the function is _for_ in the broader codebase. Why clamp the argument to `func_80057564_58164` to a minimum of four? Matching the bytes is only step one; understanding intent comes later via naming, cross-references, and seeing how the call sites behave.

Matches also vary in quality. A good match is more than C that compiles to the right bytes.[^3] It should look like something an N64-era developer would plausibly have written: simple, idiomatic C control flow; sensible data structures;[^10] and shapes that align with how the original compiler tends to emit code. Favouring plausibility pays off, later functions naturally share helpers and struct layouts, and you avoid artefacts that only exist to trigger some quirk of the compiler.

Why do matching decompilation at all? It deepens understanding of the engine, enables extensions and bug fixes, and creates a solid base for tooling (map files, debuggers, asset extractors, etc). And, most importantly, it’s fun!

## My Workflow

Here’s the loop I use:

1. Identify a function to decompile and import it to [`decomp.me`](https://www.decomp.me).
2. Try to produce matching code.
3. If I get stuck, import the function locally and bring in agents (usually Claude; sometimes Claude and Codex in parallel).
4. `diff -u` the agent's best attempt and update the scratch on `decomp.me`.
5. If it's 100%, stop. Otherwise, go back to step 2.

Agents come in at step 3. I have a helper script that pulls scratches from `decomp.me`. Running:

```bash
./tools/claude <decomp.me id>
```

This script creates a dedicated subdirectory for the match attempt, which in turn has a [tailored CLAUDE.md file](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/claude-decomp-env/CLAUDE.md)[^6] and a set of tools. For convenience, it also starts a new Claude instance with instructions to read the aforementioned file and 'use thinking'.

The agent environment exposes several tools documented in CLAUDE.md, including:

- Build & diff: compile a C file and diff it against the target binary, reporting a match percentage (0–100%).
- Disassembly: dump a binary to MIPS assembly.
- Object file diff: disassemble and diff two object files with register-name normalization.
- Line mapping: best-effort mapping from disassembly lines to C lines (via debug symbols).

Most of these utilities were initially scaffolded by Claude and then customized for this project. They're [all available on Github](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/tools). In my experience, agents excel at bootstrapping one-off CLI tools: setup is fast, and ongoing maintenance is minimal because the agent can regenerate or patch them as needed.

## Where Agents Have/Haven't Helped

My workflow is still human-driven, with agents acting as research assistants. I pick functions and try to decompile them first. Part of that is emotional. It's more satisfying to figure things out yourself than to stare at a coding agent. Even if you wanted to, though, relying solely on an agent won’t get you far. We’re a long way from 'vibe coding' being viable for matching decompilation.

### Have Helped

Agents are great at spotting patterns and sometimes make surprising leaps. Where I see 2,000 lines of noise, Claude might spot an audio-processing routine. They're also patient enough to try dozens of variations to see what nudges the match.

Different agents approach problems differently and can produce different answers for the same task. I often run Claude and Codex in parallel to widen the search space and diversify ideas. In my (completely unscientific) testing, Claude tends to perform better on decompilation overall.[^7]

### Haven’t Helped

Agents often stumble on basic arithmetic and bookkeeping that a human would do quickly. For example, they struggle to compute the correct byte offset of a struct field.

They also repeat small syntactic mistakes despite prompting. Snowboard Kids 2 is C89 (yes, 1989), not a modern dialect: variables must be declared at the start of a scope. If you write `int temp = 7;` mid-block, it won’t compile; the declaration has to appear at the beginning of the function or block.

Finally, agents struggle with very large functions (>1,000 instructions) and tangled control flow, which, to be fair, is also hard for humans.

## Ideas for Further Improvement

Some of these are experiments I’ve tried; others are hypotheses I haven’t tested yet. I’ve noted what’s been tried, what I observed, and what's still speculative.

### Stop Isolating Decompilation Tasks

My Claude script creates a dedicated directory with focused instructions and tools for each attempt. In theory, you could instead run Claude from the repo root; with the right prompting, it might perform as well or better.

In practice, running at the root burned a lot of tokens before any decompilation began, as the agent explored the environment. Results were mixed, and the extra tokens didn’t translate into a clear win. (This was pre-subscription, when wasted tokens hurt more.)

**Verdict:** isolation remains more efficient, but it might be worth a fresh A/B test with current models.

### Verbose Tool Output

Originally the `compile.sh` tool dumped full candidate and target assembly on every build. This is relevant information for the agent. It needs to see what assembly its latest attempt produced and how that compares to the target function. But force-feeding Claude relevant context didn't seem to help. Claude didn't seem to be able to make use of this information and would often try dumping the assembly itself anyway.

**Verdict:** don't provide unasked-for context. Keep disassembly available on demand and only include full listings when requested.

### Retrieval Augmented Generation (RAG)

RAG builds vector embeddings of relevant sources (here: project files) and, at query time, injects the top-K matches into the agent's context.

It’s tempting, but the payoff has seemed lower lately: larger context windows plus simple Unix tools (`grep`, `rg`, `ctags`) already give agents powerful retrieval options.[^8] Like 'Verbose Tool Output', RAG can end up forcing context the agent didn’t ask for, increasing token use without clearer wins.

**Verdict:** not something that I'm in a rush to try.

### Add a Permuter Tool

[decomp-permuter](https://github.com/simonlindholm/decomp-permuter) explores nearby program variants (statement reordering, temp variables, conditional forms, etc) and rechecks match %. This is _generally_ not an efficient strategy. The permuter, particularly at low match percentages, can arrive at local optima and introduce code artefacts/behaviours that no developer would plausibly write. Those shapes rarely lead to a true match even if the percentage ticks up.

The permuter shines when a match is nearly complete. It can nudge register allocation or scheduling just enough to cross to 100%. This is an area where Claude often struggles because sometimes fixing register allocations is just a matter of trying (literally) a million different things. Such a scale is beyond the reach of current agents with Claude racking up at best dozens of attempts.

**Verdict:** worth trying with strong safeguards such as requiring a minimum match % and clear instructions to avoid implausible suggestions.

### XML Prompt

My `CLAUDE.md` is YAML today, but both [Claude’s guide](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) and [Codex’s guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide) suggest XML tags can improve adherence and output quality.

**Verdict:** I didn’t expect to be writing XML in 2025, but it's likely worth testing.

## Final Thoughts

Coding agents have clear benefits and have significantly lowered the bar to decompilation. I suspect many projects would benefit from using them, with caveats. They’re powerful tools, but not a panacea. They don’t replace human problem-solving or the generous support of the decomp community on Discord; they work best as accelerators inside a human-led loop.

If you’ve made it this far, you probably have an interest in decompilation and Snowboard Kids. Give it a try: decompile a small function or contribute to the project. You can find more details on the [Snowboard Kids 2 decomp Github page](https://github.com/cdlewis/snowboardkids2-decomp).

[^1]: I couldn't think of anything better than how [Twilight Princess Decompilation](https://zsrtp.link/about) defines matching decompilation.
[^2]: The one exception I'm aware of is [this excellent series of posts](https://gambiconf.substack.com/p/development-journey-on-game-decompilation) by Macabeus.
[^3]: Taken to an extreme, C code that just inlines the target assembly function could otherwise be counted as a successful 'decompilation'.
[^4]: This is mostly just guesswork and trying different variations of compiler versions and configuration options. But it isn't as bad as it sounds since the time period limits which compilers were plausibly used. Similarly, we can look at what compiler arguments other decompiled games are using to inform our guesswork.
[^5]: Since my M2 Macbook tragically cannot run GCC from 1996 or the utilities necessary for MIPS cross-compilation, everything I describe is running on an Ubuntu server in a cupboard.
[^6]: I symlink CLAUDE.md to AGENTS.md for Codex's benefit. Codex responds differently to prompts and so would ideally have its own file (see [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)) but the maintenance overhead of two sets of instructions isn't worth it for me.
[^7]: Peter Steinberger has an [excellent post](https://steipete.me/posts/just-talk-to-it#what-about-claude-code) contrasting Claude and Codex. Although he reaches the opposite conclusion from me.
[^8]: [The RAG Obituary: Killed by Agents, Buried by Context Windows](https://www.nicolasbustamante.com/p/the-rag-obituary-killed-by-agents).
[^10]: Not that developers always write well-structured, idiomatic code. But this rule has been a surprisingly effective guide for finding a match.
