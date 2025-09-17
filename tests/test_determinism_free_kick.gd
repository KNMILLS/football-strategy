extends Node

func test_deterministic_free_kick_flow() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gs: Object = get_node("/root/GameState")
    var rules: Object = get_node("/root/Rules")

    # Run 1
    sm.set_seed(28282)
    gs.new_session(28282, 1, 1)
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o1: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o1)
    gs.call("try_select", "XP")
    gs.call("free_kick_select", "KICKOFF")
    var seq1 := [String(gs.get_spot_text()), int(gs.clock_remaining), int(sm.get_rng_call_count())]

    # Run 2 (same seed, same choices)
    sm.set_seed(28282)
    gs.new_session(28282, 1, 1)
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o2: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o2)
    gs.call("try_select", "XP")
    gs.call("free_kick_select", "KICKOFF")
    var seq2 := [String(gs.get_spot_text()), int(gs.clock_remaining), int(sm.get_rng_call_count())]

    assert(seq1 == seq2)


