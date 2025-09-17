class_name Timing
extends RefCounted

var cfg: Dictionary = {}

func load_cfg(path: String = "res://data/timing.json") -> void:
	var txt := FileAccess.get_file_as_string(path)
	if txt == null or txt == "":
		push_error("Timing: failed to read %s" % path)
		cfg = {}
		return
	var data: Variant = JSON.parse_string(txt)
	if typeof(data) != TYPE_DICTIONARY:
		push_error("Timing: invalid JSON in %s" % path)
		cfg = {}
		return
	cfg = data as Dictionary
	# Enforce schema
	var sg := load("res://scripts/SchemaGuard.gd")
	if sg != null and sg.has_method("require"):
		sg.call("require", cfg, "1.0", "timing.json")

func get_preset_seconds(preset: String) -> int:
	# Returns seconds for QUICK/STANDARD/FULL. Falls back to quarter_seconds/defaults.
	if cfg.is_empty():
		return 900
	var up := String(preset).to_upper()
	var presets := (cfg.get("quarter_presets", {}) as Dictionary)
	var val := int(presets.get(up, 0))
	if val > 0:
		return val
	return int(cfg.get("quarter_seconds", 900))

func is_two_minute(clock_remaining: int) -> bool:
	return int(clock_remaining) <= 120

func base_seconds(tag: String, clock_remaining: int) -> int:
	if cfg.is_empty():
		return 30
	if not is_two_minute(clock_remaining):
		return int((cfg.get("base_tc", {}) as Dictionary).get(tag, 30))
	var ticks := int(((cfg.get("two_minute_ticks", {}) as Dictionary).get("map", {}) as Dictionary).get(tag, 2))
	var spt := int(((cfg.get("two_minute_ticks", {}) as Dictionary).get("seconds_per_tick", 7)))
	return int(ticks * spt)

func apply_modifiers(sec: int, outcome: Dictionary) -> int:
	if bool(outcome.get("touchdown", false)):
		return 0
	var is_offense_big_play := bool(outcome.get("big_play", false)) and not bool(outcome.get("defense_td", false))
	if is_offense_big_play and bool(outcome.get("ended_inbounds", true)):
		sec += 5
	return max(sec, 0)

func consume_clock(state: Object, outcome: Dictionary) -> void:
	# state is GameState; must have clock_remaining
	if state == null or not state.has_method("get"): # defensive
		return
	var tag: String = String(outcome.get("timing_tag", ""))
	if tag == "":
		push_warning("Timing: Missing timing_tag on outcome")
		return
	var clock_remaining: int = int(state.clock_remaining)
	var sec := base_seconds(tag, clock_remaining)
	sec = apply_modifiers(sec, outcome)
	state.clock_remaining = max(clock_remaining - sec, 0)
