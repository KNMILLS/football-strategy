extends Node

func test_coin_flip_defend_path_kicks_to_opponent() -> void:
    var sm: Object = get_node("/root/SeedManager")
    var gs: Object = get_node("/root/GameState")
    sm.set_seed(515151)
    gs.new_session(515151, 1, 1)
    gs.call("prepare_regulation_coin_toss")
    # Visitor calls tails; ensure deterministic outcome path
    var _winner: int = int(gs.call("perform_coin_toss", false))
    # Winner chooses DEFEND; opponent should receive and be on offense
    gs.call("enter_regulation_with_choice", "DEFEND")
    # Ball placed and offense set; verify down and to_go
    assert(gs.down == 1)
    assert(gs.to_go >= 1)
    # Offense possession should be the non-winning side
    var receiving_team: int = int(gs.coin_toss_winner) if String(gs.coin_toss_choice) == "RECEIVE" else (1 - int(gs.coin_toss_winner))
    var offense_index := 0 if bool(gs.offense_is_home) else 1
    assert(offense_index == int(receiving_team))
    # Timing consumed 0 or 15
    var t: Object = load("res://scripts/Timing.gd").new()
    t.load_cfg()
    var preset: String = "STANDARD"
    if get_node_or_null("/root/GameConfig") != null:
        preset = String(get_node("/root/GameConfig").call("get_quarter_preset"))
    var base_sec: int = int(t.call("get_preset_seconds", String(preset)))
    var delta := int(base_sec - int(gs.clock_remaining))
    assert(delta == 0 or delta == 15)


