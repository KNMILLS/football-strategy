extends Node

func _setup_regulation() -> Object:
	var sm := get_tree().root.get_node("/root/SeedManager")
	var gs := get_tree().root.get_node("/root/GameState")
	sm.set_seed(11111)
	gs.new_session(11111, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	return gs

func test_reg_timeouts_limit_and_halftime_reset() -> void:
	var gs := _setup_regulation()
	# Initial counts
	assert(int(gs.call("reg_timeouts_remaining", 0)) == 3)
	assert(int(gs.call("reg_timeouts_remaining", 1)) == 3)
	# Spend 3 for current offense
	var offense_idx := int(0 if bool(gs.get("offense_is_home")) else 1)
	assert(bool(gs.call("spend_reg_timeout", offense_idx)))
	assert(bool(gs.call("spend_reg_timeout", offense_idx)))
	assert(bool(gs.call("spend_reg_timeout", offense_idx)))
	# Fourth should fail
	assert(not bool(gs.call("spend_reg_timeout", offense_idx)))
	# Counts reflect 0 for offense side
	assert(int(gs.call("reg_timeouts_remaining", offense_idx)) == 0)
	# Halftime reset: simulate Q2 -> Q3 rollover
	gs.set("quarter", 2)
	gs.set("clock_remaining", 0)
	gs.call("_after_outcome_timing", {})
	# After halftime, both reset to 3
	assert(int(gs.call("reg_timeouts_remaining", 0)) == 3)
	assert(int(gs.call("reg_timeouts_remaining", 1)) == 3)


