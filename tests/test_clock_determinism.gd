extends Node

func test_same_seed_same_clock_and_rng_calls() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	
	sm.set_seed(999)
	gs.new_session(999, 2, 1)
	var seq1_clock: Array = []
	var seq1_rng: Array = []
	for i in 8:
		var _before_rng: int = int(sm.get_rng_call_count())
		var o1: Dictionary = rules.resolve_play("QUICK_SLANT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o1)
		seq1_clock.append(int(gs.clock_remaining))
		seq1_rng.append(int(sm.get_rng_call_count()))
	
	sm.set_seed(999)
	gs.new_session(999, 2, 1)
	var seq2_clock: Array = []
	var seq2_rng: Array = []
	for i in 8:
		var _before_rng2: int = int(sm.get_rng_call_count())
		var o2: Dictionary = rules.resolve_play("QUICK_SLANT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o2)
		seq2_clock.append(int(gs.clock_remaining))
		seq2_rng.append(int(sm.get_rng_call_count()))
	
	print("SEQ1 CLOCK ", seq1_clock)
	print("SEQ2 CLOCK ", seq2_clock)
	print("SEQ1 RNG ", seq1_rng)
	print("SEQ2 RNG ", seq2_rng)
	assert(seq1_clock == seq2_clock)
	assert(seq1_rng == seq2_rng)
