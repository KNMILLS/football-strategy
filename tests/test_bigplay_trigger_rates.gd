extends Node

func test_trigger_rates_screen_zoneblitz_and_prevent() -> void:
	var rules := get_tree().root.get_node("/root/Rules")
	var sm := get_tree().root.get_node("/root/SeedManager")
	sm.set_seed(999)
	var N := 20000
	var ball_on := 40
	var dir := 1
	var base_bp := 0
	var zb_bp := 0
	var prev_bp := 0
	for i in N:
		var o1: Dictionary = rules.resolve_play("SCREEN", "BALANCED", ball_on, dir)
		if o1.has("big_play") and bool(o1["big_play"]):
			base_bp += 1
		var o2: Dictionary = rules.resolve_play("SCREEN", "ZONE_BLITZ", ball_on, dir)
		if o2.has("big_play") and bool(o2["big_play"]):
			zb_bp += 1
		var o3: Dictionary = rules.resolve_play("SCREEN", "PREVENT", ball_on, dir)
		if o3.has("big_play") and bool(o3["big_play"]):
			prev_bp += 1
	var base_rate := float(base_bp) / float(N)
	var zb_rate := float(zb_bp) / float(N)
	var prev_rate := float(prev_bp) / float(N)
	# Allow some slack due to caps and scheme multipliers; just assert directional effect.
	assert(zb_rate > base_rate)
	assert(prev_rate <= base_rate)
