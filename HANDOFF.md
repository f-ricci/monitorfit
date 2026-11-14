# Monitor fit: handoff notes

The prototype is `monitor-fit.html`: one file of plain JavaScript and inline SVG, no dependencies.
Live version: https://claude.ai/artifact/GSqV4RhXLPcTVMp7DqUtmR

## What it does
1. **Front view (2D):** a to-scale overlay of the selected monitor on a wall and desk measured from a photo. It shows how far the monitor is from the shelf and the door frame, a dashed outline of the current monitor, and three position modes (centred, pushed against the shelf, slide).
2. **Chair view (3D, drawn by hand):** a desk at 60, 70 or 80 cm deep, the stand footprint, curved panels at their true radius, and sight lines from the eyes to the screen. Readouts: eye-to-screen distance, how wide the screen looks in degrees, clear desk in front of the screen, and curve radius vs. distance.
3. **Where you look:** the panel is split into a grid and each cell is tinted by its angle from where you're looking (≤15° easy focus, 15–30° eyes only, >30° head turn). Click or drag on the screen, or use the sliders, to move it.

## How it works
- All units are millimetres. Coordinates: `x` runs left to right (0 is the original monitor's centre), `y` runs from the wall towards the user, `h` is height above the desk top.
- `P(x,y,h)`: projects a 3D point to 2D with a turn (`ist.yaw`) and a fixed downward tilt (`PITCH`, 32°).
- `box()` and `poly()` draw 3D shapes back to front (painter's order).
- Curved panels: the front face is a 24-piece arc. Bow at offset `u` from centre = `R - sqrt(R² - u²)`.
- Gaze: unit vector from the left/right and up/down angles; for each cell, `acos(dot(gaze, eye→cell))`.

## Values that are hard-coded and should become inputs
- Room (from the photo): `SHELF=-351`, `TRIM=331`, `DOOR=450` mm from the monitor's centre; monitor bottom edge `LIFT=92` mm above the desk.
- Assumptions: stand base 30 mm from the wall (`WALLGAP`), eyes 450 mm above the desk (`EYEH`), shelf 300 mm deep, screen face placed 60% of the stand depth forward.
- Monitor data lives in the `M` array: `bw/bh` = body without stand, `pw/ph` = panel, `sd` = stand depth, `R` = curve radius (0 = flat). Panel sizes marked as calculated (`est`) are worked out from diagonal and ratio.

## Ideas for the website version
- Monitor catalogue as JSON (model, body/panel/stand dimensions, radius, resolution, source link), plus a "custom monitor" form (diagonal + ratio + radius).
- Inputs for desk width and depth, obstacles left and right, eye height and seating distance; drop the room-specific shelf and door unless the user adds obstacles.
- A top-down view of the curve (the whiteboard had one).
- Shareable state in the URL, compare 2–3 monitors at once, and a mobile layout.
- Suggested stack: Vite + TypeScript, keeping the SVG renderer (it's small and fast); move the geometry into a pure `geometry.ts` with unit tests.
