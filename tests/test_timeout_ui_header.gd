extends Node

func test_header_shows_reg_then_ot_timeouts() -> void:
	var ui := get_tree().root.get_node("/root/Root/UI/Main")
	var gs := get_tree().root.get_node("/root/GameState")
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(33333)
	gs.new_session(33333, 1, 1)
	gs.call("prepare_regulation_coin_toss")
	var _w := int(gs.call("perform_coin_toss", true))
	gs.call("enter_regulation_with_choice", "RECEIVE")
	ui.call("_update_header")
	var label: Label = ui.get_node("RootMargin/VMain/HeaderBar/OTTimeouts")
	var txt := String(label.text)
	assert(txt.findn("TO: H") != -1)
	# Enter OT and check OT label
	gs.call("_prepare_overtime_entry")
	ui.call("_update_header")
	txt = String(label.text)
	assert(txt.findn("OT TO:") != -1)


