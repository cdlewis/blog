+++
title = "Common Failure Patterns in Recompilations"
date = "2026-10-03T11:42:27-07:00"

#
# description is optional
#
# description = "An optional description for SEO. If not provided, an automatically created summary will be used."
draft = true
tags = []
+++

**TLDR; [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp/releases) is available for Windows, Mac and Linux!**

Following the [decompilation of Snowboard Kids](/decompiling-a-nintendo-64-game-in-84-days/), I’ve been working on recompiling the game for modern hardware. Today I’m pleased to announce the release of Snowboard Kids: Recompiled!

This was far from a solo effort. I’d like to thank the members of the community who helped make this release possible.

* Moz Lunsford from the Snowboard Kids Discord for his amazing launcher image.
* [Darío](https://github.com/DarioSamo) for his help and advice throughout the recompilation effort.[^11]
* Everyone who helped with the decompilation, particularly [inspectredc](https://github.com/inspectredc), [Bl00D4NGEL](https://github.com/Bl00D4NGEL), and [queueRAM](https://github.com/queueRAM).
* Everyone who tested the pre-release builds, especially [McGyna](https://twitch.tv/McGyna). He played through the game extensively and sent me around 15 videos of bugs and glitches, which were invaluable when tracking down the problems.

![screenshot of the Snowboard Kids: Recompiled launcher](/snowboard-kids-launcher.png "Launcher artwork by Moz Lunsford.")

## Features

_Snowboard Kids: Recompiled_ supports widescreen and ultrawide displays, high frame rates, configurable controls, mods and so much more.

The game also includes a few simple mods to serve as inspiration:

* **Mod Example:** available as a [template on Github](https://github.com/cdlewis/snowboardkids-recomp-mod-template), this is a great starting point if you’re looking to create your own mod. It gives you unlimited parachutes and fans for good measure.
* **Quick Start:** at some point I got tired of watching the opening credits while testing the recomp. Skip straight to the title screen.
* **Nepo Kids:** takes place in an alternate reality where the kids had wealthy parents. Start the game with all content unlocked.[^888]
* **No Rubber Banding:** there’s no worse feeling than building a massive lead only to have the AI inexplicably catch up and overtake you.

![screenshot of the mod menu](/mod-menu.png "The bundled example mod keeps player one supplied with an umbrella and fan. Perfect for multiplayer.")

There are also some less conspicuous quality-of-life improvements. Saves are handled directly by the recompilation, avoiding the hassle of a virtual controller pack and allowing us to streamline the game menus in the process.

### Local Multiplayer

Local multiplayer is supported for up to four players, including high frame rates and a choice of vertical or horizontal splits for two-player races.

![screenshot of split-screen multiplayer](/split-screen.png "Two-player races default to a vertical split.")

Behind the scenes, both Snowboard Kids recompilations share a fork of [RecompFrontend](https://github.com/cdlewis/RecompFrontend). This provides the launcher, settings, and controller configuration, with some additional work on theming and (in my opinion) a smoother multiplayer controller assignment flow.

![screenshot of controller assignment for a four-player game](/pair-controllers.gif "Each player presses a button on their controller to claim a slot. The keyboard can also be assigned to a player.")

I’d like to upstream some of these changes eventually. Multiplayer support is a relatively new [RecompFrontend](https://github.com/N64Recomp/RecompFrontend) feature though and I don’t expect there to be much agreement on the best design until more projects start using it.

If, like me, you’re more of a _Snowboard Kids 2_ person, its multiplayer support is [also available](https://github.com/cdlewis/snowboardkids2-recomp/releases) as an alpha release.

## Common Problems

Aside from the ever-present need to tag models[^533] 

There were a number of common patterns in the way things failed across the two recompilations.

Having already recompiled the sequel, I expected the original game to be fairly straightforward. I recognised more of the problems and knew where to start looking, but that didn’t translate into needing fewer patches. The recurring lesson was that the renderer can do a lot automatically, but it can’t always infer what the game intended.

At the time of writing, the first game’s patch directory contains roughly 8,300 lines of C across 31 files, compared with about 5,100 lines across 16 files for the sequel.[^1] Lines of code are a terrible measure of difficulty, but they give some indication of how much game-specific work remained after the basic recompilation was running.

Some of this is the unglamorous work of teaching the renderer what belongs together. To interpolate a moving object correctly, RT64 needs to associate its graphics with the same object in the previous frame. That becomes more complicated when objects appear and disappear, the camera changes suddenly, or several players are looking at the same scene through different viewports.

The patches therefore cover things as specific as snow spray, projectiles, board previews, and the lift exit bar. These are small pieces of the game individually, but you encounter them constantly while playing. Getting the main character moving smoothly is only the beginning.

### Camera Interpolation

RT64 can draw extra frames between those produced by the original game, giving it that smooth 60 FPS feel. This works nicely until it smooths out something that was supposed to change instantly. Both games had this problem with their cameras. In SBK1’s opening cutscene, the camera cuts between different CPU racers, jumping to a new position and angle.[^91] RT64 interpolates across that jump, turning what should be a clean cut into a brief, glitchy camera sweep.

![The opening demo sequence showing interpolation of frames that should be a clean camera cut.](/interpolation-example.webp "The opening demo sequence showing interpolation of frames that should be a clean camera cut.")

The solution is to tell RT64 when to stop interpolating. In the sequel’s [camera patch](https://github.com/cdlewis/snowboardkids2-recomp/blob/main/patches/render_frame_projection_tagging.c), each viewport keeps its own previous camera orientation. A change of more than 20 degrees between game frames is treated as a cut, and the patch tells RT64 to use the new camera transform immediately. Ordinary movement continues to interpolate. Keeping that history separate for each viewport also prevents one player’s camera change from affecting everyone else.

That threshold is a heuristic, though. A fast, continuous pan can turn a long way without being a cut. The first game’s camera-cut code therefore also checks the camera mode and update function, allowing its scripted flybys to turn quickly without snapping. That detection is currently disabled in the local build, so it isn’t an active fix there yet.[^camera-cuts] The broader lesson is that smooth movement and deliberate discontinuities need different treatment, even when they use the same drawing code.

### Texture Rendering

Sprites can develop stray edges, repeated slivers of artwork, or uneven scaling when a game is rendered at higher resolutions. The image itself can be perfectly fine. The problem is in how the game tells the renderer to read it.

The coin and position indicator below show the sort of defect I ran into in Snowboard Kids. Both have a thin strip of artwork appearing again beyond their right edge.

![Close-ups of the coin and second-place indicator with stray strips of artwork at their right edges](/sprite-clip-example.png "Stray strips of artwork beside the coin and position indicator.")

At a higher resolution, the renderer has to fill more screen pixels using the same small source image. A 16×16 texture might now cover 64×64 screen pixels. Rather than simply enlarging a finished frame, RT64 samples the texture at additional positions, including near its edges. That can expose assumptions which happened to work at the original resolution. This is a recurring issue in N64 rendering, also described in Themaister’s [explanation of paraLLEl-RDP upscaling](https://www.libretro.com/index.php/parallel-rdp-how-the-upscaled-rendering-works/).[^resolution]

The fix is to make the sprite’s texture bounds and sampling coordinates agree with the artwork. The Snowboard Kids patches correct both, depending on the drawing function.

* **Keep the texture boundary within the image.** Several functions gave the texture-loading helper the width and height as its inclusive final coordinates. For a 16×16 image, the last column and row are 15, not 16. The helper also uses those bounds to decide where sampling must stop. The [bounds patch](https://github.com/cdlewis/snowboardkids-recomp/commit/d632718) changes the endpoints to `width - 1` and `height - 1`, so the renderer no longer treats the area beyond the artwork as part of the image.
* **Sample scaled images at the intended positions.** The scaled-sprite functions also needed a half-source-pixel adjustment to their sampling origin, plus a correction to the sampling offset when part of a shrunken sprite was clipped away. The [sampling patch](https://github.com/cdlewis/snowboardkids-recomp/blob/729ef6f18ba16031603d4b822bb743548ae1f42c/patches/sprite_texture_sampling.c) changes where those functions read the image, without changing its dimensions. The half-pixel adjustment accounts for the N64’s filtered coordinates identifying pixel centres rather than edges, a convention documented in [Nintendo’s manual](https://ultra64.ca/files/documentation/online-manuals/man-v5-1/pro-man/pro13/13-07.htm#05-03).

These are different settings in the same drawing process, and a function can need both corrections. The HUD screenshot illustrates the visible problem, but doesn’t isolate which correction fixes it.[^hud-texture-bounds] When investigating an edge artefact, check both where the texture is allowed to end and where the drawing code actually samples it. Moving the samples won’t repair an oversized boundary, and shrinking the boundary won’t correct misaligned samples.

### Widescreen

Widescreen follows a similar pattern. RT64, the renderer used by the recompilation, already does much of the work for ordinary 3D scenes. It adjusts the camera projection so a wider display shows more of the world to the left and right while keeping objects in proportion. At the same height, moving from 4:3 to 16:9 gives us a view a third wider. The scenery can fill that space because it already exists in 3D, provided the game still submits it for drawing.

The awkward cases are the parts left inside a 4:3 frame. RT64’s [automatic projection adjustment](https://github.com/rt64/rt64/blob/main/src/render/rt64_projection_processor.cpp) looks at the viewport, the area the camera renders into, together with the scissor, the rectangle that clips drawing. It checks whether that visible region spans the full width of the framebuffer’s combined scissor bounds. Small differences in how a game defines those edges can stop a view from qualifying for automatic widening.

Snowboard Kids 2 provides a concrete example. Some of its full-screen camera bounds end at 319 and 239, and others leave a small border around the picture. The [widescreen patch](https://github.com/cdlewis/snowboardkids2-recomp/blob/main/patches/widescreen.c) makes those intended full-screen views reach the full 320×240 boundary and updates the clipping limits to match. Smaller framed views retain their own bounds. This is a compatibility adjustment for RT64’s edge tests, not evidence that leaving a border was a mistake on the N64.

Two-dimensional artwork presents a different problem. Pulling back a camera won’t reveal more of a menu background that consists of one fixed image. We’d have to stretch it, leave borders, or supply new artwork. The way the image is assembled matters too. An [RT64 report for Mystical Ninja Starring Goemon](https://github.com/rt64/rt64/issues/28) describes automatic widescreen handling missing backgrounds made from several rectangles because each rectangle covers only part of the screen.

Repeating patterns give us a more useful option. We can fill the extra space by drawing more tiles.

The scrolling background in _Snowboard Kids_ is made from repeating tiles. There’s no shortage of artwork to fill a wider screen, but simply stretching the original image would make every tile wider too. We want to draw more of the pattern while keeping the tiles themselves in proportion.

For this backdrop, we need separate control over the rectangles carrying the artwork and the scissor that clips them. Anything outside the scissor is discarded, regardless of how much extra artwork we submit.

If the scissor stays within the old 4:3 area, drawing additional tiles achieves very little. They’re still clipped away. Stretching both the rectangles and the scissor fills the screen, but distorts the pattern. What we need is to widen the clipping window independently of the artwork.

![Game Menu at 4:3 with the widescreen backdrop patch disabled](/widescreen-menu.png "The original 4:3 menu layout, captured in the recompilation with the widescreen backdrop extension disabled.")

Darío added an [RT64 command for controlling the scissor’s aspect ratio](https://github.com/rt64/rt64/commit/0946af0c1ee1b45214380e6e07e2bcdb4fb8b5df) along with some example code. This is yet to land on RT64’s `main` branch as of writing. The Snowboard Kids backdrop now uses the same combination.

```c
// Preserve the rectangles’ proportions and widen the clipping window.
gEXSetRectAspect(gRegionAllocPtr++, G_EX_ASPECT_ADJUST);
gEXSetScissorAspect(gRegionAllocPtr++, G_EX_ASPECT_STRETCH);

// Draw the scrolling backdrop, including the additional tiles.
drawMenuTilemapSprite(/* ... */);

// Restore the normal behaviour for subsequent menu elements.
gEXSetRectAspect(gRegionAllocPtr++, G_EX_ASPECT_AUTO);
gEXSetScissorAspect(gRegionAllocPtr++, G_EX_ASPECT_AUTO);
```

This is an abbreviated version of the patch. RT64 records the scissor setting with the draw call and uses it when converting the clipping rectangle to output coordinates. The artwork can therefore retain its proportions while the scissor covers the full display. Resetting both settings afterwards keeps this treatment confined to the backdrop.

There’s another wrinkle. Imagine keeping the original 320×240 coordinate system centred within a 16:9 display. At the same height, the visible area is now roughly 427 units wide, extending from about x = −53 to x = 373. Some of our new tiles need to begin at negative coordinates.

The original [N64 texture-rectangle command](https://ultra64.ca/files/documentation/online-manuals/man-v5-2/allman52/n64man/gsp/gSPTextureRectangle.htm) can’t represent negative screen coordinates. RT64’s extended `gEXTextureRectangle` command can, so the patch can submit tiles beyond the original screen edges and let the wider scissor clip them. This extended rectangle command already existed; Darío’s new addition was the independent scissor-aspect control.

The game still has to produce those extra tiles. The patch widens the backdrop’s drawing loop and wraps its texture lookup into the repeating pattern, preserving the scroll position. Widening a scissor won’t conjure up geometry the game never submitted, unfortunately.

There was also a small seam fix. Each background tile overlaps the next by one native pixel, which guards against RT64’s scissor-edge correction opening a gap. The texture step and tile spacing stay unchanged, and the next tile draws over the overlap. The pattern therefore keeps its original proportions.

## Testing

Testing all of this manually quickly becomes tedious. There are three HUD modes, several screen shapes, and five basic race layouts when you include single player, both two-player splits, and three- and four-player races. A HUD adjustment that looks correct in single player can still put another player’s lap counter outside their viewport.

To make this manageable, I created a [test harness](https://github.com/cdlewis/snowboardkids2-recomp-validation-suite) that launches the game, sends a scripted sequence of inputs, and captures screenshots at specified points. The sequences describe what should be visible in each capture, such as an active race with all four player panels correctly aligned.

The helper also applies the requested window size and HUD mode, keeps the captures grouped by run, and produces reports with the screenshots and their written expectations. For closer inspection, it can include crops of individual viewports and HUD details. That saves a lot of opening files and trying to remember which settings produced them.

![diagram of the automated gameplay testing workflow](/snowboard-kids-testing.svg#darksafe "Scripted inputs run inside a UTM virtual machine. Captures are checked against the expected scene and layout, with fixes followed by another run.")

The tests run in a macOS virtual machine using UTM. This turned out to be particularly useful because the harness could press buttons and navigate menus inside the guest while I continued working on the host. Otherwise, automated gameplay testing has the unfortunate side effect of commandeering the computer you’re trying to use.

![25 test captures covering five player layouts and different HUD settings](/snowboard-kids-test-gallery.png "A selection from the harness’s development runs, combined into a 5×5 overview. Each row uses a different player layout; the columns vary the window shape and HUD setting.")

The current Snowboard Kids configuration covers five race layouts at two screen shapes and three HUD settings, producing 30 combinations. Each sequence can capture several stages, so that’s already more than 30 images to inspect. Having the screenshots collected together makes it much easier to spot inconsistencies. Instead of trying to remember where an item icon sat in the previous run, I can compare the same layout across settings.

LLMs were particularly helpful here because they could run the sequences and inspect the resulting images against the written expectations. A screenshot comparison can tell you that pixels have changed, but a live race is supposed to change. The more useful questions are whether the test reached the intended scene, whether every player’s view is present, and whether the HUD is positioned correctly.

Codex’s image understanding has become rather uncanny. Given those written expectations, it could generally identify what was wrong without me having to point to the offending part of the screenshot. Very small details still tripped it up, such as the race tracker not being perfectly aligned with the divider. Those needed a closer look.

This still needs care. A script finishing successfully doesn’t mean it reached the race, and a plausible-looking screenshot doesn’t prove that the particular effect being tested was visible. The capture needs to show the relevant state before it can tell us anything about the patch.

Automating the repetitive checks also doesn’t replace people actually playing the game. A screenshot can look fine while movement feels wrong, and a short scripted route will miss plenty of interactions between items, racers, and scenery. This is where the human testing was invaluable. McGyna’s recordings provided much longer stretches of gameplay and concrete examples of things going wrong, which made it considerably easier to investigate them.

## What Next?

For me, a break. I’ve spent a lot of time on these games, and the recent negativity surrounding the use of AI has also made me want to step back from the scene for a while. With both games now playable on modern platforms, this feels like a good point to do that. There’s still plenty that could be improved, but the original goals are complete.

For the games themselves, I’m excited to see what other people do next. Alongside the decompilations and recompilations, there’s been some very cool work by [Ch3Games](https://www.youtube.com/@Ch3Games-SBKD) on a _Snowboard Kids Definitive Edition_.

{{< youtube id="fRN-VPQgcGI" caption="Snowboard Kids: Definitive Edition trailer by Ch3Games. I am not associated/involved with this project." >}}

Modding is also much more approachable now. If you’re interested, take a look at the [example mod and template](https://github.com/cdlewis/snowboardkids-recomp-mod-template). Starting with a small change to an existing mechanic is a good way to learn how the game works, and any discoveries can feed back into better names and documentation in the decompilation.

It’s lovely to see this much activity around a series that’s been dormant for so long. If you love these games, come join us on the [Snowboard Kids Discord](https://discord.gg/bwQ85rUED). I’d love to see more people dip their toes in the water, whether that means making mods, investigating the original code, or just playing a few races.

**Download [Snowboard Kids: Recompiled](https://github.com/cdlewis/snowboardkids-recomp/releases)**

[^11]: At one point I woke up to 43 messages from him going into minute detail on everything I’d missed in an early alpha build 🫠.

[^1]: A snapshot of the local projects while writing this post, counting physical lines in the top-level `.c` files under `patches/`, including comments and blank lines. This excludes headers and changes to the runtime or frontend. Patched functions can also include substantial portions of the original decompiled code, so these totals shouldn’t be read as lines of entirely new logic.

[^resolution]: Higher-resolution rendering isn’t a concept unique to RT64. The N64 itself supported different resolutions, including [320×240 and 640×480](https://ultra64.ca/files/documentation/online-manuals/man-v5-1/pro-man/pro29/29-01.htm). Here, RT64 is drawing Snowboard Kids at resolutions the original game wasn’t designed to use.

[^rubber-banding]: The original game’s rank-bonus table is `0, 0x8000, 0x10000, 0x20000`; the sequel’s is `-0x8000, 0, 0x8000, 0x10000`. The sequel also adds a distance-based adjustment, so the smaller fourth-place entry doesn’t mean all of its rubber banding is simply halved. See the [original’s player update](https://github.com/cdlewis/snowboardkids-decomp/blob/main/src/race/player/race_player_update.c) and the [sequel’s race update](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/src/race/race_main.c).

[^camera-cuts]: In the current [first-game patch](https://github.com/cdlewis/snowboardkids-recomp/blob/172e8ddda9d3534afdaeaa72ee5e7c221b11f3cb/patches/fade_overlay_widescreen.c), `viewportCameraRotationCut` computes the cut decision and then overrides it with `cut = 0`. The interpolation-skip machinery exists, but that override prevents it from being selected.

[^hud-texture-bounds]: The [single-player HUD patch](https://github.com/cdlewis/snowboardkids-recomp/blob/729ef6f18ba16031603d4b822bb743548ae1f42c/patches/race_hud_ratio.c) draws the coin and position indicator through `drawAssetTableSprite`. The original game’s [multiplayer HUD](https://github.com/cdlewis/snowboardkids-decomp/blob/main/src/race/ui/race_hud.c), in `drawMultiplayerRaceHud`, draws those elements through `drawScaledAssetTableSprite` at half size. The sprite patch changes the bounds in both routines and the sampling origin in the scaled routine. Identifying the artwork alone is therefore insufficient to identify the affected drawing path.

[^91]: The same problem came up in Snowboard Kids 2 when [holding R to look behind the character](https://github.com/cdlewis/snowboardkids2-decomp/blob/main/src/text/text_elements.c). That’s an abrupt change of view, not an instruction to animate the camera turning around. Any game with camera cuts can present this ambiguity. From two camera positions alone, the renderer can’t reliably tell whether it should fill in the journey between them.

[^888]: True fans of the series know that the Konami code already does this.
