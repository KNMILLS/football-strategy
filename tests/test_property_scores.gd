extends Node

func test_scores_are_composed_of_field_goals_and_touchdowns() -> void:
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(9090)
	gs.new_session(9090, 1, 0)
	var ai_off := load("res://scripts/OffenseAI.gd")
	for i in 500:
		var play := String(ai_off.call("choose_offense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir))
		gs.offense_select(play)
		if gs.mode == 1:
			var ai_def := load("res://scripts/DefenseAI.gd")
			var def := String(ai_def.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
			gs.defense_select(def)
		rules.assert_state(gs)
		# No drive gating in regulation; continue simulation
	# Check scores are composed of FGs (3) and TD family (6+try)
	var total := int(gs.home_score + gs.away_score)
	var ok := false
	for threes in range(0, total / 3 + 1):
		var rem := total - 3 * threes
		# Accept totals reachable by TD=6 plus optional try points
		if rem % 6 == 0:
			ok = true
			break
	assert(ok)


