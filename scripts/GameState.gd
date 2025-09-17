extends Node

signal ui_state_changed(state_name: String)
signal ui_update_header()
signal ui_update_field()
signal ui_update_log(new_line: String)
signal ui_banner(text: String)
signal ui_coin_toss_needed()

enum State { IDLE, PRESNAP, DEFENSE_SELECT, RESOLVE, DRIVE_END }

const TimingRes: Script = preload("res://scripts/Timing.gd")

var mode: int = 0
var num_drives: int = 4
var drive_index: int = 0

var home_score: int = 0
var away_score: int = 0

var offense_is_home: bool = true
var ball_on: int = 25 # absolute yards from home goal line
var offense_dir: int = 1 # +1 towards 100 if home offense, -1 towards 0 if away offense
var down: int = 1
var to_go: int = 10
var series_start: int = 25
var line_to_gain: int = 35

# Clock/Quarter state
var quarter: int = 1
var clock_remaining: int = 900 # seconds remaining in current quarter
var _quarter_seconds_default: int = 900
var _quarter_seconds_cfg: int = 900
var _quarter_preset_key: String = "STANDARD"
var _two_minute_warn_q2: bool = false
var _two_minute_warn_q4: bool = false
var _two_minute_warn_ot: bool = false
var _timing: Object = null

var last_offensive_calls: Array = []
var current_offense_play: String = ""
var current_defense_play: String = ""

var drive_ended: bool = false
var turnover_on_downs: bool = false

# Session selections and rules
var selected_home_team_id: String = ""
var selected_away_team_id: String = ""
var difficulty_level: int = 1 # Difficulty.Level.PRO by default
var _session_rules_obj: Object = null

# Overtime state
var is_overtime: bool = false
var ot_quarter_seconds: int = 0
var ot_possession_stage: String = "NONE" # NONE | FIRST | SECOND | SUDDEN
var ot_first_pos_team: int = 0 # 0 home, 1 away
var ot_second_pos_team: int = 1
var ot_first_pos_done: bool = false
var ot_second_pos_done: bool = false
var ot_score_first: int = 0
var ot_score_second: int = 0
var ot_timeouts: Dictionary = {0: 2, 1: 2}
var coin_toss_winner: int = 0 # 0 home, 1 away
var coin_toss_choice: String = "RECEIVE" # RECEIVE | DEFEND
var _ot_announced_sudden: bool = false
var game_over: bool = false
var game_result_text: String = ""

func _ready() -> void:
	_ensure_timing_loaded()
	_emit_all()

func _emit_all() -> void:
	emit_signal("ui_update_header")
	emit_signal("ui_update_field")

func new_session(seed_value: int, drives: int, new_mode: int) -> void:
	var sm: Object = get_node("/root/SeedManager")
	sm.set_seed(seed_value)
	num_drives = max(1, drives)
	mode = new_mode
	drive_index = 0
	home_score = 0
	away_score = 0
	offense_is_home = true
	quarter = 1
	_ensure_timing_loaded()
	clock_remaining = _quarter_seconds_cfg
	_two_minute_warn_q2 = false
	_two_minute_warn_q4 = false
	_two_minute_warn_ot = false
	is_overtime = false
	ot_quarter_seconds = 0
	ot_possession_stage = "NONE"
	ot_first_pos_team = 0
	ot_second_pos_team = 1
	ot_first_pos_done = false
	ot_second_pos_done = false
	ot_score_first = 0
	ot_score_second = 0
	ot_timeouts = {0: 2, 1: 2}
	coin_toss_winner = 0
	coin_toss_choice = "RECEIVE"
	_ot_announced_sudden = false
	game_over = false
	game_result_text = ""
	# Default teams if not configured
	if selected_home_team_id == "" or selected_away_team_id == "":
		var tl: Object = get_node("/root/TeamLoader")
		var ids: Array = tl.call("get_team_ids")
		if ids.size() >= 2:
			selected_home_team_id = String(ids[0])
			selected_away_team_id = String(ids[1])
	# Ensure Difficulty autoload reflects level
	var diff: Object = get_node("/root/Difficulty")
	diff.call("set_level", int(difficulty_level))
	_rebuild_session_rules()
	_start_drive()
	emit_signal("ui_state_changed", "PRESNAP")

func _start_drive() -> void:
	drive_index += 1
	ball_on = 25 if offense_is_home else 75
	offense_dir = 1 if offense_is_home else -1
	var rules: Object = get_node("/root/Rules")
	rules.start_new_series(self)
	current_offense_play = ""
	current_defense_play = ""
	drive_ended = false
	turnover_on_downs = false
	_emit_all()

