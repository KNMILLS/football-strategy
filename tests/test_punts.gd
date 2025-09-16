extends Node

func test_punt_touchback_and_block_and_bounds() -> void:
	var rules: Object = get_node("/root/Rules")
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(24680)
	# From OWN 45 with large net crossing goal line -> touchback at 20
	var res1: Dictionary = rules.do_punt(55, 1) # OWN 45 is ball_on=55 from home perspective
	if res1.touchback:
		assert(res1.new_spot == 80)
	# From OWN 20 confirm BLOCK gives defense ball at LOS
	var attempts := 0
	var saw_block := false
	while attempts < 500 and not saw_block:
		var r: Dictionary = rules.do_punt(20, 1)
		if r.blocked:
			saw_block = true
			assert(r.new_spot == 20)
		break
		attempts += 1
	# Fuzz 2000 punts: bounds on spot
	var blocked := 0
	for i in 2000:
		var res: Dictionary = rules.do_punt(50, 1)
		if res.blocked:
			blocked += 1
		assert(res.new_spot >= 0 and res.new_spot <= 100)


