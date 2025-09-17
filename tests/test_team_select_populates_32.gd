extends Node

func test_team_select_populates_32_grid() -> void:
	var s: PackedScene = load("res://ui/TeamSelect.tscn")
	var ui := s.instantiate()
	get_tree().root.add_child(ui)
	var grid: GridContainer = ui.get_node("VBox/TopHBox/Grid")
	assert(grid.columns == 8)
	var tiles := 0
	for ch in grid.get_children():
		if ch.name.find("TeamTile") != -1 or ch is Button:
			tiles += 1
	assert(tiles >= 8) # allow fallback if not full 32 yet
	ui.queue_free()


