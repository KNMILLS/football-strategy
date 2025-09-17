extends Control

signal confirmed(home_team_id: String, away_team_id: String)
signal selection_changed(p1_team_id: String, p2_team_id: String)
signal hovered_team(team_id: String)

@onready var grid: GridContainer = $VBox/TopHBox/GridScroll/Grid
@onready var grid_scroll: ScrollContainer = $VBox/TopHBox/GridScroll
@onready var left_preview: Control = $VBox/TopHBox/LeftPreview
@onready var right_preview: Control = $VBox/TopHBox/RightPreview
@onready var hero_label: Label = $VBox/TopHBox/Hero/HeroLabel
@onready var hero_blurb: Label = $VBox/TopHBox/Hero/HeroBlurb
@onready var info_coach: Label = $VBox/InfoBar/CoachLabel
@onready var info_offense: Label = $VBox/InfoBar/OffenseLabel
@onready var info_defense: Label = $VBox/InfoBar/DefenseLabel
@onready var info_strengths: Label = $VBox/InfoBar/StrengthsLabel
@onready var info_weaknesses: Label = $VBox/InfoBar/WeaknessesLabel
@onready var footer: HBoxContainer = $VBox/Footer
@onready var footer_label: Label = $VBox/Footer/MatchupLabel
@onready var btn_confirm: Button = $VBox/Footer/BtnConfirm
@onready var btn_reselect: Button = $VBox/Footer/BtnReselect

var ordered_team_ids: Array = []
var ordered_team_names: Array = []
var tiles: Array = []
var hovered_index: int = 0
var p1_team_id: String = ""
var p2_team_id: String = ""
var active_side: String = "home"
var cursor: Dictionary = {
	"away": {"index": 0, "locked": false, "team_id": ""},
	"home": {"index": 1, "locked": false, "team_id": ""}
}

func _ready() -> void:
	set_process_unhandled_input(true)
	_populate()
	_set_hover_index(0)
	if ordered_team_ids.size() > 0:
		_update_previews()
	_update_footer()
	btn_confirm.pressed.connect(_on_btn_confirm)
	btn_reselect.pressed.connect(_on_btn_reselect)
	_apply_responsive_layout()
	# Enable mouse selection by listening to gui_input on the grid
	grid.gui_input.connect(_on_grid_gui_input)

# [Duplicate definitions removed below]

func _populate() -> void:
	tiles.clear()
	ordered_team_ids.clear()
	ordered_team_names.clear()
	grid.columns = 8
	var tl: Object = get_node("/root/TeamLoader")
	var teams: Array = tl.call("list_teams")
	var count: int = 0
	var idx_counter: int = 0
	for td in teams:
		var tid: String = String((td as Dictionary).get("team_id", ""))
		var team_label: String = String((td as Dictionary).get("display_name", tid))
		ordered_team_ids.append(tid)
		ordered_team_names.append(team_label)
		var tile_scene: PackedScene = load("res://ui/TeamTile.tscn")
		var tile: Control = tile_scene.instantiate()
		# Add to scene tree before calling methods that access /root autoloads
		grid.add_child(tile)
		tile.call("set_team", tid, team_label)
		tile.call("set_team_index", int(idx_counter))
		tile.connect("tile_hovered", Callable(self, "_on_tile_hovered"))
		tile.connect("tile_pressed", Callable(self, "_on_tile_pressed"))
		tiles.append(tile)
		count += 1
		idx_counter += 1
		if count >= 32:
			break
	if tiles.size() > 0:
		(tiles[0] as Control).grab_focus()
		if ordered_team_ids.size() > 0:
			call("_update_info_bar_for", String(ordered_team_ids[0]))
			_update_hero_for(String(ordered_team_ids[0]))
	_refresh_cursor_frames()

func _on_tile_hovered(team_id: String) -> void:
	var idx: int = ordered_team_ids.find(team_id)
	if idx >= 0:
		_set_hover_index(int(idx))
		_update_previews()
		call("_update_info_bar_for", team_id)
		_update_hero_for(team_id)
		emit_signal("hovered_team", team_id)

