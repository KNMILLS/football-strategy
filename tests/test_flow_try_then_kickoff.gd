extends Node

func _before_each() -> void:
    var sm: Object = get_node("/root/SeedManager")
    sm.set_seed(24242)

func test_flow_try_then_kickoff() -> void:
    var gs: Object = get_node("/root/GameState")
    gs.new_session(24242, 1, 1)
    var rules: Object = get_node("/root/Rules")
    gs.ball_on = 95 if gs.offense_dir == 1 else 5
    var o: Dictionary = rules.resolve_play("DEEP_POST", "PREVENT", gs.ball_on, gs.offense_dir)
    rules.apply_outcome(gs, o)
    assert(bool(o.get("touchdown", false)))
    gs.call("try_select", "XP")
    gs.call("free_kick_select", "KICKOFF")
    # Should be at PRESNAP for the next series
    assert(String(gs.get_spot_text()).length() > 0)


