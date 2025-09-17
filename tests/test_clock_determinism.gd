extends Node

func determinism_smoke_same_seed_outcomes_match() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	
	# First run
	sm.set_seed(999)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(999, 1, 1)
	var seq1_outcomes: Array = []
	for i in 8:
		var _before_rng: int = int(sm.get_rng_call_count())
		var o1: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o1)
		seq1_outcomes.append([String(o1.event_name), int(o1.yards_delta), int(gs.clock_remaining), int(sm.get_rng_call_count())])
	
	# Second run
	sm.set_seed(999)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(999, 1, 1)
	var seq2_outcomes: Array = []
	for i in 8:
		var _before_rng2: int = int(sm.get_rng_call_count())
		var o2: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o2)
		seq2_outcomes.append([String(o2.event_name), int(o2.yards_delta), int(gs.clock_remaining), int(sm.get_rng_call_count())])
	
	print("D1 ", seq1_outcomes)
	print("D2 ", seq2_outcomes)
	assert(seq1_outcomes == seq2_outcomes)
