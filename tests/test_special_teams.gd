extends Node

func _before_each() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(13579)

func test_fg_distance_and_buckets() -> void:
	var rules: Object = get_node("/root/Rules")
	# LOS 60 toward +1 => 57 yards
	assert(rules.kick_distance(60, 1) == 57)
	assert(rules.field_goal_bucket(60, 1) == "50_57")
	# OOR
	assert(rules.field_goal_bucket(40, -1) == "")

func test_punt_touchback_to_20() -> void:
	var rules: Object = get_node("/root/Rules")
	# Force a NET travel that crosses goal.
	# We'll simulate NET_50 from the 60 yard line toward +1 -> 110 -> touchback to 80 (20 yard line)
	var res: Dictionary = rules.do_punt(60, 1)
	# Because choice is random, run multiple to find a touchback
	var found := false
	for i in 2000:
		res = rules.do_punt(60, 1)
		if res.has("touchback") and bool(res["touchback"]):
			assert(int(res["new_spot"]) == 80)
			found = true
			break
	assert(found)

