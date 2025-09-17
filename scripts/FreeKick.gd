extends Node

class_name FreeKick

var cfg: Dictionary = {}

func _ready() -> void:
	_load_cfg()

func _sm() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/SeedManager")

func _gs() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/GameState")

func _load_cfg(path: String = "res://data/free_kick.json") -> void:
	var txt := FileAccess.get_file_as_string(path)
	if txt == null or txt == "":
		push_error("FreeKick: failed to read %s" % path)
		cfg = {}
		return
	var data: Variant = JSON.parse_string(txt)
	if typeof(data) != TYPE_DICTIONARY:
		push_error("FreeKick: invalid JSON in %s" % path)
		cfg = {}
		return
	cfg = data as Dictionary
	# Optional schema guard
	var sg := load("res://scripts/SchemaGuard.gd")
	if sg != null and sg.has_method("require"):
		sg.call("require", cfg, "1.0", "free_kick.json")

static func _make_outcome(base: Dictionary) -> Dictionary:
	return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", base)

func resolve_try_kick_xp(_unused_state: Object) -> Dictionary:
	# XP is treated as fixed-distance hash FG; use configured base make percentage
	var pct: float = float(((cfg.get("try", {}) as Dictionary).get("xp_hash", {}) as Dictionary).get("base_make_pct", 0.93))
	var good: bool = _sm().chance(pct)
	var out := {
		"event_name": ("GOOD" if good else "MISS"),
		"descriptive_text": ("XP Good (1)" if good else "XP No Good"),
		"timing_tag": "FIELD_GOAL_ATTEMPT",
		"turnover": false,
		"yards_delta": 0,
		"ended_inbounds": true
	}
	# Apply score side-effects outside via caller
	return _make_outcome(out)

func resolve_try_two_point(_unused_state: Object) -> Dictionary:
	var base_pct: float = float(((cfg.get("try", {}) as Dictionary).get("two_point", {}) as Dictionary).get("base_success_pct", 0.48))
	var success: bool = _sm().chance(base_pct)
	var def_return: bool = false
	if not success:
		# Tiny chance defense returns a turnover for 2
		def_return = _sm().chance(0.025)
	var text := "Two-Point Good (2)" if success else ("Two-Point Fail" if not def_return else "Defense returns Try for 2!")
	var out := {
		"event_name": ("GOOD" if success else ("DEFENSE_TWO" if def_return else "FAIL")),
		"descriptive_text": text,
		"timing_tag": "FIELD_GOAL_ATTEMPT",
		"turnover": false,
		"yards_delta": 0,
		"ended_inbounds": true
	}
	return _make_outcome(out)

func resolve_kickoff(_kicking_is_home: bool, _trailing_kicking_team: bool) -> Dictionary:
	var kcfg := (cfg.get("kickoff", {}) as Dictionary)
	var buckets: Array = kcfg.get("buckets", [])
	var options: Array = []
	for b in buckets:
		options.append([b, int((b as Dictionary).get("weight", 1))])
	var pick: Variant = _sm().weighted_choice(options)
	var out_id := ""
	var text := "Kickoff"
	var new_spot_text := "B25"
	var timing_tag := "KICKOFF_RESOLVED"
	if pick == null:
		out_id = "TOUCHBACK_ENDZONE"
	else:
		out_id = String((pick as Dictionary).get("id", ""))
	if out_id == "TOUCHBACK_ENDZONE":
		new_spot_text = "B30"
		timing_tag = "KICKOFF_TOUCHBACK"
		text = "Touchback to B30"
	elif out_id == "OUT_OF_BOUNDS":
		new_spot_text = "B40"
		text = "Kickoff out of bounds – B40"
	elif out_id == "ENDZONE_RETURN":
		new_spot_text = "B25"
		text = "Kickoff returned to B25"
	else:
		# Landing zone with average return and small deterministic jitter
		var avg_ret: int = int((pick as Dictionary).get("avg_return", 18))
		var jitter: int = _sm().randi_range(-3, 3)
		var clamped: int = int(clamp(20 + int(avg_ret + jitter) - 20, 0, 10))
		new_spot_text = "B%d" % int(20 + clamped)
		text = "Kickoff return to %s" % new_spot_text
	var out := {
		"event_name": "KICKOFF",
		"descriptive_text": text,
		"timing_tag": timing_tag,
		"new_series_spot_text": new_spot_text
	}
	return _make_outcome(out)

func resolve_onside(_trailing_only: bool) -> Dictionary:
	var ocfg := (cfg.get("onside", {}) as Dictionary)
	var p: float = float(ocfg.get("base_success_pct", 0.12))
	var success: bool = _sm().chance(p)
	var text := "Onside recovered!" if success else "Onside fails."
	var out := {
		"event_name": "ONSIDE",
		"descriptive_text": text,
		"timing_tag": "KICKOFF_RESOLVED",
		"onside_success": success,
		"success_spot_text": "A48",
		"fail_spot_text": String(ocfg.get("penalty_fail_spot", "A45"))
	}
	return _make_outcome(out)

static func spot_text_to_ball_on(spot_text: String, receiving_is_home: bool, kicking_is_home: bool) -> int:
	# spot_text like "B30" (receiving team own 30) or "A45" (kicking team own 45)
	if spot_text.length() < 2:
		return 25
	var side := spot_text.left(1)
	var num_str := spot_text.substr(1, spot_text.length() - 1)
	var yards := int(num_str.to_int())
	var base_is_home := receiving_is_home if side == "B" else kicking_is_home
	return int(yards if base_is_home else (100 - yards))


