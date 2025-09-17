extends Node

@onready var screen: Control = get_node("../TeamSelectionScreen") if has_node("../TeamSelectionScreen") else null

func select_by_abbr(abbr: String) -> void:
	if screen == null:
		return
	# Find tile by abbr and emit click
	var grid: GridContainer = screen.get_node("RootV/MainRow/Scroll/TeamGrid")
	for c in grid.get_children():
		if c.has_method("get") and c.has_method("call"):
			var a := String(c.get("abbr")) if c.has_method("get") else ""
			if a == String(abbr):
				c.call("_on_pressed")
				return

func reset() -> void:
	if screen == null:
		return
	screen.call("_on_reset")

func state() -> Dictionary:
	if screen == null:
		return {}
	return {
		"header": String(screen.get_node("RootV/HeaderLabel").text),
		"p1": String(screen.get("p1_team")),
		"opp": String(screen.get("opp_team")),
		"can_start": bool(not screen.get_node("RootV/Footer/ControlRow/StartButton").disabled)
	}


