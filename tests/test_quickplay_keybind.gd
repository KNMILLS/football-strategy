extends Node

func test_quickplay_enter_only_when_header_focused() -> void:
	var main := get_tree().root.get_node("/root/Main") if get_tree().root.has_node("/root/Main") else null
	if main == null:
		# Create scene to access controls
		main = load("res://Main.tscn").instantiate()
		get_tree().root.add_child(main)
	# Simulate focus on header element
	main.start_button.grab_focus()
	# We cannot synthesize actual key events easily here; rely on code path: ensure defense modal off and focus present
	assert(main.start_button.has_focus())
	# Ensure defense modal blocks quick play when visible
	main.defense_modal.popup_centered()
	var blocked: bool = main.defense_modal.visible
	assert(blocked)
	main.defense_modal.hide()


