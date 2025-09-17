extends Node

func _ready() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	sm.call("set_seed", 123456)
	gs.call("set_session_config", "balancedpro_balanced", "balancedpro_balanced", 1)
	gs.call("new_session", 123456, 2, 1)
	var seq := [
		{"off":"PASS_SHORT","def":"PASS_SHELL"},
		{"off":"INSIDE_POWER","def":"RUN_BLITZ"},
		{"off":"DEEP_POST","def":"PRESS_MAN"},
		{"off":"SCREEN","def":"ZONE_BLITZ"},
		{"off":"DRAW","def":"BALANCED"},
		{"off":"QUICK_SLANT","def":"RUN_BLITZ"},
		{"off":"PA_SHORT","def":"BALANCED"},
		{"off":"MEDIUM_CROSS","def":"PASS_SHELL"},
		{"off":"PA_DEEP","def":"BALANCED"},
		{"off":"QB_SNEAK","def":"PREVENT"},
		{"off":"INSIDE_POWER","def":"PASS_SHELL"},
		{"off":"PUNT","def":"BALANCED"},
		{"off":"PASS_SHORT","def":"ZONE_BLITZ"},
		{"off":"PASS_LONG","def":"RUN_BLITZ"},
		{"off":"FIELD_GOAL","def":"BALANCED"},
		{"off":"RUN_OUT","def":"BALANCED"},
		{"off":"PASS_SHORT","def":"PRESS_MAN"},
		{"off":"DEEP_POST","def":"PREVENT"},
		{"off":"SCREEN","def":"RUN_BLITZ"},
		{"off":"PASS_SHORT","def":"PASS_SHELL"}
	]
	var out: Array = []
	for step in seq:
		var o: Dictionary = rules.call("resolve_play", String(step["off"]), String(step["def"]), int(gs.ball_on), int(gs.offense_dir))
		rules.call("apply_outcome", gs, o)
		out.append({
			"event_name": String(o.get("event_name","")),
			"yards_delta": int(o.get("yards_delta",0)),
			"big_play": bool(o.get("big_play", false)),
			"clock": String(gs.call("get_clock_text"))
		})
	print(JSON.stringify(out))
	get_tree().quit()


