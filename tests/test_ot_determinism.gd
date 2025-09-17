extends Node

func test_ot_determinism_seed_and_choices() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gs: Object = get_node("/root/GameState")
    var rules: Object = get_node("/root/Rules")

    # Run 1
    sm.set_seed(60606)
    gs.new_session(60606, 1, 1)
    gs.call("_prepare_overtime_entry")
    var w1 := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    var seq1: Array = []
    for i in 6:
        var o1: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
        rules.apply_outcome(gs, o1)
        seq1.append([String(o1.event_name), int(o1.yards_delta), int(gs.clock_remaining), int(sm.get_rng_call_count())])

    # Run 2
    sm.set_seed(60606)
    gs.new_session(60606, 1, 1)
    gs.call("_prepare_overtime_entry")
    var w2 := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    var seq2: Array = []
    for i in 6:
        var o2: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
        rules.apply_outcome(gs, o2)
        seq2.append([String(o2.event_name), int(o2.yards_delta), int(gs.clock_remaining), int(sm.get_rng_call_count())])

    assert(w1 == w2)
    assert(seq1 == seq2)


