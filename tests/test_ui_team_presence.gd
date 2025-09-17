extends Node

func test_header_shows_team_names_after_session() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	var gs := get_tree().root.get_node("/root/GameState")
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(123456)
	gs.call("set_session_config", "westcoast_cover2", "airraid_pressman", 1)
	gs.new_session(123456, 1, 0)
	# Force UI header update and read label
	ui.call("_update_header")
	var score_label: Label = ui.get_node("RootMargin/VMain/HeaderBar/Score")
	var text := String(score_label.text)
	assert(text.findn("West Coast") != -1 or text.findn("Air Raid") != -1)
	assert(text.findn("Home") == -1 and text.findn("Away") == -1)


