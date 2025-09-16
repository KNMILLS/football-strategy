extends Node

func test_fg_buckets_and_range() -> void:
	var rules: Object = get_node("/root/Rules")
	# Spot 60 => 57 yards, in range top bucket
	var d1: String = rules.field_goal_bucket(60, 1)
	assert(d1 == "50_57")
	# Spot 61 => 56 yards
	var d2: String = rules.field_goal_bucket(61, 1)
	assert(d2 == "50_57")
	# Spot 42 => 75 yards, out of range
	var d3: String = rules.field_goal_bucket(42, 1)
	assert(d3 == "")

func test_punt_touchback_and_bounds() -> void:
	var rules: Object = get_node("/root/Rules")
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(1234)
	# Force repeated punts to sample distribution
	for i in 1000:
		var res: Dictionary = rules.do_punt(85, 1) # near their goal, likely touchback on long nets
		assert(res.new_spot >= 0 and res.new_spot <= 100)
		if res.touchback:
			assert(res.new_spot == 80)

func test_line_to_gain_penalty_first_down() -> void:
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	gs.new_session(888, 1, 1)
	# Set up 4th and 2 at midfield
	gs.down = 4
	gs.ball_on = 50
	gs.offense_dir = 1
	gs.series_start = 40
	gs.line_to_gain = 60
	rules.recompute_to_go(gs)
	# Apply defensive +5 penalty replay should award first down by yardage
	var outcome := {"event_name":"PENALTY_DEF", "yards_delta":5, "penalty_replay":true, "turnover":false, "touchdown":false, "descriptive_text":"", "field_goal":""}
	rules.apply_outcome(gs, outcome)
	assert(gs.down == 1)
	assert(gs.series_start == gs.ball_on)
	assert(gs.line_to_gain == min(100, gs.ball_on + 10))

func test_quick_play_defaults() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gs: Object = get_node("/root/GameState")
	sm.set_seed(42)
	gs.new_session(42, 4, 0)
	assert(gs.get_down_text().begins_with("1st"))
	assert(gs.get_drive_text().findn("/ 4") != -1)

func test_offense_ai_basic() -> void:
	var gs: Object = get_node("/root/GameState")
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	sm.set_seed(2024)
	gs.new_session(2024, 2, 0)
	for i in 40:
		var ai := load("res://scripts/OffenseAI.gd") as Script
		var play := String(ai.call("choose_offense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir))
		gs.offense_select(play)
		rules.assert_state(gs)

