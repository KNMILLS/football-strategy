extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gc: Object = get_node("/root/GameConfig")
    sm.set_seed(7777)
    gc.call("set_quarter_preset", "STANDARD")

func _start_ot() -> Object:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(7777, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    return gs

func test_fg_then_td_b_wins() -> void:
    var gs := _start_ot()
    var _first_team := int(gs.ot_first_pos_team)
    # First series FG by A
    gs.call("ot_debug_end_possession", "FG")
    assert(String(gs.ot_possession_stage) == "SECOND")
    # Second series TD by B → wins immediately
    gs.call("ot_debug_end_possession", "TD")
    assert(bool(gs.game_over))
    var winner := 0 if int(gs.home_score) > int(gs.away_score) else 1
    assert(winner == int(gs.ot_second_pos_team))

func test_td_then_td_enters_sudden() -> void:
    var gs := _start_ot()
    # First series TD by A
    gs.call("ot_debug_end_possession", "TD")
    assert(String(gs.ot_possession_stage) == "SECOND")
    # Second series TD by B → sudden
    gs.call("ot_debug_end_possession", "TD")
    assert(String(gs.ot_possession_stage) == "SUDDEN")
    assert(not bool(gs.game_over))


