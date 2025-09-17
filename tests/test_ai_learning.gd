extends Node

func _before_each() -> void:
	get_node("/root/SeedManager").set_seed(97531)

func test_defense_increases_pass_shell_in_long() -> void:
	var gs := get_node("/root/GameState")
	gs.set_session_config("airraid_pressman", "balancedpro_balanced", 1)
	gs.new_session(97531, 1, 0)
	var da := load("res://scripts/DefenseAI.gd")
	# Feed 12 pass-heavy calls to history
	gs.last_offensive_calls.clear()
	for i in 12:
		gs.last_offensive_calls.append("PASS_SHORT" if i % 2 == 0 else "PASS_LONG")
	var counts := {"PASS_SHELL": 0, "BALANCED": 0, "RUN_BLITZ": 0, "ALL_OUT_RUSH": 0}
	for i in 1000:
		var pick := String(da.call("choose_defense", 2, 9, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
		counts[pick] = int(counts.get(pick, 0)) + 1
	assert(int(counts["PASS_SHELL"]) > int(counts["BALANCED"]))
