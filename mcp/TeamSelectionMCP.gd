extends Node

@onready var screen: Control = get_node("../TeamSelectionScreen") if has_node("../TeamSelectionScreen") else null

func select_by_abbr(home_abbr: String, visitor_abbr: String) -> void:
    if screen == null:
        return
    if screen.has_method("set_selected_abbrs"):
        screen.call("set_selected_abbrs", String(home_abbr), String(visitor_abbr))

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


