Gridiron Strategy Animator

API
- initField(rootEl, { showDebug=false })
- loadPlays(jsonOrUrl)
- animatePlay({ offensePlayId, defenseCard, ballOnYard, yardsToGo, down, seed=1, speed=1 })
- stop()
- replayLast(seconds=3, speed=0.5)
- on(eventName, handler) where eventName in ["snap","handoff","throw","catch","drop","intercept","tackle","whistle","result"]

Coordinate transform
- JSON uses normalized coords with offense moving +y.
- Broadcast conversion (offense drives right):
  toScreen(px, py):
    sx = lerp(py, 0, 1, losX, losX + usableWidth)
    sy = lerp(1 - px, 0, 1, topBoundY, bottomBoundY)
    where losX = fieldWidth * (ballOnYard / 100), usableWidth = fieldWidth - losX.

Usage
- main.js dynamically imports scripts/gs_animator.js at startup, loads play_art_animations_autogen_min.json, and wires on() to #log.
- When a card is played, the card id (e.g., Pro_Style_PowerUpMiddle) is mapped to the JSON key (PRO_STYLE_POWER_UP_MIDDLE) and passed to animatePlay.

Testing
- Call from console: window.animateTest('PRO_STYLE_POWER_UP_MIDDLE', 'Running', 25, 10, 1, 12345)


