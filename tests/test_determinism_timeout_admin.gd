extends Node

func test_timeout_admin_does_not_change_outcomes_or_rng_calls() -> void:
	var sm := get_tree().root.get_node("/root/SeedManager")
	var gs := get_tree().root.get_node("/root/GameState")
	var rules := get_tree().root.get_node("/root/Rules")

	# Baseline sequence
	sm.set_seed(55555)
	gs.new_session(55555, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w1 := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	var seq1: Array = []
	for i in 5:
		var o: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o)
		seq1.append([String(o.event_name), int(o.yards_delta), int(gs.clock_remaining)])
	var c1 := int(sm.get_rng_call_count())

	# Same seed with inserted pre-snap timeouts between each snap
	sm.set_seed(55555)
	gs.new_session(55555, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w2 := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	var seq2: Array = []
	for i in 5:
		# Spend timeout if available
		var idx := int(0 if bool(gs.get("offense_is_home")) else 1)
		var _ok := bool(gs.call("spend_reg_timeout", idx))
		var o2: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o2)
		seq2.append([String(o2.event_name), int(o2.yards_delta), int(gs.clock_remaining)])
	var c2 := int(sm.get_rng_call_count())

	assert(seq1 == seq2)
	assert(c1 == c2)


