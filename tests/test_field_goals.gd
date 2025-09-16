extends Node

func test_field_goals_exact_ranges() -> void:
	var rules: Object = get_node("/root/Rules")
	assert(rules.kick_distance(60, 1) == 57)
	assert(rules.field_goal_bucket(60, 1) == "50_57")
	assert(rules.kick_distance(61, 1) == 56)
	assert(rules.field_goal_bucket(61, 1) == "50_57")
	assert(rules.kick_distance(42, 1) == 75)
	assert(rules.field_goal_bucket(42, 1) == "")


