extends Node

func test_only_standard_mode() -> void:
	# Ensure UI only exposes Human vs AI and Hot Seat (Standard only)
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	var mode_option: OptionButton = ui.get_node("RootMargin/VMain/HeaderBar/ModeOption")
	assert(mode_option.get_item_count() == 2)
	assert(mode_option.get_item_text(0).findn("Human") != -1)
	assert(mode_option.get_item_text(1).findn("Hot") != -1)

