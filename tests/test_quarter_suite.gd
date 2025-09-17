extends Node

func _ready() -> void:
	var passed := 0
	var suites := [
		load("res://tests/test_quarter_presets.gd").new(),
		load("res://tests/test_quarter_rollover_presets.gd").new()
	]
	for s in suites:
		add_child(s)
		if s.has_method("_before_each"):
			s.call("_before_each")
		for m in s.get_method_list():
			var name := String(m.name)
			if name.begins_with("test_"):
				s.call(name)
				passed += 1
				print("PASS ", name)
		s.queue_free()
	print("Quarter tests passed ", passed)
	get_tree().quit()


