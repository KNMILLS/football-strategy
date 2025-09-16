extends Node

func _before_each() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(12345)

func test_weighted_choice_deterministic() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(111)
	var options = [["A", 1], ["B", 3], ["C", 6]]
	var seq1: Array = []
	for i in 5000:
		seq1.append(sm.weighted_choice(options))
	sm.set_seed(111)
	var seq2: Array = []
	for i in 5000:
		seq2.append(sm.weighted_choice(options))
	assert(seq1 == seq2)

func test_field_goal_buckets() -> void:
	# Ball on 60, offense_dir +1 → distance = 17 + (100-60) = 57 → top bucket
	var rules: Object = get_node("/root/Rules")
	var b: String = rules.field_goal_bucket(60, 1)
	assert(b == "50_57")
	assert(rules.field_goal_bucket(80, 1) == "40_49")
	assert(rules.field_goal_bucket(95, 1) == "0_39")
	# Out of range long
	assert(rules.field_goal_bucket(40, -1) == "")

func test_distribution_short_pass_vs_shell() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(222)
	var rules: Object = get_node("/root/Rules")
	var incomps: int = 0
	var ints: int = 0
	var gains: int = 0
	for i in 10000:
		var o: Dictionary = rules.resolve_play("PASS_SHORT", "PASS_SHELL", 50, 1)
		if o.event_name == "INCOMP":
			incomps += 1
		elif o.event_name == "INT":
			ints += 1
		elif o.yards_delta != null and int(o.yards_delta) > 0:
			gains += 1
	assert(incomps > gains)
	assert(ints > 100 and ints < 1200)

func test_long_pass_vs_blitz_has_sacks_and_booms() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(333)
	var rules: Object = get_node("/root/Rules")
	var sacks: int = 0
	var explosives: int = 0
	for i in 10000:
		var o: Dictionary = rules.resolve_play("PASS_LONG", "RUN_BLITZ", 50, 1)
		if o.event_name == "SACK":
			sacks += 1
		elif o.yards_delta != null and int(o.yards_delta) >= 20:
			explosives += 1
	assert(sacks > 300)
	assert(explosives > 300)

func test_penalty_replay_logic() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(444)
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	gs.new_session(444, 1, 1)
	# Force a defensive penalty outcome by resolving until one occurs
	var found := false
	for i in 500:
		var o: Dictionary = rules.resolve_play("RUN_IN", "PASS_SHELL", gs.ball_on, gs.offense_dir)
		if o.event_name == "PENALTY_DEF":
			var down_before: int = gs.down
			var to_go_before: int = gs.to_go
			rules.apply_outcome(gs, o)
			assert(gs.down == down_before)
			assert(gs.to_go <= to_go_before)
			found = true
			break
	assert(found)

func test_fumble_recovery_about_50pct() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(555)
	var rules: Object = get_node("/root/Rules")
	var off: int = 0
	for i in 10000:
		if rules.fumble_offense_recovers():
			off += 1
	var rate := float(off) / 10000.0
	assert(rate > 0.46 and rate < 0.54)

func test_punts_non_negative_net_or_blocked() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(666)
	var rules: Object = get_node("/root/Rules")
	for i in 10000:
		var res: Dictionary = rules.do_punt(50, 1)
		if res.blocked:
			assert(res.new_spot == 50)
		else:
			assert(res.new_spot >= 50)

func test_scripted_sequence_no_crash_and_progress() -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(777)
	var gs: Object = get_node("/root/GameState")
	gs.new_session(777, 1, 1)
	var _before_spot: int = gs.ball_on
	gs.offense_select("PASS_SHORT")
	gs.defense_select("PASS_SHELL")
	gs.offense_select("PASS_LONG")
	gs.defense_select("RUN_BLITZ")
	gs.offense_select("RUN_IN")
	gs.defense_select("BALANCED")
	gs.offense_select("FG")
	# After FG drive ends
	assert(gs.drive_index >= 1)
	assert(gs.home_score == 3 or gs.home_score == 0)
	assert(gs.ball_on >= 0 and gs.ball_on <= 100)


