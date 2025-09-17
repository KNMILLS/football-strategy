extends Node

func test_timeout_consumes_zero_seconds_between_snaps() -> void:
	var sm := get_tree().root.get_node("/root/SeedManager")
	var gs := get_tree().root.get_node("/root/GameState")
	var rules := get_tree().root.get_node("/root/Rules")
	sm.set_seed(22222)
	gs.new_session(22222, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	# Run one play
	var o1: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
	rules.apply_outcome(gs, o1)
	var before_clock := int(gs.clock_remaining)
	var before_rng := int(sm.get_rng_call_count())
	# Spend timeout pre-snap
	var offense_idx := int(0 if bool(gs.get("offense_is_home")) else 1)
	var ok := bool(gs.call("spend_reg_timeout", offense_idx))
	assert(ok)
	# No clock consumption and no RNG calls
	assert(int(gs.clock_remaining) == before_clock)
	assert(int(sm.get_rng_call_count()) == before_rng)
	# Next play runs normally
	var o2: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
	rules.apply_outcome(gs, o2)
	assert(int(gs.clock_remaining) < before_clock)


