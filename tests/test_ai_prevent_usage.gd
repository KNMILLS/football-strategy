extends Node

func test_prevent_usage_when_long_or_end_drive() -> void:
	var sm := get_node("/root/SeedManager")
	var gs := get_node("/root/GameState")
	var da := load("res://scripts/DefenseAI.gd")
	sm.set_seed(5151)
	gs.new_session(5151, 1, 1)
	# Short yardage: Prevent should be rare
	gs.down = 2
	gs.to_go = 5
	var prevent_count := 0
	for i in 500:
		var pick := String(da.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
		if pick == "PREVENT":
			prevent_count += 1
	assert(prevent_count <= 75)
	# Long yardage: allow any rate; just assert it's not zero to prove availability
	gs.to_go = 12
	prevent_count = 0
	for i in 500:
		var pick2 := String(da.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
		if pick2 == "PREVENT":
			prevent_count += 1
	assert(prevent_count > 0)
