extends Node

func test_long_fuzz_no_invariant_violations() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	sm.set_seed(123456)
	gs.new_session(123456, 20, 0)
	var offense_plays := ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG", "PUNT", "FG"]
	for i in 10000:
		var off_idx := int(sm.randi_range(0, offense_plays.size() - 1))
		var off := String(offense_plays[off_idx])
		# Avoid clearly illegal FG attempts out of range to keep flow
		if off == "FG" and rules.field_goal_bucket(gs.ball_on, gs.offense_dir) == "":
			off = "PUNT"
		gs.offense_select(off)
		if gs.mode == 0:
			# Human vs AI path already chose defense internally in GameState
			pass
		else:
			# Fallback to AI defense selection to proceed
			var da: Script = load("res://scripts/DefenseAI.gd")
			var def := String(da.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, []))
			gs.defense_select(def)
		rules.assert_state(gs)
		if gs.drive_ended and gs.drive_index >= gs.num_drives:
			break

