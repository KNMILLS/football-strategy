extends Node

func test_keyboard_navigation_and_enter_confirm() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	ui.call("_enter_setup")
	var team_select: Control = ui.get_node("SetupOverlay/SetupVBox/TeamSelect")
	assert(team_select != null)
	# Navigate: RIGHT, RIGHT, DOWN then ENTER twice to lock both
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_handle_key", "DOWN")
	team_select.call("debug_handle_key", "ENTER")
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_handle_key", "ENTER")
	var state: Dictionary = team_select.call("get_state")
	assert(String(state.get("p1")) != "")
	assert(String(state.get("p2")) != "")
	assert(bool(state.get("footer_visible")))


