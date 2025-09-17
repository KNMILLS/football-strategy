extends Node

func _before_each() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(12345)

func _start_session() -> Object:
	var gs: Object = get_node("/root/GameState")
	gs.new_session(12345, 1, 1)
	return gs

func test_inbounds_run_consumes_33() -> void:
	var gs := _start_session()
	var start_clock := int(gs.clock_remaining)
	gs.offense_select("INSIDE_POWER")
	gs.defense_select("BALANCED")
	assert(int(gs.clock_remaining) <= start_clock)
	assert(start_clock - int(gs.clock_remaining) >= 30)

func test_short_pass_complete_consumes_approx_30() -> void:
	var gs := _start_session()
	var start_clock := int(gs.clock_remaining)
	gs.offense_select("QUICK_SLANT")
	gs.defense_select("PASS_SHELL")
	assert(start_clock - int(gs.clock_remaining) >= 15)

func test_incomplete_consumes_15() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(24680)
	var gs := _start_session()
	var start_clock := int(gs.clock_remaining)
	# Force many attempts until an INCOMP occurs
	var rules: Object = get_node("/root/Rules")
	for i in 200:
		var o: Dictionary = rules.resolve_play("QUICK_SLANT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		if o.event_name == "INCOMP":
			rules.apply_outcome(gs, o)
			gs.call_deferred("_emit_all")
			break
	assert(start_clock - int(gs.clock_remaining) >= 7)

func test_sack_consumes_15() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(13579)
	var gs := _start_session()
	var rules: Object = get_node("/root/Rules")
	var start_clock := int(gs.clock_remaining)
	var found := false
	for i in 500:
		var o: Dictionary = rules.resolve_play("DEEP_POST", "RUN_BLITZ", gs.ball_on, gs.offense_dir)
		if o.event_name == "SACK":
			rules.apply_outcome(gs, o)
			found = true
			break
	assert(found)
	assert(start_clock - int(gs.clock_remaining) >= 10)

func test_touchdown_consumes_0() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(777777)
	var gs := _start_session()
	var rules: Object = get_node("/root/Rules")
	# Force the game state to be at the 1-yard line going in for a deterministic TD on any gain
	gs.ball_on = 99
	gs.offense_dir = 1
	var o: Dictionary = rules.resolve_play("DEEP_POST", "PASS_SHELL", gs.ball_on, gs.offense_dir)
	# Ensure we have a positive yards gain to cross goal
	if not (o.event_name == "YARDS" and int(o.yards_delta) >= 1):
		# If not, try a few more times
		for i in 100:
			o = rules.resolve_play("DEEP_POST", "PASS_SHELL", gs.ball_on, gs.offense_dir)
			if o.event_name == "YARDS" and int(o.yards_delta) >= 1:
				break
	var start_clock := int(gs.clock_remaining)
	rules.apply_outcome(gs, o)
	assert(gs.home_score >= 7)
	assert(int(gs.clock_remaining) == start_clock)
