extends Node

var banner_seen := false

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(30303)
    banner_seen = false

func _watch_banner(text: String) -> void:
    if text.find("TWO-MINUTE WARNING") >= 0:
        banner_seen = true

func test_two_minute_warning_triggers_in_ot() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.ui_banner.connect(_watch_banner)
    gs.new_session(30303, 1, 1)
    gs.call("_prepare_overtime_entry")
    var _winner := int(gs.call("perform_coin_toss", true))
    gs.call("enter_overtime_with_choice", "RECEIVE")
    # Force the clock just above 2:00
    gs.clock_remaining = 125
    # One snap should drop under 120 and trigger 2MW
    var rules: Object = get_node("/root/Rules")
    var o: Dictionary = rules.resolve_play("INSIDE_POWER", "BALANCED", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    assert(banner_seen)


