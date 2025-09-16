extends Node

func _before_each() -> void:
	get_node("/root/SeedManager").set_seed(24680)

func test_offense_bias_applied() -> void:
	var gs := get_node("/root/GameState")
	gs.set_session_config("westcoast_cover2", "balancedpro_balanced", 1)
	gs.new_session(24680, 1, 0)
	var seq: Array = []
	for i in 2000:
		var choice := String(load("res://scripts/OffenseAI.gd").call("choose_offense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir))
		seq.append(choice)
	var count_short := 0
	for c in seq:
		if c == "PASS_SHORT":
			count_short += 1
	# West Coast should bias towards PASS_SHORT modestly
	assert(count_short > 450)

