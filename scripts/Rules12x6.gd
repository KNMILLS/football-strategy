extends Node

# Phase 4: 12x6 rules with Big Play system. Rules are loaded from JSON and never mutated.

var RULES: Dictionary = {}

enum Mode { HUMAN_AI, HOT_SEAT }

func _ready() -> void:
	RULES = _load_rules_json("res://data/rules_12x6.json")

static func _load_rules_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("Failed to load rules file: %s" % path)
		return {}
	var txt := f.get_as_text()
	f.close()
	var data: Variant = JSON.parse_string(txt)
	if typeof(data) != TYPE_DICTIONARY:
		push_error("Invalid rules JSON structure")
		return {}
	var d: Dictionary = data as Dictionary
	# Enforce schema version for rules JSON
	var sg := load("res://scripts/SchemaGuard.gd")
	if sg != null and sg.has_method("require"):
		sg.call("require", d, "1.1", "rules_12x6.json")
	return d

static func yards_to_string(offense_dir: int, ball_on: int, _offense_is_home: bool) -> String:
	if ball_on == 50:
		return "50"
	var side: String
	var num: int
	if offense_dir == 1:
		if ball_on < 50:
			side = "OWN"
			num = clamp(ball_on, 1, 49)
		else:
			side = "OPP"
			num = clamp(100 - ball_on, 1, 49)
	else:
		if ball_on > 50:
			side = "OWN"
			num = clamp(100 - ball_on, 1, 49)
		else:
			side = "OPP"
			num = clamp(ball_on, 1, 49)
	return "%s %d" % [side, num]

static func kick_distance(ball_on: int, offense_dir: int) -> int:
	var yards_to_goal := (100 - ball_on) if offense_dir == 1 else ball_on
	var distance := 17 + yards_to_goal
	if distance < 18:
		distance = 18
	return distance

static func field_goal_bucket(ball_on: int, offense_dir: int) -> String:
	var distance := kick_distance(ball_on, offense_dir)
	if distance > 57:
		return ""
	if distance <= 39:
		return "0_39"
	elif distance <= 49:
		return "40_49"
	else:
		return "50_57"

static func _sm() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/SeedManager")

static func _session_rules() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	var gs := tree.root.get_node("/root/GameState")
	if gs != null and gs.has_method("get_session_rules"):
		return gs.call("get_session_rules")
	return null

static func _game_state() -> Object:
	return Engine.get_main_loop().root.get_node("/root/GameState")

static func recompute_to_go(state: Object) -> void:
	var raw: int = int((state.line_to_gain - state.ball_on) * state.offense_dir)
	state.to_go = max(1, int(raw))

static func start_new_series(state: Object) -> void:
	state.series_start = state.ball_on
	state.line_to_gain = clamp(state.series_start + 10 * state.offense_dir, 0, 100)
	state.down = 1
	recompute_to_go(state)

static func assert_state(state: Object) -> void:
	assert(state.ball_on >= 0 and state.ball_on <= 100)
	if state.drive_ended and state.turnover_on_downs:
		assert(state.down == 5)
	else:
		assert(state.down >= 1 and state.down <= 4)
	assert(state.to_go >= 1)
	if state.down == 1:
		assert(state.line_to_gain == clamp(state.series_start + 10 * state.offense_dir, 0, 100))
	if state.drive_ended:
		assert(state.ball_on >= 0 and state.ball_on <= 100)

func get_offense_play_ids() -> Array:
	var ids: Array = []
	var arr: Array = RULES.get("offense_plays", [])
	for p in arr:
		ids.append(String((p as Dictionary).get("id")))
	return ids

func get_defense_front_ids() -> Array:
	var ids: Array = []
	var arr: Array = RULES.get("defense_fronts", [])
	for p in arr:
		ids.append(String((p as Dictionary).get("id")))
	return ids

