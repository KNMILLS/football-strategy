extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gc: Object = get_node("/root/GameConfig")
    sm.set_seed(12345)
    gc.call("set_quarter_preset", "QUICK")

func _start_ot_for_preset(preset: String) -> Object:
    var gs: Object = get_node("/root/GameState")
    var gc: Object = get_node("/root/GameConfig")
    gc.call("set_quarter_preset", String(preset))
    gs.new_session(12345, 1, 1)
    # Force OT entry without playing Q4: prepare and resolve coin toss deterministically
    gs.call("_prepare_overtime_entry")
    # Visitor calls heads; winner choice receive
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    return gs

func test_quick_ot_is_300() -> void:
    var gs := _start_ot_for_preset("QUICK")
    assert(int(gs.clock_remaining) == 300)
    assert(String(gs.get_quarter_text()) == "OT")

func test_standard_ot_is_600() -> void:
    var gs := _start_ot_for_preset("STANDARD")
    assert(int(gs.clock_remaining) == 600)

func test_full_ot_is_900() -> void:
    var gs := _start_ot_for_preset("FULL")
    assert(int(gs.clock_remaining) == 900)