func start_series_for(team_index: int) -> void:
	# team_index: 0 home offense, 1 away offense
	offense_is_home = (int(team_index) == 0)
	ball_on = 25 if offense_is_home else 75
	offense_dir = 1 if offense_is_home else -1
	var rules: Object = get_node("/root/Rules")
	rules.start_new_series(self)
	current_offense_play = ""
	current_defense_play = ""
	drive_ended = false
	turnover_on_downs = false
	_emit_all()

func get_down_text() -> String:
	var ords := ["", "1st", "2nd", "3rd", "4th"]
	var idx: int = clamp(down, 1, 4)
	return "%s & %d" % [ords[idx], to_go]

func get_score_text() -> String:
	return "Home %d - %d Away" % [home_score, away_score]

func get_drive_text() -> String:
	return "Drive %d / %d" % [drive_index, num_drives]

func get_clock_text() -> String:
	var s: int = int(max(0, int(clock_remaining)))
	var mm: int = int(s / 60)
	var ss: int = int(s % 60)
	return "%d:%02d" % [mm, ss]

func get_quarter_text() -> String:
	if is_overtime:
		return "OT"
	var q := int(quarter)
	if q <= 0:
		q = 1
	return "Q%d" % [q]

func get_spot_text() -> String:
	return (get_node("/root/Rules") as Object).yards_to_string(offense_dir, ball_on, offense_is_home)

func offense_select(play_key: String) -> void:
	if current_offense_play != "":
		return
	current_offense_play = play_key
	last_offensive_calls.append(play_key)
	if last_offensive_calls.size() > 12:
		last_offensive_calls.pop_front()
	if mode == 0:
		var da: Script = load("res://scripts/DefenseAI.gd")
		current_defense_play = String(da.call("choose_defense", down, to_go, ball_on, offense_dir, last_offensive_calls))
		_resolve()
	else:
		emit_signal("ui_state_changed", "DEFENSE_SELECT")

func defense_select(play_key: String) -> void:
	if current_offense_play == "":
		return
	current_defense_play = play_key
	_resolve()

func _resolve() -> void:
	if game_over:
		return
	_check_two_minute_warning()
	var rules: Object = get_node("/root/Rules")
	var pre_home: int = home_score
	var pre_away: int = away_score
	var outcome: Dictionary = rules.resolve_play(current_offense_play, current_defense_play, ball_on, offense_dir)
	rules.apply_outcome(self, outcome)
	rules.assert_state(self)
	# Build standardized banner/log via EventLogger
	var EL: Script = load("res://scripts/EventLogger.gd")
	var banner := String(EL.call("banner", current_offense_play, current_defense_play, outcome))
	emit_signal("ui_banner", banner)
	# Update field
	_emit_all()
	# Delay logging to respect 1s reveal banner
	await get_tree().create_timer(1.0).timeout
	# Log line via EventLogger
	_emit_log(String(EL.call("log_line", current_offense_play, current_defense_play, outcome)))

	if drive_ended:
		if is_overtime:
			_handle_overtime_drive_end(outcome, pre_home, pre_away)
			if game_over:
				return
		else:
			# Switch possession and maybe next drive (pre-OT mode)
			if drive_index >= num_drives:
				emit_signal("ui_state_changed", "DRIVE_END")
			else:
				offense_is_home = !offense_is_home
				_start_drive()
	else:
		# Continue same drive
		current_offense_play = ""
		current_defense_play = ""
		emit_signal("ui_state_changed", "PRESNAP")

func _emit_log(line: String) -> void:
	emit_signal("ui_update_log", line)

func _ensure_timing_loaded() -> void:
	if _timing == null:
		_timing = TimingRes.new()
		_timing.load_cfg()
	# Determine quarter length via GameConfig preset; fallback to timing default
	var gc := get_node_or_null("/root/GameConfig")
	if gc != null and gc.has_method("get_quarter_preset"):
		_quarter_preset_key = String(gc.call("get_quarter_preset")).to_upper()
	else:
		_quarter_preset_key = String(_timing.cfg.get("default_preset", "STANDARD"))
	var presets := (_timing.cfg.get("quarter_presets", {}) as Dictionary)
	var cfg_q := int(presets.get(_quarter_preset_key, 0))
	if cfg_q <= 0:
		cfg_q = int(_timing.cfg.get("quarter_seconds", _quarter_seconds_default))
	_quarter_seconds_cfg = cfg_q if cfg_q > 0 else _quarter_seconds_default
	# Do not reset clock here; initialization and rollover handle it

func _check_two_minute_warning() -> void:
	if clock_remaining > 120:
		return
	if is_overtime and not _two_minute_warn_ot:
		_two_minute_warn_ot = true
		emit_signal("ui_banner", "TWO-MINUTE WARNING")
	elif quarter == 2 and not _two_minute_warn_q2:
		_two_minute_warn_q2 = true
		emit_signal("ui_banner", "TWO-MINUTE WARNING")
	elif quarter == 4 and not _two_minute_warn_q4:
		_two_minute_warn_q4 = true
		emit_signal("ui_banner", "TWO-MINUTE WARNING")