func expected_yards_for(off_play: String, def_front: String) -> float:
	var entry := _get_matrix_entry(off_play, def_front)
	var buckets := _filter_buckets_by_context(entry)
	buckets = _adjust_buckets_via_session(off_play, def_front, buckets)
	var total_w := 0.0
	var accum := 0.0
	for b in buckets:
		var bd := b as Dictionary
		var w := float(int(bd.get("weight", 0)))
		if w <= 0:
			continue
		total_w += w
		var ev := String(bd.get("event", "YARDS"))
		var val := 0.0
		if ev == "YARDS":
			var r := bd.get("yards_range", [0, 0]) as Array
			val = (float(int(r[0])) + float(int(r[1]))) * 0.5
		elif ev == "INCOMP":
			val = 0.0
		elif ev == "INT":
			val = -10.0
		elif ev == "FUMBLE":
			var off_rec := float(bd.get("offense_recovers", 0.5))
			val = -5.0 * (1.0 - off_rec)
		elif ev == "SACK":
			var r2 := bd.get("yards_range", [-8, -5]) as Array
			val = (float(int(r2[0])) + float(int(r2[1]))) * 0.5
		elif ev == "PENALTY_DEF" or ev == "PENALTY_OFF":
			var p := bd.get("penalty", {}) as Dictionary
			val = float(int(String(p.get("kind", "+0"))))
		accum += val * w
	if total_w <= 0.0:
		return 0.0
	return accum / total_w

func _get_matrix_entry(off_play: String, def_front: String) -> Dictionary:
	var m := RULES.get("matrix", {}) as Dictionary
	if not m.has(off_play):
		return {}
	var row := m[off_play] as Dictionary
	return row.get(def_front, {}) as Dictionary

func _filter_buckets_by_context(entry: Dictionary) -> Array:
	var buckets: Array = entry.get("buckets", [])
	var rules_arr: Array = entry.get("context_rules", [])
	if rules_arr.is_empty():
		return buckets
	var gs := _game_state()
	var to_go: int = 10
	if gs != null:
		to_go = int(gs.to_go)
	var out: Array = []
	for b in buckets:
		var allow := true
		for r in rules_arr:
			var rd := r as Dictionary
			if rd.has("allow_when_to_go_max"):
				if to_go > int(rd["allow_when_to_go_max"]):
					allow = false
		if allow:
			out.append(b)
	return out

func _adjust_buckets_via_session(off_play: String, def_front: String, base_buckets: Array) -> Array:
	var sr := _session_rules()
	if sr != null and sr.has_method("adjust_buckets"):
		return sr.call("adjust_buckets", off_play, def_front, base_buckets)
	return base_buckets

func _pick_bucket_index(buckets: Array) -> int:
	var options: Array = []
	for i in buckets.size():
		var w := int(max(0, int((buckets[i] as Dictionary).get("weight", 0))))
		options.append([i, w])
	var pick: Variant = _sm().weighted_choice(options)
	if pick == null:
		return -1
	return int(pick)

func _materialize_bucket(bucket: Dictionary) -> Dictionary:
	var out: Dictionary = {"yards_delta": 0, "event_name": "", "penalty_replay": false, "turnover": false, "touchdown": false, "field_goal": "", "descriptive_text": ""}
	var kind := String(bucket.get("event", ""))
	if kind == "YARDS":
		var r := bucket.get("yards_range", [0, 0]) as Array
		var lo := int(r[0])
		var hi := int(r[1])
		var yd: int = _sm().randi_range(lo, hi)
		out.event_name = "YARDS"
		out.yards_delta = int(yd)
		out.descriptive_text = "%d yards" % [int(yd)]
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	if kind == "INCOMP":
		out.event_name = "INCOMP"
		out.descriptive_text = "Incomplete"
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	if kind == "SACK":
		var r2 := bucket.get("yards_range", [-8, -5]) as Array
		var slo := int(r2[0])
		var shi := int(r2[1])
		var sval: int = _sm().randi_range(slo, shi)
		out.event_name = "SACK"
		out.yards_delta = int(sval)
		out.descriptive_text = "SACK for %d" % [abs(int(sval))]
		if bucket.has("sack_fumble_chance") and _sm().chance(float(bucket["sack_fumble_chance"])):
			out["sack_fumble"] = true
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	if kind == "INT":
		out.event_name = "INT"
		out.turnover = true
		out.descriptive_text = "Interception"
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	if kind == "FUMBLE":
		out.event_name = "FUMBLE"
		var rec := float(bucket.get("offense_recovers", 0.5))
		var off_rec: bool = _sm().chance(rec)
		if off_rec:
			out.descriptive_text = "Fumble, offense recovers"
		else:
			out.descriptive_text = "Fumble, defense recovers"
			out.turnover = true
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	if kind == "PENALTY_DEF" or kind == "PENALTY_OFF":
		var p := bucket.get("penalty", {}) as Dictionary
		var amt_str := String(p.get("kind", "+0"))
		var amt := int(amt_str)
		out.event_name = kind
		out.yards_delta = int(amt)
		out.penalty_replay = bool(p.get("replay_down", true))
		out.descriptive_text = ("Defensive penalty %d" if kind == "PENALTY_DEF" else "Offensive penalty %d") % [int(amt)]
		return out
	return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)

