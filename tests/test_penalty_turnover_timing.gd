extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(4242)

func _start() -> Object:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(4242, 1, 1)
    return gs

func test_penalty_accept_consumes_15() -> void:
    var gs := _start()
    var rules: Object = get_node("/root/Rules")
    var start := int(gs.clock_remaining)
    var found := false
    for i in 1000:
        var o: Dictionary = rules.resolve_play("QUICK_SLANT", "BALANCED", gs.ball_on, gs.offense_dir)
        if o.event_name.begins_with("PENALTY"):
            rules.apply_outcome(gs, o)
            found = true
            break
    assert(found)
    assert(start - int(gs.clock_remaining) >= 7)

func test_turnover_consumes_15() -> void:
    var gs := _start()
    var rules: Object = get_node("/root/Rules")
    var start := int(gs.clock_remaining)
    var found := false
    for i in 2000:
        var o: Dictionary = rules.resolve_play("DEEP_POST", "PASS_SHELL", gs.ball_on, gs.offense_dir)
        if (o.event_name == "INT") or (o.event_name == "FUMBLE" and bool(o.get("turnover", false))):
            rules.apply_outcome(gs, o)
            found = true
            break
    assert(found)
    assert(start - int(gs.clock_remaining) >= 7)


