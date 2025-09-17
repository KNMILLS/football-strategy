extends Node

func test_timeout_only_presnap() -> void:
	var sm := get_tree().root.get_node("/root/SeedManager")
	var gs := get_tree().root.get_node("/root/GameState")
	var rules := get_tree().root.get_node("/root/Rules")
	sm.set_seed(44444)
	gs.new_session(44444, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	# Start selecting offense to enter non-presnap (defense_select state)
	gs.call("offense_select", "QUICK_SLANT")
	# Attempt timeout should fail since selection in progress
	var offense_idx := int(0 if bool(gs.get("offense_is_home")) else 1)
	assert(not bool(gs.call("spend_reg_timeout", offense_idx)))
	# Reset presnap by resolving via defense selection
	gs.call("defense_select", "BALANCED")
	# After resolve, state returns to PRESNAP – should allow timeout (if any remain)
	# Ensure at least one available
	# Spend once
	assert(bool(gs.call("spend_reg_timeout", offense_idx)))