func _do_punt(ball_on: int, offense_dir: int) -> Dictionary:
	var punt_cfg := (RULES.get("special_teams", {}) as Dictionary).get("punt", {}) as Dictionary
	var options: Array = []
	for row in punt_cfg.get("net_yards", []) as Array:
		options.append([row, int(row.get("weight", 1))])
	var blocked := false
	if _sm().chance(float(punt_cfg.get("block_chance", 0.0))):
		blocked = true
	if blocked:
		return {"blocked": true, "new_spot": ball_on, "touchback": false}
	var chosen: Variant = _sm().weighted_choice(options)
	if chosen == null:
		return {"blocked": false, "new_spot": ball_on, "touchback": false}
	var rowd := chosen as Dictionary
	var r := rowd.get("range", [35, 40]) as Array
	var net: int = _sm().randi_range(int(r[0]), int(r[1]))
	var travel := int(net) * offense_dir
	var tentative := ball_on + travel
	var crosses_goal := (offense_dir == 1 and tentative >= 100) or (offense_dir == -1 and tentative <= 0)
	var new_spot := tentative
	if crosses_goal:
		new_spot = 80 if offense_dir == 1 else 20
	new_spot = clamp(new_spot, 0, 100)
	return {"blocked": false, "new_spot": int(new_spot), "touchback": bool(crosses_goal)}

func _field_goal_resolve(ball_on: int, offense_dir: int) -> Dictionary:
	var out := {"event_name": "", "field_goal": "", "new_spot_after_special": ball_on, "turnover": true, "descriptive_text": ""}
	var buck := field_goal_bucket(ball_on, offense_dir)
	if buck == "":
		out.event_name = "OUT_OF_RANGE"
		out.field_goal = "MISS"
		out["turnover"] = false
		out.descriptive_text = "Field Goal out of range"
		out["timing_tag"] = "FIELD_GOAL_ATTEMPT"
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)
	var fg_cfg := (RULES.get("special_teams", {}) as Dictionary).get("field_goal", {}) as Dictionary
	var dist := fg_cfg.get(buck, {}) as Dictionary
	var sr := _session_rules()
	if sr != null and sr.has_method("adjust_fg_distribution"):
		dist = sr.call("adjust_fg_distribution", buck, dist)
	# Convert to int weights
	var opts: Array = []
	var good_w := int(round(float(dist.get("good", 0.0)) * 1000.0))
	var miss_w := int(round(float(dist.get("miss", 0.0)) * 1000.0))
	var block_w := int(round(float(dist.get("block", 0.0)) * 1000.0))
	opts.append(["GOOD", good_w])
	opts.append(["MISS", miss_w])
	opts.append(["BLOCK", block_w])
	var pick := String(_sm().weighted_choice(opts))
	out.event_name = pick
	out.field_goal = pick
	out.descriptive_text = "Field Goal %s" % [pick]
	out["timing_tag"] = "FIELD_GOAL_ATTEMPT"
	return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", out)

