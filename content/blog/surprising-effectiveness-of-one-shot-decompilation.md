+++
title = "The Unexpected Effectiveness of One-Shot Decompilation with Claude"
description = "A deep dive into how a 'one-shot' Claude headless loop (paired with scoring, defensive tooling, and a simple bash driver) massively accelerates matching decompilation of Snowboard Kids 2 on the Nintendo 64."
date = "2025-11-27T13:48:07-05:00"
draft = false 
images = ['difficulty-distribution.png']
+++

Recently, I've been experimenting with 'one-shot' decompilation leveraging Claude's [Headless mode](https://code.claude.com/docs/en/headless) in a continuous loop.[^1] The results have been surprisingly positive. In the three weeks since adopting this workflow, I've made more progress on [Snowboard Kids 2](https://github.com/cdlewis/snowboardkids2-decomp) than in the preceding three months.[^4]

![chart showing recent decompilation progress](/sbk2-progress.svg)

'One-shot' in this context means that Claude follows the prompt and exits. You hand it a function; it tries to match it, and you move on. The lack of a human-piloted feedback loop allows for significantly more throughput. I've left Claude for 8+ hours unattended and it will happily process functions trying to find matches. It does come with some risk, however. We've all seen LLMs go off the rails, and with no human present to correct this behaviour, you may come back hours later to find your Claude quota exhausted without much progress to show for it. But with the right scaffolding, the risk becomes manageable.

The purpose of this post is to document the workflow I've arrived at, along with a few lessons that might apply to your own projects.

## The Workflow

As a user, I just run:

```
./tools/vacuum.sh
```

The script (originally called 'vacuum' for its intended purpose of hoovering up simple functions) handles everything from there. It will churn through matchable functions until none remain, either because they've been matched or marked too difficult.

![diagram showing decompilation workflow](/workflow.svg)

Under the hood, the system has four components:

1. The scorer picks the next function to attempt, prioritising those most likely to match;
2. Claude performs the actual decompilation using the provided tools;
3. Tools give Claude what it needs to decompile the function:  build scripts, diffing utilities, linters;
4. The driver manages the lifecycle: invoking Claude, handling failures, logging progress.

The following sections cover each in detail.

### The Scorer

The purpose of the scorer is to decide which function to attempt next. Claude is less capable than a human so we're best served by focusing our agent on simple functions, where it is most likely to make meaningful progress.

Early on, I used a hand-waved formula:

```
score = instruction_count + 3 * branch_count + 2 * jump_count + 2 * label_count + stack_size
```

The idea is that a program's complexity, and therefore decompilation difficulty, will largely be a function of instruction count. Control flow constructs (branches and labels) are likely to increase difficulty, as are other function calls (jumps). Managing a large stack might also be tricky so that is thrown in for good measure. This worked well enough. Simpler functions (lower scores) are more likely to match, and matching them first builds momentum and context for later attempts.

Once I had logged a few hundred matched and failed functions, I switched to a logistic regression model. The idea is to use features of a function (instruction count, branches, etc.) to predict the probability of a successful match. I don't have enough data for anything fancy, but logistic regression can at least find better weights than my initial guesses.

![diagram showing decompilation workflow](/scorer-comparison.webp)

The model confirmed some intuitions and challenged others. For instance, stack size had almost no predictive value and appeared to contribute to overfitting, so I removed it from the feature set. The remaining features proved more robust but my initial guesses at the weights were way off.

I periodically retrained the model as I gathered more data, which led to marginal improvements in its accuracy.

### Claude

Claude is the brains of the operation, performing the actual function decompilation. Most of these matches were performed using Opus 4.5. I do not have much data comparing Opus to Sonnet. However, in a brief experiment I conducted, Opus was able to match five out of seven functions that had been deemed too difficult by Sonnet 4.5.

The [full prompt](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/CLAUDE.md) lives in the repository, but the core instructions are straightforward:

1. Create a matching environment for function X.
2. Follow the instructions in that environment and use the provided tools.
3. Give up if it's too hard: more than ten attempts without progress means move on.
4. If matched: integrate into the project, verify the build, and commit. Committing is critical. It preserves progress even if Claude later ends up borking the local environment.
5. If not matched: add to [difficult_functions](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/difficult_functions) log and exit.

The 'give up after ten attempts' threshold matters. Without it, Claude will happily burn forty attempts on an impossible function. With it, we fail fast and move on to something tractable.

### The Toolbox

My tooling approach has remained largely unchanged from the [previous post](https://blog.chrislewis.au/using-coding-agents-to-decompile-nintendo-64-games/): provide simple, Unix-like programs that Claude can compose to solve problems. I don't use any [MCP (Model Context Protocol)](https://modelcontextprotocol.io/docs/getting-started/intro) servers. With that said, giving Claude more autonomy has highlighted the need for defensive coding in these tools: clear error messages, graceful failures, guardrails against misuse. An ambiguous error from a tool can send Claude down a rabbit hole, wasting time and tokens.

For example, Claude is told to use a single script to build and verify the project: [build-and-verify.sh](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/build-and-verify.sh). The script gives Claude specific instructions on failure to combat Claude's tendency to misclassify failures and successes:

> BUILD HAS FAILED. Claude, you should treat this as a build failure. Adding new warnings or accepting a non-matching checksum count as failures.

Similarly, Claude sometimes gets lost when moving between the matching environment and the main project. We can handle this with a catchall (`%:`) make rule in the problematic directories which just says:

> You are in a matching environment for a specific function. Only use the tools explicitly listed in this directory's CLAUDE.md. If you're ready to build against the main project, you need to jump back two directory levels (cd ../..)

This defensive approach to tooling has proved to be far more effective than prompt engineering at combatting specific Claude failure patterns.

Another new consideration is token efficiency, which matters far more now that we're running Claude for long periods of time. This was what originally motivated the decision for [vacuum.sh](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/vacuum.sh) (the bash script) to invoke the scorer then pass Claude the cheapest function rather than having Claude choose for itself.[^3] Tweaks to tooling can also help. [build-and-verify.sh](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/tools/build-and-verify.sh) significantly limits build output in an effort to save tokens. 

### The Driver

The outer loop is a simple bash script that calls Claude repeatedly with an optional maximum iteration count. The logic is as follows:

- Call Claude with the next function to match.
- If Claude returns non-zero, back off, eventually checking at five-minute intervals in case we've hit a usage limit.
- Trap Ctrl-C so we can signal a stop without killing Claude mid-run and wasting the current attempt.
- Log the function name and timestamp to stdout; you want visibility into what's happening.
- Append all Claude output to a file. This is invaluable for debugging failed matches; you can see exactly where Claude got stuck.

## Performance vs Other Agents

I briefly tried Codex, which was getting a lot of attention when I started down this path. The results were disappointing. Codex (including the 5.1-codex-max) struggled both with effective decompilation and with following instructions generally.

Git usage was the worst part. This [appears to be a known issue](https://github.com/openai/codex/issues/5034), although upgrading did not help in my case. Poor decompilation strategy combined with unreliable git usage makes for a painful combination.

I haven't yet tested Gemini or other agents.

## Final Thoughts

Traditional decompilation efforts have often been multi-year, team-based projects. The primary constraint has usually been the time and availability of a handful of experts. Coding agents shift that constraint. For Snowboard Kids 2, the data so far suggests that the vast majority of functions are within reach of Claude Opus 4.5; if current trends hold, roughly 79% of functions should be matchable. Looking ahead, the limiting factor is likely to be compute and access to frontier models rather than human attention.

![histogram of functions bucketed by estimated difficulty](/difficulty-distribution.svg)

**With that said, the tireless efforts of the decompilation community cannot be overstated.** My project simply would not exist without the support of many patient people on Discord, and without tools such as [Splat](https://github.com/ethteck/splat), [m2c](https://github.com/matt-kempster/m2c), [decomp-permuter](https://github.com/simonlindholm/decomp-permuter), [asm-differ](https://github.com/simonlindholm/asm-differ), and many others. We stand on the shoulders of giants. While the roles may change, I don't see human experts becoming unnecessary any time soon.

The remaining functions will almost certainly be among the most challenging to decompile (barring a few Claude quirks). Even when LLMs succeed, the output is often rough: pointer arithmetic instead of array access, goto-heavy control flow, awkward temporaries, and so on. If the goal is to understand how these games work (or to modify them) byte-perfect but ugly matches don't buy us much over the original assembly. It seems likely that future decompilers will spend more time cleaning up and documenting LLM output than writing from scratch, using these matches as a base in much the same way earlier projects built on [m2c](https://github.com/matt-kempster/m2c) output.

*If you've made it this far, you probably have an interest in decompilation and Snowboard Kids. Give it a try. Take a look at `difficult_functions.txt` on the [Snowboard Kids 2 decomp GitHub page](https://github.com/cdlewis/snowboardkids2-decomp) and see if you can beat the LLMs!*

*Something to say? You can upvote and/or join [the discussion on Hacker News](#).*

[^1]: Inspired by Anand Chowdhary's post on [running Claude Code in a loop](https://anandchowdhary.com/blog/2025/running-claude-code-in-a-loop).
[^3]: Why didn't I update the prompt to reflect this? Because it made Claude confused and it stopped committing changes. LLMs are weird. This needs more experimentation.
[^4]: Progress is currently tracked on [decomp.dev](https://decomp.dev/cdlewis/snowboardkids2-decomp?mode=history). Before then, the [README.md](https://github.com/cdlewis/snowboardkids2-decomp/commit/f34cdb1c26ef64cd4627980d4f8753abe11f03c2) file was directly updated to reflect progress.


