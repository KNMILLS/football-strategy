extends Node

func _ready() -> void:
	var s: Object = load("res://tests/test_quarter_suite.gd").new()
	add_child(s)