func _bp_matchup_mult(off_play: String, def_front: String) -> float:
	var tbl := (RULES.get("big_play", {}) as Dictionary).get("matchup_multipliers", {}) as Dictionary
	var key := "%s:%s" % [off_play, def_front]
	return float(tbl.get(key, 1.0))

func _bp_caps() -> Dictionary:
	return (RULES.get("big_play", {}) as Dictionary).get("caps", {"offense_bp_max": 0.025, "defense_bp_max": 0.020}) as Dictionary

func _bp_off_base(off_play: String) -> float:
	var base := (RULES.get("big_play", {}) as Dictionary).get("offense_base", {}) as Dictionary
	return float(base.get(off_play, 0.0))

func _bp_def_base(def_front: String) -> float:
	var base := (RULES.get("big_play", {}) as Dictionary).get("defense_base", {}) as Dictionary
	return float(base.get(def_front, 0.0))

func _bp_pick(kind: String) -> String:
	var types_arr := (RULES.get("big_play", {}) as Dictionary).get(kind, []) as Array
	var opts: Array = []
	for t in types_arr:
		var td := t as Dictionary
		opts.append([String(td.get("kind")), int(td.get("weight", 1))])
	var pick: Variant = _sm().weighted_choice(opts)
	return String(pick)

func _offense_play_family(off_play: String) -> String:
	var arr: Array = RULES.get("offense_plays", [])
	for p in arr:
		var pd := p as Dictionary
		if String(pd.get("id")) == off_play:
			return String(pd.get("family", ""))
	return ""

func _yards_to_goal(ball_on: int, offense_dir: int) -> int:
	return (100 - ball_on) if offense_dir == 1 else ball_on

func _apply_offense_big_play(outcome: Dictionary, off_play: String, _def_front: String, ball_on: int, offense_dir: int) -> Dictionary:
	var family := _offense_play_family(off_play)
	var kind := _bp_pick("offense_types")
	if kind == "RUN_BREAKAWAY":
		if outcome.event_name == "YARDS" and int(outcome.yards_delta) >= 3 and family == "RUN":
			var extra: int = _sm().randi_range(20, 60)
			outcome.yards_delta = int(outcome.yards_delta) + int(extra)
			outcome["big_play"] = true
			outcome["big_play_kind"] = kind
			outcome.descriptive_text = "🔥 BIG PLAY – Breakaway Run!"
	elif kind == "YAC_EXPLOSION":
		if outcome.event_name == "YARDS" and family == "PASS":
			var extra2: int = _sm().randi_range(15, 45)
			outcome.yards_delta = int(outcome.yards_delta) + int(extra2)
			outcome["big_play"] = true
			outcome["big_play_kind"] = kind
			outcome.descriptive_text = "🔥 BIG PLAY – YAC Explosion!"
	elif kind == "DEEP_BOMB_TD":
		if off_play == "DEEP_POST" or off_play == "PA_DEEP":
			var to_goal := _yards_to_goal(ball_on, offense_dir)
			outcome.yards_delta = int(to_goal)
			outcome["big_play"] = true
			outcome["big_play_kind"] = kind
			outcome.descriptive_text = "🔥 BIG PLAY – Deep Bomb!"
	return outcome

func _apply_defense_big_play(outcome: Dictionary, base_event: String, _off_play: String) -> Dictionary:
	var kind := _bp_pick("defense_types")
	# Eligibility filters
	if kind == "PICK_SIX" and base_event != "INT":
		return outcome
	if kind == "STRIP_SACK_TD" and not (base_event == "SACK" and bool(outcome.get("sack_fumble", false))):
		return outcome
	if kind == "SCOOP_AND_SCORE" and not (base_event == "FUMBLE" and bool(outcome.get("turnover", false))):
		return outcome
	if (kind == "BLOCK_PUNT_TD" or kind == "BLOCK_FG_TD") and base_event != "BLOCK":
		return outcome
	outcome["defense_td"] = true
	outcome["big_play"] = true
	outcome["big_play_kind"] = kind
	outcome.descriptive_text = "🛡️ %s" % [kind.replace("_", " ")]
	return outcome

