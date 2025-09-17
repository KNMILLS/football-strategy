extends Node

func test_spot_stays_within_field_bounds() -> void:
	var sm := get_node("/root/SeedManager")
	var gs := get_node("/root/GameState")
	var rules := get_node("/root/Rules")
	sm.set_seed(8080)
	gs.new_session(8080, 1, 1)
	# Force near-goal situations and apply outcomes
	gs.ball_on = 98
	gs.offense_dir = 1
	var o1 := {"event_name":"YARDS","yards_delta":5,"penalty_replay":false,"turnover":false}
	rules.apply_outcome(gs, o1)
	assert(gs.ball_on >= 0 and gs.ball_on <= 100)
	# Safety-like back move from the 2 going wrong direction is clamped
	gs.ball_on = 2
	gs.offense_dir = -1
	var o2 := {"event_name":"YARDS","yards_delta":-5,"penalty_replay":false,"turnover":false}
	rules.apply_outcome(gs, o2)
	assert(gs.ball_on >= 0 and gs.ball_on <= 100)


