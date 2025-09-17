extends Node

func test_setup_and_playcall_structure() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	# Setup overlay elements
	var setup_overlay: Panel = ui.get_node("SetupOverlay")
	assert(setup_overlay != null)
	var grid: GridContainer = ui.get_node("SetupOverlay/SetupVBox/TileGrid")
	assert(grid.columns == 2)
	# Playcalling groups: Runs/Pass/Special; defense modal 6 buttons
	var runs_v := ui.get_node("RootMargin/VMain/OffensePanel/RunsVBox")
	var pass_v := ui.get_node("RootMargin/VMain/OffensePanel/PassVBox")
	var spec_v := ui.get_node("RootMargin/VMain/OffensePanel/SpecialVBox")
	assert(runs_v.get_child_count() >= 4)
	assert(pass_v.get_child_count() >= 6)
	assert(spec_v.get_child_count() >= 2)
	var dm := ui.get_node("DefenseModal/DMVBox/DMButtons")
	var def_buttons := 0
	for c2 in dm.get_children():
		if c2 is Button:
			def_buttons += 1
	assert(def_buttons == 6)