func _maybe_big_play(outcome: Dictionary, off_play: String, def_front: String, ball_on: int, offense_dir: int, base_event: String) -> Dictionary:
	var sr := _session_rules()
	var off_base := _bp_off_base(off_play)
	var def_base := _bp_def_base(def_front)
	var mult := _bp_matchup_mult(off_play, def_front)
	var def_mult: float = clamp(1.0 / max(mult, 0.001), 0.6, 1.6)
	var off_scheme: float = 1.0
	var def_scheme: float = 1.0
	if sr != null:
		if sr.has_method("bigplay_off_multiplier"):
			off_scheme = float(sr.call("bigplay_off_multiplier", off_play))
		if sr.has_method("bigplay_def_multiplier"):
			def_scheme = float(sr.call("bigplay_def_multiplier", def_front))
	var caps := _bp_caps()
	var p_off: float = clamp(off_base * mult * off_scheme, 0.0, float(caps.get("offense_bp_max", 0.025)))
	var p_def: float = clamp(def_base * def_mult * def_scheme, 0.0, float(caps.get("defense_bp_max", 0.020)))

	var off_eligible := (base_event == "YARDS" and int(outcome.yards_delta) > 0)
	var def_eligible := (base_event == "INT") or (base_event == "FUMBLE" and bool(outcome.get("turnover", false))) or (base_event == "SACK" and bool(outcome.get("sack_fumble", false))) or (base_event == "BLOCK")

	if def_eligible and (base_event == "INT" or base_event == "BLOCK"):
		# Defense-first precedence on turnover/block
		if _sm().chance(p_def):
			outcome = _apply_defense_big_play(outcome, base_event, off_play)
			return outcome
		if off_eligible and _sm().chance(p_off):
			outcome = _apply_offense_big_play(outcome, off_play, def_front, ball_on, offense_dir)
			return outcome
	else:
		if off_eligible and _sm().chance(p_off):
			outcome = _apply_offense_big_play(outcome, off_play, def_front, ball_on, offense_dir)
			return outcome
		if def_eligible and _sm().chance(p_def):
			outcome = _apply_defense_big_play(outcome, base_event, off_play)
			return outcome
	return outcome

