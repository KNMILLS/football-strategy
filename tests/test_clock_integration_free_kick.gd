extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(27272)

func test_clock_try_and_kickoff_tags() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(27272, 1, 1)
    var rules: Object = get_node("/root/Rules")
    var pre := int(gs.clock_remaining)
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    gs.call("try_select", "XP")
    var after_try := int(gs.clock_remaining)
    assert(int(pre - after_try) == 15)
    gs.call("free_kick_select", "KICKOFF")
    # Kickoff consumes 15 unless touchback admin 0s
    assert(int(after_try - gs.clock_remaining) >= 0 and int(after_try - gs.clock_remaining) <= 15)


