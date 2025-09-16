extends Node

func test_setup_and_playcall_structure() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	# Setup overlay elements
	var setup_overlay: Panel = ui.get_node("SetupOverlay")
	assert(setup_overlay != null)
	var grid: GridContainer = ui.get_node("SetupOverlay/SetupVBox/TileGrid")
	assert(grid.columns == 2)
	# Playcalling grids: offense 6 buttons, defense modal 4 buttons
	var offense_panel := ui.get_node("RootMargin/VMain/OffensePanel")
	var children := offense_panel.get_children()
	var count_buttons := 0
	for c in children:
		if c is Button:
			count_buttons += 1
	assert(count_buttons == 6)
	var dm := ui.get_node("DefenseModal/DMVBox/DMButtons")
	var def_buttons := 0
	for c2 in dm.get_children():
		if c2 is Button:
			def_buttons += 1
	assert(def_buttons == 4)

