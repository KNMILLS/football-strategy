extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(21212)

func _touchdown_then_kickoff(gs: Object) -> void:
    var rules: Object = get_node("/root/Rules")
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    assert(bool(o.get("touchdown", false)))
    gs.call("try_select", "XP")
    gs.call("free_kick_select", "KICKOFF")

func test_kickoff_spots_and_timing() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(21212, 1, 1)
    var pre := int(gs.clock_remaining)
    _touchdown_then_kickoff(gs)
    var delta := int(pre - gs.clock_remaining)
    assert(delta >= 15) # 15s Try + 0–15 for kickoff (TB 0s)
    # Spot must be reasonable
    var yt := String(gs.get_spot_text())
    assert(yt.find("OWN") >= 0 or yt.find("OPP") >= 0)