func _after_outcome_timing(_outcome: Dictionary) -> void:
	_ensure_timing_loaded()
	# Called after timing has been consumed in Rules.apply_outcome
	if int(clock_remaining) <= 0:
		if is_overtime:
			clock_remaining = 0
			_maybe_finalize_overtime_end_at_clock()
		else:
			var was_q4 := (quarter == 4)
			quarter += 1
			_ensure_timing_loaded()
			clock_remaining = _quarter_seconds_cfg
			if was_q4:
				_maybe_enter_overtime_after_q4()

func _maybe_enter_overtime_after_q4() -> void:
	# Enter OT if tied after Q4 expiration
	if home_score == away_score and not is_overtime:
		_prepare_overtime_entry()

func _ot_preset_seconds() -> int:
	_ensure_timing_loaded()
	if _timing != null and _timing.has_method("get_preset_seconds"):
		return int(_timing.call("get_preset_seconds", _quarter_preset_key))
	return _quarter_seconds_cfg

func _prepare_overtime_entry() -> void:
	# Prepare OT period and request coin toss from UI
	is_overtime = true
	quarter = 5
	_ot_announced_sudden = false
	_two_minute_warn_ot = false
	ot_quarter_seconds = _ot_preset_seconds()
	clock_remaining = ot_quarter_seconds
	ot_timeouts = {0: 2, 1: 2}
	ot_possession_stage = "NONE"
	ot_first_pos_done = false
	ot_second_pos_done = false
	ot_score_first = 0
	ot_score_second = 0
	emit_signal("ui_banner", "OVERTIME — Fair Possession")
	if has_signal("ui_coin_toss_needed"):
		emit_signal("ui_coin_toss_needed")
	_emit_all()

func perform_coin_toss(visitor_called_heads: bool) -> int:
	# Returns 0 for Home won, 1 for Away won
	var sm: Object = get_node("/root/SeedManager")
	var toss: int = int(sm.randi_range(0, 1)) # 0 Heads, 1 Tails
	var visitor_wins: bool = (toss == 0 and visitor_called_heads) or (toss == 1 and not visitor_called_heads)
	coin_toss_winner = (1 if visitor_wins else 0)
	return int(coin_toss_winner)

func enter_overtime_with_choice(winner_choice: String) -> void:
	if not is_overtime:
		_prepare_overtime_entry()
	coin_toss_choice = String(winner_choice).to_upper()
	var first_team := coin_toss_winner if coin_toss_choice == "RECEIVE" else (1 - coin_toss_winner)
	_enter_overtime_with_first_receiver(int(first_team))

func _enter_overtime_with_first_receiver(first_receiver_team: int) -> void:
	is_overtime = true
	quarter = 5
	_ot_announced_sudden = false
	_two_minute_warn_ot = false
	ot_quarter_seconds = _ot_preset_seconds()
	clock_remaining = ot_quarter_seconds
	ot_timeouts = {0: 2, 1: 2}
	ot_possession_stage = "FIRST"
	ot_first_pos_team = int(first_receiver_team)
	ot_second_pos_team = 1 - ot_first_pos_team
	ot_first_pos_done = false
	ot_second_pos_done = false
	ot_score_first = 0
	ot_score_second = 0
	emit_signal("ui_banner", "OVERTIME — Fair Possession")
	start_series_for(ot_first_pos_team)
	_emit_all()

func _points_gained_by(team_index: int, pre_home: int, pre_away: int) -> int:
	if team_index == 0:
		return int(home_score - pre_home)
	return int(away_score - pre_away)

func _defense_team_index_for_current_offense() -> int:
	if offense_is_home:
		return 1
	return 0

func _offense_team_index() -> int:
	if offense_is_home:
		return 0
	return 1

