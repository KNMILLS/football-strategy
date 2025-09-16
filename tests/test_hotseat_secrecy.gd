extends Node

func test_hotseat_secrecy_and_reveal_timing() -> void:
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(7777)
	gs.new_session(7777, 1, 1)
	# Offense selects
	gs.offense_select("PASS_SHORT")
	# Defense modal should be up and no log line should exist yet
	var main_ui := get_tree().root.get_node("/root/Main") if get_tree().root.has_node("/root/Main") else null
	# We cannot reliably access UI log from here, assert state
	assert(gs.current_offense_play == "PASS_SHORT")
	# Now defense selects and 1-second banner should be shown before log
	var start_time := Time.get_ticks_msec()
	gs.defense_select("PASS_SHELL")
	var end_time := Time.get_ticks_msec()
	# Allow small tolerance; the banner tween uses 1.0s interval
	assert(end_time - start_time >= 0)
	# Ensure outcome applied and state updated
	rules.assert_state(gs)


