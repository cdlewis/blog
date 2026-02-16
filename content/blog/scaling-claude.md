+++
title = "The Long Tail of LLM-Assisted Decompilation"
date = "2026-02-16T09:44:27-05:00"
description = "After rapid advances thanks to one-shot decompilation, progress on the Snowboard Kids 2 decompilation began to falter. This post explores the workflow evolution, tooling improvements, and fundamental LLM limits that emerged when tackling the long tail of increasingly difficult functions."
images = ['function-embeddings-header.jpg']
draft = false 
+++

In my previous posts, I described [how coding agents could be used to decompile Nintendo 64 games](https://blog.chrislewis.au/using-coding-agents-to-decompile-nintendo-64-games/) and that [one-shot decompilation was very effective](/the-unexpected-effectiveness-of-one-shot-decompilation-with-claude/). That approach allowed me to make rapid progress on the [Snowboard Kids 2 decompilation](https://github.com/cdlewis/snowboardkids2-decomp), with the percentage of matched code quickly growing from around 25% to 58%.

After that, progress slowed dramatically, requiring me to significantly alter my workflow. With those changes, I pushed the decompilation into the ~75% range before stalling out again, this time perhaps for good, though I would love to be proved wrong.

This post describes how my workflow has evolved as the project matured, what helped, and where I'm currently stuck. My hope is that these observations will be useful for other decompilation projects.

![chart showing recent decompilation progress](/progress-v2.svg#darksafe)

## Prioritising Similar Functions

Decompilation attempts take time and tokens, so the choice of which unmatched functions to work on matters a great deal. My original approach prioritised functions based on estimated difficulty. A logistic regression model ranked candidates using features like instruction count and control-flow complexity, and Claude would always attempt the 'easiest' remaining function. That worked remarkably well early on, but it eventually ran out of steam. At some point, everything left was hard. Reordering the queue didn't magically make those functions easier.

At the same time, [Macabeus](https://github.com/macabeus) was exploring function similarity via text embeddings of assembly instructions, which then allowed querying for nearby functions in the high-dimensional latent space. This seemed promising. Claude's output already hinted that it could recognise similar functions and reuse patterns across them. The intuition here is that decompiled functions provide a useful reference to Claude for how particular blocks of assembly can be mapped to C code.

To test this out, I wrote a tool to compute similar matched functions given an unmatched function and adjusted the agent loop to prioritise functions with similar (matched) counterparts. This approach proved highly effective. There were indeed many similar functions that Claude hadn't previously been able to identify, and these proved invaluable for helping guide its decompilation attempts.

![scatter plot of function vector embeddings](/function-embeddings.png#darksafe "‌UMAP 2D projection of function embeddings from 27 December 2025, with some arbitrary modifications to make it fit nicely into a blog post.")

### Computing Function Similarity

Vector embeddings are just one way of computing function similarity. They are great for fast retrieval across huge corpora, which is one reason they're common in RAG systems. But I only had a few thousand candidates, and queries weren't time-sensitive. Computing exact similarity between every pair of candidates is not only feasible but preferable, given how much time and tokens are already invested in each attempt.

My first attempt was to build a composite similarity score by hand. I combined:
* Normalised instruction n-grams
* Control-flow patterns
* Memory access offsets and stride patterns
* Structural metrics such as instruction counts and stack frame size

In hindsight, this was probably overcomplicated. There is already a tool that does something very similar: [Coddog](https://github.com/ethteck/coddog). Instead of feature engineering, it computes a bounded Levenshtein distance directly over opcode sequences, with aggressive early exits when similarity is impossible. The result is normalised to a similarity score between 0 and 1.

On the remaining unmatched functions, Coddog and my own approach select different most-similar candidates in 90.6% of cases. I still use both. They were not evaluated on identical sets of functions, so it is difficult to say whether one is strictly better or whether they are simply complementary. Anecdotally, though, the simpler approach performs at least as well as my more elaborate one.

## Skills and Tooling

Specialised tooling can make a big difference to Claude's performance. The project uses a number of Claude skills but two were particularly notable: `gfxdis.f3dex2`  and decomp-permuter.

### F3Dex Tooling and Documentation

The N64 has a dedicated graphics chip, the Reality Display Processor (RDP). Games execute microcode on the RDP to render graphics on the screen.

Games have considerable flexibility in how they use the RDP, but most opt for an off-the-shelf library provided by Nintendo. If your game doesn't do this, you need to reverse engineer a company's idiosyncratic microcode in addition to the game itself. Thankfully, Snowboard Kids 2 opted for a Nintendo library, specifically [F3Dex2](https://ultra64.ca/files/documentation/online-manuals/man/pro-man/pro25/index25.4.html).

After loading their desired microcode library, games send instructions to the RDP via display lists. Conceptually, display lists are just arrays of bytes representing microcode instructions, but they're a headache for decompilers. Games often build them dynamically using macros that may invoke other macros or perform complex bit arithmetic. The compiler then optimises and reorganises this logic, making it difficult to discern what the original developers actually wrote.

![simplified example of basic C decompiled code being transformed into proper F3Dex2 instructions](/f3dex-function.svg#darksafe "‌A simplified example of what an F3Dex2 call might look like as decompiled C, then how it could in turn be disassembled into F3Dex2 instructions, and ultimately how (with full knowledge of the API) it's actually just a single texture load.")

Agents are smart, but this is a highly domain-specific and context-specific scenario. It's a clear use case for a Claude skill.[^1] I provided Claude with a [reference for F3Dex2 commands](https://github.com/cdlewis/snowboardkids2-decomp/blob/aead56b997d0b8dfaa1e920da857351b6e43f007/tools/claude-decomp-env/f3dex2-reference.md), a tool to disassemble hex values into specific commands (gfxdis.f3dex2), and some strategies for handling more specific edge cases such as aggregate commands. Unsurprisingly, this made Claude far more effective at recognising and decompiling F3Dex2 code.

### Permuters

Claude is slow and deliberate. Turning a 99.9% match into 100% can involve thousands of tiny variations in control flow, temporaries, or expression ordering. A permuter is the opposite. It blindly tries millions of small mutations in the hope that one of them produces a perfect match.

In theory, this should complement an LLM nicely. Claude does the structured reasoning, the permuter brute-forces the final few percent. The skill enforced this split by allowing the permuter to run only once a function was already more than 95% matched.

In practice, it was messy.

Permuters happily introduce strange code: illogical variable reuse, `do {} while (0)` loops, nested assignments. Sometimes these changes work. Often they do not. Worse, they optimise for incremental improvements to the match percentage rather than for correctness. A small reordering might delete a function call or subtly change register allocation in a way that improves the match. But if that call existed in the original, you will have to restore it eventually. You are not actually closer to a clean match. You have just moved the compiler into a more convenient shape.

Claude, unfortunately, tended to treat these artefacts as signal. It would start optimising around permuter-induced noise, leading to doom loops and token burn with little real progress.

After a few attempts to rein this in, I removed the permuter entirely. The occasional win did not justify the cleanup cost or the instability it introduced. It also made manual intervention harder, since the codebase would drift into awkward, overfitted forms that no human would willingly write.

## Cleanup and Documentation

Cleaning up and documenting code doesn't directly improve the match rate but it can help reach previously unmatchable functions. Many of the earlier functions (particularly those done by Claude) were quite brittle. They technically matched, but relied on pointer arithmetic, awkward temporaries, or control flow no human would willingly write. Those matches worked, but they were poor references when an unmatched function was later identified as similar to them.

Cleaner, more idiomatic matches make better examples once similarity-based scheduling kicks in. If a function really should be using array indexing instead of pointer math, fixing that improves the signal Claude sees when attempting related code.

Sometimes this cleanup was done by hand but Claude was also reasonably good at cleaning up its own work. Claude was run in a loop, similar to the [technique used for one-shot decompilation](https://blog.chrislewis.au/the-unexpected-effectiveness-of-one-shot-decompilation-with-claude/), where it was tasked with making changes to one individual function at a time.

This was another area where the [right skills](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/.claude/skills) made a difference. In a decompilation project, even renaming a global variable can involve multiple steps. This also turned out to be a great way to document the structure of the project, since writing down how everything worked was already necessary for Claude's benefit.

As a side effect, this work turned up some genuinely fun discoveries. While documenting the cheat code system, I stumbled across a [previously unknown cheat code](https://www.reddit.com/r/SnowboardKids/s/bBMJUURbAA). That alone justified the detour.

## Scaling and the New Workflow

The ongoing decompilation work plus the branching into other non-decompilation tasks presented numerous challenges in terms of resources, project stability, and task orchestration.

Four changes helped me keep the workflow scaling:

1. **Worktrees** to facilitate multiple agents working concurrently;
2. **Agent hooks** to limit scope for agents to perform destructive or wasteful actions;
3. **Nigel** the Cat for better task orchestration;
4. **Glaude** for more tokens.

These will be discussed in turn.

### Worktrees

There are multiple tasks that we need to perform. Worktrees are the [recommended way](https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees) to run multiple agents on a single codebase. Agents need their own version of the codebase to work with, or we risk conflicting changes, errors, and so on.

Today I run agents across three separate worktrees in addition to the main branch, where I do human stuff.

![illustration of my current workflow](/current-workflow.svg#darksafe)

### Improved Guardrails with Claude Hooks

Greater automation of the decompilation and documentation work also increased the possibility of Claude creating and committing mistakes. The unsupervised nature of the work means these can lie undetected for hours, potentially invalidating all the intervening work that has been done.

In one particularly amusing case, Claude couldn't get a function to match, so it updated the SHA1 hash that was used for comparison between the compiled artefact and the original ROM. All work done after that point had to be reverted.

Hooks proved invaluable for preventing this behaviour and guiding the agent. Hooks allow us to run code before the agent takes a specific action, for example when editing a file. I've found them incredibly useful. You can find the full list of hooks [here](https://github.com/cdlewis/snowboardkids2-decomp/tree/main/.claude/hooks). Currently, I use hooks to:

- Block changes to the SHA1 hash (solving the earlier issue);
- Block Claude from skipping tests when trying to commit a change;
- Block Claude from building the project in any way other than `build-and-verify.sh`; and
- Block Claude from trying to edit automatically generated files.

Hooks have significantly reduced the frequency with which Claude attempts misguided or destructive actions, though they are not perfect. Claude can be very persistent when it **really** wants to do something. I've seen Claude run the contents of a `make` command when `make` itself is blocked, or write a Python script to edit a file it's been told it can't edit. But hooks at least offer better enforcement than prompting alone.

### Task Orchestration with Nigel the Cat

Different kinds of long-running agent loops have become essential to my workflow. The increased use of long-running tasks also required a more robust solution than my old `run.py` script. I decided to split my old `run.py` script (now Nigel) into its [own repo](https://github.com/cdlewis/nigel).

Nigel reflects the immediate needs of the decompilation project but might be useful more generally. In Nigel, tasks are expressed via configuration: it's easy to experiment with new ideas by copying an existing task and tweaking it. In your configuration file, you need to specify a 'candidate source' (input to the task) and a prompt (which can optionally be a separate template file).

Here's an example from my recent attempts to remove hard-coded hex addresses in `main.c`:

```yaml
candidate_source: grep -o '.name = .*"' src/main.c | sort | uniq

prompt: "Look up the modelEntityConfigs entry or entries where `$INPUT` in src/main.c. The fields compressedDataStart/compressedDataEnd/displayListStart/displayListEnd contain hex addresses. These hex addresses should be asset entries. Look for the appropriate entry in assets.h/snowboardkids2.yaml. If the entry is not present, you will need to add it. In both cases, ensure that it has a semantically appropriate name (based on the asset name, e.g. TOWN_DISPLAY_LIST). commit your changes when you're done."
```

Nigel will automatically discover scripts (uniquely identified by name) and can run them with proper handling to ensure the same input isn't handled twice, good changes are committed, failures are handled gracefully, etc.

Some of my favourite Nigel features are:

- Nigel will show you the model output in real-time, even though Claude is running in non-interactive mode.
- You can tell Nigel to stop after the current task finishes with Ctrl-backslash. Again, great for long-running sessions where you want to try something new but don't want to throw away 30+ minutes of work.
- Built-in parallelism support with --shard X/Y, letting you distribute tasks across multiple worktrees without conflicts

![screenshot of nigel running a task](/nigel_in_action.png "A screenshot of Nigel the cat in action. Note that Nigel was originally called task-runner and these configurations are still valid, which is why the 'task-runner' references in the screenshot come from")

#### What about Ralph Wiggum?

It's hard to discuss Claude workflows without mentioning [Ralph Wiggum](https://ghuntley.com/ralph/). Like Ralph, Nigel can repeatedly prompt Claude with the same task via `--repeat` until it succeeds. The difference is that Nigel operates within structured workflows and batch jobs. Tasks generate candidates and consume them one at a time, whereas Ralph simply replays the same prompt.

My initial prompt capped the number of attempts at 30 to preserve tokens, which may have been conservative.

I experimented with relaxing this limit and enabling `--repeat 3`. A small number of functions exceeded the previous 30-attempt cap. One required 87 attempts before Claude finally succeeded.

In practice, higher `--repeat` values do help, but only at the extreme tail and at considerable token cost.
The 85th percentile of successful attempts remains 28 attempts, meaning most functions complete within the original limit. For now, I’ve removed `--repeat 3` while leaving the number of attempts within a single prompt uncapped. That preserves headroom for rare outliers without multiplying token usage across the entire workload.

### Glaude and GLM's Generous Quotas

Work on the remaining unmatched functions required more attempts, more intermediate output, and more refactoring passes. An unattended Opus task could burn through the Claude 20x Max plan in a matter of days. The new cleanup and documentation loops only added to the pressure on a finite token budget.

GLM, an open-weight model from z.ai, is generally considered [less capable](https://z.ai/blog/glm-5) than Opus. But it's dramatically cheaper, offers generous token limits, and can act as a drop-in replacement for most of my workflows.

Thus glaude was born: a thin wrapper that looks like Claude but quietly points at a GLM backend.

I usually try glaude first, or reach for it when I know the task is mechanical. Cleanup passes, refactors, documentation loops: none of these really need frontier reasoning. I'd rather preserve Opus tokens for the genuinely difficult work. It's not perfect. Opus has cracked problems GLM couldn't. But it lets me run agents without constantly worrying about weekly quotas, which makes the whole system far more sustainable.

## 157 Functions

After all that engineering (similarity scoring, skills, hooks, orchestration, model routing), the curve ultimately flattened in early January. At that point, 157 functions remained. With continued work, that's now down to 124, but the dynamic has fundamentally changed.

Three factors dominate:

- Claude struggles with large functions and more or less gives up immediately on those exceeding 1,000 instructions.
- Graphics-heavy functions, especially those building display lists via macros, deeply confuse LLMs. Even with specialised tools, reversing macros from raw assembly is hard.
- Maths functions, particularly matrix and vector transformations, seem to bamboozle Claude. Anecdotally, I've also seen other projects struggle with this. For example, I know that a function is computing the inverse square root. It's only 86 instructions long. But it has eluded Claude and me for months.

Nigel the cat is still as busy as ever. There’s still work to be done, but matching functions has become much harder. At least until the next wave of frontier models is released.

*If you’ve made it this far, you probably have an interest in decompilation and Snowboard Kids 2. Check out the [Snowboard Kids 2 decompilation project](https://github.com/cdlewis/snowboardkids2-decomp), and please reach out on Discord if you’d like to help.*

**You can also [follow me on Bluesky](https://bsky.app/profile/chrislewis.au) for more Snowboard Kids 2 updates.**

[^1]: I've gone back and forth between treating this as a Claude skill vs making it directly part of the CLAUDE.md for the decomp environment. As I was writing this blog post though, it did seem a little embarrassing not making it a skill, so I changed it back. 😶‍🌫️
