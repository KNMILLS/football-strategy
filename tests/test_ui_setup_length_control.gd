extends Node

func test_quarter_preset_selector_survives_teamselect_integration() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	assert(ui != null)
	ui.call("_enter_setup")
	var quarter_opt: OptionButton = ui.get_node("SetupOverlay/SetupVBox/TileGrid/QuarterPanel/QuarterVBox/QuarterOption")
	assert(quarter_opt != null)
	# Toggle through QUICK → FULL → STANDARD
	quarter_opt.select(0)
	quarter_opt.select(2)
	quarter_opt.select(1)
	# Start via TeamSelect confirm path using defaults
	var _gs := get_tree().root.get_node("/root/GameState")
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(24680)
	# Using Start button path should still work without using OptionButtons for team
	ui.call("_on_setup_start")
	# After starting, header should show a Q label and preset label non-empty
	var qlabel: Label = ui.get_node("RootMargin/VMain/HeaderBar/Quarter")
	var plabel: Label = ui.get_node("RootMargin/VMain/HeaderBar/PresetLabel")
	assert(String(qlabel.text).length() > 0)
	assert(String(plabel.text).find(":") != -1)


