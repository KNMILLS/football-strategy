extends Control

signal confirmed(home_team_id: String, away_team_id: String)
signal selection_changed(p1_team_id: String, opp_team_id: String)

enum SelectState { IDLE, P1_SELECTED, BOTH_SELECTED }

@onready var header_label: Label = $RootV/HeaderLabel
@onready var p1_panel: PanelContainer = $RootV/MainRow/P1Panel
@onready var opp_panel: PanelContainer = $RootV/MainRow/OpponentPanel
@onready var team_grid: GridContainer = $RootV/MainRow/Scroll/TeamGrid
@onready var main_row: HBoxContainer = $RootV/MainRow
@onready var stack_area: VBoxContainer = $RootV/StackArea
@onready var footer: VBoxContainer = $RootV/Footer
@onready var options_row: HBoxContainer = $RootV/Footer/OptionsRow
@onready var play_mode_opt: HBoxContainer = $RootV/Footer/OptionsRow/PlayModeOption
@onready var home_opt: HBoxContainer = $RootV/Footer/OptionsRow/HomeTeamOption
@onready var visitor_opt: HBoxContainer = $RootV/Footer/OptionsRow/VisitorTeamOption
@onready var length_opt: HBoxContainer = $RootV/Footer/OptionsRow/GameLengthOption
@onready var weather_opt: HBoxContainer = $RootV/Footer/OptionsRow/WeatherOption
@onready var reset_button: Button = $RootV/Footer/ControlRow/ResetButton
@onready var start_button: Button = $RootV/Footer/ControlRow/StartButton

var state: SelectState = SelectState.IDLE
var p1_team: StringName = &""
var opp_team: StringName = &""

var _tiles: Array = []
var _abbr_to_id: Dictionary = {}
var _id_to_abbr: Dictionary = {}
var _teams: Array = []

func _ready() -> void:
	_load_teams()
	_build_grid()
	_configure_options()
	_update_header()
	_update_panels()
	_update_layout_reflow()
	reset_button.pressed.connect(_on_reset)
	start_button.pressed.connect(_on_start)
	set_process(true)

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_grid_columns()
		_update_layout_reflow()

func _load_teams() -> void:
	var T = load("res://data/teams.gd")
	if T != null:
		_teams = T.get_all()
	for t in _teams:
		var id: String = String(t.get("id", ""))
		var ab: String = String(t.get("abbr", id))
		_abbr_to_id[ab] = id
		_id_to_abbr[id] = ab

func _build_grid() -> void:
	team_grid.columns = 6
	_tiles.clear()
	for t in _teams:
		var tile_scene: PackedScene = load("res://ui/team_select/TeamTile.tscn")
		var tile: Button = tile_scene.instantiate()
		team_grid.add_child(tile)
		tile.call("set_team", t)
		tile.connect("tile_clicked", Callable(self, "_on_tile_clicked"))
		_tiles.append(tile)
	_update_grid_columns()

func _update_grid_columns() -> void:
	if not is_instance_valid(team_grid):
		return
	var parent_node := team_grid.get_parent()
	var parent_w: float = 0.0
	if parent_node is Control:
		parent_w = float((parent_node as Control).size.x)
	else:
		parent_w = float(size.x)
	var min_tile: float = 128.0
	var max_cols: int = int(clamp(floor(parent_w / (min_tile + 16.0)), 4.0, 8.0))
	team_grid.columns = max(4, max_cols)
	var avail_w: float = parent_w
	for t in _tiles:
		(t as Control).custom_minimum_size = Vector2(clamp((avail_w - (team_grid.columns - 1) * 12.0) / team_grid.columns, 128.0, 196.0), clamp((avail_w - (team_grid.columns - 1) * 12.0) / team_grid.columns, 128.0, 196.0))

func _update_layout_reflow() -> void:
	# Stack P1 and Opponent under the grid when narrow
	if not is_instance_valid(main_row) or not is_instance_valid(p1_panel) or not is_instance_valid(opp_panel):
		return
	var total_w: float = float(size.x)
	var use_stack: bool = total_w < 1000.0
	if use_stack:
		if p1_panel.get_parent() != stack_area:
			p1_panel.get_parent().remove_child(p1_panel)
			stack_area.add_child(p1_panel)
		if opp_panel.get_parent() != stack_area:
			opp_panel.get_parent().remove_child(opp_panel)
			stack_area.add_child(opp_panel)
		stack_area.visible = true
		# Ensure Scroll sits above in MainRow alone
		for c in main_row.get_children():
			if c != main_row.get_node("Scroll"):
				c.visible = false
	else:
		# Place panels back to MainRow left/right of Scroll
		if p1_panel.get_parent() != main_row:
			p1_panel.get_parent().remove_child(p1_panel)
			main_row.add_child(p1_panel)
			main_row.move_child(p1_panel, 0)
		if opp_panel.get_parent() != main_row:
			opp_panel.get_parent().remove_child(opp_panel)
			main_row.add_child(opp_panel)
			main_row.move_child(opp_panel, main_row.get_child_count())
		for c in main_row.get_children():
			c.visible = true
		stack_area.visible = false

