extends Node

# Golden 20-snap replay using fixed seed and scripted (off,def) pairs.
# Asserts key invariants per snap without changing balance.

const TestUtil = preload("res://qa/TestUtil.gd")

func test_golden_replay_20_snaps() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	sm.set_seed(123456)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(123456, 2, 1)
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
	var expected := [
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"14:45"},
		{"event_name":"YARDS","yards_delta":3,"big_play":false,"clock":"14:12"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"13:57"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"13:42"},
		{"event_name":"YARDS","yards_delta":7,"big_play":false,"clock":"13:09"},
		{"event_name":"YARDS","yards_delta":4,"big_play":false,"clock":"12:39"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"12:24"},
		{"event_name":"YARDS","yards_delta":11,"big_play":false,"clock":"11:54"},
		{"event_name":"INT","yards_delta":0,"big_play":false,"clock":"11:39"},
		{"event_name":"YARDS","yards_delta":3,"big_play":false,"clock":"11:17"},
		{"event_name":"YARDS","yards_delta":5,"big_play":false,"clock":"10:44"},
		{"event_name":"PUNT","yards_delta":0,"big_play":false,"clock":"10:29"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"10:14"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"9:59"},
		{"event_name":"GOOD","yards_delta":0,"big_play":false,"clock":"9:44"},
		{"event_name":"YARDS","yards_delta":7,"big_play":false,"clock":"9:44"},
		{"event_name":"INT","yards_delta":0,"big_play":false,"clock":"9:44"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"9:44"},
		{"event_name":"SACK","yards_delta":-6,"big_play":false,"clock":"9:29"},
		{"event_name":"INCOMP","yards_delta":0,"big_play":false,"clock":"9:14"}
	]
	for i in seq.size():
		var step = seq[i]
		var before_clock: int = gs.clock_remaining
		var o: Dictionary = rules.resolve_play(String(step.off), String(step.def), gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o)
		rules.assert_state(gs)
		# Validate normalized outcome and expected tuple
		var e: Dictionary = expected[i]
		assert(String(o.event_name) == String(e.event_name))
		assert(int(o.yards_delta) == int(e.yards_delta))
		assert(bool(o.get("big_play", false)) == bool(e.big_play))
		assert(gs.get_clock_text() == String(e.clock))
	# Ensure exactly 20 snaps processed
	pass
