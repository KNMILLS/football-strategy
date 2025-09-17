extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(50505)

func test_tie_after_one_period() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(50505, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    # First and second series both FG → tie
    gs.call("ot_debug_end_possession", "FG")
    gs.call("ot_debug_end_possession", "FG")
    # Exhaust clock via scripted steady consumption
    gs.clock_remaining = 5
    var rules: Object = get_node("/root/Rules")
    var o: Dictionary = rules.resolve_play("INSIDE_POWER", "BALANCED", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    # After clock=0 and fair-possession complete and still tied, ends in tie
    assert(bool(gs.game_over))
    assert(String(gs.game_result_text).find("tie") >= 0)