func _on_tile_pressed(team_id: String) -> void:
	var side: String = active_side
	if side == "away" and not bool(cursor.away.locked):
		cursor.away.team_id = team_id
		cursor.away.locked = true
		p2_team_id = team_id
		_set_badge(team_id, "P2 SELECTED")
	elif side == "home" and not bool(cursor.home.locked):
		cursor.home.team_id = team_id
		cursor.home.locked = true
		p1_team_id = team_id
		_set_badge(team_id, "P1 SELECTED")
	_update_footer()
	emit_signal("selection_changed", p1_team_id, p2_team_id)
	_refresh_cursor_frames()

func _set_badge(team_id: String, text: String) -> void:
	var idx: int = ordered_team_ids.find(team_id)
	if idx >= 0 and idx < tiles.size():
		tiles[idx].call("set_badge", text)

func _clear_badge(team_id: String) -> void:
	if team_id == "":
		return
	var idx: int = ordered_team_ids.find(team_id)
	if idx >= 0 and idx < tiles.size():
		tiles[idx].call("set_badge", "")

func _update_footer() -> void:
	var have_both: bool = (p1_team_id != "" and p2_team_id != "")
	footer.visible = have_both
	if have_both:
		var tl: Object = get_node("/root/TeamLoader")
		var n1: String = String(tl.call("get_display_name", p1_team_id))
		var n2: String = String(tl.call("get_display_name", p2_team_id))
		footer_label.text = "%s vs %s — Confirm or Reselect (Tab swaps)" % [n1, n2]
	btn_confirm.disabled = not have_both

func _team_dict_from_id(team_id: String) -> Dictionary:
	var tl: Object = get_node("/root/TeamLoader")
	# Try list_teams first to include extra fields
	var list: Array = tl.call("list_teams")
	for td in list:
		if String((td as Dictionary).get("team_id", "")) == team_id:
			return td
	return tl.call("get_team_dict", String(team_id))

func _update_previews() -> void:
	# Left = Away, Right = Home
	if p2_team_id != "":
		right_preview.call("set_team", _team_dict_from_id(p2_team_id))
		right_preview.call("set_locked", bool(cursor.away.locked), "AWAY")
	else:
		right_preview.call("set_locked", false, "")
	if p1_team_id != "":
		left_preview.call("set_team", _team_dict_from_id(p1_team_id))
		left_preview.call("set_locked", bool(cursor.home.locked), "HOME")
	else:
		left_preview.call("set_locked", false, "")

func _update_info_bar_for(team_id: String) -> void:
	var td: Dictionary = _team_dict_from_id(String(team_id))
	var coach: String = String(td.get("coach", "TBD"))
	var o: String = String(td.get("offense_scheme", td.get("offense_archetype", "")))
	var d: String = String(td.get("defense_scheme", td.get("defense_archetype", "")))
	info_coach.text = "Coach: %s" % coach
	info_offense.text = "Offense: %s" % o
	info_defense.text = "Defense: %s" % d
	var strengths: Array = _derive_strengths(o, d)
	info_strengths.text = "Strengths: %s" % ", ".join(strengths)
	var weaknesses: Array = _derive_weaknesses(o, d)
	info_weaknesses.text = "Weaknesses: %s" % ", ".join(weaknesses)

func _update_hero_for(team_id: String) -> void:
	var tl: Object = get_node("/root/TeamLoader")
	var d: Dictionary = tl.call("get_team_dict", String(team_id))
	var name: String = String(d.get("display_name", team_id))
	var o: String = String(d.get("offense_scheme", d.get("offense_archetype", "")))
	var dsc: String = String(d.get("defense_scheme", d.get("defense_archetype", "")))
	hero_label.text = name
	hero_blurb.text = (o + (" / " if o != "" and dsc != "" else "") + dsc).strip_edges()

func _stringify_info(v: Variant) -> String:
	if typeof(v) == TYPE_ARRAY:
		var parts: Array = []
		for x in (v as Array):
			parts.append(String(x))
		return ", ".join(parts)
	return String(v)