func resolve_play(off_play: String, def_play: String, ball_on: int, offense_dir: int) -> Dictionary:
	# Returns a rich outcome dict. Deterministic via SeedManager.
	var outcome: Dictionary = {"yards_delta": 0, "event_name": "", "penalty_replay": false, "turnover": false, "touchdown": false, "field_goal": "", "descriptive_text": ""}

	if off_play == "PUNT" or off_play == "FIELD_GOAL":
		if off_play == "PUNT":
			var punt := _do_punt(ball_on, offense_dir)
			if bool(punt.get("blocked", false)):
				outcome.event_name = "BLOCK"
				outcome.turnover = true
				outcome.yards_delta = 0
				outcome["new_spot_after_special"] = ball_on
				outcome.descriptive_text = "Punt BLOCKED"
				# Big Play: chance to return for TD
				outcome = _maybe_big_play(outcome, off_play, def_play, ball_on, offense_dir, "BLOCK")
				outcome["timing_tag"] = "TURNOVER"
				return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", outcome)
			outcome.event_name = "PUNT"
			outcome.turnover = true
			outcome.yards_delta = 0
			outcome["new_spot_after_special"] = int(punt.get("new_spot", ball_on))
			outcome["touchback"] = bool(punt.get("touchback", false))
			outcome.descriptive_text = "Punt touchback" if bool(punt.get("touchback", false)) else "Punt"
			outcome["timing_tag"] = "PUNT_TOUCHBACK" if bool(punt.get("touchback", false)) else "PUNT_RESOLVED"
			return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", outcome)
		else:
			var fg := _field_goal_resolve(ball_on, offense_dir)
			if String(fg.get("event_name")) == "BLOCK":
				# Big Play chance on block
				outcome = fg
				outcome = _maybe_big_play(outcome, off_play, def_play, ball_on, offense_dir, "BLOCK")
				return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", outcome)
			return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", fg)

	# Normal matrix-based plays
	var entry := _get_matrix_entry(off_play, def_play)
	var filtered := _filter_buckets_by_context(entry)
	var adjusted := _adjust_buckets_via_session(off_play, def_play, filtered)
	var idx := _pick_bucket_index(adjusted)
	if idx < 0:
		outcome.descriptive_text = "No outcome"
		return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", outcome)
	var bucket := adjusted[idx] as Dictionary
	outcome = _materialize_bucket(bucket)

	# Big Play evaluation (deterministic)
	outcome = _maybe_big_play(outcome, off_play, def_play, ball_on, offense_dir, String(outcome.event_name))
	# Timing tag assignment for normal plays
	var ev := String(outcome.event_name)
	if ev == "INCOMP":
		outcome["timing_tag"] = "INCOMPLETE"
		outcome["ended_inbounds"] = false
	elif ev == "SACK":
		outcome["timing_tag"] = "SACK"
		outcome["ended_inbounds"] = true
	elif ev == "INT":
		outcome["timing_tag"] = "TURNOVER"
		outcome["ended_inbounds"] = true
	elif ev == "FUMBLE":
		if bool(outcome.get("turnover", false)):
			outcome["timing_tag"] = "TURNOVER"
		else:
			var fam := _offense_play_family(off_play)
			if off_play == "QB_SNEAK":
				outcome["timing_tag"] = "QB_SNEAK"
			elif fam == "RUN":
				outcome["timing_tag"] = "RUN_INBOUNDS"
			else:
				if off_play == "DEEP_POST" or off_play == "PA_DEEP" or off_play == "PASS_LONG":
					outcome["timing_tag"] = "PASS_COMPLETE_DEEP"
				else:
					outcome["timing_tag"] = "PASS_COMPLETE_SHORT_MED"
		outcome["ended_inbounds"] = true
	elif ev == "YARDS":
		var fam2 := _offense_play_family(off_play)
		if off_play == "QB_SNEAK":
			outcome["timing_tag"] = "QB_SNEAK"
		elif fam2 == "RUN":
			outcome["timing_tag"] = "RUN_INBOUNDS"
		else:
			if off_play == "DEEP_POST" or off_play == "PA_DEEP" or off_play == "PASS_LONG":
				outcome["timing_tag"] = "PASS_COMPLETE_DEEP"
			else:
				outcome["timing_tag"] = "PASS_COMPLETE_SHORT_MED"
		outcome["ended_inbounds"] = true
	return (load("res://scripts/OutcomeBuilder.gd") as Script).call("make", outcome)