func _configure_options() -> void:
	play_mode_opt.call("set_option_name", "Play Mode")
	play_mode_opt.call("set_values", ["Exhibition", "Season"])
	home_opt.call("set_option_name", "Home Team")
	visitor_opt.call("set_option_name", "Visitor Team")
	length_opt.call("set_option_name", "Game Length")
	length_opt.call("set_values", ["5", "10", "15", "20"])
	weather_opt.call("set_option_name", "Weather")
	weather_opt.call("set_values", ["Fair", "Rain", "Snow", "Windy"])
	start_button.disabled = true

func _on_tile_clicked(team_id: String) -> void:
	if state == SelectState.IDLE:
		p1_team = StringName(team_id)
		state = SelectState.P1_SELECTED
	elif state == SelectState.P1_SELECTED:
		if String(p1_team) == team_id:
			_show_notice("Opponent must be different")
			return
		opp_team = StringName(team_id)
		state = SelectState.BOTH_SELECTED
	else:
		if String(p1_team) == team_id:
			_show_notice("Opponent must be different")
			return
		opp_team = StringName(team_id)
	_update_header()
	_update_panels()
	_update_options_assignment()
	_update_tile_selection_visuals()
	start_button.disabled = not _can_start()
	emit_signal("selection_changed", String(p1_team), String(opp_team))

func _can_start() -> bool:
	return state == SelectState.BOTH_SELECTED and String(p1_team) != "" and String(opp_team) != ""

func _update_header() -> void:
	if state == SelectState.IDLE:
		header_label.text = "Select Team"
	elif state == SelectState.P1_SELECTED:
		header_label.text = "Select Opponent"
	else:
		header_label.text = "Select Opponent"

func _update_panels() -> void:
	var T = load("res://data/teams.gd")
	if state == SelectState.IDLE:
		p1_panel.call("clear_panel")
		opp_panel.call("clear_panel")
	elif state == SelectState.P1_SELECTED:
		var t1: Dictionary = T.get_by_id(p1_team)
		p1_panel.call("set_team", t1)
		opp_panel.call("clear_panel")
	else:
		var t1: Dictionary = T.get_by_id(p1_team)
		var t2: Dictionary = T.get_by_id(opp_team)
		p1_panel.call("set_team", t1)
		opp_panel.call("set_team", t2)

func _update_options_assignment() -> void:
	var p1_ab := String(_id_to_abbr.get(String(p1_team), ""))
	var opp_ab := String(_id_to_abbr.get(String(opp_team), ""))
	var both_selected: bool = (p1_ab != "" and opp_ab != "")
	if both_selected:
		home_opt.call("set_values", [opp_ab, p1_ab])
		visitor_opt.call("set_values", [p1_ab, opp_ab])
		home_opt.call("set_enabled", true)
		visitor_opt.call("set_enabled", true)
		# Defaults: Home = Opponent, Visitor = P1
		home_opt.call("set_value", opp_ab)
		visitor_opt.call("set_value", p1_ab)
	else:
		home_opt.call("set_values", [])
		visitor_opt.call("set_values", [])
		home_opt.call("set_enabled", false)
		visitor_opt.call("set_enabled", false)

func _update_tile_selection_visuals() -> void:
	for tile in _tiles:
		var id: String = String(tile.get("team_id"))
		var is_selected: bool = (id == String(p1_team)) or (id == String(opp_team))
		tile.call("set_selected", is_selected)

func _on_reset() -> void:
	state = SelectState.IDLE
	p1_team = &""
	opp_team = &""
	_update_header()
	_update_panels()
	_update_tile_selection_visuals()
	_update_options_assignment()
	start_button.disabled = true

func _on_start() -> void:
	if not _can_start():
		return
	var cfg := {
		"play_mode": String(play_mode_opt.call("get_value")),
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
	# Emit compatibility signal for Main.gd
	var home_id: String = String(_abbr_to_id.get(String(home_opt.call("get_value")), String(opp_team)))
	var away_id: String = String(_abbr_to_id.get(String(visitor_opt.call("get_value")), String(p1_team)))
	emit_signal("confirmed", home_id, away_id)
	# Transition is handled by listener (Main.gd)

func _show_notice(text: String) -> void:
	# Minimal UX: use push_warning; UI toast could be added later
	push_warning(text)

func get_selected_team_ids() -> Array[String]:
	# Compatibility helper used by Main.gd when starting via setup button
	if not _can_start():
		return ["", ""]
	var home_id: String = String(_abbr_to_id.get(String(home_opt.call("get_value")), String(opp_team)))
	var away_id: String = String(_abbr_to_id.get(String(visitor_opt.call("get_value")), String(p1_team)))
	return [home_id, away_id]

# ---- Test helpers ----
func debug_force_layout(width_px: int) -> Dictionary:
	size.x = float(width_px)
	_update_grid_columns()
	_update_layout_reflow()
	return {
		"columns": int(team_grid.columns),
		"stacked": bool(stack_area.visible)
	}
