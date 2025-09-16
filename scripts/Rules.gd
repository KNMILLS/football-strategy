extends Node

const DATA := {
	"plays": {
		"OFFENSE": ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG", "PUNT", "FG"],
		"DEFENSE": ["RUN_BLITZ", "BALANCED", "PASS_SHELL", "ALL_OUT_RUSH"]
	},
	"matrix": {
		"RUN_IN": {
			"RUN_BLITZ": [["-3", 10], ["0", 25], ["2", 35], ["4", 20], ["FUMBLE", 5], ["PENALTY_OFF_-10", 5]],
			"BALANCED": [["-1", 10], ["2", 25], ["3", 30], ["5", 25], ["8", 5], ["FUMBLE", 5]],
			"PASS_SHELL": [["2", 15], ["3", 30], ["5", 30], ["8", 15], ["10", 5], ["PENALTY_DEF_+5", 5]],
			"ALL_OUT_RUSH": [["-2", 25], ["0", 30], ["2", 25], ["4", 10], ["FUMBLE", 10]]
		},
		"RUN_OUT": {
			"RUN_BLITZ": [["-2", 15], ["0", 25], ["3", 25], ["6", 20], ["FUMBLE", 5], ["PENALTY_OFF_-10", 10]],
			"BALANCED": [["0", 10], ["3", 25], ["5", 30], ["8", 20], ["12", 10], ["FUMBLE", 5]],
			"PASS_SHELL": [["2", 10], ["5", 25], ["7", 25], ["10", 20], ["15", 10], ["PENALTY_DEF_+5", 10]],
			"ALL_OUT_RUSH": [["-3", 15], ["0", 25], ["3", 30], ["6", 20], ["FUMBLE", 10]]
		},
		"PASS_SHORT": {
			"RUN_BLITZ": [["SACK_-7", 15], ["INCOMP", 25], ["3", 25], ["6", 20], ["INT", 5], ["PENALTY_DEF_+5", 10]],
			"BALANCED": [["INCOMP", 25], ["4", 25], ["6", 25], ["9", 15], ["INT", 5], ["PENALTY_DEF_+5", 5]],
			"PASS_SHELL": [["INCOMP", 35], ["3", 25], ["5", 20], ["7", 10], ["INT", 5], ["PENALTY_DEF_+5", 5]],
			"ALL_OUT_RUSH": [["SACK_-8", 20], ["INCOMP", 30], ["5", 25], ["10", 15], ["INT", 10]]
		},
		"PASS_LONG": {
			"RUN_BLITZ": [["SACK_-9", 10], ["INCOMP", 30], ["12", 20], ["20", 20], ["30", 10], ["INT", 10]],
			"BALANCED": [["INCOMP", 40], ["12", 20], ["18", 20], ["25", 10], ["INT", 10]],
			"PASS_SHELL": [["INCOMP", 50], ["10", 20], ["15", 15], ["22", 10], ["INT", 5]],
			"ALL_OUT_RUSH": [["SACK_-10", 20], ["INCOMP", 30], ["15", 20], ["28", 15], ["INT", 15]]
		}
	},
	"special": {
		"PUNT": [["NET_35", 60], ["NET_40", 25], ["NET_50", 10], ["BLOCK", 5]],
		"FG": {
			"0_39": [["GOOD", 90], ["MISS", 10]],
			"40_49": [["GOOD", 75], ["MISS", 25]],
			"50_57": [["GOOD", 55], ["MISS", 45]]
		}
	}
}

enum Mode { HUMAN_AI, HOT_SEAT }

static func yards_to_string(offense_dir: int, ball_on: int, _offense_is_home: bool) -> String:
	# Standard gridiron notation: OWN 1..49, 50, OPP 49..1 (from offense perspective)
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
	assert(state.down >= 1 and state.down <= 4)
	assert(state.to_go >= 1)

static func do_punt(ball_on: int, offense_dir: int) -> Dictionary:
	var choice = _sm().weighted_choice(DATA["special"]["PUNT"])
	if String(choice).begins_with("NET_"):
		var net := int(String(choice).get_slice("_", 1))
		var travel := net * offense_dir
		var tentative := ball_on + travel
		var crosses_goal := (offense_dir == 1 and tentative >= 100) or (offense_dir == -1 and tentative <= 0)
		var new_spot := tentative
		if crosses_goal:
			new_spot = 80 if offense_dir == 1 else 20
		new_spot = clamp(new_spot, 0, 100)
		return {"blocked": false, "new_spot": new_spot, "event_name": String(choice), "touchback": crosses_goal}
	elif choice == "BLOCK":
		return {"blocked": true, "new_spot": ball_on, "event_name": "BLOCK", "touchback": false}
	return {"blocked": false, "new_spot": ball_on, "event_name": "UNKNOWN", "touchback": false}

static func weighted_choice(options: Array) -> Variant:
	return _sm().weighted_choice(options)

static func _parse_result_token(token: String) -> Dictionary:
	var result: Dictionary = {"yards_delta": null, "event_name": ""}
	if token == "INCOMP" or token == "INT" or token == "FUMBLE":
		result.event_name = token
		return result
	if token.begins_with("SACK_"):
		var n := int(token.get_slice("_", 1)) # negative number in string
		result.event_name = "SACK"
		result.yards_delta = n
		return result
	if token.begins_with("PENALTY_DEF_"):
		var amt := int(token.get_slice("_", 2))
		result.event_name = "PENALTY_DEF"
		result.yards_delta = amt
		return result
	if token.begins_with("PENALTY_OFF_"):
		var amt2 := int(token.get_slice("_", 2))
		result.event_name = "PENALTY_OFF"
		result.yards_delta = amt2
		return result
	# Plain yardage string
	result.yards_delta = int(token)
	result.event_name = "YARDS"
	return result