static func apply_outcome(state: Object, outcome: Dictionary) -> void:
	var ball_on: int = state.ball_on
	var dir: int = state.offense_dir
	var down: int = state.down
	var drive_ended := false
	var turnover_on_downs := false

	if outcome.has("new_spot_after_special"):
		ball_on = int(outcome["new_spot_after_special"]) # special teams change of possession
		# Handle defensive TD from blocked kick big play
		if bool(outcome.get("defense_td", false)):
			if state.offense_is_home:
				state.away_score += 6
			else:
				state.home_score += 6
			drive_ended = true
			outcome["touchdown"] = true
			outcome["timing_tag"] = "TOUCHDOWN"
		else:
			if String(outcome.get("field_goal", "")) == "GOOD":
				if state.offense_is_home:
					state.home_score += 3
				else:
					state.away_score += 3
				drive_ended = true
			else:
				drive_ended = true
		state.ball_on = ball_on
		state.turnover_on_downs = false
		state.drive_ended = drive_ended
		# Timing consumption after state mutation
		if state.has_method("_ensure_timing_loaded"):
			state.call("_ensure_timing_loaded")
			var t = state._timing
			if t != null:
				t.consume_clock(state, outcome)
				if state.has_method("_after_outcome_timing"):
					state.call("_after_outcome_timing", outcome)
		return

	# Defensive TD on returns (INT/FUMBLE/SACK strip)
	if bool(outcome.get("defense_td", false)):
		if state.offense_is_home:
			state.away_score += 7
		else:
			state.home_score += 7
		state.drive_ended = true
		state.turnover_on_downs = false
		outcome["touchdown"] = true
		outcome["timing_tag"] = "TOUCHDOWN"
		# Timing consumption after state mutation
		if state.has_method("_ensure_timing_loaded"):
			state.call("_ensure_timing_loaded")
			var t2 = state._timing
			if t2 != null:
				t2.consume_clock(state, outcome)
				if state.has_method("_after_outcome_timing"):
					state.call("_after_outcome_timing", outcome)
		return

	# Non-special plays and penalties
	var yards_delta := int(outcome.yards_delta)
	var pre_unclamped := ball_on + yards_delta * dir
	# Safety detection: ball carried/penalized into own end zone
	var is_safety := (dir == 1 and pre_unclamped < 0) or (dir == -1 and pre_unclamped > 100)
	if is_safety:
		if state.offense_is_home:
			state.away_score += 2
		else:
			state.home_score += 2
		state.drive_ended = true
		state.turnover_on_downs = false
		outcome["safety"] = true
		outcome["timing_tag"] = "TURNOVER"
		outcome["descriptive_text"] = "Safety"
		# Place ball at goal line for log consistency
		state.ball_on = (0 if dir == 1 else 100)
		# Timing consumption after state mutation
		if state.has_method("_ensure_timing_loaded"):
			state.call("_ensure_timing_loaded")
			var t0 = state._timing
			if t0 != null:
				t0.consume_clock(state, outcome)
				if state.has_method("_after_outcome_timing"):
					state.call("_after_outcome_timing", outcome)
		return

	ball_on = clamp(pre_unclamped, 0, 100)

	# Touchdown check
	if (dir == 1 and ball_on >= 100) or (dir == -1 and ball_on <= 0):
		if state.offense_is_home:
			state.home_score += 6
		else:
			state.away_score += 6
		drive_ended = true
		state.ball_on = ball_on
		state.drive_ended = true
		state.turnover_on_downs = false
		outcome["touchdown"] = true
		outcome["timing_tag"] = "TOUCHDOWN"
		# Timing consumption after state mutation
		if state.has_method("_ensure_timing_loaded"):
			state.call("_ensure_timing_loaded")
			var t3 = state._timing
			if t3 != null:
				t3.consume_clock(state, outcome)
		return

	if outcome.penalty_replay:
		state.ball_on = ball_on
		recompute_to_go(state)
		if state.to_go <= 0:
			start_new_series(state)
		state.drive_ended = false
		state.turnover_on_downs = false
		# Timing consumption after state mutation
		if state.has_method("_ensure_timing_loaded"):
			state.call("_ensure_timing_loaded")
			var t4 = state._timing
			if t4 != null:
				t4.consume_clock(state, outcome)
				if state.has_method("_after_outcome_timing"):
					state.call("_after_outcome_timing", outcome)
		return

	# Normal down advancement using line_to_gain
	state.ball_on = ball_on
	recompute_to_go(state)
	if outcome.turnover:
		drive_ended = true
	else:
		if state.to_go <= 0:
			start_new_series(state)
		else:
			down += 1
			if down > 4:
				turnover_on_downs = true
				drive_ended = true

	state.down = down
	state.drive_ended = drive_ended
	state.turnover_on_downs = turnover_on_downs
	# Timing consumption after state mutation
	if state.has_method("_ensure_timing_loaded"):
		state.call("_ensure_timing_loaded")
		var t5 = state._timing
		if t5 != null:
			t5.consume_clock(state, outcome)
			if state.has_method("_after_outcome_timing"):
				state.call("_after_outcome_timing", outcome)
