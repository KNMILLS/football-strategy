extends Node

func _before_each() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gc: Object = get_node("/root/GameConfig")
	sm.set_seed(222)
	gc.call("set_quarter_preset", "QUICK")

func _snap_until_zero(gs: Object) -> void:
	# Consume time deterministically by applying outcomes from Rules
	var rules: Object = get_node("/root/Rules")
	var safety := 20000
	var start_q := int(gs.quarter)
	while safety > 0:
		var o: Dictionary = rules.resolve_play("INSIDE_POWER", "BALANCED", gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o)
		if int(gs.quarter) > start_q:
			break
		safety -= 1
	assert(safety > 0)

func test_rollover_resets_to_preset_length() -> void:
	var gs: Object = get_node("/root/GameState")
	gs.new_session(222, 1, 1)
	assert(int(gs.clock_remaining) == 300)
	# Run down the clock to zero; expect Q2 and reset to 300
	_snap_until_zero(gs)
	assert(int(gs.quarter) == 2)
	assert(int(gs.clock_remaining) == 300)
