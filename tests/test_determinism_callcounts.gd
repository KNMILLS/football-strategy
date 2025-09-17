extends Node

func test_rerun_same_seed_same_calls() -> void:
	var sm := get_tree().root.get_node("/root/SeedManager")
	var rules := get_tree().root.get_node("/root/Rules")
	sm.set_seed(777777)
	var _c0: int = sm.get_rng_call_count()
	var seq := [
		["INSIDE_POWER", "RUN_BLITZ"],
		["QUICK_SLANT", "PRESS_MAN"],
		["SCREEN", "ZONE_BLITZ"],
		["DEEP_POST", "PREVENT"],
		["PUNT", "BALANCED"],
		["FIELD_GOAL", "PASS_SHELL"]
	]
	for s in seq:
		rules.resolve_play(String(s[0]), String(s[1]), 45, 1)
	var c1: int = sm.get_rng_call_count()
	# Replay
	sm.set_seed(777777)
	for s2 in seq:
		rules.resolve_play(String(s2[0]), String(s2[1]), 45, 1)
	var c2: int = sm.get_rng_call_count()
	assert(c1 == c2)


