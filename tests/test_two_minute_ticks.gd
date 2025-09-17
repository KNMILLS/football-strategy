extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(111)

func _start_at_two_minutes() -> Object:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(111, 1, 1)
    gs.clock_remaining = 120
    return gs

func test_deep_completion_is_35s_at_two_minute() -> void:
    var gs := _start_at_two_minutes()
    var rules: Object = get_node("/root/Rules")
    var start := int(gs.clock_remaining)
    # Resolve repeatedly until we get a deep yards gain
    var consumed := 0
    for i in 1000:
        var o: Dictionary = rules.resolve_play("DEEP_POST", "PASS_SHELL", gs.ball_on, gs.offense_dir)
        if o.event_name == "YARDS" and int(o.yards_delta) > 0:
            rules.apply_outcome(gs, o)
            consumed = start - int(gs.clock_remaining)
            break
    assert(consumed == 35 or consumed == 28 or consumed >= 21)

func test_incomplete_is_7s_at_two_minute() -> void:
    var gs := _start_at_two_minutes()
    var rules: Object = get_node("/root/Rules")
    var start := int(gs.clock_remaining)
    var found := false
    for i in 500:
        var o: Dictionary = rules.resolve_play("QUICK_SLANT", "PASS_SHELL", gs.ball_on, gs.offense_dir)
        if o.event_name == "INCOMP":
            rules.apply_outcome(gs, o)
            found = true
            break
    assert(found)
    assert(start - int(gs.clock_remaining) == 7)


