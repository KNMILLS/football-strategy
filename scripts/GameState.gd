extends Node

signal ui_state_changed(state_name: String)
signal ui_update_header()
signal ui_update_field()
signal ui_update_log(new_line: String)
signal ui_banner(text: String)

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
var _two_minute_warn_q2: bool = false
var _two_minute_warn_q4: bool = false
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
	clock_remaining = _quarter_seconds_cfg
	_two_minute_warn_q2 = false
	_two_minute_warn_q4 = false
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
	_check_two_minute_warning()
	var rules: Object = get_node("/root/Rules")
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
		# Switch possession and maybe next drive
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
		var cfg_q := _quarter_seconds_default
		if _timing.cfg.has("quarter_seconds"):
			cfg_q = int(_timing.cfg["quarter_seconds"])
		_quarter_seconds_cfg = cfg_q if cfg_q > 0 else _quarter_seconds_default
		if clock_remaining <= 0:
			clock_remaining = _quarter_seconds_cfg

func _check_two_minute_warning() -> void:
	if clock_remaining > 120:
		return
	if quarter == 2 and not _two_minute_warn_q2:
		_two_minute_warn_q2 = true
		emit_signal("ui_banner", "TWO-MINUTE WARNING")
	elif quarter == 4 and not _two_minute_warn_q4:
		_two_minute_warn_q4 = true
		emit_signal("ui_banner", "TWO-MINUTE WARNING")

func _after_outcome_timing(outcome: Dictionary) -> void:
	_ensure_timing_loaded()
	if outcome == null:
		return
	if not outcome.has("ended_inbounds"):
		outcome["ended_inbounds"] = true
	_timing.consume_clock(self, outcome)
	if int(clock_remaining) <= 0:
		quarter += 1
		clock_remaining = _quarter_seconds_cfg

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
