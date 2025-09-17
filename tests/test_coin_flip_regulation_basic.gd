extends Node

func test_coin_flip_receive_path_kickoff_into_first_series() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gs: Object = get_node("/root/GameState")
    sm.set_seed(424242)
    gs.new_session(424242, 1, 1)
    # Trigger regulation coin toss
    gs.call("prepare_regulation_coin_toss")
    # Visitor calls heads deterministically based on seed
    var _winner: int = int(gs.call("perform_coin_toss", true))
    # Choose Receive for the winner; kickoff should resolve and set offense accordingly
    gs.call("enter_regulation_with_choice", "RECEIVE")
    # Spot must be within [0,100] and down resets to 1 with to_go >= 1
    assert(gs.ball_on >= 0 and gs.ball_on <= 100)
    assert(gs.down == 1)
    assert(gs.to_go >= 1)
    # Clock should have consumed 15s for non-touchback; allow 0s on touchback
    # We detect by comparing against initial preset seconds
    var t: Object = load("res://scripts/Timing.gd").new()
    t.load_cfg()
    var preset: String = "STANDARD"
    if get_node_or_null("/root/GameConfig") != null:
        preset = String(get_node("/root/GameConfig").call("get_quarter_preset"))
    var base_sec: int = int(t.call("get_preset_seconds", String(preset)))
    var delta := int(base_sec - int(gs.clock_remaining))
    assert(delta == 0 or delta == 15)


