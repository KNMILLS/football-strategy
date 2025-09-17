extends Control

signal confirmed(home_team_id: String, away_team_id: String)
signal selection_changed(p1_team_id: String, p2_team_id: String)
signal hovered_team(team_id: String)

@onready var grid: GridContainer = $VBox/TopHBox/Grid
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

func _ready() -> void:
    set_process_unhandled_input(true)
    _populate()
    _set_hover_index(0)
    if ordered_team_ids.size() > 0:
        _update_preview(String(ordered_team_ids[0]))
    _update_footer()
    btn_confirm.pressed.connect(_on_btn_confirm)
    btn_reselect.pressed.connect(_on_btn_reselect)

func _populate() -> void:
    tiles.clear()
    ordered_team_ids.clear()
    ordered_team_names.clear()
    grid.columns = 4
    var tl: Object = get_node("/root/TeamLoader")
    var ids: Array = tl.call("get_team_ids")
    for tid in ids:
        var team_label: String = String(tl.call("get_display_name", String(tid)))
        ordered_team_ids.append(String(tid))
        ordered_team_names.append(team_label)
        var tile_scene := load("res://ui/TeamTile.tscn")
        var tile: Control = tile_scene.instantiate()
        tile.call("set_team", String(tid), team_label)
        tile.connect("tile_hovered", Callable(self, "_on_tile_hovered"))
        tile.connect("tile_pressed", Callable(self, "_on_tile_pressed"))
        grid.add_child(tile)
        tiles.append(tile)
    if tiles.size() > 0:
        (tiles[0] as Control).grab_focus()

func _on_tile_hovered(team_id: String) -> void:
    var idx := ordered_team_ids.find(team_id)
    if idx >= 0:
        _set_hover_index(int(idx))
        _update_preview(team_id)
        emit_signal("hovered_team", team_id)

func _on_tile_pressed(team_id: String) -> void:
    if p1_team_id == "":
        p1_team_id = team_id
        _set_badge(team_id, "P1 SELECTED")
    elif p2_team_id == "":
        p2_team_id = team_id
        _set_badge(team_id, "P2 SELECTED")
    else:
        # Already both selected; ignore tile presses until reselect
        pass
    _update_footer()
    emit_signal("selection_changed", p1_team_id, p2_team_id)

func _set_badge(team_id: String, text: String) -> void:
    var idx := ordered_team_ids.find(team_id)
    if idx >= 0 and idx < tiles.size():
        tiles[idx].call("set_badge", text)

func _clear_badge(team_id: String) -> void:
    if team_id == "":
        return
    var idx := ordered_team_ids.find(team_id)
    if idx >= 0 and idx < tiles.size():
        tiles[idx].call("set_badge", "")

func _update_footer() -> void:
    var have_both := (p1_team_id != "" and p2_team_id != "")
    footer.visible = have_both
    if have_both:
        var tl: Object = get_node("/root/TeamLoader")
        var n1 := String(tl.call("get_display_name", p1_team_id))
        var n2 := String(tl.call("get_display_name", p2_team_id))
        footer_label.text = "%s vs %s — Confirm or Reselect" % [n1, n2]
    btn_confirm.disabled = not have_both

func _update_preview(team_id: String) -> void:
    var tl: Object = get_node("/root/TeamLoader")
    var d: Dictionary = tl.call("get_team_dict", String(team_id))
    var team_name := String(d.get("display_name", team_id))
    var coach := String(d.get("coach_display_name", "TBD"))
    var o := String(d.get("offense_scheme", d.get("offense_archetype", "BALANCED")))
    var de := String(d.get("defense_scheme", d.get("defense_archetype", "BALANCED")))
    var s: Variant = d.get("strengths", _derive_strengths(o, de))
    var w: Variant = d.get("weaknesses", _derive_weaknesses(o, de))
    hero_label.text = team_name
    var blurb := String(d.get("blurb", ""))
    hero_blurb.text = blurb
    info_coach.text = "Coach: %s" % coach
    info_offense.text = "Offense: %s" % o
    info_defense.text = "Defense: %s" % de
    info_strengths.text = "Strengths: %s" % (_stringify_info(s))
    info_weaknesses.text = "Weaknesses: %s" % (_stringify_info(w))

func _stringify_info(v: Variant) -> String:
    if typeof(v) == TYPE_ARRAY:
        var parts: Array = []
        for x in (v as Array):
            parts.append(String(x))
        return ", ".join(parts)
    return String(v)

func _derive_strengths(o: String, d: String) -> Array:
    var out: Array = []
    var ou := o.to_upper()
    var du := d.to_upper()
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
    var ou := o.to_upper()
    var du := d.to_upper()
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
        var key := (event as InputEventKey).physical_keycode
        if key == KEY_LEFT:
            _move_hover(-1)
        elif key == KEY_RIGHT:
            _move_hover(1)
        elif key == KEY_UP:
            _move_hover(-grid.columns)
        elif key == KEY_DOWN:
            _move_hover(grid.columns)
        elif key == KEY_ENTER or key == KEY_KP_ENTER:
            _confirm_hover()
        elif key == KEY_ESCAPE or key == KEY_BACKSPACE:
            _on_btn_reselect()

func _move_hover(delta: int) -> void:
    if tiles.size() == 0:
        return
    var idx: int = clamp(hovered_index + int(delta), 0, tiles.size() - 1)
    _set_hover_index(idx)
    _update_preview(ordered_team_ids[idx])

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
    elif p1_team_id != "":
        _clear_badge(p1_team_id)
        p1_team_id = ""
    _update_footer()
    emit_signal("selection_changed", p1_team_id, p2_team_id)

# ---- Test helpers ----
func debug_hover_index(idx: int) -> void:
    _set_hover_index(idx)
    if idx >= 0 and idx < ordered_team_ids.size():
        _update_preview(String(ordered_team_ids[idx]))

func debug_confirm_current() -> void:
    _confirm_hover()

func debug_handle_key(key_name: String) -> void:
    var n := key_name.to_upper()
    if n == "LEFT":
        _move_hover(-1)
    elif n == "RIGHT":
        _move_hover(1)
    elif n == "UP":
        _move_hover(-grid.columns)
    elif n == "DOWN":
        _move_hover(grid.columns)
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


