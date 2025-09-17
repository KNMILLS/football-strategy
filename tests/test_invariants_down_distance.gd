extends Node

func test_down_distance_goal_to_go_and_negative_yardage() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	var rules: Object = get_node("/root/Rules")
	sm.set_seed(2025)
	gs.new_session(2025, 1, 1)
	# March to goal-to-go intentionally
	gs.ball_on = 95
	gs.offense_dir = 1
	gs.series_start = 85
	gs.line_to_gain = 100
	gs.to_go = 5
	gs.down = 1
	rules.assert_state(gs)
	# Negative yardage should not set to_go < 1
	var o := {"event_name":"YARDS","yards_delta":-3,"penalty_replay":false,"turnover":false}
	rules.apply_outcome(gs, o)
	assert(gs.to_go >= 1)
	# Gain first down resets to new series and goal-to-go when within 10
	var o2 := {"event_name":"YARDS","yards_delta":8,"penalty_replay":false,"turnover":false}
	rules.apply_outcome(gs, o2)
	assert(gs.down == 1)
	assert(gs.line_to_gain == clamp(gs.series_start + 10 * gs.offense_dir, 0, 100))