static func resolve_play(off_play: String, def_play: String, ball_on: int, offense_dir: int) -> Dictionary:
	# Returns: { yards_delta: int?, event_name: String?, penalty_replay: bool, turnover: bool, touchdown: bool, field_goal: String?, descriptive_text: String }
	var outcome: Dictionary = {"yards_delta": null, "event_name": "", "penalty_replay": false, "turnover": false, "touchdown": false, "field_goal": "", "descriptive_text": ""}
	if off_play == "PUNT":
		var punt = do_punt(ball_on, offense_dir)
		outcome.event_name = punt.event_name
		if punt.blocked:
			outcome.descriptive_text = "Punt BLOCKED! Possession changes at LOS."
		else:
			if punt.touchback:
				outcome.descriptive_text = "Punt touchback"
			else:
				outcome.descriptive_text = "Punt for %s." % [punt.event_name]
		outcome.turnover = true
		outcome.yards_delta = 0
		outcome["new_spot_after_special"] = int(punt.new_spot)
		outcome["touchback"] = bool(punt.touchback)
		return outcome
	if off_play == "FG":
		var buck := field_goal_bucket(ball_on, offense_dir)
		if buck == "":
			outcome.event_name = "OUT_OF_RANGE"
			outcome.field_goal = "MISS"
			outcome.turnover = false
			outcome.descriptive_text = "Field Goal out of range"
			outcome.yards_delta = 0
			outcome.penalty_replay = true
			return outcome
		var res = _sm().weighted_choice(DATA["special"]["FG"][buck])
		outcome.event_name = String(res)
		outcome.field_goal = String(res)
		outcome.turnover = true
		outcome.yards_delta = 0
		outcome["new_spot_after_special"] = ball_on
		outcome.descriptive_text = "Field Goal %s" % [String(res)]
		return outcome
	# Matrix-based plays
	var table: Array = DATA["matrix"][off_play][def_play]
	var token: String = String(weighted_choice(table))
	var parsed := _parse_result_token(token)
	match parsed.event_name:
		"YARDS":
			outcome.yards_delta = int(parsed.yards_delta)
			outcome.descriptive_text = "%s yards" % [outcome.yards_delta]
			return outcome
		"INCOMP":
			outcome.event_name = "INCOMP"
			outcome.yards_delta = 0
			outcome.descriptive_text = "Incomplete"
			return outcome
		"SACK":
			outcome.event_name = "SACK"
			outcome.yards_delta = int(parsed.yards_delta)
			outcome.descriptive_text = "SACK for %d" % [abs(outcome.yards_delta)]
			return outcome
		"INT":
			outcome.event_name = "INT"
			outcome.turnover = true
			outcome.yards_delta = 0
			outcome.descriptive_text = "Interception"
			return outcome
		"FUMBLE":
			outcome.event_name = "FUMBLE"
			var offense_recovers := fumble_offense_recovers()
			if offense_recovers:
				outcome.yards_delta = 0
				outcome.descriptive_text = "Fumble, offense recovers"
			else:
				outcome.turnover = true
				outcome.yards_delta = 0
				outcome.descriptive_text = "Fumble, defense recovers"
			return outcome
		"PENALTY_DEF":
			outcome.event_name = "PENALTY_DEF"
			outcome.penalty_replay = true
			outcome.yards_delta = int(parsed.yards_delta)
			outcome.descriptive_text = "Defensive penalty %d" % [outcome.yards_delta]
			return outcome
		"PENALTY_OFF":
			outcome.event_name = "PENALTY_OFF"
			outcome.penalty_replay = true
			outcome.yards_delta = int(parsed.yards_delta)
			outcome.descriptive_text = "Offensive penalty %d" % [outcome.yards_delta]
			return outcome
	outcome.descriptive_text = token
	return outcome

static func fumble_offense_recovers() -> bool:
	return _sm().chance(0.5)

static func apply_outcome(state: Object, outcome: Dictionary) -> void:
	var ball_on: int = state.ball_on
	var dir: int = state.offense_dir
	var down: int = state.down
	var drive_ended := false
	var turnover_on_downs := false

	if outcome.has("new_spot_after_special"):
		ball_on = int(outcome["new_spot_after_special"]) # special teams change of possession
		if outcome.field_goal == "GOOD":
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
		return

	# Non-special plays and penalties
	var yards_delta := int(outcome.yards_delta)
	ball_on += yards_delta * dir
	ball_on = clamp(ball_on, 0, 100)

	# Touchdown check
	if (dir == 1 and ball_on >= 100) or (dir == -1 and ball_on <= 0):
		if state.offense_is_home:
			state.home_score += 7
		else:
			state.away_score += 7
		drive_ended = true
		state.ball_on = ball_on
		state.drive_ended = true
		state.turnover_on_downs = false
		return

	if outcome.penalty_replay:
		state.ball_on = ball_on
		recompute_to_go(state)
		if state.to_go <= 0:
			start_new_series(state)
		state.drive_ended = false
		state.turnover_on_downs = false
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
