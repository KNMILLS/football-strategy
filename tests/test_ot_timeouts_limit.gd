extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(40404)

func test_timeouts_limited_to_two_per_team() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(40404, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    assert(int(gs.call("ot_timeouts_remaining", 0)) == 2)
    assert(int(gs.call("ot_timeouts_remaining", 1)) == 2)
    assert(bool(gs.call("spend_ot_timeout", 0)) == true)
    assert(bool(gs.call("spend_ot_timeout", 0)) == true)
    assert(int(gs.call("ot_timeouts_remaining", 0)) == 0)
    assert(bool(gs.call("spend_ot_timeout", 0)) == false)


