extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(20202)

func test_safety_first_series_ends_immediately() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(20202, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    gs.call("ot_debug_end_possession", "SAFETY")
    assert(bool(gs.game_over))


