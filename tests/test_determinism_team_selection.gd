extends Node

func test_team_selection_ui_makes_no_rng_calls() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(987654)
	var before := int(sm.get_rng_call_count())
	ui.call("_enter_setup")
	var team_select: Control = ui.get_node("SetupOverlay/SetupVBox/TeamSelect")
	# Hover across a few tiles and lock/unlock; should not change RNG count
	team_select.call("debug_hover_index", 0)
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_handle_key", "DOWN")
	team_select.call("debug_confirm_current")
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_confirm_current")
	team_select.call("debug_handle_key", "RESELECT")
	var after := int(sm.get_rng_call_count())
	assert(before == after)


