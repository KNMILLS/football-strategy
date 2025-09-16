extends Node

func test_invariants_random_snaps() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	sm.set_seed(load("res://qa/QAConfig.gd").SEED_MAIN)
	# Single long session, HUMAN_AI for speed and predictability
	gs.new_session(sm.get_seed(), 9999, 0)
	var offense_plays := ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG", "PUNT", "FG"]
	for i in 1000:
		var off_idx := int(sm.randi_range(0, offense_plays.size() - 1))
		var off := String(offense_plays[off_idx])
		if off == "FG" and rules.field_goal_bucket(gs.ball_on, gs.offense_dir) == "":
			off = "PUNT"
		# Choose defense via AI for realism
		var da: Script = load("res://scripts/DefenseAI.gd")
		var def := String(da.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
		var outcome: Dictionary = rules.resolve_play(off, def, gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, outcome)
		rules.assert_state(gs)
		if gs.drive_ended and gs.drive_index >= gs.num_drives:
			break