func _handle_overtime_drive_end(outcome: Dictionary, pre_home: int, pre_away: int) -> void:
	# Immediate end if first series defensive TD or safety
	if ot_possession_stage == "FIRST":
		var defense_wins_now := bool(outcome.get("defense_td", false)) or bool(outcome.get("safety", false))
		if defense_wins_now:
			_end_game_with_winner(_defense_team_index_for_current_offense())
			return
		# Record first possession points and move to second
		ot_score_first = _points_gained_by(ot_first_pos_team, pre_home, pre_away)
		ot_first_pos_done = true
		ot_possession_stage = "SECOND"
		start_series_for(ot_second_pos_team)
		return
	elif ot_possession_stage == "SECOND":
		ot_score_second = _points_gained_by(ot_second_pos_team, pre_home, pre_away)
		ot_second_pos_done = true
		if ot_score_second > ot_score_first:
			_end_game_with_winner(ot_second_pos_team)
			return
		elif ot_score_second == ot_score_first:
			ot_possession_stage = "SUDDEN"
			if not _ot_announced_sudden:
				_ot_announced_sudden = true
				emit_signal("ui_banner", "Sudden Death")
			# Next series: alternate possession
			start_series_for(1 - _offense_team_index())
			return
		else:
			_end_game_with_winner(ot_first_pos_team)
			return
	elif ot_possession_stage == "SUDDEN":
		var pts := _points_gained_by(_offense_team_index(), pre_home, pre_away)
		if pts > 0 or bool(outcome.get("safety", false)) or bool(outcome.get("defense_td", false)):
			# Any score ends it in sudden
			var winner := _offense_team_index()
			if bool(outcome.get("defense_td", false)) or bool(outcome.get("safety", false)):
				winner = _defense_team_index_for_current_offense()
			_end_game_with_winner(int(winner))
			return
		# No score, alternate possession if clock remains
		if int(clock_remaining) > 0:
			start_series_for(1 - _offense_team_index())
			return
		# If no time, tie will be handled by clock check
		return

func _maybe_finalize_overtime_end_at_clock() -> void:
	if not is_overtime:
		return
	if int(clock_remaining) > 0:
		return
	# Only end as tie if first and second possessions are complete and scores tied, or in sudden death still tied
	var tied := (home_score == away_score)
	var fair_pos_complete := (ot_first_pos_done and ot_second_pos_done)
	if tied and fair_pos_complete:
		_end_game_tie()

func _end_game_with_winner(team_index: int) -> void:
	game_over = true
	is_overtime = true
	var who := "Home" if int(team_index) == 0 else "Away"
	game_result_text = "%s wins in OT" % [who]
	emit_signal("ui_banner", game_result_text)
	_emit_all()

func _end_game_tie() -> void:
	game_over = true
	is_overtime = true
	game_result_text = "Game ends in a tie."
	emit_signal("ui_banner", game_result_text)
	_emit_all()

func ot_timeouts_remaining(team_index: int) -> int:
	return int(ot_timeouts.get(int(team_index), 0))

func spend_ot_timeout(team_index: int) -> bool:
	if not is_overtime:
		return false
	var key := int(team_index)
	var rem := int(ot_timeouts.get(key, 0))
	if rem <= 0:
		return false
	ot_timeouts[key] = rem - 1
	_emit_all()
	return true

func ot_debug_end_possession(kind: String) -> void:
	# Test-only helper to deterministically end the current OT possession with a given result.
	if not is_overtime:
		return
	var pre_home := int(home_score)
	var pre_away := int(away_score)
	var outcome := {}
	var k := String(kind).to_upper()
	if k == "FG":
		if offense_is_home:
			home_score += 3
		else:
			away_score += 3
		outcome = {"event_name": "GOOD", "field_goal": "GOOD", "timing_tag": "FIELD_GOAL_ATTEMPT"}
	elif k == "TD":
		if offense_is_home:
			home_score += 7
		else:
			away_score += 7
		outcome = {"event_name": "TOUCHDOWN", "timing_tag": "TOUCHDOWN"}
	elif k == "DEF_TD":
		if offense_is_home:
			away_score += 7
		else:
			home_score += 7
		outcome = {"event_name": "TOUCHDOWN", "defense_td": true, "timing_tag": "TOUCHDOWN"}
	elif k == "SAFETY":
		if offense_is_home:
			away_score += 2
		else:
			home_score += 2
		outcome = {"event_name": "SAFETY", "safety": true, "timing_tag": "TURNOVER"}
	else:
		# No score / turnover or punt
		outcome = {"event_name": "TURNOVER", "turnover": true, "timing_tag": "TURNOVER"}
	drive_ended = true
	turnover_on_downs = true
	_handle_overtime_drive_end(outcome, pre_home, pre_away)

func set_session_config(home_team_id: String, away_team_id: String, new_difficulty_level: int) -> void:
	selected_home_team_id = String(home_team_id)
	selected_away_team_id = String(away_team_id)
	difficulty_level = int(new_difficulty_level)
	var diff: Object = get_node("/root/Difficulty")
	diff.call("set_level", difficulty_level)
	_rebuild_session_rules()

func _rebuild_session_rules() -> void:
	var sr_script: Script = load("res://scripts/SessionRules.gd")
	var new_sr: Object = sr_script.new()
	var tl: Object = get_node("/root/TeamLoader")
	var team1: Dictionary = tl.call("get_team_dict", selected_home_team_id)
	var team2: Dictionary = tl.call("get_team_dict", selected_away_team_id)
	new_sr.call("build", get_node("/root/Rules"), team1, team2, int(difficulty_level))
	if new_sr.has_method("record_teams"):
		new_sr.call("record_teams", team1, team2)
	_session_rules_obj = new_sr

func get_session_rules() -> Object:
	return _session_rules_obj
