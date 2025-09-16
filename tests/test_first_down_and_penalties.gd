extends Node

func test_first_down_line_to_gain_and_replay_penalties() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	sm.set_seed(10101)
	gs.new_session(10101, 1, 1)
	# Start OWN 25 -> +6 -> sack -7 -> DEF +5 -> run +6
	gs.ball_on = 25
	gs.offense_dir = 1
	gs.series_start = 25
	gs.line_to_gain = 35
	rules.recompute_to_go(gs)
	# +6
	var o1 := {"yards_delta": 6, "event_name":"YARDS", "penalty_replay":false, "turnover":false, "touchdown":false, "field_goal":"", "descriptive_text":""}
	rules.apply_outcome(gs, o1)
	assert(gs.down == 2 and gs.to_go == 4)
	# sack -7
	var o2 := {"yards_delta": -7, "event_name":"SACK", "penalty_replay":false, "turnover":false, "touchdown":false, "field_goal":"", "descriptive_text":""}
	rules.apply_outcome(gs, o2)
	assert(gs.down == 3)
	# DEF +5 replay
	var o3 := {"yards_delta": 5, "event_name":"PENALTY_DEF", "penalty_replay":true, "turnover":false, "touchdown":false, "field_goal":"", "descriptive_text":""}
	var down_before: int = gs.down
	var togo_before: int = gs.to_go
	rules.apply_outcome(gs, o3)
	assert(gs.down == down_before)
	assert(gs.to_go <= togo_before)
	# run +6 crossing line to gain should award first down
	var o4 := {"yards_delta": 6, "event_name":"YARDS", "penalty_replay":false, "turnover":false, "touchdown":false, "field_goal":"", "descriptive_text":""}
	rules.apply_outcome(gs, o4)
	assert(gs.down == 1)

	# 4th & 4 at OWN 40 -> DEF +5 on replay leads to new series
	gs.down = 4
	gs.ball_on = 40
	gs.offense_dir = 1
	gs.series_start = 30
	gs.line_to_gain = 40
	rules.recompute_to_go(gs)
	var o5 := {"yards_delta": 5, "event_name":"PENALTY_DEF", "penalty_replay":true, "turnover":false, "touchdown":false, "field_goal":"", "descriptive_text":""}
	rules.apply_outcome(gs, o5)
	assert(gs.down == 1)
	assert(gs.series_start == gs.ball_on)


