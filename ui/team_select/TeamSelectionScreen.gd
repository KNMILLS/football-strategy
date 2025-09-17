extends Control

signal confirmed(home_team_id: String, away_team_id: String)
signal selection_changed(p1_team_id: String, opp_team_id: String)

@onready var header_label: Label = $RootV/HeaderLabel
@onready var p1_panel: PanelContainer = $RootV/MainRow/P1Panel
@onready var opp_panel: PanelContainer = $RootV/MainRow/OpponentPanel
@onready var footer: VBoxContainer = $RootV/Footer
@onready var options_row: HBoxContainer = $RootV/Footer/OptionsRow
@onready var play_mode_opt: HBoxContainer = $RootV/Footer/OptionsRow/PlayModeOption
@onready var home_opt: HBoxContainer = $RootV/Footer/OptionsRow/HomeTeamOption
@onready var visitor_opt: HBoxContainer = $RootV/Footer/OptionsRow/VisitorTeamOption
@onready var length_opt: HBoxContainer = $RootV/Footer/OptionsRow/GameLengthOption
@onready var weather_opt: HBoxContainer = $RootV/Footer/OptionsRow/WeatherOption
@onready var reset_button: Button = $RootV/Footer/ControlRow/ResetButton
@onready var start_button: Button = $RootV/Footer/ControlRow/StartButton

var p1_team: StringName = &"" # Visitor team id
var opp_team: StringName = &"" # Home team id

var _abbr_to_id: Dictionary = {}
var _id_to_abbr: Dictionary = {}
var _teams: Array = []

func _ready() -> void:
	_load_teams()
	_configure_options()
	_update_header()
	_sync_panels_from_options()
	reset_button.pressed.connect(_on_reset)
	start_button.pressed.connect(_on_start)
	play_mode_opt.connect("value_changed", Callable(self, "_on_option_changed"))
	home_opt.connect("value_changed", Callable(self, "_on_option_changed"))
	visitor_opt.connect("value_changed", Callable(self, "_on_option_changed"))
	length_opt.connect("value_changed", Callable(self, "_on_option_changed"))
	weather_opt.connect("value_changed", Callable(self, "_on_option_changed"))

func _load_teams() -> void:
	var T = load("res://data/teams.gd")
	if T != null:
		_teams = T.get_all()
	for t in _teams:
		var id: String = String(t.get("id", ""))
		var ab: String = String(t.get("abbr", id))
		_abbr_to_id[ab] = id
		_id_to_abbr[id] = ab

func _configure_options() -> void:
	play_mode_opt.call("set_option_name", "Play Mode")
	play_mode_opt.call("set_values", ["Exhibition"]) # Placeholder for future modes
	home_opt.call("set_option_name", "Home Team")
	visitor_opt.call("set_option_name", "Visitor Team")
	length_opt.call("set_option_name", "Game Length")
	length_opt.call("set_values", ["5", "10", "15", "20"])
	weather_opt.call("set_option_name", "Weather")
	weather_opt.call("set_values", ["Fair", "Rain", "Snow", "Windy"])
	# Populate team options
	var abbrs: Array = []
	for t in _teams:
		var ab := String(t.get("abbr", t.get("id", "")))
		if ab != "":
			abbrs.append(ab)
	home_opt.call("set_values", abbrs)
	visitor_opt.call("set_values", abbrs)
	if abbrs.has("DAL") and abbrs.has("BUF"):
		home_opt.call("set_value", "DAL")
		visitor_opt.call("set_value", "BUF")
	elif abbrs.size() >= 2:
		home_opt.call("set_value", String(abbrs[0]))
		visitor_opt.call("set_value", String(abbrs[1]))
	start_button.disabled = false

func _on_option_changed(_name: String, _value: String) -> void:
	_sync_panels_from_options()
	_emit_selection_changed()

func _emit_selection_changed() -> void:
	var ids := get_selected_team_ids()
	emit_signal("selection_changed", String(ids[1]), String(ids[0]))

func _update_header() -> void:
	header_label.text = "GAME SET UP"

func _sync_panels_from_options() -> void:
	# Enforce different teams
	var h_ab: String = String(home_opt.call("get_value"))
	var v_ab: String = String(visitor_opt.call("get_value"))
	if h_ab != "" and v_ab != "" and h_ab == v_ab:
		# Rotate visitor to next abbreviation deterministically
		var all: Array = _abbr_to_id.keys()
		all.sort()
		var idx: int = all.find(v_ab)
		if idx >= 0 and all.size() > 1:
			visitor_opt.call("set_value", String(all[(idx + 1) % all.size()]))
		v_ab = String(visitor_opt.call("get_value"))
	# Update preview panels
	var T = load("res://data/teams.gd")
	var v_id: String = String(_abbr_to_id.get(v_ab, ""))
	var h_id: String = String(_abbr_to_id.get(h_ab, ""))
	if v_id != "":
		p1_panel.call("set_team", T.get_by_id(v_id))
	else:
		p1_panel.call("clear_panel")
	if h_id != "":
		opp_panel.call("set_team", T.get_by_id(h_id))
	else:
		opp_panel.call("clear_panel")
	# Internal ids
	p1_team = StringName(v_id)
	opp_team = StringName(h_id)
	start_button.disabled = (String(p1_team) == "" or String(opp_team) == "")

func _on_reset() -> void:
	if _abbr_to_id.has("DAL") and _abbr_to_id.has("BUF"):
		home_opt.call("set_value", "DAL")
		visitor_opt.call("set_value", "BUF")
	else:
		var keys: Array = _abbr_to_id.keys()
		keys.sort()
		if keys.size() >= 2:
			home_opt.call("set_value", String(keys[0]))
			visitor_opt.call("set_value", String(keys[1]))
	_sync_panels_from_options()
	_update_header()

func _on_start() -> void:
	if String(opp_team) == "" or String(p1_team) == "":
		return
	var cfg := {
		"home_abbr": String(home_opt.call("get_value")),
		"visitor_abbr": String(visitor_opt.call("get_value")),
		"game_length_minutes": int(String(length_opt.call("get_value"))),
		"weather": String(weather_opt.call("get_value")),
		"p1_id": String(p1_team),
		"opp_id": String(opp_team)
	}
	var MC = load("res://scripts/MatchConfig.gd")
	if MC != null:
		var mc: Object = MC.new()
		mc.call("apply_from_team_selection", cfg)
	var home_id: String = String(_abbr_to_id.get(String(home_opt.call("get_value")), String(opp_team)))
	var away_id: String = String(_abbr_to_id.get(String(visitor_opt.call("get_value")), String(p1_team)))
	emit_signal("confirmed", home_id, away_id)

func _show_notice(text: String) -> void:
	push_warning(text)

func get_selected_team_ids() -> Array[String]:
	var home_id: String = String(_abbr_to_id.get(String(home_opt.call("get_value")), String(opp_team)))
	var away_id: String = String(_abbr_to_id.get(String(visitor_opt.call("get_value")), String(p1_team)))
	if home_id == away_id:
		return ["", ""]
	return [home_id, away_id]

func set_selected_abbrs(home_abbr: String, visitor_abbr: String) -> void:
	home_opt.call("set_value", String(home_abbr))
	visitor_opt.call("set_value", String(visitor_abbr))
	_sync_panels_from_options()

# ---- Test helpers ----
func debug_force_layout(width_px: int) -> Dictionary:
	size.x = float(width_px)
	return { "ok": true }