func _derive_strengths(o: String, d: String) -> Array:
	var out: Array = []
	var ou: String = o.to_upper()
	var du: String = d.to_upper()
	if ou.find("AIR") >= 0:
		out.append("Spread passing")
	elif ou.find("WEST") >= 0:
		out.append("Short timing / YAC")
	elif ou.find("ZONE") >= 0:
		out.append("Outside zone / boot")
	elif ou.find("POWER") >= 0:
		out.append("Ground control")
	elif ou.find("RPO") >= 0:
		out.append("RPO / space stress")
	else:
		out.append("Balanced")
	if du.find("PRESS") >= 0:
		out.append("Man pressure")
	elif du.find("COVER2") >= 0 or du.find("TAMPA") >= 0:
		out.append("Underneath zone integrity")
	elif du.find("MULT") >= 0:
		out.append("Versatility")
	return out

func _derive_weaknesses(o: String, d: String) -> Array:
	var out: Array = []
	var ou: String = o.to_upper()
	var du: String = d.to_upper()
	if ou.find("AIR") >= 0:
		out.append("Run power susceptibility")
	elif ou.find("WEST") >= 0:
		out.append("Limited deep shots")
	elif ou.find("ZONE") >= 0:
		out.append("Interior power")
	elif ou.find("POWER") >= 0:
		out.append("Edge speed")
	elif ou.find("RPO") >= 0:
		out.append("Discipline required vs keys")
	if du.find("PRESS") >= 0:
		out.append("YAC risk if beaten")
	elif du.find("COVER2") >= 0 or du.find("TAMPA") >= 0:
		out.append("Seam / deep hole vulnerability")
	return out

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var key: int = (event as InputEventKey).physical_keycode
		if key == KEY_LEFT:
			_move_hover(-1)
		elif key == KEY_RIGHT:
			_move_hover(1)
		elif key == KEY_UP:
			_move_hover(-_grid_cols())
		elif key == KEY_DOWN:
			_move_hover(_grid_cols())
		elif key == KEY_TAB:
			active_side = ("home" if active_side == "away" else "away")
		elif key == KEY_ENTER or key == KEY_KP_ENTER:
			_confirm_hover()
		elif key == KEY_ESCAPE or key == KEY_BACKSPACE:
			_on_btn_reselect()

func _move_hover(delta: int) -> void:
	if tiles.size() == 0:
		return
	var total: int = tiles.size()
	if total == 0:
		return
	var cols: int = _grid_cols()
	if cols < 1:
		cols = 1
	var rows: int = int(ceil(float(total) / float(cols)))
	var c: int = hovered_index % cols
	var r: int = int(hovered_index / cols)
	if delta == -1:
		c = (c - 1 + cols) % cols
	elif delta == 1:
		c = (c + 1) % cols
	elif delta == -_grid_cols():
		r = (r - 1 + rows) % rows
	elif delta == _grid_cols():
		r = (r + 1) % rows
	var idx: int = r * cols + c
	if idx >= total:
		idx = total - 1
	_set_hover_index(idx)
	_refresh_cursor_frames()
	_update_previews()
	if hovered_index >= 0 and hovered_index < ordered_team_ids.size():
		call("_update_info_bar_for", String(ordered_team_ids[hovered_index]))

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_apply_responsive_layout()

func _apply_responsive_layout() -> void:
	# Compute tile size from available grid width to keep 8×N responsive and centered
	if not is_instance_valid(grid):
		return
	var cols: int = grid.columns
	if cols < 1:
		cols = 1
	var hsep: int = int(grid.get_theme_constant("h_separation"))
	var padding: int = 16
	var width_px: float = 0.0
	if is_instance_valid(grid_scroll):
		width_px = float(grid_scroll.size.x)
	else:
		width_px = float(grid.size.x)
	var avail_w: float = max(0.0, width_px - float(hsep * (cols - 1)) - float(padding))
	var tile: int = int(clamp(floor(avail_w / float(cols)), 72.0, 160.0))
	var sep: int = int(clamp(floor(float(tile) * 0.12), 6.0, 18.0))
	grid.add_theme_constant_override("h_separation", sep)
	grid.add_theme_constant_override("v_separation", sep)
	for t in tiles:
		(t as Control).custom_minimum_size = Vector2(tile, tile)
	# Ensure scroll gets a workable height
	if is_instance_valid(grid_scroll) and grid_scroll.custom_minimum_size.y < 320.0:
		grid_scroll.custom_minimum_size = Vector2(0, 320)

