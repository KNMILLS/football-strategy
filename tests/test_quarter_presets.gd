extends Node

func _before_each() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var gc: Object = get_node("/root/GameConfig")
	# Use a fixed seed for determinism and ensure persistence won't interfere
	sm.set_seed(111)
	gc.call("set_quarter_preset", "STANDARD")

func _new_session() -> Object:
	var gs: Object = get_node("/root/GameState")
	# drives=1, mode=hotseat for isolation
	gs.new_session(111, 1, 1)
	return gs

func test_quick_initial_clock_300() -> void:
	var gc: Object = get_node("/root/GameConfig")
	gc.call("set_quarter_preset", "QUICK")
	var gs := _new_session()
	assert(int(gs.clock_remaining) == 300)

func test_standard_initial_clock_600() -> void:
	var gc: Object = get_node("/root/GameConfig")
	gc.call("set_quarter_preset", "STANDARD")
	var gs := _new_session()
	assert(int(gs.clock_remaining) == 600)

func test_full_initial_clock_900() -> void:
	var gc: Object = get_node("/root/GameConfig")
	gc.call("set_quarter_preset", "FULL")
	var gs := _new_session()
	assert(int(gs.clock_remaining) == 900)
