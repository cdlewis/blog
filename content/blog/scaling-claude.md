+++
title = "The Long Tail of LLM-Assisted Decompilation"
date = "2026-02-16T12:44:27-05:00"
tags = []
+++

In my previous posts I described [how coding agents could be used to decompile Nintendo 64 games](https://blog.chrislewis.au/using-coding-agents-to-decompile-nintendo-64-games/) and, indeed, that [one-shot decompilation was very effective](/the-unexpected-effectiveness-of-one-shot-decompilation-with-claude/).

That approach allowed me to make rapid progress on the [Snowboard Kids 2 decompilation](https://github.com/cdlewis/snowboardkids2-decomp), with the percentage of matched code growing from ~25% to ~58% in a relatively short period of time. Making further progress, however, became increasingly difficult and I had to significantly adapt my workflow. With those changes I pushed the decompilation into the ~75% range before stalling out again — this time, perhaps for good. Though I’d love to be proved wrong.

This post describes how that workflow evolved as the project matured, what helped (sometimes only briefly), and where the current limits of LLM-assisted decompilation became clear. My hope is that these observations will be useful for other decompilation projects.

![chart showing recent decompilation progress](/progress-v2.svg#darksafe)

## Prioritising Similar Functions

Decompilation attempts take time and tokens so the choice of which functions to attempt decompilation of matters a great deal. My original approach prioritised functions based on estimated difficulty. A logistic regression model ranked candidates using features like instruction count and control-flow complexity, and Claude would always attempt the 'easiest' remaining function. That worked remarkably well early on, but it eventually ran out of steam. At some point, everything left was hard. Reordering the queue didn't magically make those functions easier.

Aside from making the best use of limited resources, the intuition was that building up matched code would make future work easier — giving Claude more context and a body of decompiled C to reference. Put another way, if Claude has already successfully decompiled something very similar, it has a much better chance of matching the next one. 

Claude could sometimes identify and leverage these similarities, but they needed to be obvious. And as the number of 'easy' functions decreased, the parallels between matched and unmatched functions became increasingly important. At a minimum, the next logical step was to give Claude tooling to look up similar functions and encourage it, through prompting, to actually use them. And if function similarity proved to be highly valuable, we could also re-orient our whole strategy to explicitly focus on decompiling functions that were substantially similar to already decompiled functions. Indeed, this was the approach suggested by [Macabeus](https://github.com/macabeus). We could create a text embedding from each function's assembly instructions and then query for nearby functions in this high-dimensional latent space.

![scatter plot of function vector embeddings](/function-embeddings.png#darksafe "‌UMAP 2D projection of function embeddings from 27 December 2025, with some arbitrary modifications to make it fit nicely into a blog post.")

This was a great suggestion. We see a number of functions (pictured above) surrounded by already matched code.

### Computing Function Similarity

There are many ways to compute function similarity. Vector embeddings are great for fast retrieval across huge corpora, which is one reason they’re common in RAG systems. But I only had several thousand candidates, and queries weren’t time-sensitive. Computing exact similarity between every candidate (i.e. O(n²)) is not only feasible but preferable given the amount of time and tokens already invested in each decompilation attempt.

For direct function-to-function comparisons, several other options present themselves:[^1]

* **Instruction N-Grams**: based on n-gram Jaccard similarity over normalised instruction trigrams, with a fallback to edit distance for very small functions. Instructions are aggressively normalised — registers are abstracted by class, addresses are replaced with placeholders, branch labels are canonicalised, and call targets are reduced to `jal FUNC`.
* **Control-flow**: compares sequences of branch and jump opcodes using edit distance, combined with a comparison of branch density ratios.
* **Data-Accesses**: looks at memory offsets accessed by the function, along with patterns in offset deltas to catch similar struct access layouts.
* **Function Structure**: compares instruction counts, branch counts, jump counts, and stack frame sizes.

The initial implementation combined these features into a single score, weighted by my best guess at their predictive value. The n-grams and control-flow features were given the greatest weight.

In hindsight, this may have been overly complicated. The goal wasn't perfect semantic equivalence, just to surface functions that look alike in ways that matter for decompilation. There's already a tool that does this: [coddog](https://github.com/ethteck/coddog). Instead of feature engineering, coddog computes a bounded Levenshtein distance directly over opcode sequences, with aggressive early exits when similarity is impossible. Sequences are flattened to bytes, compared under a configurable threshold, and normalised to a [0, 1] similarity score.

I ended up adding support for Coddog similarity scoring as well. It's hard to say whether Coddog was better or merely complementary though since they both operated on different sets of functions. And, unless Anthropic dramatically increases usage quotas, I'm not willing to burn tokens running a proper experiment. Anecdotally, however, the Coddog approach seemed at least as effective as the more 'sophisticated' initial approach.

## Skills and Tooling

Specialised tooling can make a big difference to Claude's performance. The decompilation uses a variety of tools but there were two particularly notable cases:

### Permuters

Claude is slow when making changes and there are thousands of possible tweaks we could try to turn a 99.9% match into a 100% match. A permuter is the complete opposite. It will completely mindlessly try millions of different changes to the source code in the hope of chancing upon a match.

Permuters aren't a panacea, and their suggestions need to be taken with a grain of salt. These changes might temporarily improve the match percentage but not in a constructive way. For example, the Permuter might delete a function call, which just so happens to change the registers used by the compiler in a way that makes the rest of the function better match the original. But if that call was in the original function you'll need to add it back eventually. You're not actually any closer to a match than you were before.

Still, in theory, these approaches should nicely complement each other. Claude does the bulk of the work and then permutes out the last few holdouts. The skill tried to enforce that work breakdown by instructing Claude to not use the permuter unless a function was already >95% matched.

In practice, however, Claude had a tendency to fall into doom loops, endlessly optimising against permuter artefacts rather than meaningfully improving the code. 

After a few attempts to fix this, I removed the Permuter. The occasional win didn't justify the token burn or cleanup. It also made it harder to pick up from where Claude left off and attempt to match manually since the code had a tendency to be either stuck in a hopeless local minima or such a mess of unnecessary noise (such as additional temporary variables, `do {} while` loops, and nested assignments) that I needed to start from scratch anyway.

### F3Dex Tooling and Documentation

The N64 has a dedicated graphics chip called the Reality Display Processor (RDP). Games execute microcode on the RDP to render graphics on the screen. They have a lot of flexibility in terms of how they want to use the RDP but most games just opt for an off-the-shelf library provided by Nintendo. If your game doesn't do this, then you need to reverse engineer a company's idiosyncratic microcode in addition to the game itself.[^2] Thankfully, Snowboard Kids 2 opted for a Nintendo library, specifically [F3Dex2](https://ultra64.ca/files/documentation/online-manuals/man/pro-man/pro25/index25.4.html).

After loading their desired microcode library, games send instructions to the RDP via display lists.

Conceptually they're just arrays of bytes representing microcode instructions, but they’re a headache for decompilers, especially when built dynamically. This is because (sorry -- more indirection coming) games often use helper libraries which in turn use macros to construct the display list that are eventually sent to the RDP.

![simplified example of basic C decompiled code being transformed into proper F3Dex2 instructions](/f3dex-function.svg#darksafe "‌A simplified example of what an F3Dex2 call might look like as decompiled C, then how it could in turn be disassembled into F3Dex2 instructions, and ultimately how (with full knowledge of the API) it's actually just a single texture load.")

Agents are smart but this is obviously a highly domain and context-specific scenario. It is a clear use-case for a Claude skill.[^3] I provided Claude with a [reference for F3Dex2 commands](https://github.com/cdlewis/snowboardkids2-decomp/blob/aead56b997d0b8dfaa1e920da857351b6e43f007/tools/claude-decomp-env/f3dex2-reference.md), a tool to disassemble hex values into specific commands (gfxdis.f3dex2), and some strategies for handling more specific edge cases such as aggregate commands. Unsurprisingly, this made Claude far more effective at recognising and decompiling F3Dex2 code.

## Cleanup and Documentation

Cleaning up and documenting code doesn't directly improve the match rate but it can help reach previously unmatchable functions. Many of the earlier functions -- particularly those done by Claude -- were quite 'brittle'. They technically matched, but relied on pointer arithmetic, awkward temporaries, or control flow no human would write. Those matches worked, but they were poor references when an unmatched function was later identified as similar to them.

Cleaner, more idiomatic matches make better examples once similarity-based scheduling kicks in. If a function really should be using array indexing instead of pointer math, fixing that improves the signal Claude sees when attempting related code.

Sometimes this cleanup was done by hand but Claude was also reasonably good at cleaning up its own work. Claude was run in a loop -- similar to the [technique used for one-shot decompilation](https://blog.chrislewis.au/the-unexpected-effectiveness-of-one-shot-decompilation-with-claude/) -- where it was tasked with making changes to one individual function at a time.

This was another area where the [right skills](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/.claude/skills) made a difference. In a decompilation project, even renaming a global variable can involve multiple steps. This also turned out to be a great way to document the structure of the project -- since writing down how everything worked was already necessary for Claude's benefit.

As a side effect, this work turned up some genuinely fun discoveries. While documenting the cheat code system, I stumbled across a [previously unknown cheat code](https://www.reddit.com/r/SnowboardKids/s/bBMJUURbAA). That alone justified the detour.

## Scaling and the New Workflow

The ongoing decompilation work plus the branching into other non-decompilation tasks presented numerous challenges in terms of resources, project stability, and task orchestration.

Four changes helped me keep the workflow scaling:

1. **Worktrees** to facilitate multiple agents working concurrently;
2. **Agent hooks** to limit scope for agent's to perform destructive or wasteful actions;
3. **Nigel** the Cat for better task orchestration;
4. **Glaude** for more tokens.

These will be discussed in turn.

### Worktrees

This is not particularly controversial but I mention it to place the remaining items in context. There are multiple tasks that we need to perform. Worktrees are the recommended way to run multiple agents on a single codebase. Agents need their own version of the codebase to work with or we risk conflicting changes, errors, etc.

Today I run agents across three separate worktrees in addition to the main branch, where I do human stuff.

![illustration of my current workflow](/current-workflow.svg#darksafe)

### Improved Guardrails with Claude Hooks

Greater automation of the decompilation and documentation work also introduced a greater possibility for Claude to create and commit mistakes. The unsupervised nature of the work means that these can lie for hours undetected, potentially invalidating all the intervening work that has been done.

In one particularly amusing case, Claude couldn't get a function to match so it updated the SHA1 hash that it was used for comparison between the compiled artefact and the original rom. All work done after that point had to be reverted.

Hooks proved invaluable for preventing this behaviour and guiding the agent. Hooks allow us to, for example, run code before the agent takes a specific action, such as editing a file. I have found them to be incredibly useful. You can find the full list of hooks [here](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/.claude/hooks). Currently I use hooks to:

* Block changes to the SHA1 hash (solving the earlier issue);
* Block Claude from skipping tests when trying to commit a change;
* Block Claude from building the project in any way other than `build-and-verify.sh`; and
* Block Claude from trying to edit automatically generated files.

All, regrettably, are things Claude has done to me. Hooks have significantly reduced how often Claude attempts something misguided or destructive. But they are not perfect and Claude can be very persistent when it **really** wants to do something. I've seen Claude run the contents of a `make` command when `make` is blocked or write a Python script to edit a file it's been told can't be edited. But hooks at least offer a better enforcement mechanism than prompting alone.

### Task Orchestration with Nigel the Cat

Different kinds of long-running agent loops have become an essential part of my workflow. The greater use of long-running tasks also required a more robust solution than my old `run.py` script. I decided to split my old `run.py` script (now renamed to Nigel) into its [own repo](https://github.com/cdlewis/nigel).

Nigel reflects the immediate needs of the decompilation project, but might be useful more generally. In Nigel, tasks are expressed via configuration: it is easy to experiment with new ideas by copying an existing task and tweaking it. In your configuration file you need to specify a 'candidate source' (input to the task) and a prompt (which can optionally be a separate template file).

Here is an example from my recent attempts to remove hard-coded hex addresses in `main.c`:

```yaml
candidate_source: grep -o '.name = .*"' src/main.c | sort | uniq

prompt: "Look up the modelEntityConfigs entry or entries where `$INPUT` in src/main.c. The fields compressedDataStart/compressedDataEnd/displayListStart/displayListEnd contain hex addresses. These hex addresses should be an asset entries. Look for the appropriate entry in assets.h/snowboardkids2.yaml. If the entry is not present, you will need to add it. In both cases, ensure that it has a semantically appropriate name (based on the asset name, e.g. TOWN_DISPLAY_LIST). commit your changes when you're done."
```

Nigel will automatically discover scripts (uniquely identified by their name) and can run them with proper handling to ensure the same input isn't handled twice, good changes are committed, failures are handled gracefully, etc.

There are too many features to mention here, but some favourites are:

* Although Claude is running in non-interactive mode, Nigel will recombine and present the streamed JSON output so you can have a better sense of how tasks are going in real time.
* You can tell Nigel to stop after the current task finishes with Ctrl-\. Again, great for long running sessions where you want to try something new but don't want to throw away 30+ minutes of work.
* Built-in parallelism support with --shard X/Y, letting you distribute tasks across multiple worktrees without conflicts

![screenshot of nigel running a task](/nigel_in_action.png "A screenshot of Nigel the cat in action. Note that Nigel was originally called task-runner and these configurations are still valid, which is why the 'task-runner' references in the screenshot come from")

#### What about Ralph Wiggum?

It's hard to talk about Claude workflows without mentioning [Ralph Wiggum](https://ghuntley.com/ralph/). Like Ralph, Nigel can repeatedly prompt Claude with the same task via `--repeat` until it succeeds. The difference is that Nigel works in terms of workflows and batch jobs. Tasks generate candidates and consume them one at a time, whereas Ralph simply replays the same prompt.

I experimented with large repeat counts. My initial prompt imposed a 30 attempt cap, which may have been conservative, so I removed it. In practice, higher `--repeat` values didn’t materially improve results. They just made each run take much longer. Claude giving up too early does not appear to be the bottleneck.

### Glaude and GLM's Generous Quotas

Work on the remaining unmatched functions required more attempts, more intermediate output, and more refactoring passes. An unattended Opus task could burn through the Claude 20x Max plan in a matter of days. The new cleanup and documentation loops only added to the pressure on a finite token budget.

GLM — an open-weight model from z.ai — is generally considered [less capable](https://z.ai/blog/glm-5) than Opus. But it’s dramatically cheaper, offers generous token limits, and can act as a drop-in replacement for most of my workflows.

So glaude was born: a thin wrapper that looks like Claude but quietly points at a GLM backend.

I usually try glaude first, or reach for it when I know the task is mechanical. Cleanup passes, refactors, documentation loops — none of these really need frontier reasoning. I'd rather preserve Opus tokens for the genuinely difficult work. It’s not perfect. Opus has cracked problems GLM couldn't. But it lets me run agents without constantly thinking about weekly quotas, which makes the whole system far more sustainable.

## 157 Functions

After all that engineering (similarity scoring, skills, hooks, orchestration, model routing) the curve ultimately flattened in early January.

At that point, **157 functions remained**. With continued manual work, that’s now down to **144**, but the dynamic has fundamentally changed.

Two factors dominate:

* Claude struggles badly with functions over ~500 instructions, and more or less gives up immediately beyond ~1000.
* Graphics-heavy functions, especially those building display lists via macros, are deeply confusing for LLMs. Even with specialised tools, reversing macros from raw assembly is hard.

As a result, Nigel the cat doesn't do much these days. There’s still documentation and cleanup to be done, but the era of endless unattended Claude loops is over, at least until a model arrives that can push past these limits.

[^1]: obviously claude helped out here. n-gram Jaccard similarity didn't just pop into my head
[^2]: something about rare's microcode
[^3]: i've gone back-and-forth between treating this as a claude skill vs making it directly part of the CLAUDE.md for the decomp environment. as i was writing this blog post though it did seem a little embarassing not making it a skill so i changed it back. 😶‍🌫️