func _grid_cols() -> int:
	if is_instance_valid(grid) and int(grid.columns) > 0:
		return int(grid.columns)
	return 8

func _set_hover_index(idx: int) -> void:
	hovered_index = int(idx)
	if hovered_index >= 0 and hovered_index < tiles.size():
		(tiles[hovered_index] as Control).grab_focus()

func _confirm_hover() -> void:
	if hovered_index >= 0 and hovered_index < ordered_team_ids.size():
		_on_tile_pressed(String(ordered_team_ids[hovered_index]))

func _on_btn_confirm() -> void:
	if p1_team_id != "" and p2_team_id != "":
		emit_signal("confirmed", p1_team_id, p2_team_id)

func _on_btn_reselect() -> void:
	if p2_team_id != "":
		_clear_badge(p2_team_id)
		p2_team_id = ""
		cursor.away.locked = false
	elif p1_team_id != "":
		_clear_badge(p1_team_id)
		p1_team_id = ""
		cursor.home.locked = false
	_update_footer()
	emit_signal("selection_changed", p1_team_id, p2_team_id)
	_refresh_cursor_frames()
	_update_previews()

# ---- Test helpers ----
func debug_hover_index(idx: int) -> void:
	_set_hover_index(idx)
	if idx >= 0 and idx < ordered_team_ids.size():
		_update_previews()

func debug_confirm_current() -> void:
	_confirm_hover()

func debug_handle_key(key_name: String) -> void:
	var n: String = key_name.to_upper()
	if n == "LEFT":
		_move_hover(-1)
	elif n == "RIGHT":
		_move_hover(1)
	elif n == "UP":
		_move_hover(-grid.columns)
	elif n == "DOWN":
		_move_hover(grid.columns)
	elif n == "TAB":
		active_side = ("home" if active_side == "away" else "away")
	elif n == "ENTER":
		_confirm_hover()
	elif n == "RESELECT":
		_on_btn_reselect()

func debug_select(home_id: String, away_id: String, do_confirm: bool) -> void:
	# Test-only helper to select by ids quickly without UI input
	p1_team_id = home_id
	p2_team_id = away_id
	_clear_all_badges()
	_set_badge(home_id, "P1 SELECTED")
	_set_badge(away_id, "P2 SELECTED")
	_update_footer()
	if do_confirm:
		_on_btn_confirm()

func _clear_all_badges() -> void:
	for i in tiles.size():
		tiles[i].call("set_badge", "")

func get_state() -> Dictionary:
	return {
		"p1": p1_team_id,
		"p2": p2_team_id,
		"hover_index": hovered_index,
		"footer_visible": footer.visible,
		"footer_text": footer_label.text
	}

func get_selected_team_ids() -> Array[String]:
	return [String(p1_team_id), String(p2_team_id)]

func _refresh_cursor_frames() -> void:
	# Clear all
	for i in tiles.size():
		tiles[i].call("set_focus_for", "away", false)
		tiles[i].call("set_focus_for", "home", false)
		tiles[i].call("set_locked_for", "away", bool(cursor.away.locked) and ordered_team_ids[i] == p2_team_id)
		tiles[i].call("set_locked_for", "home", bool(cursor.home.locked) and ordered_team_ids[i] == p1_team_id)
	# Set active cursor frame on hovered index
	if hovered_index >= 0 and hovered_index < tiles.size():
		tiles[hovered_index].call("set_focus_for", active_side, true)

func _on_grid_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		var mb: InputEventMouseButton = event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			# Translate click position to tile index
			var pos: Vector2 = Vector2(mb.position.x, mb.position.y)
			pos = grid.to_local(pos)
			var _cols: int = _grid_cols()
			var best: int = -1
			var best_dist: float = INF
			for i in tiles.size():
				var r: Rect2 = (tiles[i] as Control).get_global_rect()
				if r.has_point(get_global_mouse_position()):
					best = i
					break
				var d: float = r.get_center().distance_to(get_global_mouse_position())
				if d < best_dist:
					best_dist = d
					best = i
			if best >= 0:
				_set_hover_index(best)
				_confirm_hover()
