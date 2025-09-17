extends Node

var mcp: Node

func _ready() -> void:
	# This test expects TeamSelectionTestScene.tscn to be the current scene
	var root := get_tree().root
	var screen := root.get_node("/root/TeamSelectionTestScene/TeamSelectionScreen")
	assert(screen != null)
	mcp = root.get_node("/root/TeamSelectionTestScene/MCP")
	assert(mcp != null)
	_run_tests()

func _run_tests() -> void:
	_test_initial_state()
	_test_first_and_second_select()
	_test_duplicate_block()
	_test_reset()
	_test_responsiveness()
	_test_options_cycle()
	print("TeamSelection UI tests completed")

func _test_initial_state() -> void:
	var s: Dictionary = mcp.call("state")
	assert(String(s.header) == "Select Team")
	assert(String(s.p1) == "")
	assert(String(s.opp) == "")
	assert(not bool(s.can_start))

func _test_first_and_second_select() -> void:
	mcp.call("select_by_abbr", "BUF")
	var s: Dictionary = mcp.call("state")
	assert(String(s.header) == "Select Opponent")
	assert(String(s.p1) == "BUF")
	assert(String(s.opp) == "")
	assert(not bool(s.can_start))
	mcp.call("select_by_abbr", "NE")
	s = mcp.call("state")
	assert(String(s.p1) == "BUF")
	assert(String(s.opp) == "NE")
	assert(bool(s.can_start))

func _test_duplicate_block() -> void:
	mcp.call("reset")
	mcp.call("select_by_abbr", "KC")
	mcp.call("select_by_abbr", "KC")
	var s: Dictionary = mcp.call("state")
	# Should still be awaiting opponent
	assert(String(s.p1) == "KC")
	assert(String(s.opp) == "")
	assert(not bool(s.can_start))

func _test_reset() -> void:
	mcp.call("reset")
	var s: Dictionary = mcp.call("state")
	assert(String(s.header) == "Select Team")
	assert(String(s.p1) == "")
	assert(String(s.opp) == "")
	assert(not bool(s.can_start))

func _test_responsiveness() -> void:
	var root := get_tree().root
	var screen := root.get_node("/root/TeamSelectionTestScene/TeamSelectionScreen")
	var r: Dictionary = screen.call("debug_force_layout", 800)
	assert(int(r.columns) >= 4)
	assert(bool(r.stacked) == true)
	r = screen.call("debug_force_layout", 1280)
	assert(int(r.columns) >= 4)
	assert(bool(r.stacked) == false)
	r = screen.call("debug_force_layout", 1920)
	assert(int(r.columns) >= 4)
	assert(bool(r.stacked) == false)

func _test_options_cycle() -> void:
	var root := get_tree().root
	var screen := root.get_node("/root/TeamSelectionTestScene/TeamSelectionScreen")
	var m := root.get_node("/root/TeamSelectionTestScene/MCP")
	m.call("reset")
	m.call("select_by_abbr", "BUF")
	m.call("select_by_abbr", "NE")
	var home_opt: Node = screen.get_node("RootV/Footer/OptionsRow/HomeTeamOption")
	var visitor_opt: Node = screen.get_node("RootV/Footer/OptionsRow/VisitorTeamOption")
	var h0 := String(home_opt.call("get_value"))
	var v0 := String(visitor_opt.call("get_value"))
	# Cycle right on home option and expect it to change
	home_opt.call("_on_right")
	var h1 := String(home_opt.call("get_value"))
	assert(h1 != h0)
	# Cycle left to return
	home_opt.call("_on_left")
	var h2 := String(home_opt.call("get_value"))
	assert(h2 == h0)


