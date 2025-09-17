extends Node

func test_coin_flip_and_kickoff_deterministic() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gs: Object = get_node("/root/GameState")
    # Run 1
    sm.set_seed(616161)
    gs.new_session(616161, 1, 1)
    gs.call("prepare_regulation_coin_toss")
    var winner1: int = int(gs.call("perform_coin_toss", true))
    var choice := "RECEIVE"
    gs.call("enter_regulation_with_choice", String(choice))
    var seq1 := [int(winner1), String(gs.get_spot_text()), int(gs.clock_remaining), int(sm.get_rng_call_count())]
    # Run 2 same seed
    sm.set_seed(616161)
    gs.new_session(616161, 1, 1)
    gs.call("prepare_regulation_coin_toss")
    var winner2: int = int(gs.call("perform_coin_toss", true))
    gs.call("enter_regulation_with_choice", String(choice))
    var seq2 := [int(winner2), String(gs.get_spot_text()), int(gs.clock_remaining), int(sm.get_rng_call_count())]
    assert(seq1 == seq2)


