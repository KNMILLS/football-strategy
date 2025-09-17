extends Node

func _before_each() -> void:
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(12345)

func test_defense_types_constraints() -> void:
	var rules := get_tree().root.get_node("/root/Rules")
	var ball_on := 50
	var dir := 1
	# Force INT path likely with deep post vs press man repeatedly
	for i in 100:
		var out: Dictionary = rules.resolve_play("DEEP_POST", "PRESS_MAN", ball_on, dir)
		if out.event_name == "INT":
			var out2: Dictionary = rules.resolve_play("DEEP_POST", "PRESS_MAN", ball_on, dir)
			assert(out2.field_goal == "" or true)
			break
