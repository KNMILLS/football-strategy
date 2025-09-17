extends Node

func _set_session(home_id: String, away_id: String, difficulty_id: int) -> void:
	var gs := get_tree().root.get_node("/root/GameState")
	gs.call("set_session_config", home_id, away_id, difficulty_id)

func _rate_bigplay(off_play: String, def_play: String, N: int) -> float:
	var rules := get_tree().root.get_node("/root/Rules")
	var _sm := get_tree().root.get_node("/root/SeedManager")
	var ball_on := 40
	var dir := 1
	var hits := 0
	for i in N:
		var out: Dictionary = rules.resolve_play(off_play, def_play, ball_on, dir)
		if out.has("big_play") and bool(out["big_play"]):
			hits += 1
	return float(hits) / float(N)

func test_airraid_deep_post_up() -> void:
	var _sm := get_tree().root.get_node("/root/SeedManager")
	_sm.set_seed(424242)
	_set_session("airraid_pressman", "balancedpro_balanced", 1)
	var base := _rate_bigplay("DEEP_POST", "BALANCED", 10000)
	_set_session("balancedpro_balanced", "balancedpro_balanced", 1)
	var neutral := _rate_bigplay("DEEP_POST", "BALANCED", 10000)
	assert(base >= neutral * 1.05)

func test_power_inside_power_up() -> void:
	var _sm2 := get_tree().root.get_node("/root/SeedManager")
	_sm2.set_seed(434343)
	_set_session("powergap_pressman", "balancedpro_balanced", 1)
	var power_rate := _rate_bigplay("INSIDE_POWER", "BALANCED", 10000)
	_set_session("balancedpro_balanced", "balancedpro_balanced", 1)
	var neutral := _rate_bigplay("INSIDE_POWER", "BALANCED", 10000)
	assert(power_rate >= neutral * 1.03)


