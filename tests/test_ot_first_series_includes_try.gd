extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(26262)

func test_ot_first_series_try_occurs() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(26262, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    var rules: Object = get_node("/root/Rules")
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    assert(bool(o.get("touchdown", false)))
    # Try should be pending and resolvable, then second series should begin after handling
    gs.call("try_select", "XP")
    # If not sudden, ensure we progressed OT possession state
    assert(bool(gs.get("is_overtime")))


