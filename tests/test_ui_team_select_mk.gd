extends Node

func test_hover_lock_and_matchup_footer() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	# Enter setup overlay
	ui.call("_enter_setup")
	var team_select: Control = ui.get_node("SetupOverlay/SetupVBox/TeamSelect")
	assert(team_select != null)
	# Hover first tile via helper
	team_select.call("debug_hover_index", 0)
	var s1: Dictionary = team_select.call("get_state")
	assert(not bool(s1.get("footer_visible")))
	# Confirm P1 on current hover
	team_select.call("debug_confirm_current")
	var s2: Dictionary = team_select.call("get_state")
	assert(String(s2.get("p1")) != "")
	# Move and confirm P2
	team_select.call("debug_handle_key", "RIGHT")
	team_select.call("debug_confirm_current")
	var s3: Dictionary = team_select.call("get_state")
	assert(String(s3.get("p2")) != "")
	assert(bool(s3.get("footer_visible")))
	var footer_text := String(s3.get("footer_text"))
	assert(footer_text.findn(" vs ") != -1)


