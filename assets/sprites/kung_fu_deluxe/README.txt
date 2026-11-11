+====================================================================+
|  KUNG FU PLATFORMER CHARACTER [22x22] — README (DELUXE VERSION)    |
+====================================================================+

ANIMATION LIST (per skin)
----------------------------------------------------------------------
- Design loop - 1 frame
- Idle - 14 frames
- Jump (Standing) - 15 frames (folder with sub-clips)
    - Hop - 6 frames
    - Fall - 3 frames
    - Fall Loop - 3 frames
    - Land - 3 frames
- Run - 8 frames
- Jump (Running) - 19 frames (folder with sub-clips)
    - Hop - 7 frames
    - Fall - 3 frames
    - Fall Loop - 3 frames
    - Land Running - 2 frames
    - Land Standing - 4 frames
- Jeet Kune Do Fighting Stance - 8 frames
- Turn Over - 3 frames
- Side Kick - 7 frames
- Four-Punch Combo - 26 frames (folder with sub-clips)
    - Punch 1 - 4 frames
    - Punch 2 - 4 frames
    - Punch 3 - 4 frames
    - Punch 4 - 14 frames
- Hit - 5 frames
- Die - 11 frames
- Die Loop - 1 frame
- Disappear - 11 frames (each skin has a distinct version)
- Wood Substitution (loop) - 1 frame (exclusive to the Ninja skin)

DUST VFX (separate layer)
----------------------------------------------------------------------
Spawn contextually in your game engine. See the animated demos and the
Aseprite source file for placement.
- Dust - Run Step - 4 frames
- Dust - Jump (Standing) - 6 frames
- Dust - Jump (Running) - 6 frames
- Dust - Land (Standing) - 6 frames
- Dust - Front Step - 6 frames
- Dust - Die - 8 frames

DECOMPOSED CLIPS (per skin)
----------------------------------------------------------------------
For cleaner state handling in engines, these moves are provided as
separate sub-clips:
- Four-Punch Combo -> P1, P2, P3, P4
- Jump (Running) -> Hop, Fall, Fall Loop, Land Running, Land Standing
- Jump (Standing) -> Hop, Fall, Fall Loop, Land

TIMING ACCENTS
----------------------------------------------------------------------
Default frame time: 80 ms.
For extra snap, set the frames below to 40 ms:
- Jump (Running): first 3 frames (Hop)
- Punch 1, 2, 3: last frame of each
- Punch 4: frames 8-10 (post-impact "arm vibration")
