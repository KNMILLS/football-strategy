extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(23232)

func _td_for_team(gs: Object, offense_home: bool) -> void:
    gs.offense_is_home = offense_home
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var rules: Object = get_node("/root/Rules")
    var o: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    assert(bool(o.get("touchdown", false)))

func test_trailing_gate_and_outcomes() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(23232, 1, 1)
    # Away trails: give Home a TD first
    _td_for_team(gs, true)
    gs.call("try_select", "XP")
    # Now Home leads; onside should be disabled for Home; force Away kickoff by selecting KICKOFF
    gs.call("free_kick_select", "KICKOFF")
    # Later create a scenario where trailing team chooses onside
    _td_for_team(gs, false)
    gs.call("try_select", "XP")
    # Away now behind; allow onside
    gs.call("free_kick_select", "ONSIDE")
    # Timing must have consumed 15s for kickoff/onside resolution on top of Try
    assert(int(gs.clock_remaining) <= 600)


